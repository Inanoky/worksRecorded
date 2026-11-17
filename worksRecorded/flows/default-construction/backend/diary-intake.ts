import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";
import { saveSiteDiaryRecord } from "@/server/actions/site-diary-actions";
import { diaryIntakeRows } from "../lib/diary-intake";
import { DIARY_REVIEW_TIMEOUT_MS } from "../lib/diary-review";
import { runDiaryIntakeAgent } from "./diary-intake-agent";
import {
  assertDiaryIntakeContextCurrent,
  buildDiaryIntakeContext,
  type DiaryIntakeScope,
} from "./diary-intake-context";
import { DiaryReviewSession } from "./diary-review-session";

export function diaryIntakeRunId(scope: DiaryIntakeScope) {
  const hex = createHash("sha256")
    .update(
      JSON.stringify([
        "whatsapp-direct",
        scope.organizationId,
        scope.siteId,
        scope.userId,
        scope.sourceMessageId,
      ]),
    )
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const failureReply =
  "Jaunā aģenta izpildi neizdevās pabeigt. Atveriet projekta sadaļu “Dienasgrāmatas AI aģents”, lai redzētu statusu. Ziņa vecajam aģentam netika nodota.";

export async function processDiaryIntake(
  scope: DiaryIntakeScope,
  sourceText: string,
  originalAudioUrl?: string | null,
  receivedAt?: string,
) {
  const id = diaryIntakeRunId(scope);
  const leaseToken = randomUUID();
  const started = Date.now();
  const steps: Array<{ name: string; at: string }> = [];
  let metrics: Record<string, unknown> = { mode: "direct", steps };
  const progress = async (name: string) => {
    steps.push({ name, at: new Date().toISOString() });
    const changed = await prisma.constructionDiaryReviewRun.updateMany({
      where: { id, leaseToken, status: "running" },
      data: { metrics: json({ ...metrics, steps, currentTool: name }) },
    });
    if (changed.count !== 1) throw new Error("INTAKE_RUN_CHANGED");
  };
  try {
    await prisma.constructionDiaryReviewRun.create({
      data: {
        id,
        leaseToken,
        queueId: "whatsapp-direct",
        siteId: scope.siteId,
        organizationId: scope.organizationId,
        userId: scope.userId,
        recordIds: [],
        snapshot: { mode: "direct", sourceText },
        metrics: json(metrics),
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const existing = await prisma.constructionDiaryReviewRun.findFirst({
        where: {
          id,
          siteId: scope.siteId,
          organizationId: scope.organizationId,
          userId: scope.userId,
        },
        select: { status: true, snapshot: true, createdAt: true },
      });
      const snapshot = existing?.snapshot as { reply?: string } | null;
      if (
        existing &&
        ["completed", "needs_clarification", "replied"].includes(
          existing.status,
        )
      )
        return snapshot?.reply ?? "Šī ziņa jau ir apstrādāta.";
      if (
        existing?.status === "running" &&
        Date.now() - existing.createdAt.getTime() <
          DIARY_REVIEW_TIMEOUT_MS + 60000
      )
        return "Šī ziņa jau tiek apstrādāta. Izpilde redzama projekta AI aģenta sadaļā.";
    }
    return failureReply;
  }
  try {
    await progress("read_context");
    const previous = await prisma.siteDiarySaveBatch.findUnique({
      where: { sourceMessageId: scope.sourceMessageId },
      select: { id: true, siteId: true, userId: true },
    });
    if (previous) throw new Error("INTAKE_MESSAGE_ALREADY_SAVED");
    const received = receivedAt ? new Date(receivedAt) : new Date();
    const context = await buildDiaryIntakeContext(scope, sourceText, received);
    const result = await runDiaryIntakeAgent(
      context,
      new DiaryReviewSession(id, leaseToken),
      progress,
    );
    metrics = { ...metrics, ...result.metrics, draft: result.draft };
    await progress("validate_records");
    if (result.draft.intent !== "save") {
      const reply = result.draft.reply;
      await prisma.constructionDiaryReviewRun.updateMany({
        where: { id, leaseToken, status: "running" },
        data: {
          status:
            result.draft.intent === "clarify"
              ? "needs_clarification"
              : "replied",
          finishedAt: new Date(),
          snapshot: { mode: "direct", sourceText, reply },
          metrics: json({ ...metrics, steps, currentTool: "finished" }),
        },
      });
      return reply;
    }
    await assertDiaryIntakeContextCurrent(scope, context);
    await progress("save_records");
    const reply = `Saglabāti ${result.draft.records.length} dienasgrāmatas ieraksti. ${result.draft.reply}`;
    const saved = await saveSiteDiaryRecord({
      rows: diaryIntakeRows(result.draft, context),
      userId: scope.userId,
      siteId: scope.siteId,
      originalUserComment: sourceText,
      originalAudioUrl,
      sourceMessageId: scope.sourceMessageId,
      diaryIntakeRun: {
        id,
        leaseToken,
        reply,
        positionIds: result.draft.records.map((row) => row.positionId),
        positions: context.positions
          .filter((position) =>
            result.draft.records.some((row) => row.positionId === position.id),
          )
          .map(({ id, code, name }) => ({ id, code, name })),
      },
    });
    if (!saved.ok) throw new Error("INTAKE_SAVE_FAILED");
    steps.push({ name: "finished", at: new Date().toISOString() });
    await prisma.constructionDiaryReviewRun
      .updateMany({
        where: { id, leaseToken, status: "completed" },
        data: {
          metrics: json({
            ...metrics,
            steps,
            currentTool: "finished",
            durationMs: Date.now() - started,
          }),
        },
      })
      .catch(() => {});
    return reply;
  } catch (error) {
    const errorCode =
      error instanceof Error && /^INTAKE_[A-Z_]+$/.test(error.message)
        ? error.message
        : "INTAKE_EXECUTION_FAILED";
    await prisma.constructionDiaryReviewRun
      .updateMany({
        where: { id, leaseToken, status: "running" },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errorCode,
          metrics: json({
            ...metrics,
            steps,
            durationMs: Date.now() - started,
          }),
        },
      })
      .catch(() => {});
    return failureReply;
  }
}
