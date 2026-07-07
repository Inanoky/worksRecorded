import {
  parseZtcLaborNormNumber,
  readZtcLaborNormFromMetadata,
} from "@/flows/ztc-production/lib/ztc-labor-norm";

export const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";

export type ZtcDiaryRow = {
  id?: string;
  createdAt?: string | Date;
  Date: string | Date;
  Location?: string | null;
  Location_Custom_1?: string | null;
  Location_Custom_2?: string | number | null;
  Works?: string | null;
  Works_Custom_1?: string | null;
  Works_Custom_2?: string | number | null;
  Units?: string | null;
  Amounts?: number | string | null;
  WorkersInvolved?: number | string | null;
  TimeInvolved?: number | string | null;
  pausedAt?: string | Date | null;
  pauseIntervals?: unknown;
  Comments?: string | null;
  Comments_Custom_2?: string | null;
  originalUserComment?: string | null;
  originalAudioUrl?: string | null;
  Photos?: string[] | null;
  createdBy?: string | null;
  [key: string]: any;
};

export type ZtcImageDialogState = {
  title: string;
  subtitle?: string;
  photos: Array<{ src: string; caption?: string }>;
} | null;

export type ZtcLaborNormComparison = {
  planned: number | null;
  actual: number | null;
  difference: number | null;
};

type ZtcDrawingMetadata = {
  type?: string;
  elements?: Array<{
    elementName?: string | null;
    totalAreaM2?: number | string | null;
    works?: Array<{
      name?: string | null;
    }>;
  }>;
};

export type ZtcPauseInterval = {
  start: Date;
  end: Date;
};

export function parseZtcPayrollNumber(value: unknown, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeZtcText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isZtcHourlyUnit(value: unknown) {
  const normalized = normalizeZtcText(value).replace(/\.$/, "");
  return ["st", "h", "hr", "hour", "hours", "stunda", "stundas"].includes(normalized);
}

function parsePositiveZtcNumber(value: unknown) {
  const parsed = parseZtcPayrollNumber(value, Number.NaN);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getZtcPauseIntervals(value: unknown): ZtcPauseInterval[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const start = new Date(String((item as Record<string, unknown>).start ?? ""));
      const end = new Date(String((item as Record<string, unknown>).end ?? ""));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      if (end.getTime() < start.getTime()) return null;
      return { start, end };
    })
    .filter((item): item is ZtcPauseInterval => Boolean(item));
}

