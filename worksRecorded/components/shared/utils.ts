"use client"

import * as XLSX from "xlsx";




// -- Helper to get unique values for column filtering --
export function getUniqueValues(data, key) {
  return Array.from(new Set(data.map(row => row[key] ?? "")));
}



// -- Excel export using SheetJS --
export function exportToExcel(headers, rows) {
  const worksheetData = [
    headers,
    ...rows.map(row => headers.map(h => row[h] ?? ""))
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, "table_data.xlsx");
}