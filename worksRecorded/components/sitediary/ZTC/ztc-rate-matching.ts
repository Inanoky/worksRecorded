import { isZtcComplexityCoefficientTask } from "@/components/sitediary/ZTC/ztc-rate-constants";
import type { ZtcRateUnit } from "@/components/sitediary/ZTC/ztc-rate-units";

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
  const taskTokens = new Set(ztcRateMatchTokens(String(task ?? "")));
  if (!taskTokens.size) return null;

  let best: { entry: ZtcDefaultTaskRate; score: number } | null = null;

  for (const entry of rates) {
    if (isZtcComplexityCoefficientTask(entry.task)) continue;
    const rateTokens = new Set(ztcRateMatchTokens(entry.task));
    if (!rateTokens.size) continue;

    const overlap = [...rateTokens].filter((token) => taskTokens.has(token)).length;
    const rawScore = overlap / Math.max(rateTokens.size, taskTokens.size);
    const rateCoverageScore = overlap / rateTokens.size;
    const exact =
      normalizeZtcRateTaskName(entry.task).toLowerCase() ===
      normalizeZtcRateTaskName(String(task ?? "")).toLowerCase();
    const timberFrameTokens = ["tl", "karkas", "karkass", "timber", "frame"];
    const tlSemanticMatch =
      timberFrameTokens.some((token) => rateTokens.has(token)) &&
      timberFrameTokens.some((token) => taskTokens.has(token));
    const detailTokenMatch =
      options.category === "additionalDetails" &&
      [...rateTokens].some((token) => taskTokens.has(token));

    const score = exact
      ? 1
      : tlSemanticMatch
        ? Math.max(rawScore, 0.8)
        : detailTokenMatch
          ? Math.max(rawScore, 0.55)
          : rateCoverageScore >= 0.75
            ? Math.max(rawScore, 0.7 + Math.min(overlap, 4) * 0.05)
            : rawScore;
    const threshold = options.category === "additionalDetails" ? 0.35 : 0.45;
    if (score >= threshold && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  return best;
}
