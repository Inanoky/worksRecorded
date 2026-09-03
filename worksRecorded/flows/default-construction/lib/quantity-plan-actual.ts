export const DEFAULT_CONSTRUCTION_QUANTITY_PROFILE_KEY =
  "defaultConstructionQuantityPlanActual";

export const DEFAULT_CONSTRUCTION_PLANNED_QUANTITY_FIELD = "Amounts";
export const DEFAULT_CONSTRUCTION_ACTUAL_QUANTITY_FIELD = "Comments_Custom_1";

export type DefaultConstructionQuantityComparisonStatus =
  "over-plan" | "under-plan" | "on-plan" | "unknown";

type ConfigMap = Record<string, any>;
type QuantityRecord = Record<string, unknown>;

const MAX_QUANTITY = 1_000_000_000;

function cloneConfig(config: ConfigMap) {
  return JSON.parse(JSON.stringify(config)) as ConfigMap;
}

export function hasDefaultConstructionQuantityProfile(
  config: ConfigMap | null | undefined,
) {
  return (
    config?.otherSettings?.[DEFAULT_CONSTRUCTION_QUANTITY_PROFILE_KEY]
      ?.enabled === true
  );
}

export function enableDefaultConstructionQuantityProfile(config: ConfigMap) {
  const next = cloneConfig(config);

  next.otherSettings = {
    ...(next.otherSettings ?? {}),
    [DEFAULT_CONSTRUCTION_QUANTITY_PROFILE_KEY]: { enabled: true },
  };

  return next;
}

export function applyDefaultConstructionQuantityProfile(config: ConfigMap) {
  if (!hasDefaultConstructionQuantityProfile(config)) return config;

  const next = cloneConfig(config);
  const plannedField = next[DEFAULT_CONSTRUCTION_PLANNED_QUANTITY_FIELD] ?? {};
  const actualField = next[DEFAULT_CONSTRUCTION_ACTUAL_QUANTITY_FIELD] ?? {};

  next[DEFAULT_CONSTRUCTION_PLANNED_QUANTITY_FIELD] = {
    ...plannedField,
    DisplayName: "Daudzums (plāns)",
    customSettings: {
      ...(plannedField.customSettings ?? {}),
      semanticRole: "plannedQuantity",
      forceDisplayName: true,
      order: 5,
      displayinSiteListOrder: 4,
      displayinSiteListWidth: 110,
    },
  };

  next[DEFAULT_CONSTRUCTION_ACTUAL_QUANTITY_FIELD] = {
    ...actualField,
    Type: "float",
    DisplayName: "Daudzums (fakts)",
    customSettings: {
      ...(actualField.customSettings ?? {}),
      aiDescription:
        "Actual completed quantity for this specific diary record. Leave null when no completed quantity is stated.",
      semanticRole: "actualQuantity",
      forceDisplayName: true,
      order: 6,
      cellWidth: 110,
      displayinSiteList: "yes",
      displayinSiteListOrder: 5,
      displayinSiteListWidth: 110,
      displayinSiteListTextAlignment: "center",
    },
  };

  for (const [field, order, displayOrder] of [
    ["WorkersInvolved", 7, 6],
    ["TimeInvolved", 8, 7],
    ["Comments", 10, 8],
  ] as const) {
    if (!next[field]) continue;
    next[field] = {
      ...next[field],
      customSettings: {
        ...(next[field].customSettings ?? {}),
        order,
        displayinSiteListOrder: displayOrder,
      },
    };
  }

  return next;
}

export function parseDefaultConstructionQuantity(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const normalized =
    typeof value === "string" ? value.trim().replace(",", ".") : value;
  if (normalized === "") return null;
  const quantity =
    typeof normalized === "number" ? normalized : Number(normalized);
  return Number.isFinite(quantity) ? quantity : null;
}

