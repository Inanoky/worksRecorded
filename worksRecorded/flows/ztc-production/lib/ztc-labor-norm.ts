export const ZTC_LABOR_NORM_HOURS_PER_UNIT_KEY = "ztcLaborNormHoursPerUnit";
export const ZTC_LABOR_NORM_UNIT_KEY = "ztcLaborNormUnit";

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function normalizeZtcLaborNorm(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? normalized : undefined;
}

export function parseZtcLaborNormNumber(value: unknown) {
  const normalized = normalizeZtcLaborNorm(value);
  if (normalized === null || normalized === undefined) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function attachZtcLaborNormToMetadata(
  metadataValue: unknown,
  laborNorm: unknown,
  unit: string | null | undefined = "m2",
) {
  const parsedLaborNorm = parseZtcLaborNormNumber(laborNorm);
  if (parsedLaborNorm == null) {
    const existing = String(metadataValue ?? "").trim();
    return existing || null;
  }

  const metadata = parseJsonObject(metadataValue) ?? {};
  return JSON.stringify({
    ...metadata,
    [ZTC_LABOR_NORM_HOURS_PER_UNIT_KEY]: parsedLaborNorm,
    [ZTC_LABOR_NORM_UNIT_KEY]: String(unit ?? "m2").trim() || "m2",
  });
}

export function readZtcLaborNormFromMetadata(metadataValue: unknown) {
  const metadata = parseJsonObject(metadataValue);
  if (!metadata) {
    return {
      plannedHoursPerUnit: null as number | null,
      unit: null as string | null,
    };
  }

  return {
    plannedHoursPerUnit: parseZtcLaborNormNumber(
      metadata[ZTC_LABOR_NORM_HOURS_PER_UNIT_KEY],
    ),
    unit: String(metadata[ZTC_LABOR_NORM_UNIT_KEY] ?? "").trim() || null,
  };
}
