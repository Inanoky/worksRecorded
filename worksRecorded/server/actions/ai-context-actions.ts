"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { hasAiContextAccess } from "@/lib/utils/ai-context-access";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import {
  buildDashboardContextInspection,
  inspectCheckpointShape,
} from "@/server/ai-flows/ai-context-inspection";
import {
  buildAiContextThreadCandidates,
  type AiContextThreadCandidate,
} from "@/server/ai-flows/ai-context-thread-candidates";
import { systemPrompt as dashboardSystemPrompt } from "@/server/ai-flows/agents/orchestrating-agent-v2/prompts";

type RawCheckpointSummary = {
  threadId: string;
  checkpointCount: number | bigint | null;
  writeCount: number | bigint | null;
  blobCount: number | bigint | null;
  latestCheckpointId: string | null;
  latestCheckpointTs: string | null;
  latestMetadata: unknown;
};

type RawLatestCheckpointInspection = {
  checkpointId: string;
  checkpointTs: string | null;
  metadata: unknown;
  checkpoint: unknown;
};

type RawCheckpointWriteInspection = {
  writeCount: number | bigint | null;
  writeBytes: number | bigint | null;
  largestWriteBytes: number | bigint | null;
};

function toNumber(value: number | bigint | null | undefined) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return 0;
}

function getLangSmithProjectUrl() {
  return "https://smith.langchain.com/";
}

async function requireSiteAccess(siteId: string) {
  const user = await requireUser();
  if (!hasAiContextAccess(user.id)) notFound();

  const site =
    user.id === process.env.SUPERADMIN
      ? await prisma.site.findUnique({ where: { id: siteId } })
      : await orgCheck(user.id, siteId);
  if (!site) notFound();

  return { user, site };
}

async function getThreadCandidates(
  siteId: string,
  userId: string,
): Promise<AiContextThreadCandidate[]> {
  const workers = await prisma.workers.findMany({
    where: { siteId },
    select: { id: true, name: true, surname: true, phone: true },
    orderBy: [{ name: "asc" }, { surname: "asc" }],
  });

  return buildAiContextThreadCandidates(siteId, userId, workers);
}

async function getCheckpointSummaries(threadIds: string[]) {
  if (threadIds.length === 0) return new Map<string, RawCheckpointSummary>();

  const rows = await prisma.$queryRaw<RawCheckpointSummary[]>(Prisma.sql`
    WITH requested(thread_id) AS (
      VALUES ${Prisma.join(threadIds.map((threadId) => Prisma.sql`(${threadId})`))}
    ),
    checkpoint_counts AS (
      SELECT thread_id, COUNT(*)::int AS checkpoint_count
      FROM "checkpoints"
      WHERE thread_id IN (SELECT thread_id FROM requested)
      GROUP BY thread_id
    ),
    write_counts AS (
      SELECT thread_id, COUNT(*)::int AS write_count
      FROM "checkpoint_writes"
      WHERE thread_id IN (SELECT thread_id FROM requested)
      GROUP BY thread_id
    ),
    blob_counts AS (
      SELECT thread_id, COUNT(*)::int AS blob_count
      FROM "checkpoint_blobs"
      WHERE thread_id IN (SELECT thread_id FROM requested)
      GROUP BY thread_id
    ),
    latest AS (
      SELECT DISTINCT ON (thread_id)
        thread_id,
        checkpoint_id,
        checkpoint->>'ts' AS checkpoint_ts,
        metadata
      FROM "checkpoints"
      WHERE thread_id IN (SELECT thread_id FROM requested)
      ORDER BY thread_id, COALESCE(checkpoint->>'ts', '') DESC, checkpoint_id DESC
    )
    SELECT
      requested.thread_id AS "threadId",
      COALESCE(checkpoint_counts.checkpoint_count, 0) AS "checkpointCount",
      COALESCE(write_counts.write_count, 0) AS "writeCount",
      COALESCE(blob_counts.blob_count, 0) AS "blobCount",
      latest.checkpoint_id AS "latestCheckpointId",
      latest.checkpoint_ts AS "latestCheckpointTs",
      latest.metadata AS "latestMetadata"
    FROM requested
    LEFT JOIN checkpoint_counts ON checkpoint_counts.thread_id = requested.thread_id
    LEFT JOIN write_counts ON write_counts.thread_id = requested.thread_id
    LEFT JOIN blob_counts ON blob_counts.thread_id = requested.thread_id
    LEFT JOIN latest ON latest.thread_id = requested.thread_id
  `);

  return new Map(rows.map((row) => [row.threadId, row]));
}

