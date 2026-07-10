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
  ["__ztcSum", "Summa"],
  ["createdBy", "Darbinieks"],
] as const;

const ZTC_EXCEL_NUMERIC_FIELDS = new Set([
  "Location_Custom_2",
  "Works_Custom_2",
  "Amounts",
  "WorkersInvolved",
  "TimeInvolved",
  "__ztcSum",
]);

const ZTC_EXCEL_NUMERIC_HEADERS = new Set([
  "Likme",
  "Koef.",
  "Daudzums",
  "Sarežģītība",
  "Stundas",
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

function getZtcExcelRowSum(row: Record<string, any>) {
  const hours = parseZtcPayrollNumber(row.TimeInvolved);
  const amount = parseZtcPayrollNumber(row.Amounts);
  const quantity = isZtcHourlyUnit(row.Units) ? hours : amount;
  const rate = parseZtcPayrollNumber(row.Location_Custom_2);
  const coefficient = parseZtcPayrollNumber(row.Works_Custom_2, 1);
  const complexity = parseZtcPayrollNumber(row.WorkersInvolved, 1);
  return Number((quantity * rate * coefficient * complexity).toFixed(2));
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

export function formatZtcRowsForExcel<T extends Record<string, any>>(rows: T[]) {
  return rows.map((row) =>
    Object.fromEntries(
      ZTC_EXCEL_COLUMNS.map(([field, label]) => [
        label,
        field === "__ztcSum"
          ? getZtcExcelRowSum(row)
          : ZTC_EXCEL_NUMERIC_FIELDS.has(field)
          ? parseZtcExcelNumber(row[field])
          : row[field] ?? "",
      ]),
    ),
  );
}
