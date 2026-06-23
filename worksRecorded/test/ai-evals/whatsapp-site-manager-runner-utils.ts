import type { SavedSiteDiaryRecord } from "./whatsapp-site-manager-validators";

type StructuredSaveTraceWithPersistedRecords = {
  persistedRecords?: SavedSiteDiaryRecord[] | null;
};

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
  return traceEntries.flatMap((entry) => entry.persistedRecords ?? []);
}

export function selectRecordsForWhatsappEval(args: {
  traceEntries: StructuredSaveTraceWithPersistedRecords[];
  fallbackRecords: SavedSiteDiaryRecord[];
}) {
  const persistedRecords = getPersistedEvalRecordsFromTrace(args.traceEntries);
  return persistedRecords.length > 0 ? persistedRecords : args.fallbackRecords;
}
