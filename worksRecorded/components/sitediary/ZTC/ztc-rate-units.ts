export const ZTC_RATE_UNITS = ["m2", "gab", "kg", "t.m.", "m3", "tn", "st"] as const;

export type ZtcRateUnit = (typeof ZTC_RATE_UNITS)[number];

export function normalizeZtcRateUnit(
  value: unknown,
  fallback: ZtcRateUnit,
): ZtcRateUnit {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ZTC_RATE_UNITS.find((unit) => unit.toLowerCase() === normalized) ?? fallback;
}

export function resolveZtcAdditionalWorkUnit(args: {
  configuredUnit?: unknown;
  reportedUnit?: unknown;
}): ZtcRateUnit {
  const reportedUnit = normalizeZtcRateUnit(args.reportedUnit, "st");
  return normalizeZtcRateUnit(args.configuredUnit, reportedUnit);
}
