import { isZtcComplexityCoefficientTask } from "@/flows/ztc-production/lib/ztc-rate-constants";
import type { ZtcRateUnit } from "@/flows/ztc-production/lib/ztc-rate-units";

export type ZtcRateCategory = "works" | "additionalDetails" | "additionalWorks";

export type ZtcDefaultTaskRate = {
  task: string;
  rate: string;
  unit: ZtcRateUnit;
  laborNorm?: string | null;
  relatesToElement?: boolean;
};

const ZTC_RATE_STOP_WORDS = new Set([
  "papild",
  "papildus",
  "papilddetala",
  "papilddetalas",
  "detala",
  "detalas",
  "detalu",
  "detali",
  "gab",
  "gabals",
  "gabali",
  "mm",
  "cm",
  "m",
  "m2",
  "vieniba",
  "vienibas",
  "viens",
  "viena",
  "divi",
  "divas",
  "tris",
  "cetri",
  "cetras",
  "pieci",
]);

export function normalizeZtcRateTaskName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/^T\s*\d+(?=\s|[-/]|$)/i, "TL")
    .replace(/^T(?!L)(?=\s|[-/]|$)/i, "TL");
}

function normalizeRateToken(token: string) {
  const normalized = token
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    normalized.length < 2 ||
    /^\d+(?:[.,]\d+)?$/.test(normalized) ||
    ZTC_RATE_STOP_WORDS.has(normalized)
  ) {
    return "";
  }
  return normalized;
}

function rateTokenVariants(token: string) {
  const normalized = normalizeRateToken(token);
  if (!normalized) return [];
  const stem = normalized.replace(/(iem|am|us|as|es|is|ai|ei|am|em|i|a|e|u|s)$/i, "");
  return [stem.length >= 4 ? stem : normalized];
}

function normalizeDimensionToMm(value: string, unit: string) {
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return "";

  const normalizedUnit = unit.toLowerCase();
  const millimeters =
    normalizedUnit === "m"
      ? number * 1000
      : normalizedUnit === "cm"
        ? number * 10
        : number;

  return `mm:${Number(millimeters.toFixed(3))}`;
}

function ztcRateDimensionTokens(value: string) {
  const normalized = normalizeZtcRateTaskName(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const dimensions = new Set<string>();

  for (const match of normalized.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm|m)(?!\s*2\b)/gi)) {
    const dimension = normalizeDimensionToMm(match[1], match[2]);
    if (dimension) dimensions.add(dimension);
  }

  return dimensions;
}

export function ztcRateMatchTokens(value: string) {
  const normalized = normalizeZtcRateTaskName(value);
  const normalizedSearchText = normalized
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const tokens = normalizedSearchText
    .replace(/^(r[1-5]|tl|l[1-5])\s*[-:/]?\s*/i, "")
    .split(/[^a-z0-9]+/i)
    .flatMap(rateTokenVariants);

  if (/^tl(\b|\s*[-/:])/i.test(normalized)) {
    tokens.push("karkas", "karkass", "timber", "frame");
  }
  if (/\b(karkas\w*|timber|frame)\b/i.test(normalizedSearchText)) {
    tokens.push("tl", "karkas", "karkass");
  }

  return Array.from(new Set(tokens));
}

export function findZtcDefaultRateForTask(
  task: unknown,
  rates: ZtcDefaultTaskRate[],
  options: { category?: ZtcRateCategory } = {},
) {
  const taskName = String(task ?? "");
  const taskTokens = new Set(ztcRateMatchTokens(taskName));
  if (!taskTokens.size) return null;
  const taskDimensions = ztcRateDimensionTokens(taskName);

  let best: { entry: ZtcDefaultTaskRate; score: number } | null = null;

  for (const entry of rates) {
    if (isZtcComplexityCoefficientTask(entry.task)) continue;
    const rateTokens = new Set(ztcRateMatchTokens(entry.task));
    if (!rateTokens.size) continue;
    const rateDimensions = ztcRateDimensionTokens(entry.task);
    const matchingDimensions = [...rateDimensions].filter((token) => taskDimensions.has(token)).length;
    const hasDimensionMismatch =
      rateDimensions.size > 0 &&
      taskDimensions.size > 0 &&
      matchingDimensions === 0;

    const overlap = [...rateTokens].filter((token) => taskTokens.has(token)).length;
    const rawScore = overlap / Math.max(rateTokens.size, taskTokens.size);
    const rateCoverageScore = overlap / rateTokens.size;
    const exact =
      normalizeZtcRateTaskName(entry.task).toLowerCase() ===
      normalizeZtcRateTaskName(taskName).toLowerCase();
    const timberFrameTokens = ["tl", "karkas", "karkass", "timber", "frame"];
    const tlSemanticMatch =
      timberFrameTokens.some((token) => rateTokens.has(token)) &&
      timberFrameTokens.some((token) => taskTokens.has(token));
    const detailTokenMatch =
      options.category === "additionalDetails" &&
      [...rateTokens].some((token) => taskTokens.has(token));

    const baseScore = exact
      ? 1
      : tlSemanticMatch
        ? Math.max(rawScore, 0.8)
        : detailTokenMatch
          ? Math.max(rawScore, 0.55)
          : rateCoverageScore >= 0.75
          ? Math.max(rawScore, 0.7 + Math.min(overlap, 4) * 0.05)
          : rawScore;
    const score =
      matchingDimensions > 0
        ? Math.min(1, baseScore + 0.2)
        : hasDimensionMismatch
          ? baseScore * 0.65
          : baseScore;
    const threshold = options.category === "additionalDetails" ? 0.35 : 0.45;
    if (score >= threshold && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  return best;
}
