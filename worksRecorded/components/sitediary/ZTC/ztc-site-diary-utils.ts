export const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";

export type ZtcDiaryRow = {
  id?: string;
  createdAt?: string | Date;
  Date: string | Date;
  Location?: string | null;
  Location_Custom_1?: string | null;
  Location_Custom_2?: string | number | null;
  Works?: string | null;
  Works_Custom_2?: string | number | null;
  Units?: string | null;
  Amounts?: number | string | null;
  WorkersInvolved?: number | string | null;
  TimeInvolved?: number | string | null;
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

export function isZtcQualityRow(row: ZtcDiaryRow) {
  if (normalizeZtcText(row.Works) === "kvalitates kontrole") return true;

  try {
    const parsed = JSON.parse(String(row.Comments_Custom_2 ?? ""));
    return parsed?.type === "ztc_quality_check";
  } catch {
    return false;
  }
}

function getZtcQualityCoefficient(row: ZtcDiaryRow) {
  const storedCoefficient = parseZtcPayrollNumber(row.Works_Custom_2, Number.NaN);
  if (Number.isFinite(storedCoefficient)) return storedCoefficient;

  const commentMatch = String(row.Comments ?? "").match(/koeficients\s*:\s*(-?\d+(?:[.,]\d+)?)/i);
  const commentCoefficient = parseZtcPayrollNumber(commentMatch?.[1], Number.NaN);
  return Number.isFinite(commentCoefficient) ? commentCoefficient : Number.NaN;
}

export function getZtcQualityRowToneClass(row: ZtcDiaryRow) {
  if (!isZtcQualityRow(row)) return "";

  const coefficient = getZtcQualityCoefficient(row);
  if (coefficient === 0) return "bg-red-100/70 hover:bg-red-100";
  if (coefficient === 0.9) return "bg-yellow-100/70 hover:bg-yellow-100";
  if (coefficient === 1) return "bg-green-100/70 hover:bg-green-100";
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
  const unit = String(row.Units ?? "").trim().toLowerCase();
  const payrollQuantity = unit === "st" ? hours : amountM2;
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

  payrollRows.forEach((row) => {
    const month =
      row.Mēnesis ||
      `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const worker = String(row.Darbinieks || "—").trim() || "—";
    const key = `${month}::${worker}`;
    const existing = summaryByWorkerMonth.get(key) ?? {
      Mēnesis: month,
      Darbinieks: worker,
      "Papilddarbu stundas": 0,
      "Darbu stundas": 0,
      Alga: 0,
    };

    if (String(row.Projekts ?? "").trim() === "Papilddarbi") {
      existing["Papilddarbu stundas"] += Number(row.Stundas) || 0;
    } else {
      existing["Darbu stundas"] += Number(row.Stundas) || 0;
    }
    existing.Alga += Number(row.Summa) || 0;
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