export function normalizeActualQuantityForStorage(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const quantity = parseDefaultConstructionQuantity(value);
  if (quantity === null || quantity < 0 || quantity > MAX_QUANTITY) {
    throw new Error(
      `Faktiskajam daudzumam jābūt skaitlim no 0 līdz ${MAX_QUANTITY}.`,
    );
  }
  return String(quantity);
}

export function getDefaultConstructionQuantityComparison(
  record: QuantityRecord,
  config: ConfigMap | null | undefined,
) {
  const enabled = hasDefaultConstructionQuantityProfile(config);
  const plannedAmount = enabled
    ? parseDefaultConstructionQuantity(
        record[DEFAULT_CONSTRUCTION_PLANNED_QUANTITY_FIELD],
      )
    : null;
  const actualAmount = enabled
    ? parseDefaultConstructionQuantity(
        record[DEFAULT_CONSTRUCTION_ACTUAL_QUANTITY_FIELD],
      )
    : null;

  let status: DefaultConstructionQuantityComparisonStatus = "unknown";
  if (plannedAmount !== null && actualAmount !== null) {
    if (actualAmount > plannedAmount) status = "over-plan";
    else if (actualAmount < plannedAmount) status = "under-plan";
    else status = "on-plan";
  }

  return { enabled, plannedAmount, actualAmount, status };
}

export function getDefaultConstructionQuantityToneClass(
  status: DefaultConstructionQuantityComparisonStatus,
) {
  if (status === "over-plan") {
    return "border-red-300 bg-red-50/80 hover:bg-red-100/70 dark:border-red-900 dark:bg-red-950/30";
  }
  if (status === "under-plan") {
    return "border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/70 dark:border-emerald-900 dark:bg-emerald-950/30";
  }
  return "";
}

export function getDefaultConstructionQuantityStatusLabel(
  status: DefaultConstructionQuantityComparisonStatus,
  language?: string | null,
) {
  const isLatvian = String(language ?? "")
    .toLowerCase()
    .startsWith("lv");
  if (status === "over-plan") return isLatvian ? "Virs plāna" : "Over plan";
  if (status === "under-plan") return isLatvian ? "Zem plāna" : "Under plan";
  if (status === "on-plan") return isLatvian ? "Atbilst plānam" : "On plan";
  return null;
}

export function isDefaultConstructionActualQuantityField(
  config: ConfigMap | null | undefined,
  field: string,
) {
  return (
    hasDefaultConstructionQuantityProfile(config) &&
    field === DEFAULT_CONSTRUCTION_ACTUAL_QUANTITY_FIELD
  );
}

export function formatDefaultConstructionQuantityRowsForExcel(
  rows: QuantityRecord[],
  config: ConfigMap | null | undefined,
  language?: string | null,
) {
  if (!hasDefaultConstructionQuantityProfile(config)) return rows;
  const isLatvian = String(language ?? "")
    .toLowerCase()
    .startsWith("lv");
  const plannedLabel = isLatvian ? "Daudzums (plāns)" : "Quantity (plan)";
  const actualLabel = isLatvian ? "Daudzums (fakts)" : "Quantity (actual)";
  const statusLabel = isLatvian ? "Plāna statuss" : "Plan status";

  return rows.map((row) => {
    const comparison = getDefaultConstructionQuantityComparison(row, config);
    const formatted: QuantityRecord = {};

    for (const [key, value] of Object.entries(row)) {
      if (key === DEFAULT_CONSTRUCTION_PLANNED_QUANTITY_FIELD) continue;
      if (key === DEFAULT_CONSTRUCTION_ACTUAL_QUANTITY_FIELD) {
        formatted[plannedLabel] = comparison.plannedAmount;
        formatted[actualLabel] = comparison.actualAmount;
        formatted[statusLabel] =
          getDefaultConstructionQuantityStatusLabel(
            comparison.status,
            language,
          ) ?? "";
        continue;
      }
      formatted[key] = value;
    }

    return formatted;
  });
}
