import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";
import {
  DIARY_REVIEW_BATCH_SIZE,
  DIARY_REVIEW_LEASE_MS,
  diaryReviewEnabled,
  diaryReviewIds,
  diaryReviewProcessAfter,
  diaryReviewSiteIds,
} from "../lib/diary-review";
import {
  diaryReviewPilotAllowsSender,
  diaryReviewPilotAllowsUser,
  diaryReviewSourceWhere,
  getDiaryReviewPilot,
  normalizeDiaryReviewPhone,
} from "../lib/diary-review-pilot";
import { ProjectAccessError } from "../visual/project-access-error";
import { requireConstructionProjectAccess } from "./construction-project-access";

export async function prepareDiaryReviewScope(args: {
  siteId?: string;
  userId?: string;
  organizationId: string | null;
  isEval: boolean;
  senderPhone?: string | null;
  sourceMessageId?: string | null;
}) {
  if (
    !args.siteId ||
    !args.userId ||
    args.isEval ||
    !diaryReviewEnabled(args.siteId) ||
    !normalizeDiaryReviewPhone(args.senderPhone) ||
    !args.sourceMessageId
  )
    return null;
  try {
    const access = await requireConstructionProjectAccess(
      args.userId,
      args.siteId,
    );
    if (args.organizationId && access.organizationId !== args.organizationId)
      return null;
    const pilot = getDiaryReviewPilot(access.diaryConfig);
    if (!diaryReviewPilotAllowsSender(pilot, args.userId, args.senderPhone))
      return null;
    return {
      siteId: args.siteId,
      userId: args.userId,
      organizationId: access.organizationId,
      senderPhone: normalizeDiaryReviewPhone(args.senderPhone) as string,
      sourceMessageId: args.sourceMessageId,
    };
  } catch (error) {
    if (error instanceof ProjectAccessError) return null;
    throw error;
  }
}

export async function enqueueDiaryReview(
  tx: Prisma.TransactionClient,
  args: {
    siteId: string;
    userId: string;
    organizationId: string;
    recordIds: string[];
  },
  now = new Date(),
) {
  if (!diaryReviewEnabled(args.siteId) || !args.recordIds.length) return;
  const access = await requireConstructionProjectAccess(
    args.userId,
    args.siteId,
  );
  if (access.organizationId !== args.organizationId)
    throw new Error("REVIEW_TENANT_CHANGED");
  const pilot = getDiaryReviewPilot(access.diaryConfig);
  if (!pilot || !diaryReviewPilotAllowsUser(pilot, args.userId))
    throw new Error("REVIEW_PILOT_NOT_ALLOWED");
  const ids = [...new Set(args.recordIds)];
  const eligible = await tx.sitediaryrecords.findMany({
    where: {
      id: { in: ids },
      siteId: args.siteId,
      userId: args.userId,
      archivedAt: null,
      OR: [{ organizationId: args.organizationId }, { organizationId: null }],
      ...diaryReviewSourceWhere(pilot),
    },
    select: { id: true },
  });
  if (eligible.length !== ids.length)
    throw new Error("REVIEW_SOURCE_NOT_ALLOWED");
  await tx.constructionDiaryReviewQueue.upsert({
    where: { siteId_userId: { siteId: args.siteId, userId: args.userId } },
    create: {
      siteId: args.siteId,
      userId: args.userId,
      organizationId: args.organizationId,
    },
    update: { revision: { increment: 1 } },
  });
  const queue = await tx.constructionDiaryReviewQueue.findUniqueOrThrow({
    where: { siteId_userId: { siteId: args.siteId, userId: args.userId } },
  });
  const first = queue.firstReceivedAt ?? now;
  await tx.constructionDiaryReviewQueue.update({
    where: { id: queue.id },
    data: {
      organizationId: args.organizationId,
      recordIds: [
        ...new Set([...diaryReviewIds(queue.recordIds), ...args.recordIds]),
      ],
      firstReceivedAt: first,
      lastReceivedAt: now,
      processAfter: diaryReviewProcessAfter(first, now),
      failures: 0,
    },
  });
}

export async function diaryReviewTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      });
    } catch (error) {
      if (
        attempt >= 2 ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034"
      )
        throw error;
    }
  }
}

