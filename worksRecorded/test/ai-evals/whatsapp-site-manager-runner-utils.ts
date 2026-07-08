import type { SavedSiteDiaryRecord } from "./whatsapp-site-manager-validators";

type StructuredSaveTraceWithPersistedRecords = {
  persistedRecords?: Array<SavedSiteDiaryRecord | Record<string, unknown>> | null;
};

const WHATSAPP_SITE_MANAGER_EVAL_THREAD_PREFIX = "eval:whatsapp-site-manager:";

export async function cleanupWhatsappSiteManagerEvalCheckpointThread(
  threadId: string,
  deleteThread: (threadId: string) => Promise<unknown>,
) {
  if (!threadId.startsWith(WHATSAPP_SITE_MANAGER_EVAL_THREAD_PREFIX)) {
    throw new Error(
      `Refusing to delete non-eval WhatsApp site-manager checkpoint thread: ${threadId}`,
    );
  }

  await deleteThread(threadId);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function createdAtMs(record: Pick<SavedSiteDiaryRecord, "createdAt">) {
  return new Date(record.createdAt).getTime();
}

export function selectNewestEvalRecord<T extends Pick<SavedSiteDiaryRecord, "createdAt">>(
  records: T[],
) {
  return (
    [...records].sort((left, right) => createdAtMs(right) - createdAtMs(left))[0] ?? null
  );
}

export function getPersistedEvalRecordsFromTrace(
  traceEntries: StructuredSaveTraceWithPersistedRecords[],
) {
  return traceEntries.flatMap((entry) => entry.persistedRecords ?? []) as SavedSiteDiaryRecord[];
}

export function selectRecordsForWhatsappEval(args: {
  traceEntries: StructuredSaveTraceWithPersistedRecords[];
  fallbackRecords: SavedSiteDiaryRecord[];
}) {
  const persistedRecords = getPersistedEvalRecordsFromTrace(args.traceEntries);
  return persistedRecords.length > 0 ? persistedRecords : args.fallbackRecords;
}

export function hasWhatsappSiteManagerEvalMetadata(
  record: Pick<SavedSiteDiaryRecord, "evalMetadata">,
  args: { runId?: string; caseId?: string } = {},
) {
  const metadata = asRecord(record.evalMetadata);
  if (!metadata) return false;

  if (metadata.isEval !== true) return false;
  if (metadata.flow !== "whatsapp-site-manager") return false;
  if (args.runId && metadata.runId !== args.runId) return false;
  if (args.caseId && metadata.caseId !== args.caseId) return false;

  return true;
}
