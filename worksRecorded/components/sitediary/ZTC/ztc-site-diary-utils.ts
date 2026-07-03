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

type ZtcDrawingMetadata = {
  type?: string;
  elements?: Array<{
    elementName?: string | null;
    totalAreaM2?: number | string | null;
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

export function isZtcQualityRow(row: ZtcDiaryRow) {
  if (normalizeZtcText(row.Works) === "kvalitates kontrole") return true;

  try {
    const parsed = JSON.parse(String(row.Comments_Custom_2 ?? ""));
    return parsed?.type === "ztc_quality_check";
  } catch {
    return false;
  }
}

export function isZtcAdditionalWorkRow(row: ZtcDiaryRow) {
  return row.Location === "Papilddarbi" || row.Works_Custom_1 === "Papilddarbi";
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

    const elementKey = getZtcQualityElementKey(row);
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
    };
  }

  const hours = parseZtcPayrollNumber(row.TimeInvolved);
  const amountM2 = parseZtcPayrollNumber(row.Amounts);
  const payrollQuantity = isZtcHourlyUnit(row.Units) ? hours : amountM2;
  const rate = parseZtcPayrollNumber(row.Location_Custom_2);
  const coefficient = parseZtcPayrollNumber(row.Works_Custom_2, 1);
  const complexity = parseZtcPayrollNumber(row.WorkersInvolved, 1);
  const sum = payrollQuantity * rate * coefficient * complexity;

  return {
    hours,
    amountM2,
    rate,
    coefficient,
    complexity,
    sum: Number(sum.toFixed(2)),
    payrollQuantity,
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

function getZtcProductivityFinish(row: ZtcDiaryRow, fallbackFinish: Date) {
  const rowStart = parseZtcDate(row.Date);
  if (!rowStart) return fallbackFinish;

  const startDayKey = getZtcLocalDayKey(rowStart);
  const overnightPause = getZtcPauseIntervals(row.pauseIntervals)
    .filter((interval) => {
      const intervalStartDayKey = getZtcLocalDayKey(interval.start);
      const intervalEndDayKey = getZtcLocalDayKey(interval.end);
      return (
        intervalStartDayKey === startDayKey &&
        intervalEndDayKey !== startDayKey &&
        interval.start.getTime() >= rowStart.getTime() &&
        interval.start.getTime() <= fallbackFinish.getTime()
      );
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

  return overnightPause?.start ?? fallbackFinish;
}

export async function exportZtcPayrollToExcel({
  rows,
  currentYear,
  currentMonth,
}: {
  rows: ZtcDiaryRow[];
  currentYear: number;
  currentMonth: number;
}) {
  const XLSX = await import("xlsx");
  const monthRows = rows.filter((row) => {
    const date = new Date(row.Date);
    return (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === currentYear &&
      date.getMonth() === currentMonth &&
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
        : `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
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
  XLSX.writeFile(
    workbook,
    `ZTC-Algu-aprekins-${currentYear}-${String(currentMonth + 1).padStart(2, "0")}.xlsx`,
  );
}

export async function exportZtcProductivityToExcel({
  rows,
}: {
  rows: ZtcDiaryRow[];
}) {
  const XLSX = await import("xlsx");
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
      start: Date;
      finish: Date;
      effectiveHours: number;
    }
  >();

  exportRows.forEach((row) => {
    const start = parseZtcDate(row.Date);
    const rawFinish = parseZtcDate(row.Date_Custom_2);
    const finish = rawFinish ? getZtcProductivityFinish(row, rawFinish) : null;
    if (!start || !finish) return;

    const worker = String(row.createdBy || "").trim() || "N/A";
    const dayKey = getZtcLocalDayKey(start);
    const key = `${dayKey}::${worker}`;
    const existing = groups.get(key);
    const effectiveHours = parseZtcPayrollNumber(row.TimeInvolved);

    if (!existing) {
      groups.set(key, {
        day: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
        worker,
        start,
        finish,
        effectiveHours,
      });
      return;
    }

    if (start.getTime() < existing.start.getTime()) {
      existing.start = start;
    }
    if (finish.getTime() > existing.finish.getTime()) {
      existing.finish = finish;
    }
    existing.effectiveHours += effectiveHours;
  });

  const productivityRows = Array.from(groups.values())
    .sort((a, b) => {
      const dayCompare = a.day.getTime() - b.day.getTime();
      if (dayCompare !== 0) return dayCompare;
      const workerCompare = a.worker.localeCompare(b.worker, "lv");
      if (workerCompare !== 0) return workerCompare;
      return a.start.getTime() - b.start.getTime();
    })
    .map((group) => {
      const totalHours = roundZtcHours(
        (group.finish.getTime() - group.start.getTime()) / 3_600_000,
      );
      const effectiveHours = roundZtcHours(group.effectiveHours);
      const workerName = splitZtcWorkerDisplayName(group.worker);

      return {
        Datums: group.day,
        Vārds: workerName.name,
        Uzvārds: workerName.surname,
        "Dienas sākums": group.start,
        "Dienas beigas": group.finish,
        "Kopējais laiks": totalHours,
        "Efektīvais laiks": effectiveHours,
        "Neuzskaitītais laiks": roundZtcHours(totalHours - effectiveHours),
      };
    });

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
    `ZTC-Produktivitate-${filenameDatePart}.xlsx`,
  );
}
