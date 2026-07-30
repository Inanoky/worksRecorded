export type SiteDiaryAiValidationWarningCode =
  | "amount_not_explicit"
  | "amount_zero_not_explicit"
  | "workers_not_explicit"
  | "workers_zero_not_explicit"
  | "hours_not_explicit"
  | "hours_zero_not_explicit";

export type SiteDiaryAiValidationWarning = {
  field: "Amounts" | "WorkersInvolved" | "TimeInvolved";
  code: SiteDiaryAiValidationWarningCode;
  value: number;
};

export type SiteDiaryAiRowValidationResult<Row extends Record<string, any>> = {
  row: Row;
  warnings: SiteDiaryAiValidationWarning[];
};

const NUMBER_PATTERN = String.raw`-?\d+(?:[.,]\d+)?`;
const AMOUNT_UNIT_PATTERN = String.raw`m2|m3|m²|m³|m|kg|tn|t|pcs|pc|gab\.?|gabali|gabals|pieces?|units?|set|komplekts|komplekti|package|pakas?|lifts?|pacelšanas?`;
const WORKER_WORD_PATTERN = String.raw`cilv[eē]ki|cilv[eē]ks|str[aā]dnieki|str[aā]dnieks|darbinieki|darbinieks|personas?|workers?|people|employees?`;
const HOUR_WORD_PATTERN = String.raw`h|hr|hrs|hours?|stundas?|st\.?`;

