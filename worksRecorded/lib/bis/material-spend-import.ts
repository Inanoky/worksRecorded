import { randomUUID } from "crypto";
import { prisma } from "@/lib/utils/db";

const REQUIRED_COLUMNS = [
  "Rekina Datums",
  "Rēķina NR",
  "PiegādātajsSIA",
  "Apgrozījums /Izmaksas (EUR)",
] as const;

export type MaterialSpendExcelRow = Record<string, unknown>;

export type MaterialSpendImportRow = {
  invoiceDate: Date;
  invoiceNr: string | null;
  supplierName: string | null;
  cost: number;
};

export type MaterialSpendImportValidation = {
  ok: boolean;
  excelRowCount: number;
  parsedRowCount: number;
  rows: MaterialSpendImportRow[];
  errors: string[];
  emptySupplierRows: number[];
  skippedEmptyCostRows: number[];
  missingColumns: string[];
};

export function cleanSupplierName(value: unknown) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,+$/g, "")
    .trim();

  return cleaned || null;
}

function readOptionalString(value: unknown) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text || null;
}

function formatRawCellValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? JSON.stringify(text) : "\"\"";
}

function hasAnyImportCellValue(row: MaterialSpendExcelRow) {
  return REQUIRED_COLUMNS.some((column) => String(row[column] ?? "").trim() !== "");
}

export function parseLatvianInvoiceDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }

  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function parseEurCost(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBlankCell(value: unknown) {
  return String(value ?? "").trim() === "";
}

export function validateMaterialSpendImportRows(excelRows: MaterialSpendExcelRow[]) {
  const errors: string[] = [];
  const emptySupplierRows: number[] = [];
  const skippedEmptyCostRows: number[] = [];
  const rows: MaterialSpendImportRow[] = [];
  let dataRowCount = 0;
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !excelRows.some((row) => Object.prototype.hasOwnProperty.call(row, column)),
  );

  if (missingColumns.length) {
    errors.push(`Missing required columns: ${missingColumns.join(", ")}`);
  }

  excelRows.forEach((row, index) => {
    if (!hasAnyImportCellValue(row)) return;
    dataRowCount += 1;

    const rowNumber = index + 2;
    const rawInvoiceDate = row["Rekina Datums"];
    const rawCost = row["Apgrozījums /Izmaksas (EUR)"];
    const invoiceDate = parseLatvianInvoiceDate(rawInvoiceDate);
    const cost = parseEurCost(rawCost);
    const supplierName = cleanSupplierName(row["PiegādātajsSIA"]);

    if (isBlankCell(rawCost)) {
      skippedEmptyCostRows.push(rowNumber);
      return;
    }

    if (!invoiceDate) {
      errors.push(`Row ${rowNumber}: Rekina Datums must be DD.MM.YYYY; got ${formatRawCellValue(rawInvoiceDate)}.`);
    }

    if (cost == null) {
      errors.push(`Row ${rowNumber}: Apgrozījums /Izmaksas (EUR) must be numeric; got ${formatRawCellValue(rawCost)}.`);
    }

    if (!supplierName) {
      emptySupplierRows.push(rowNumber);
    }

    if (invoiceDate && cost != null) {
      rows.push({
        invoiceDate,
        invoiceNr: readOptionalString(row["Rēķina NR"]),
        supplierName,
        cost,
      });
    }
  });

  const handledRowCount = rows.length + skippedEmptyCostRows.length;
  if (handledRowCount !== dataRowCount && !errors.length) {
    errors.push(`Parsed or skipped row count ${handledRowCount} does not match non-empty Excel row count ${dataRowCount}.`);
  }

  return {
    ok: errors.length === 0,
    excelRowCount: excelRows.length,
    parsedRowCount: rows.length,
    rows,
    errors,
    emptySupplierRows,
    skippedEmptyCostRows,
    missingColumns,
  } satisfies MaterialSpendImportValidation;
}

export async function insertMaterialSpendImportRows({
  organizationId,
  siteId,
  userId,
  rows,
  importBatchId = randomUUID(),
}: {
  organizationId: string;
  siteId: string;
  userId?: string | null;
  rows: MaterialSpendImportRow[];
  importBatchId?: string;
}) {
  const data = buildMaterialSpendImportCreateData({
    organizationId,
    siteId,
    userId,
    rows,
    importBatchId,
  });

  await prisma.bISmaterialRecords.createMany({
    data,
  });

  return { importBatchId, insertedCount: rows.length };
}

export function buildMaterialSpendImportCreateData({
  organizationId,
  siteId,
  userId,
  rows,
  importBatchId,
}: {
  organizationId: string;
  siteId: string;
  userId?: string | null;
  rows: MaterialSpendImportRow[];
  importBatchId: string;
}) {
  return rows.map((row) => ({
    name: null,
    quantity: null,
    categoryId: null,
    categoryName: null,
    measurementUnitId: null,
    measurementUnit: null,
    cost: row.cost,
    invoiceNr: row.invoiceNr,
    invoiceDate: row.invoiceDate,
    materialDate: null,
    supplierName: row.supplierName,
    importBatchId,
    costCode: null,
    sourcePhoto: null,
    declarationAttachment: [],
    agreementAttachment: [],
    siteId,
    orgId: organizationId,
    userId: userId ?? null,
    BISId: null,
    bisStatus: null,
  }));
}
