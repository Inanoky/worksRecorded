import { readFileSync } from "fs";
import process from "process";
import * as XLSX from "xlsx";
import {
  insertMaterialSpendImportRows,
  validateMaterialSpendImportRows,
  type MaterialSpendExcelRow,
} from "@/lib/bis/material-spend-import";

function readArg(name: string) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];

  return null;
}

async function main() {
  const filePath = readArg("--file");
  const organizationId = readArg("--organizationId");
  const siteId = readArg("--siteId");
  const userId = readArg("--userId");
  const importBatchId = readArg("--importBatchId") ?? undefined;
  const commit = process.argv.includes("--commit");

  if (!filePath || !organizationId || !siteId) {
    throw new Error("Usage: tsx scripts/import-material-spend.ts --file <xlsx> --organizationId <id> --siteId <id> [--userId <id>] [--importBatchId <id>] [--commit]");
  }

  const workbook = XLSX.read(readFileSync(filePath), {
    type: "buffer",
    cellDates: false,
  });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    throw new Error("Excel file has no sheets.");
  }

  const excelRows = XLSX.utils.sheet_to_json<MaterialSpendExcelRow>(workbook.Sheets[firstSheet], {
    defval: "",
    raw: false,
  });
  const validation = validateMaterialSpendImportRows(excelRows);

  console.log(JSON.stringify({
    mode: commit ? "commit" : "staging",
    filePath,
    sheet: firstSheet,
    ok: validation.ok,
    excelRowCount: validation.excelRowCount,
    parsedRowCount: validation.parsedRowCount,
    emptySupplierRows: validation.emptySupplierRows,
    skippedEmptyCostRows: validation.skippedEmptyCostRows,
    missingColumns: validation.missingColumns,
    errors: validation.errors,
  }, null, 2));

  if (!validation.ok) {
    process.exitCode = 1;
    return;
  }

  if (!commit) {
    return;
  }

  const result = await insertMaterialSpendImportRows({
    organizationId,
    siteId,
    userId,
    rows: validation.rows,
    importBatchId,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
