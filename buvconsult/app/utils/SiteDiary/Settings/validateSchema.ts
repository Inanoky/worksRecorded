import * as XLSX from "xlsx";
import { validateWBS } from "./validateWBS";

export function validateExcel(fileBuffer: Buffer) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // ✅ Filter out completely empty rows
  const nonEmptyRows = rows.filter(
    r => r.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "")
  );

  // ✅ If file has no data rows (only headers or fully empty)
  if (nonEmptyRows.length <= 1) {
    throw new Error("Excel validation failed: file is empty (no tasks found).");
  }

  // 1. Validate only columns A, B, C
  nonEmptyRows.forEach((row, idx) => {
    if (row.length > 3) {
      throw new Error("Excel validation failed: Data found outside columns A–C");
    }
  });

// 2. Check Task, Task Type, WBS present
for (const row of nonEmptyRows.slice(1)) { // skip header
  const [task, taskType, wbs] = row;

  // Skip completely empty rows (already filtered, but just in case)
  if (!task && !taskType && !wbs) continue;

  if (!task || !taskType || !wbs) {
    throw new Error("Excel validation failed: Missing Task/Task Type/WBS");
  }

  // ✅ Case-insensitive Task Type validation
  const validTypes = ["location", "work"];
  const typeStr = String(taskType).trim().toLowerCase();
  if (!validTypes.includes(typeStr)) {
    throw new Error(
      `Excel validation failed: Invalid Task Type "${taskType}". Must be "Location" or "Work".`
    );
  }
}


  // 3. Validate WBS structure cascade
  validateWBS(nonEmptyRows);

  return true;
}
