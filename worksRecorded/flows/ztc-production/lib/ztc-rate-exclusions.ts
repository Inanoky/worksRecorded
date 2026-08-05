import { isZtcComplexityCoefficientTask } from "@/flows/ztc-production/lib/ztc-rate-constants";

export const ZTC_RATE_CATEGORIES = [
  "works",
  "additionalDetails",
  "additionalWorks",
] as const;

export type ZtcRateCategory = (typeof ZTC_RATE_CATEGORIES)[number];

export type ZtcProjectRateExclusions = Partial<
  Record<ZtcRateCategory, string[]>
>;

export function normalizeZtcRateTaskKey(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("lv");
}

export function normalizeZtcProjectRateExclusions(
  value: unknown,
): ZtcProjectRateExclusions {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    ZTC_RATE_CATEGORIES.map((category) => {
      const seen = new Set<string>();
      const tasks = (Array.isArray(source[category]) ? source[category] : [])
        .map((task) => String(task ?? "").trim())
        .filter((task) => {
          const key = normalizeZtcRateTaskKey(task);
          if (
            !key ||
            seen.has(key) ||
            (category === "works" && isZtcComplexityCoefficientTask(task))
          ) {
            return false;
          }
          seen.add(key);
          return true;
        });
      return [category, tasks];
    }),
  ) as ZtcProjectRateExclusions;
}

export function getZtcExcludedRateTaskKeys(
  exclusions: ZtcProjectRateExclusions | null | undefined,
  category: ZtcRateCategory,
) {
  const normalizedExclusions = normalizeZtcProjectRateExclusions(exclusions);
  return new Set(
    (normalizedExclusions[category] ?? [])
      .map(normalizeZtcRateTaskKey)
      .filter(Boolean),
  );
}