export function getZtcActivePauseStartedAt(row: ZtcDiaryRow) {
  if (!row.pausedAt) return null;
  const date = new Date(row.pausedAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getZtcPauseHours(row: ZtcDiaryRow) {
  const intervals = getZtcPauseIntervals(row.pauseIntervals);
  const activeStartedAt = getZtcActivePauseStartedAt(row);
  const now = new Date();
  const totalMilliseconds = intervals.reduce(
    (sum, interval) => sum + (interval.end.getTime() - interval.start.getTime()),
    activeStartedAt ? now.getTime() - activeStartedAt.getTime() : 0,
  );

  return Math.max(0, Number((totalMilliseconds / 3_600_000).toFixed(2)));
}

function parseZtcDrawingMetadata(value: unknown): ZtcDrawingMetadata | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as ZtcDrawingMetadata;
    if (parsed?.type !== "ztc_drawing_context" || !Array.isArray(parsed.elements)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getZtcElementTotalAreaM2(rows: ZtcDiaryRow[], elementName: string | null | undefined) {
  const normalizedElement = normalizeZtcText(elementName);
  if (!normalizedElement) return null;

  for (const row of rows) {
    const metadata = parseZtcDrawingMetadata(row.Comments_Custom_2);
    const element = metadata?.elements?.find(
      (candidate) => normalizeZtcText(candidate.elementName) === normalizedElement,
    );
    const area = parsePositiveZtcNumber(element?.totalAreaM2);
    if (area != null) return area;
  }

  return null;
}

export function getZtcProjectTotalAreaM2(rows: ZtcDiaryRow[], projectName: string | null | undefined) {
  const normalizedProject = normalizeZtcText(projectName);
  if (!normalizedProject) return null;

  const areasByElement = new Map<string, number>();
  for (const row of rows) {
    if (normalizeZtcText(row.Location) !== normalizedProject) continue;

    const metadata = parseZtcDrawingMetadata(row.Comments_Custom_2);
    for (const element of metadata?.elements ?? []) {
      const elementKey = normalizeZtcText(element.elementName);
      if (!elementKey || areasByElement.has(elementKey)) continue;

      const area = parsePositiveZtcNumber(element.totalAreaM2);
      if (area != null) areasByElement.set(elementKey, area);
    }
  }

  const total = Array.from(areasByElement.values()).reduce((sum, area) => sum + area, 0);
  return total > 0 ? Number(total.toFixed(2)) : null;
}

export function isZtcQualityRow(row: ZtcDiaryRow) {
  if (normalizeZtcText(row.Works) === "kvalitates kontrole") return true;

  try {
    const parsed = JSON.parse(String(row.Comments_Custom_2 ?? ""));
    return parsed?.type === "ztc_quality_check";
  } catch {
    return false;
  }
}

function ztcWorkMatchesDrawingMetadata(row: ZtcDiaryRow) {
  const normalizedWork = normalizeZtcText(row.Works);
  if (!normalizedWork) return false;

  const metadata = parseZtcDrawingMetadata(row.Comments_Custom_2);
  return Boolean(
    metadata?.elements?.some((element) =>
      element.works?.some((work) => normalizeZtcText(work?.name) === normalizedWork),
    ),
  );
}

export function isZtcAdditionalWorkRow(row: ZtcDiaryRow) {
  if (row.Location === "Papilddarbi") return true;
  if (normalizeZtcText(row.Works_Custom_1) !== "papilddarbi") return false;

  return !ztcWorkMatchesDrawingMetadata(row);
}

export function isZtcAdditionalDetailsRow(row: ZtcDiaryRow) {
  return normalizeZtcText(row.Works_Custom_1) === "papilddetalas";
}

function isZtcProductionWorkRow(row: ZtcDiaryRow) {
  return !isZtcQualityRow(row) && !isZtcAdditionalWorkRow(row) && !isZtcAdditionalDetailsRow(row);
}

function getZtcQualityCoefficient(row: ZtcDiaryRow) {
  const storedCoefficient = parseZtcPayrollNumber(row.Works_Custom_2, Number.NaN);
  if (Number.isFinite(storedCoefficient)) return storedCoefficient;

  const commentMatch = String(row.Comments ?? "").match(/koeficients\s*:\s*(-?\d+(?:[.,]\d+)?)/i);
  const commentCoefficient = parseZtcPayrollNumber(commentMatch?.[1], Number.NaN);
  return Number.isFinite(commentCoefficient) ? commentCoefficient : Number.NaN;
}

function getZtcQualityElementKey(row: ZtcDiaryRow) {
  const project = normalizeZtcText(row.Location);
  const element = normalizeZtcText(row.Location_Custom_1);
  return project && element ? `${project}::${element}` : "";
}

function getZtcQualityCheckedWork(row: ZtcDiaryRow) {
  try {
    const parsed = JSON.parse(String(row.Comments_Custom_2 ?? ""));
    return parsed?.type === "ztc_quality_check"
      ? String(parsed.checkedWork ?? "").trim() || null
      : null;
  } catch {
    return null;
  }
}

function getZtcQualityScopeKey(row: ZtcDiaryRow) {
  const elementKey = getZtcQualityElementKey(row);
  if (!elementKey) return "";

  const checkedWork = normalizeZtcText(getZtcQualityCheckedWork(row));
  return checkedWork ? `${elementKey}::${checkedWork}` : elementKey;
}

function getZtcQualityRowTime(row: ZtcDiaryRow) {
  const value = new Date(row.createdAt ?? row.Date).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export type ZtcQualityDisplayState = {
  toneClass: string;
  hasResolvedDefect: boolean;
};

export function buildZtcQualityDisplayStateByRowId(rows: ZtcDiaryRow[]) {
  const states = new Map<string, ZtcQualityDisplayState>();
  const qualityRowsByElement = new Map<
    string,
    Array<{ row: ZtcDiaryRow; rowId: string; time: number }>
  >();

  rows.forEach((row) => {
    if (!row.id) return;
    states.set(row.id, { toneClass: "", hasResolvedDefect: false });
    if (!isZtcQualityRow(row)) return;

    const elementKey = getZtcQualityScopeKey(row);
    if (!elementKey) return;
    const timeline = qualityRowsByElement.get(elementKey) ?? [];
    timeline.push({ row, rowId: row.id, time: getZtcQualityRowTime(row) });
    qualityRowsByElement.set(elementKey, timeline);
  });

  qualityRowsByElement.forEach((timeline) => {
    timeline.sort((a, b) => a.time - b.time);

    timeline.forEach((entry, index) => {
      const coefficient = getZtcQualityCoefficient(entry.row);
      if (coefficient !== 0 && coefficient !== 0.9) return;

      const laterAccepted = timeline
        .slice(index + 1)
        .some((candidate) => getZtcQualityCoefficient(candidate.row) === 1);

      states.set(entry.rowId, {
        toneClass: laterAccepted
          ? ""
          : coefficient === 0
            ? "bg-red-100/70 hover:bg-red-100"
            : "bg-yellow-100/70 hover:bg-yellow-100",
        hasResolvedDefect: laterAccepted,
      });
    });
  });

  return states;
}

export function getZtcQualityRowToneClass(row: ZtcDiaryRow) {
  if (!isZtcQualityRow(row)) return "";

  const coefficient = getZtcQualityCoefficient(row);
  if (coefficient === 0) return "bg-red-100/70 hover:bg-red-100";
  if (coefficient === 0.9) return "bg-yellow-100/70 hover:bg-yellow-100";
  return "";
}

export function getZtcPayrollValues(row: ZtcDiaryRow) {
  if (isZtcQualityRow(row)) {
    return {
      hours: 0,
      amountM2: 0,
      rate: 0,
      coefficient: 0,
      complexity: 0,
      sum: 0,
      payrollQuantity: 0,
      laborNorm: { planned: null, actual: null, difference: null },
    };
  }

  const hours = parseZtcPayrollNumber(row.TimeInvolved);
  const amountM2 = parseZtcPayrollNumber(row.Amounts);
  const payrollQuantity = isZtcHourlyUnit(row.Units) ? hours : amountM2;
  const rate = parseZtcPayrollNumber(row.Location_Custom_2);
  const coefficient = parseZtcPayrollNumber(row.Works_Custom_2, 1);
  const complexity = parseZtcPayrollNumber(row.WorkersInvolved, 1);
  const sum = payrollQuantity * rate * coefficient * complexity;
  const plannedLaborNorm = isZtcProductionWorkRow(row)
    ? readZtcLaborNormFromMetadata(row.Comments_Custom_2).plannedHoursPerUnit
    : null;
  const actualLaborNorm =
    isZtcProductionWorkRow(row) && amountM2 > 0
      ? Number((hours / amountM2).toFixed(4))
      : null;
  const laborNorm = {
    planned: plannedLaborNorm,
    actual: actualLaborNorm,
    difference:
      plannedLaborNorm != null && actualLaborNorm != null
        ? Number((actualLaborNorm - plannedLaborNorm).toFixed(4))
        : null,
  };

  return {
    hours,
    amountM2,
    rate,
    coefficient,
    complexity,
    sum: Number(sum.toFixed(2)),
    payrollQuantity,
    laborNorm,
  };
}

export function formatZtcLaborNorm(value: number | null | undefined, locale = "lv-LV") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function getZtcLaborNormComparison(row: ZtcDiaryRow): ZtcLaborNormComparison {
  return getZtcPayrollValues(row).laborNorm;
}

export function buildZtcLaborNormSummaryRows(rows: ZtcDiaryRow[]) {
  const groups = new Map<
    string,
    {
      task: string;
      hours: number;
      amount: number;
      plannedWeighted: number;
      plannedAmount: number;
    }
  >();

  rows.forEach((row) => {
    if (!isZtcProductionWorkRow(row)) return;
    const task = String(row.Works ?? "").trim();
    if (!task) return;

    const hours = parseZtcPayrollNumber(row.TimeInvolved);
    const amount = parseZtcPayrollNumber(row.Amounts);
    if (amount <= 0) return;

    const planned = parseZtcLaborNormNumber(
      readZtcLaborNormFromMetadata(row.Comments_Custom_2).plannedHoursPerUnit,
    );
    const key = normalizeZtcText(task);
    const existing = groups.get(key) ?? {
      task,
      hours: 0,
      amount: 0,
      plannedWeighted: 0,
      plannedAmount: 0,
    };

    existing.hours += hours;
    existing.amount += amount;
    if (planned != null) {
      existing.plannedWeighted += planned * amount;
      existing.plannedAmount += amount;
    }
    groups.set(key, existing);
  });

  return Array.from(groups.values())
    .map((group) => {
      const planned =
        group.plannedAmount > 0
          ? Number((group.plannedWeighted / group.plannedAmount).toFixed(4))
          : null;
      const actual =
        group.amount > 0 ? Number((group.hours / group.amount).toFixed(4)) : null;
      return {
        task: group.task,
        hours: Number(group.hours.toFixed(2)),
        amount: Number(group.amount.toFixed(2)),
        planned,
        actual,
        difference:
          planned != null && actual != null
            ? Number((actual - planned).toFixed(4))
            : null,
      };
    })
    .sort((a, b) => a.task.localeCompare(b.task, "lv"));
}

export function buildZtcLaborNormTotalSummary(rows: ZtcDiaryRow[]) {
  const totals = rows.reduce(
    (acc, row) => {
      if (!isZtcProductionWorkRow(row)) return acc;

      const hours = parseZtcPayrollNumber(row.TimeInvolved);
      const amount = parseZtcPayrollNumber(row.Amounts);
      if (amount <= 0) return acc;

      const planned = parseZtcLaborNormNumber(
        readZtcLaborNormFromMetadata(row.Comments_Custom_2).plannedHoursPerUnit,
      );

      acc.hours += hours;
      acc.amount += amount;
      if (planned != null) {
        acc.plannedWeighted += planned * amount;
        acc.plannedAmount += amount;
      }
      return acc;
    },
    {
      hours: 0,
      amount: 0,
      plannedWeighted: 0,
      plannedAmount: 0,
    },
  );

  if (totals.amount <= 0) {
    return {
      hours: 0,
      amount: 0,
      planned: null,
      actual: null,
      difference: null,
    };
  }

  const planned =
    totals.plannedAmount > 0
      ? Number((totals.plannedWeighted / totals.plannedAmount).toFixed(4))
      : null;
  const actual = Number((totals.hours / totals.amount).toFixed(4));

  return {
    hours: Number(totals.hours.toFixed(2)),
    amount: Number(totals.amount.toFixed(2)),
    planned,
    actual,
    difference:
      planned != null && actual != null
        ? Number((actual - planned).toFixed(4))
        : null,
  };
}

export function formatZtcMoney(value: number) {
  return new Intl.NumberFormat("lv-LV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function splitZtcWorkerDisplayName(value: string | null | undefined) {
  const parts = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { name: "—", surname: "" };
  return {
    name: parts[0],
    surname: parts.slice(1).join(" "),
  };
}

export function getZtcRowPhotos(row: ZtcDiaryRow) {
  return (Array.isArray(row.Photos) ? row.Photos : [])
    .map((url) => String(url ?? "").trim())
    .filter(Boolean);
}

export function getZtcRowKindLabel(row: ZtcDiaryRow) {
  return isZtcQualityRow(row) ? "QA" : "Darbs";
}

export function parseZtcDiaryAudioUrls(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return [];

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
  } catch {
    // Older records may have newline-separated audio URLs.
  }

  return normalized
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildZtcImageDialogState(row: ZtcDiaryRow): ZtcImageDialogState {
  const photos = getZtcRowPhotos(row);
  if (!photos.length) return null;

  return {
    title: row.Works || getZtcRowKindLabel(row),
    subtitle: [row.Location, row.Location_Custom_1, row.createdBy]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(" • "),
    photos: photos.map((src) => ({
      src,
      caption: [row.Works, row.Location_Custom_1, row.createdBy, row.Comments]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" • "),
    })),
  };
}

function parseZtcDate(value: unknown) {
  if (!value) return null;
  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getZtcLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function roundZtcHours(value: number) {
  return Number(Math.max(0, value).toFixed(2));
}

type ZtcTimeInterval = {
  start: Date;
  end: Date;
};

function getZtcLocalDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addZtcDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function mergeZtcTimeIntervals(intervals: ZtcTimeInterval[]) {
  const sorted = intervals
    .filter((interval) => interval.end.getTime() > interval.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: ZtcTimeInterval[] = [];

  sorted.forEach((interval) => {
    const previous = merged[merged.length - 1];
    if (!previous || interval.start.getTime() > previous.end.getTime()) {
      merged.push({ start: interval.start, end: interval.end });
      return;
    }

    if (interval.end.getTime() > previous.end.getTime()) {
      previous.end = interval.end;
    }
  });

  return merged;
}

function getZtcIntervalHours(intervals: ZtcTimeInterval[]) {
  return intervals.reduce(
    (sum, interval) => sum + (interval.end.getTime() - interval.start.getTime()) / 3_600_000,
    0,
  );
}

function clipZtcInterval(interval: ZtcTimeInterval, boundary: ZtcTimeInterval) {
  const start = new Date(Math.max(interval.start.getTime(), boundary.start.getTime()));
  const end = new Date(Math.min(interval.end.getTime(), boundary.end.getTime()));
  return end.getTime() > start.getTime() ? { start, end } : null;
}

function subtractZtcPauseIntervals(interval: ZtcTimeInterval, pauses: ZtcTimeInterval[]) {
  return mergeZtcTimeIntervals(pauses).reduce(
    (segments, pause) =>
      segments.flatMap((segment) => {
        const clippedPause = clipZtcInterval(pause, segment);
        if (!clippedPause) return [segment];

        return [
          { start: segment.start, end: clippedPause.start },
          { start: clippedPause.end, end: segment.end },
        ].filter((candidate) => candidate.end.getTime() > candidate.start.getTime());
      }),
    [interval],
  );
}

function splitZtcIntervalByLocalDay(interval: ZtcTimeInterval) {
  const parts: Array<{ day: Date; interval: ZtcTimeInterval }> = [];
  let cursor = interval.start;

  while (cursor.getTime() < interval.end.getTime()) {
    const day = getZtcLocalDayStart(cursor);
    const nextDay = addZtcDays(day, 1);
    const end = new Date(Math.min(interval.end.getTime(), nextDay.getTime()));
    if (end.getTime() > cursor.getTime()) {
      parts.push({ day, interval: { start: cursor, end } });
    }
    cursor = end;
  }

  return parts;
}

export async function exportZtcPayrollToExcel({
  rows,
  currentYear,
  currentMonth,
}: {
  rows: ZtcDiaryRow[];
  currentYear?: number;
  currentMonth?: number;
}) {
  const XLSX = await import("xlsx");
  const hasMonthFilter =
    typeof currentYear === "number" && typeof currentMonth === "number";
  const monthRows = rows.filter((row) => {
    const date = new Date(row.Date);
    return (
      !Number.isNaN(date.getTime()) &&
      (!hasMonthFilter ||
        (date.getFullYear() === currentYear && date.getMonth() === currentMonth)) &&
      !isZtcQualityRow(row)
    );
  });

  const payrollRows = monthRows.map((row) => {
    const payroll = getZtcPayrollValues(row);
    const payrollDate = row.Date ? new Date(row.Date) : null;
    const monthKey =
      payrollDate && !Number.isNaN(payrollDate.getTime())
        ? `${payrollDate.getFullYear()}-${String(payrollDate.getMonth() + 1).padStart(2, "0")}`
        : "";

    return {
      Datums:
        payrollDate && !Number.isNaN(payrollDate.getTime())
          ? payrollDate
          : undefined,
      Mēnesis: monthKey,
      Darbinieks: row.createdBy ?? "",
      Projekts: row.Location ?? "",
      Elements: row.Location_Custom_1 ?? "",
      Darbi: row.Works ?? "",
      Stundas: payroll.hours,
      Apjoms: payroll.amountM2,
      "Aprēķina apjoms": payroll.payrollQuantity ?? payroll.amountM2,
      Mērvienība: row.Units ?? "",
      Likme: payroll.rate,
      Koeficients: payroll.coefficient,
      Sarežģītība: payroll.complexity,
      Summa: payroll.sum,
    };
  });

  const summaryByWorkerMonth = new Map<
    string,
    {
      Mēnesis: string;
      Darbinieks: string;
      "Papilddarbu stundas": number;
      "Darbu stundas": number;
      Alga: number;
    }
  >();

  monthRows.forEach((row) => {
    const payroll = getZtcPayrollValues(row);
    const payrollDate = row.Date ? new Date(row.Date) : null;
    const month =
      payrollDate && !Number.isNaN(payrollDate.getTime())
        ? `${payrollDate.getFullYear()}-${String(payrollDate.getMonth() + 1).padStart(2, "0")}`
        : "";
    const worker = String(row.createdBy || "—").trim() || "—";
    const key = `${month}::${worker}`;
    const existing = summaryByWorkerMonth.get(key) ?? {
      Mēnesis: month,
      Darbinieks: worker,
      "Papilddarbu stundas": 0,
      "Darbu stundas": 0,
      Alga: 0,
    };

    if (isZtcAdditionalWorkRow(row)) {
      existing["Papilddarbu stundas"] += Number(payroll.hours) || 0;
    } else {
      existing["Darbu stundas"] += Number(payroll.hours) || 0;
    }
    existing.Alga += Number(payroll.sum) || 0;
    summaryByWorkerMonth.set(key, existing);
  });

  const summaryRows = Array.from(summaryByWorkerMonth.values())
    .map((row) => ({
      ...row,
      "Papilddarbu stundas": Number(row["Papilddarbu stundas"].toFixed(2)),
      "Darbu stundas": Number(row["Darbu stundas"].toFixed(2)),
      Alga: Number(row.Alga.toFixed(2)),
    }))
    .sort((a, b) => {
      const monthCompare = a.Mēnesis.localeCompare(b.Mēnesis, "lv");
      if (monthCompare !== 0) return monthCompare;
      return a.Darbinieks.localeCompare(b.Darbinieks, "lv");
    });

  const workbook = XLSX.utils.book_new();
  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);
  summaryWorksheet["!cols"] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 20 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Mēneša kopsavilkums");

  const payrollWorksheet = XLSX.utils.json_to_sheet(payrollRows, {
    cellDates: true,
  });
  const payrollRange = XLSX.utils.decode_range(payrollWorksheet["!ref"] ?? "A1:A1");
  for (let rowIndex = 1; rowIndex <= payrollRange.e.r; rowIndex += 1) {
    const cell = payrollWorksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 0 })];
    if (cell?.v instanceof Date) {
      cell.t = "d";
      cell.z = "dd.mm.yyyy";
    }
  }
  payrollWorksheet["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 24 },
    { wch: 26 },
    { wch: 18 },
    { wch: 30 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, payrollWorksheet, "Algu ieraksti");
  const dateKeys = monthRows
    .map((row) => {
      const date = new Date(row.Date);
      return Number.isNaN(date.getTime()) ? "" : getZtcLocalDayKey(date);
    })
    .filter(Boolean);
  const filenameDatePart = hasMonthFilter
    ? `${currentYear}-${String((currentMonth ?? 0) + 1).padStart(2, "0")}`
    : dateKeys.length > 0
      ? `${dateKeys[0]}_${dateKeys[dateKeys.length - 1]}`
      : "empty";
  XLSX.writeFile(
    workbook,
    `Razosana-Algu-aprekins-${filenameDatePart}.xlsx`,
  );
}

export function buildZtcProductivityRows(rows: ZtcDiaryRow[]) {
  const exportRows = rows.filter((row) => {
    const start = parseZtcDate(row.Date);
    const end = parseZtcDate(row.Date_Custom_2);
    return start && end && !isZtcQualityRow(row);
  });

  const groups = new Map<
    string,
    {
      day: Date;
      worker: string;
      activeIntervals: ZtcTimeInterval[];
      pauseIntervals: ZtcTimeInterval[];
    }
  >();

  exportRows.forEach((row) => {
    const start = parseZtcDate(row.Date);
    const finish = parseZtcDate(row.Date_Custom_2);
    if (!start || !finish) return;

    const worker = String(row.createdBy || "").trim() || "N/A";
    const pauseIntervals = getZtcPauseIntervals(row.pauseIntervals);
    const activeIntervals = subtractZtcPauseIntervals({ start, end: finish }, pauseIntervals);

    activeIntervals.forEach((interval) => {
      splitZtcIntervalByLocalDay(interval).forEach((part) => {
        const dayKey = getZtcLocalDayKey(part.day);
        const key = `${dayKey}::${worker}`;
        const existing = groups.get(key) ?? {
          day: part.day,
          worker,
          activeIntervals: [],
          pauseIntervals: [],
        };

        existing.activeIntervals.push(part.interval);
        groups.set(key, existing);
      });
    });

    pauseIntervals.forEach((interval) => {
      splitZtcIntervalByLocalDay(interval).forEach((part) => {
        const dayKey = getZtcLocalDayKey(part.day);
        const key = `${dayKey}::${worker}`;
        const existing = groups.get(key);
        if (!existing) return;

        existing.pauseIntervals.push(part.interval);
      });
    });
  });

  const productivityRows = Array.from(groups.values())
    .map((group) => ({
      ...group,
      activeIntervals: mergeZtcTimeIntervals(group.activeIntervals),
    }))
    .filter((group) => group.activeIntervals.length > 0)
    .sort((a, b) => {
      const dayCompare = a.day.getTime() - b.day.getTime();
      if (dayCompare !== 0) return dayCompare;
      const workerCompare = a.worker.localeCompare(b.worker, "lv");
      if (workerCompare !== 0) return workerCompare;
      return a.activeIntervals[0].start.getTime() - b.activeIntervals[0].start.getTime();
    })
    .map((group) => {
      const start = group.activeIntervals[0].start;
      const finish = group.activeIntervals[group.activeIntervals.length - 1].end;
      const dayEnvelope = { start, end: finish };
      const pauseIntervals = mergeZtcTimeIntervals(
        group.pauseIntervals
          .map((interval) => clipZtcInterval(interval, dayEnvelope))
          .filter((interval): interval is ZtcTimeInterval => Boolean(interval)),
      );
      const totalHours = roundZtcHours(
        (finish.getTime() - start.getTime()) / 3_600_000,
      );
      const effectiveHours = roundZtcHours(getZtcIntervalHours(group.activeIntervals));
      const pausedHours = roundZtcHours(getZtcIntervalHours(pauseIntervals));
      const workerName = splitZtcWorkerDisplayName(group.worker);

      return {
        Datums: group.day,
        Vārds: workerName.name,
        Uzvārds: workerName.surname,
        "Dienas sākums": start,
        "Dienas beigas": finish,
        "Kopējais laiks": totalHours,
        "Efektīvais laiks": effectiveHours,
        "Pauzes laiks": pausedHours,
        "Neuzskaitītais laiks": roundZtcHours(totalHours - effectiveHours - pausedHours),
      };
    });

  return productivityRows;
}

export async function exportZtcProductivityToExcel({
  rows,
}: {
  rows: ZtcDiaryRow[];
}) {
  const XLSX = await import("xlsx");
  const productivityRows = buildZtcProductivityRows(rows);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(productivityRows, {
    cellDates: true,
  });
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");
  for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex += 1) {
    const dayCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 0 })];
    const startCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 3 })];
    const finishCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 4 })];

    if (dayCell?.v instanceof Date) {
      dayCell.t = "d";
      dayCell.z = "dd.mm.yyyy";
    }
    [startCell, finishCell].forEach((cell) => {
      if (cell?.v instanceof Date) {
        cell.t = "d";
        cell.z = "hh:mm";
      }
    });
  }
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
  ];

  const dateKeys = productivityRows
    .map((row) => (row.Datums instanceof Date ? getZtcLocalDayKey(row.Datums) : ""))
    .filter(Boolean);
  const filenameDatePart =
    dateKeys.length > 0
      ? `${dateKeys[0]}_${dateKeys[dateKeys.length - 1]}`
      : "empty";

  XLSX.utils.book_append_sheet(workbook, worksheet, "Produktivitate");
  XLSX.writeFile(
    workbook,
    `Razosana-Produktivitate-${filenameDatePart}.xlsx`,
  );
}
