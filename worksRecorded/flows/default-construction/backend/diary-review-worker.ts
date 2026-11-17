import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import { diaryReviewIds } from "../lib/diary-review";
import { ProjectAccessError } from "../visual/project-access-error";
import { buildDiaryReviewSnapshot } from "./diary-review-data";
import { claimDiaryReview, finishDiaryReview } from "./diary-review-queue";
import { DiaryReviewSession } from "./diary-review-session";

export async function processNextDiaryReview() {
  if (process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED !== "true")
    return { status: "disabled" };
  const job = await claimDiaryReview();
  if (!job) return { status: "idle" };
  try {
    const snapshot = await buildDiaryReviewSnapshot({
      siteId: job.siteId,
      userId: job.userId,
      organizationId: job.organizationId,
      recordIds: diaryReviewIds(job.recordIds),
    });
    const stored = await prisma.constructionDiaryReviewRun.updateMany({
      where: { id: job.id, leaseToken: job.leaseToken, status: "running" },
      data: {
        snapshot: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
      },
    });
    if (stored.count !== 1) throw new Error("REVIEW_LEASE_LOST");
    const { runDiaryReviewAgent } = await import("./diary-review-agent");
    const result = await runDiaryReviewAgent(
      snapshot,
      new DiaryReviewSession(job.id, job.leaseToken),
      async (tool) => {
        const changed = await prisma.constructionDiaryReviewRun.updateMany({
          where: { id: job.id, leaseToken: job.leaseToken, status: "running" },
          data: { metrics: { currentTool: tool } },
        });
        if (changed.count !== 1) throw new Error("REVIEW_LEASE_LOST");
      },
    );
    const status = result.proposal.records.some(
      (row) => row.verdict !== "verified",
    )
      ? "waiting_approval"
      : "completed";
    await finishDiaryReview({
      id: job.id,
      queueId: job.queueId,
      leaseToken: job.leaseToken,
      status,
      proposal: result.proposal,
      metrics: result.metrics,
    });
    return { id: job.id, status };
  } catch (error) {
    const errorCode =
      error instanceof ProjectAccessError
        ? "REVIEW_ACCESS_REVOKED"
        : error instanceof z.ZodError
          ? "REVIEW_INVALID_OUTPUT"
          : error instanceof Error && /^REVIEW_[A-Z_]+$/.test(error.message)
            ? error.message
            : "REVIEW_EXECUTION_FAILED";
    try {
      await finishDiaryReview({
        id: job.id,
        queueId: job.queueId,
        leaseToken: job.leaseToken,
        status: "failed",
        errorCode,
        retryable: errorCode === "REVIEW_EXECUTION_FAILED",
      });
    } catch {
      console.error("[diary-review] run lease unavailable", { runId: job.id });
    }
    return { id: job.id, status: "failed", errorCode };
  }
}