export async function getAiContextDiagnostics(siteId: string) {
  const { user, site } = await requireSiteAccess(siteId);
  const [dbUser, candidates] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { lastSelectedSiteIdforWhatsapp: true, role: true, email: true },
    }),
    getThreadCandidates(siteId, user.id),
  ]);

  const summaryByThreadId = await getCheckpointSummaries(candidates.map((candidate) => candidate.id));

  return {
    site,
    user: {
      id: user.id,
      email: dbUser?.email ?? user.email ?? null,
      role: dbUser?.role ?? null,
      lastSelectedSiteIdforWhatsapp: dbUser?.lastSelectedSiteIdforWhatsapp ?? null,
    },
    langSmith: {
      enabled: process.env.LANGSMITH_TRACING === "true" || process.env.LANGCHAIN_TRACING_V2 === "true",
      project: process.env.LANGSMITH_PROJECT ?? process.env.LANGCHAIN_PROJECT ?? null,
      endpoint: process.env.LANGSMITH_ENDPOINT ?? null,
      url: getLangSmithProjectUrl(),
    },
    threads: candidates.map((candidate) => {
      const summary = summaryByThreadId.get(candidate.id);
      return {
        ...candidate,
        checkpointCount: toNumber(summary?.checkpointCount),
        writeCount: toNumber(summary?.writeCount),
        blobCount: toNumber(summary?.blobCount),
        latestCheckpointId: summary?.latestCheckpointId ?? null,
        latestCheckpointTs: summary?.latestCheckpointTs ?? null,
        latestMetadata: summary?.latestMetadata ?? null,
      };
    }),
  };
}

export async function getDashboardAiContextInspection(siteId: string, threadId: string) {
  if (!siteId || !threadId) {
    throw new Error("Missing siteId or threadId.");
  }

  const { user } = await requireSiteAccess(siteId);
  const candidates = await getThreadCandidates(siteId, user.id);
  const thread = candidates.find(
    (candidate) => candidate.id === threadId && candidate.flowName === "dashboard-chat",
  );

  if (!thread) {
    throw new Error("This dashboard checkpoint thread is not inspectable for the current project.");
  }

  const summaryByThreadId = await getCheckpointSummaries([threadId]);
  const summary = summaryByThreadId.get(threadId);

  const [latestCheckpoint] = await prisma.$queryRaw<RawLatestCheckpointInspection[]>(Prisma.sql`
    SELECT
      checkpoint_id AS "checkpointId",
      checkpoint->>'ts' AS "checkpointTs",
      metadata,
      checkpoint
    FROM "checkpoints"
    WHERE thread_id = ${threadId}
    ORDER BY COALESCE(checkpoint->>'ts', '') DESC, checkpoint_id DESC
    LIMIT 1
  `);

  const [writeInspection] = await prisma.$queryRaw<RawCheckpointWriteInspection[]>(Prisma.sql`
    SELECT
      COUNT(*)::int AS "writeCount",
      COALESCE(SUM(octet_length(blob)), 0)::int AS "writeBytes",
      COALESCE(MAX(octet_length(blob)), 0)::int AS "largestWriteBytes"
    FROM "checkpoint_writes"
    WHERE thread_id = ${threadId}
  `);

  const checkpointShape = inspectCheckpointShape(latestCheckpoint?.checkpoint ?? null);

  return buildDashboardContextInspection({
    threadId,
    policy: thread.contextPolicy,
    checkpointCount: toNumber(summary?.checkpointCount),
    writeCount: toNumber(summary?.writeCount ?? writeInspection?.writeCount),
    blobCount: toNumber(summary?.blobCount),
    latestCheckpointId: latestCheckpoint?.checkpointId ?? summary?.latestCheckpointId ?? null,
    latestCheckpointTs: latestCheckpoint?.checkpointTs ?? summary?.latestCheckpointTs ?? null,
    latestMetadata: latestCheckpoint?.metadata ?? summary?.latestMetadata ?? null,
    checkpointChars: checkpointShape.chars,
    checkpointMessageCount: checkpointShape.messageCount,
    checkpointSystemMessageCount: checkpointShape.systemMessageCount,
    checkpointToolMessageCount: checkpointShape.toolMessageCount,
    checkpointLargestToolMessageChars: checkpointShape.largestToolMessageChars,
    writeBytes: toNumber(writeInspection?.writeBytes),
    largestWriteBytes: toNumber(writeInspection?.largestWriteBytes),
    systemPrompt: dashboardSystemPrompt(siteId, user.id),
  });
}

export async function resetAiCheckpointThreadAction(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const threadId = String(formData.get("threadId") ?? "");

  if (!siteId || !threadId) {
    throw new Error("Missing siteId or threadId.");
  }

  const { user } = await requireSiteAccess(siteId);
  const candidates = await getThreadCandidates(siteId, user.id);
  const allowedThread = candidates.find((candidate) => candidate.id === threadId && candidate.resettable);

  if (!allowedThread) {
    throw new Error("This checkpoint thread is not resettable for the current project.");
  }

  await prisma.$transaction([
    prisma.$executeRaw(Prisma.sql`DELETE FROM "checkpoint_writes" WHERE thread_id = ${threadId}`),
    prisma.$executeRaw(Prisma.sql`DELETE FROM "checkpoint_blobs" WHERE thread_id = ${threadId}`),
    prisma.$executeRaw(Prisma.sql`DELETE FROM "checkpoints" WHERE thread_id = ${threadId}`),
  ]);

  revalidatePath(`/dashboard/sites/${siteId}/ai-context`);
}
