import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const file = "g:/My Drive/worksRecorded/companies/ProDev/Technical Task/L6_BIS (02.10.-09.10. ).xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
console.log((await workbook.inspect({ kind: "workbook,sheet", maxChars: 10000 })).ndjson);
const sheets = [];
for (let i = 0; ; i += 1) {
  let sheet;
  try { sheet = workbook.worksheets.getItemAt(i); } catch { break; }
  if (!sheet) break;
  const range = sheet.getUsedRange();
  const values = range.values;
  sheets.push({ name: sheet.name, values });
  console.log(JSON.stringify({ sheet: sheet.name, rows: values.length, sample: values.slice(0, 21) }));
}
await fs.writeFile(new URL("./sheets.json", import.meta.url), JSON.stringify(sheets));
