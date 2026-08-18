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
  const primary = stem.length >= 4 ? stem : normalized;
  return primary === "gkf" ? [primary, "gkfi"] : [primary];
}

function stripZtcDrawingWorkCode(value: string) {
  return normalizeZtcRateTaskName(value).replace(
    /^(?:(?:r[1-5]\/t[1-5])|(?:l[1-5](?:\/b[1-5])?)|tl|l0|(?:[a-z]{1,4}\d+(?:\/[a-z]{1,4}\d+)?))\s*[-:/]?\s*/i,
    "",
  );
}

function getZtcDrawingWorkCode(value: string) {
  const match = normalizeZtcRateTaskName(value).match(
    /^((?:r[1-5]\/t[1-5])|(?:l[1-5](?:\/b[1-5])?)|tl|l0|(?:[a-z]{1,4}\d+(?:\/[a-z]{1,4}\d+)?))(?=\s*[-:/])/i,
  );
  return match?.[1] ?? null;
}

function ztcRateNumberTokens(value: string) {
  return new Set(
    Array.from(stripZtcDrawingWorkCode(value).matchAll(/\d+(?:[.,]\d+)?/g), (match) =>
      String(Number(match[0].replace(",", "."))),
    ),
  );
}

function isKnownZtcRateAlias(taskName: string, rateTask: string) {
  const normalizedTask = stripZtcDrawingWorkCode(taskName)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const normalizedRate = stripZtcDrawingWorkCode(rateTask)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const isParoc245Alias =
    /\bparoc\b.*\bultra\b/.test(normalizedTask) &&
    /\b245\s*mm\b/.test(normalizedTask) &&
    /\bparoc\b.*\bultra\b/.test(normalizedRate) &&
    /\b150\s*mm\b/.test(normalizedRate);
  const isKts95Alias =
    /\bgipskarton\w*\b/.test(normalizedTask) &&
    /\b9[.,]5\b/.test(normalizedTask) &&
    /\bkts\b/.test(normalizedTask) &&
    /\bgipskarton\w*\b/.test(normalizedRate) &&
    /\bgkfi\s*12[.,]?5\b/.test(normalizedRate);

  return isParoc245Alias || isKts95Alias;
}