export async function claimDiaryReview(now = new Date()) {
  const sites = diaryReviewSiteIds();
  return diaryReviewTransaction(async (tx) => {
    const queue = await tx.constructionDiaryReviewQueue.findFirst({
      where: {
        ...(sites.length ? { siteId: { in: sites } } : {}),
        OR: [
          {
            processAfter: { lte: now },
            OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
          },
          { leaseUntil: { lte: now }, activeRunId: { not: null } },
        ],
      },
      orderBy: { processAfter: "asc" },
    });
    if (!queue) return null;
    const leaseToken = randomUUID();
    const acquired = await tx.constructionDiaryReviewQueue.updateMany({
      where: {
        id: queue.id,
        revision: queue.revision,
        leaseToken: queue.leaseToken,
      },
      data: {
        leaseToken,
        leaseUntil: new Date(now.getTime() + DIARY_REVIEW_LEASE_MS),
        revision: { increment: 1 },
      },
    });
    if (acquired.count !== 1) return null;
    let recovered: string[] = [];
    if (queue.activeRunId) {
      const previous = await tx.constructionDiaryReviewRun.findUnique({
        where: { id: queue.activeRunId },
      });
      if (previous?.status === "running") {
        recovered = diaryReviewIds(previous.recordIds);
        await tx.constructionDiaryReviewRun.update({
          where: { id: previous.id },
          data: {
            status: "failed",
            errorCode: "REVIEW_LEASE_EXPIRED",
            finishedAt: now,
          },
        });
      }
    }
    const pending = diaryReviewIds(queue.recordIds);
    const deferred =
      queue.processAfter && queue.processAfter > now ? pending : [];
    const ids = [
      ...new Set([...recovered, ...(deferred.length ? [] : pending)]),
    ];
    const failures = queue.failures + (recovered.length ? 1 : 0);
    if (!diaryReviewEnabled(queue.siteId) || failures >= 3 || !ids.length) {
      await tx.constructionDiaryReviewQueue.update({
        where: { id: queue.id },
        data: {
          leaseToken: null,
          leaseUntil: null,
          activeRunId: null,
          processAfter: null,
          recordIds: [...new Set([...ids, ...deferred])],
          failures,
        },
      });
      return null;
    }
    const run = await tx.constructionDiaryReviewRun.create({
      data: {
        queueId: queue.id,
        siteId: queue.siteId,
        userId: queue.userId,
        organizationId: queue.organizationId,
        leaseToken,
        recordIds: ids.slice(0, DIARY_REVIEW_BATCH_SIZE),
      },
    });
    const remaining = [
      ...new Set([...ids.slice(DIARY_REVIEW_BATCH_SIZE), ...deferred]),
    ];
    await tx.constructionDiaryReviewQueue.update({
      where: { id: queue.id },
      data: {
        activeRunId: run.id,
        recordIds: remaining,
        failures,
        processAfter: remaining.length
          ? deferred.length
            ? queue.processAfter
            : now
          : null,
        firstReceivedAt: remaining.length ? queue.firstReceivedAt : null,
      },
    });
    return run;
  });
}

export async function finishDiaryReview(args: {
  id: string;
  queueId: string;
  leaseToken: string;
  status: "waiting_approval" | "completed" | "failed";
  proposal?: Prisma.InputJsonValue;
  metrics?: Prisma.InputJsonValue;
  errorCode?: string;
  retryable?: boolean;
}) {
  return diaryReviewTransaction(async (tx) => {
    const queue = await tx.constructionDiaryReviewQueue.findUniqueOrThrow({
      where: { id: args.queueId },
    });
    if (
      queue.leaseToken !== args.leaseToken ||
      !queue.leaseUntil ||
      queue.leaseUntil <= new Date()
    )
      throw new Error("REVIEW_LEASE_LOST");
    const run = await tx.constructionDiaryReviewRun.findUniqueOrThrow({
      where: { id: args.id },
    });
    if (run.status !== "running" || run.leaseToken !== args.leaseToken)
      throw new Error("REVIEW_LEASE_LOST");
    const failed = args.status === "failed";
    const failures = failed
      ? args.retryable === false
        ? 3
        : queue.failures + 1
      : 0;
    const ids = diaryReviewIds(queue.recordIds);
    const pending = failed
      ? [...new Set([...diaryReviewIds(run.recordIds), ...ids])]
      : ids;
    await tx.constructionDiaryReviewRun.update({
      where: { id: args.id },
      data: {
        status: args.status,
        proposal: args.proposal,
        metrics: args.metrics,
        errorCode: args.errorCode,
        finishedAt: new Date(),
      },
    });
    await tx.constructionDiaryReviewQueue.update({
      where: { id: queue.id },
      data: {
        leaseToken: null,
        leaseUntil: null,
        activeRunId: null,
        recordIds: pending,
        failures,
        processAfter:
          pending.length && failures < 3
            ? (queue.processAfter ??
              new Date(Date.now() + (failed ? failures * 60_000 : 0)))
            : null,
        firstReceivedAt: pending.length
          ? (queue.firstReceivedAt ?? new Date())
          : null,
      },
    });
  });
}
