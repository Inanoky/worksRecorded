import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import {
  DIARY_REVIEW_PILOT_KEY,
  normalizeDiaryReviewPhone,
} from "./diary-review-pilot";
import {
  DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY,
  normalizeDefaultConstructionForma2State,
} from "./forma2-analytics";
import { syncDefaultConstructionForma2WorkOptions } from "./forma2-work-options-sync";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? structuredClone(value as Record<string, unknown>)
    : {};
}

export function prepareForma2TemplateCopy(args: {
  sourceSiteId: string;
  sourceRoot: unknown;
  targetRoot: unknown;
  targetConfig: unknown;
  documentId: string;
  copiedAt: string;
  pilotPhone: string;
  pilotUserId: string;
}) {
  const source = normalizeDefaultConstructionForma2State(
    object(args.sourceRoot)[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY],
  );
  if (!source.document?.positions.length)
    throw new Error("Avota projektā nav Forma2 pozīciju.");
  const root = object(args.targetRoot);
  const target = normalizeDefaultConstructionForma2State(
    root[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY],
  );
  if (
    target.document ||
    target.allocations.length ||
    target.materialRules.length
  )
    throw new Error(
      "Mērķa projektā jau ir Forma2 dati; tie netiks pārrakstīti.",
    );
  const phone = normalizeDiaryReviewPhone(args.pilotPhone);
  if (!phone || !args.pilotUserId) throw new Error("Nederīgs pilota sūtītājs.");
  const document = {
    ...source.document,
    id: args.documentId,
    importedAt: args.copiedAt,
  };
  root[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY] = {
    version: 1,
    document,
    allocations: [],
    materialRules: [],
  };
  root.forma2TemplateCopy = {
    sourceSiteId: args.sourceSiteId,
    sourceDocumentId: source.document.id,
    copiedAt: args.copiedAt,
  };
  const sync = syncDefaultConstructionForma2WorkOptions({
    config:
      args.targetConfig && typeof args.targetConfig === "object"
        ? object(args.targetConfig)
        : structuredClone(defaultConfig),
    documentId: args.documentId,
    positions: document.positions,
  });
  sync.config.otherSettings = {
    ...sync.config.otherSettings,
    [DIARY_REVIEW_PILOT_KEY]: {
      enabled: true,
      allowedSenderPhones: [phone],
      allowedUserIds: [args.pilotUserId],
    },
  };
  return {
    root,
    config: sync.config,
    positions: document.positions.length,
    importedWorks: sync.importedWorks,
  };
}
