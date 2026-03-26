import * as XLSX from "xlsx";
import { validateExcel } from "@/lib/utils/SiteDiary/Settings/validateSchema";

function buildWorkbook(rows: any[][]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("validateExcel", () => {
  it("accepts a valid A-C only task sheet", () => {
    const file = buildWorkbook([
      ["Task", "Task Type", "WBS"],
      ["Main site", "Location", "1"],
      ["Pour concrete", "Work", "1.1"],
    ]);

    expect(validateExcel(file)).toBe(true);
  });

  it("rejects workbook with no data rows", () => {
    const file = buildWorkbook([["Task", "Task Type", "WBS"]]);
    expect(() => validateExcel(file)).toThrow(/file is empty/i);
  });

  it("rejects data outside columns A-C", () => {
    const file = buildWorkbook([
      ["Task", "Task Type", "WBS", "Unexpected"],
      ["Main site", "Location", "1", "extra"],
    ]);

    expect(() => validateExcel(file)).toThrow(/outside columns A–C/i);
  });

  it("rejects invalid task type", () => {
    const file = buildWorkbook([
      ["Task", "Task Type", "WBS"],
      ["Main site", "SomethingElse", "1"],
    ]);

    expect(() => validateExcel(file)).toThrow(/Invalid Task Type/i);
  });

  it("rejects missing task columns", () => {
    const file = buildWorkbook([
      ["Task", "Task Type", "WBS"],
      ["Main site", "Location", ""],
    ]);

    expect(() => validateExcel(file)).toThrow(/Missing Task\/Task Type\/WBS/i);
  });
});