const WORD_NUMBERS = new Map<string, number>([
  ["nulle", 0],
  ["viens", 1],
  ["viena", 1],
  ["divi", 2],
  ["divas", 2],
  ["trīs", 3],
  ["tris", 3],
  ["četri", 4],
  ["cetri", 4],
  ["četras", 4],
  ["cetras", 4],
  ["pieci", 5],
  ["piecas", 5],
  ["seši", 6],
  ["sesi", 6],
  ["sešas", 6],
  ["sesas", 6],
  ["septiņi", 7],
  ["septini", 7],
  ["septiņas", 7],
  ["septinas", 7],
  ["astoņi", 8],
  ["astoni", 8],
  ["astoņas", 8],
  ["astonas", 8],
  ["deviņi", 9],
  ["devini", 9],
  ["deviņas", 9],
  ["devinas", 9],
  ["desmit", 10],
]);

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("lv-LV")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue =
    typeof value === "number"
      ? value
      : Number(String(value).trim().replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseNumber(value: string) {
  return Number(value.replace(",", "."));
}

function numbersMatch(left: number, right: number) {
  return Math.abs(left - right) < 0.01;
}

function explicitAmountValues(source: string) {
  const values: number[] = [];
  const regex = new RegExp(
    String.raw`(?:^|[^\p{L}\p{N}])(${NUMBER_PATTERN})\s*(?:${AMOUNT_UNIT_PATTERN})(?=$|[^\p{L}\p{N}])`,
    "giu",
  );

  for (const match of source.matchAll(regex)) {
    const value = parseNumber(match[1]);
    if (Number.isFinite(value)) values.push(value);
  }

  return values;
}

function explicitWorkerValues(source: string) {
  const values: number[] = [];
  const numericBefore = new RegExp(
    String.raw`(?:^|[^\p{L}\p{N}])(${NUMBER_PATTERN})\s*(?:${WORKER_WORD_PATTERN})(?=$|[^\p{L}\p{N}])`,
    "giu",
  );
  const numericAfter = new RegExp(
    String.raw`(?:${WORKER_WORD_PATTERN})\s*[:=-]?\s*(${NUMBER_PATTERN})(?=$|[^\p{L}\p{N}])`,
    "giu",
  );
  const wordBefore = new RegExp(
    String.raw`(?:^|[^\p{L}\p{N}])(${Array.from(WORD_NUMBERS.keys()).join("|")})\s+(?:${WORKER_WORD_PATTERN})(?=$|[^\p{L}\p{N}])`,
    "giu",
  );

  for (const regex of [numericBefore, numericAfter]) {
    for (const match of source.matchAll(regex)) {
      const value = parseNumber(match[1]);
      if (Number.isFinite(value)) values.push(value);
    }
  }

  for (const match of source.matchAll(wordBefore)) {
    const value = WORD_NUMBERS.get(match[1]);
    if (value !== undefined) values.push(value);
  }

  if (/\b(?:bez|nav)\s+(?:neviena\s+)?(?:cilv[eē]ka|str[aā]dnieka|darbinieka|personas|workers?|people|employees?)\b/iu.test(source)) {
    values.push(0);
  }

  return values;
}

function explicitHourValues(source: string) {
  const values: number[] = [];
  const numericHours = new RegExp(
    String.raw`(?:^|[^\p{L}\p{N}])(${NUMBER_PATTERN})\s*(?:${HOUR_WORD_PATTERN})(?=$|[^\p{L}\p{N}])`,
    "giu",
  );
  const labelHours = new RegExp(
    String.raw`(?:laiks|hours?|stundas?)\s*[:=-]?\s*(${NUMBER_PATTERN})(?=$|[^\p{L}\p{N}])`,
    "giu",
  );
  const timeRange = /(?:^|[^\d])([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)(?=$|[^\d])/gu;

  for (const regex of [numericHours, labelHours]) {
    for (const match of source.matchAll(regex)) {
      const value = parseNumber(match[1]);
      if (Number.isFinite(value)) values.push(value);
    }
  }

  for (const match of source.matchAll(timeRange)) {
    const start = Number(match[1]) * 60 + Number(match[2]);
    const end = Number(match[3]) * 60 + Number(match[4]);
    if (end >= start) values.push((end - start) / 60);
  }

  if (/\b(?:bez|nav)\s+stundu\b/iu.test(source)) {
    values.push(0);
  }

  return values;
}

function hasMatchingExplicitValue(values: number[], value: number) {
  return values.some((candidate) => numbersMatch(candidate, value));
}

function addWarning(
  warnings: SiteDiaryAiValidationWarning[],
  field: SiteDiaryAiValidationWarning["field"],
  code: SiteDiaryAiValidationWarningCode,
  value: number,
) {
  warnings.push({ field, code, value });
}

export function validateAiSiteDiaryRow<Row extends Record<string, any>>(
  sourceText: string,
  row: Row,
): SiteDiaryAiRowValidationResult<Row> {
  const source = normalizeText(sourceText);
  const warnings: SiteDiaryAiValidationWarning[] = [];
  const sanitized = { ...row } as Row;
  const amount = toNumber(row.Amounts);
  const workers = toNumber(row.WorkersInvolved);
  const hours = toNumber(row.TimeInvolved);
  const amounts = explicitAmountValues(source);
  const workerCounts = explicitWorkerValues(source);
  const hourCounts = explicitHourValues(source);

  if (amount !== null && !hasMatchingExplicitValue(amounts, amount)) {
    sanitized.Amounts = null;
    addWarning(
      warnings,
      "Amounts",
      amount === 0 ? "amount_zero_not_explicit" : "amount_not_explicit",
      amount,
    );
    if (row.Units) sanitized.Units = null;
  }

  if (workers !== null && !hasMatchingExplicitValue(workerCounts, workers)) {
    sanitized.WorkersInvolved = null;
    addWarning(
      warnings,
      "WorkersInvolved",
      workers === 0 ? "workers_zero_not_explicit" : "workers_not_explicit",
      workers,
    );
  }

  if (hours !== null && !hasMatchingExplicitValue(hourCounts, hours)) {
    sanitized.TimeInvolved = null;
    addWarning(
      warnings,
      "TimeInvolved",
      hours === 0 ? "hours_zero_not_explicit" : "hours_not_explicit",
      hours,
    );
  }

  return { row: sanitized, warnings };
}

export function buildSiteDiaryAiValidationMetadata(
  warningsByRow: SiteDiaryAiValidationWarning[][],
) {
  const rowWarnings = warningsByRow
    .map((warnings, rowIndex) => ({ rowIndex, warnings }))
    .filter((item) => item.warnings.length > 0);

  if (!rowWarnings.length) return null;

  return {
    siteDiaryAiValidation: {
      version: 1,
      rowWarnings,
    },
  };
}

export function buildSiteDiaryAiValidationSummaryMetadata(
  warningsByRow: SiteDiaryAiValidationWarning[][],
) {
  const warnings = warningsByRow.flat();
  const fields = Array.from(new Set(warnings.map((warning) => warning.field))).sort();
  const codes = Array.from(new Set(warnings.map((warning) => warning.code))).sort();

  return {
    siteDiaryValidationWarningCount: warnings.length,
    siteDiaryValidationFields: fields.join(","),
    siteDiaryValidationCodes: codes.join(","),
    siteDiaryValidationSanitized: warnings.length > 0,
  };
}