export function canonicalizeZtcMatchedWorkName(
  extractedWork: string,
  matchedRateTask: string,
) {
  const canonicalTask = stripZtcDrawingWorkCode(matchedRateTask).trim();
  if (!canonicalTask) return normalizeZtcRateTaskName(extractedWork).trim();

  const workCode = getZtcDrawingWorkCode(extractedWork);
  return workCode ? `${workCode} - ${canonicalTask}` : canonicalTask;
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

export type ZtcRateCrossSectionMatch = {
  kind: "not_applicable" | "exact" | "compatible" | "incompatible";
  distance: number | null;
};

function normalizeCrossSectionDimension(value: string, unit: string) {
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return null;

  const normalizedUnit = unit.toLowerCase();
  const millimeters =
    normalizedUnit === "m"
      ? number * 1000
      : normalizedUnit === "cm"
        ? number * 10
        : number;
  return Number(millimeters.toFixed(3));
}

function getZtcRateCrossSection(value: string) {
  const match = normalizeZtcRateTaskName(value).match(
    /\b(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\s*[x×х*]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\b/i,
  );
  if (!match) return null;

  const firstUnit = match[2] || match[4] || "mm";
  const secondUnit = match[4] || match[2] || "mm";
  const dimensions = [
    normalizeCrossSectionDimension(match[1], firstUnit),
    normalizeCrossSectionDimension(match[3], secondUnit),
  ];
  if (dimensions.some((dimension) => dimension == null)) return null;

  return (dimensions as number[]).sort((left, right) => left - right);
}

export function hasZtcRateCrossSection(value: unknown) {
  return Boolean(getZtcRateCrossSection(String(value ?? "")));
}

export function getZtcRateCrossSectionMatch(
  taskName: string,
  rateTask: string,
): ZtcRateCrossSectionMatch {
  const taskDimensions = getZtcRateCrossSection(taskName);
  const rateDimensions = getZtcRateCrossSection(rateTask);

  if (!taskDimensions && !rateDimensions) {
    return { kind: "not_applicable", distance: null };
  }
  if (taskDimensions && !rateDimensions) {
    return { kind: "not_applicable", distance: null };
  }
  if (!taskDimensions && rateDimensions) {
    return { kind: "incompatible", distance: null };
  }

  const distance = taskDimensions.reduce(
    (sum, dimension, index) => sum + Math.abs(dimension - rateDimensions[index]),
    0,
  );
  if (distance === 0) return { kind: "exact", distance: 0 };

  const hasSharedDimension = taskDimensions.some((taskDimension) =>
    rateDimensions.some(
      (rateDimension) => Math.abs(taskDimension - rateDimension) < 0.001,
    ),
  );
  return hasSharedDimension
    ? { kind: "compatible", distance }
    : { kind: "incompatible", distance };
}

export function ztcRateMatchTokens(value: string) {
  const normalized = normalizeZtcRateTaskName(value);
  const normalizedSearchText = normalized
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const tokens = stripZtcDrawingWorkCode(normalizedSearchText)
    .replace(/([a-z])(?=\d)/gi, "$1 ")
    .replace(/(\d)(?=[a-z])/gi, "$1 ")
    .split(/[^a-z0-9]+/i)
    .flatMap(rateTokenVariants);

  if (
    /\bblue\b/i.test(normalizedSearchText) &&
    /\bgk(?:fi?|l)(?:\d|\b)/i.test(normalizedSearchText)
  ) {
    tokens.push("gipskarton", "plaksn", "gkfi");
  }
  if (/\b9[.,]5\b/.test(normalizedSearchText) && /\bkts\b/i.test(normalizedSearchText)) {
    tokens.push("gkfi");
  }

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
  const taskNumbers = ztcRateNumberTokens(taskName);
  const taskHasCrossSection = hasZtcRateCrossSection(taskName);

  let best: {
    entry: ZtcDefaultTaskRate;
    score: number;
    crossSectionRank: number;
    crossSectionDistance: number;
  } | null = null;

  for (const entry of rates) {
    if (isZtcComplexityCoefficientTask(entry.task)) continue;
    const rateTokens = new Set(ztcRateMatchTokens(entry.task));
    if (!rateTokens.size) continue;
    const rateDimensions = ztcRateDimensionTokens(entry.task);
    const rateNumbers = ztcRateNumberTokens(entry.task);
    const crossSectionMatch =
      options.category === "additionalDetails" ||
      options.category === "additionalWorks"
        ? { kind: "not_applicable" as const, distance: null }
        : getZtcRateCrossSectionMatch(taskName, entry.task);
    if (crossSectionMatch.kind === "incompatible") continue;
    const matchingDimensions = [...rateDimensions].filter((token) => taskDimensions.has(token)).length;
    const hasDimensionMismatch =
      rateDimensions.size > 0 &&
      taskDimensions.size > 0 &&
      matchingDimensions === 0;
    const hasNumberMismatch =
      rateNumbers.size > 0 &&
      taskNumbers.size > 0 &&
      ![...rateNumbers].some((token) => taskNumbers.has(token));

    if (hasNumberMismatch && !isKnownZtcRateAlias(taskName, entry.task)) {
      continue;
    }

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
    const crossSectionRank =
      crossSectionMatch.kind === "exact"
        ? 3
        : taskHasCrossSection && !hasZtcRateCrossSection(entry.task)
          ? 2
        : crossSectionMatch.kind === "compatible"
          ? 1
          : 0;
    const crossSectionDistance = crossSectionMatch.distance ?? 0;
    const isBetterMatch =
      !best ||
      crossSectionRank > best.crossSectionRank ||
      (crossSectionRank === best.crossSectionRank &&
        crossSectionDistance < best.crossSectionDistance) ||
      (crossSectionRank === best.crossSectionRank &&
        crossSectionDistance === best.crossSectionDistance &&
        score > best.score);
    if (score >= threshold && isBetterMatch) {
      best = { entry, score, crossSectionRank, crossSectionDistance };
    }
  }

  return best ? { entry: best.entry, score: best.score } : null;
}
