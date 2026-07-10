import {
  parseZtcLaborNormNumber,
  readZtcLaborNormFromMetadata,
} from "@/flows/ztc-production/lib/ztc-labor-norm";
import {
  findZtcDefaultRateForTask,
  type ZtcDefaultTaskRate,
} from "@/flows/ztc-production/lib/ztc-rate-matching";
import { ZTC_ALL_PROJECTS_RATE_NAME } from "@/flows/ztc-production/lib/ztc-rate-constants";

type ZtcExcelProjectRates = {
  projectName: string;
  works?: ZtcDefaultTaskRate[];
};

type FormatZtcRowsForExcelOptions = {
  defaultRates?: ZtcExcelProjectRates[];
};

const ZTC_EXCEL_COLUMNS = [
  ["Date", "Sākums"],
  ["Location", "Projekts"],
  ["Location_Custom_1", "Elements"],
  ["Location_Custom_2", "Likme"],
  ["Works", "Darbi"],
  ["Works_Custom_1", "Rasējuma darbi"],
  ["Works_Custom_2", "Koef."],
  ["Comments", "Komentāri"],
  ["Amounts", "Daudzums"],
  ["WorkersInvolved", "Sarežģītība"],
  ["TimeInvolved", "Stundas"],
  ["__ztcLaborNorm", "Laika norma"],
  ["__ztcSum", "Summa"],
  ["createdBy", "Darbinieks"],
] as const;

const ZTC_EXCEL_NUMERIC_FIELDS = new Set([
  "Location_Custom_2",
  "Works_Custom_2",
  "Amounts",
  "WorkersInvolved",
  "TimeInvolved",
  "__ztcLaborNorm",
  "__ztcSum",
]);

const ZTC_EXCEL_NUMERIC_HEADERS = new Set([
  "Likme",
  "Koef.",
  "Daudzums",
  "Sarežģītība",
  "Stundas",
  "Laika norma",
  "Apjoms",
  "Aprēķina apjoms",
  "Koeficients",
  "Summa",
  "Papilddarbu stundas",
  "Darbu stundas",
  "Alga",
  "Kopējais laiks",
  "Efektīvais laiks",
  "Pauzes laiks",
  "Neuzskaitītais laiks",
]);

function parseZtcExcelNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : "";

  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return "";

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : value;
}

function parseZtcPayrollNumber(value: unknown, fallback = 0) {
  const parsed = parseZtcExcelNumber(value);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function isZtcHourlyUnit(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/\.$/, "");
  return ["st", "h", "hr", "hour", "hours", "stunda", "stundas"].includes(normalized);
}

function normalizeZtcExcelText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getZtcExcelRowSum(row: Record<string, any>) {
  const hours = parseZtcPayrollNumber(row.TimeInvolved);
  const amount = parseZtcPayrollNumber(row.Amounts);
  const quantity = isZtcHourlyUnit(row.Units) ? hours : amount;
  const rate = parseZtcPayrollNumber(row.Location_Custom_2);
  const coefficient = parseZtcPayrollNumber(row.Works_Custom_2, 1);
  const complexity = parseZtcPayrollNumber(row.WorkersInvolved, 1);
  return Number((quantity * rate * coefficient * complexity).toFixed(2));
}

function getZtcExcelProjectWorkRates(
  defaultRates: ZtcExcelProjectRates[] | null | undefined,
  projectName: unknown,
) {
  const allProjectRates = defaultRates?.find(
    (project) =>
      normalizeZtcExcelText(project.projectName) ===
      normalizeZtcExcelText(ZTC_ALL_PROJECTS_RATE_NAME),
  );
  const projectRates = defaultRates?.find(
    (project) =>
      normalizeZtcExcelText(project.projectName) === normalizeZtcExcelText(projectName),
  );
  const merged = [...(allProjectRates?.works ?? [])];

  for (const override of projectRates?.works ?? []) {
    const index = merged.findIndex(
      (entry) => normalizeZtcExcelText(entry.task) === normalizeZtcExcelText(override.task),
    );
    if (index >= 0) {
      merged[index] = { ...merged[index], ...override };
    } else {
      merged.push(override);
    }
  }

  return merged;
}

function getZtcExcelRowLaborNorm(
  row: Record<string, any>,
  options: FormatZtcRowsForExcelOptions = {},
) {
  const metadataPlanned = parseZtcLaborNormNumber(
    readZtcLaborNormFromMetadata(row.Comments_Custom_2).plannedHoursPerUnit,
  );
  if (metadataPlanned != null) return metadataPlanned;

  const fallbackRate = findZtcDefaultRateForTask(
    row.Works,
    getZtcExcelProjectWorkRates(options.defaultRates, row.Location),
    { category: "works" },
  )?.entry;

  return parseZtcLaborNormNumber(fallbackRate?.laborNorm) ?? "";
}

export function applyZtcExcelNumberFormats(XLSX: any, worksheet: any) {
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");
  const numericColumns = new Set<number>();

  for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
    const headerCell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: columnIndex })];
    if (ZTC_EXCEL_NUMERIC_HEADERS.has(String(headerCell?.v ?? ""))) {
      numericColumns.add(columnIndex);
    }
  }

  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
    numericColumns.forEach((columnIndex) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (!cell || typeof cell.v !== "number") return;
      cell.t = "n";
      cell.z = "#,##0.00";
    });
  }
}

export function formatZtcRowsForExcel<T extends Record<string, any>>(
  rows: T[],
  options: FormatZtcRowsForExcelOptions = {},
) {
  return rows.map((row) =>
    Object.fromEntries(
      ZTC_EXCEL_COLUMNS.map(([field, label]) => [
        label,
        field === "__ztcSum"
          ? getZtcExcelRowSum(row)
          : field === "__ztcLaborNorm"
          ? getZtcExcelRowLaborNorm(row, options)
          : ZTC_EXCEL_NUMERIC_FIELDS.has(field)
          ? parseZtcExcelNumber(row[field])
          : row[field] ?? "",
      ]),
    ),
  );
}
