import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const sourcePath = "G:/My Drive/worksRecorded/companies/limeni.lv/Technical task/Apaksuznemeja_ligums_P02_(Tāme)_033 I  Šmerļa ielā 3a, Rīgā 16.06  (Bukoteks) AB (2).xlsx";
const outputPath = path.resolve(
  process.cwd(),
  "../outputs/estimate-grouping-smerla/Smerla_iela_3a_grupeta_tame.xlsx",
);

if (process.argv.includes("--restore-cached-values")) {
  const originalWorkbook = XLSX.readFile(sourcePath, {
    cellFormula: true,
    cellStyles: true,
    cellDates: true,
  });
  const finalWorkbook = XLSX.readFile(outputPath, {
    cellFormula: true,
    cellStyles: true,
    cellDates: true,
  });
  const originalSheet = originalWorkbook.Sheets[originalWorkbook.SheetNames[0]];
  const auditSheet = finalWorkbook.Sheets["Oriģinālā tāme"];

  for (const [address, originalCell] of Object.entries(originalSheet)) {
    if (address.startsWith("!") || !originalCell?.f || !auditSheet[address]) continue;
    auditSheet[address].v = originalCell.v;
    auditSheet[address].w = originalCell.w;
    auditSheet[address].t = originalCell.t;
  }

  finalWorkbook.Workbook ??= {};
  finalWorkbook.Workbook.CalcPr = {
    ...(finalWorkbook.Workbook.CalcPr ?? {}),
    calcMode: "manual",
    calcOnSave: false,
    fullCalcOnLoad: false,
    forceFullCalc: false,
  };
  XLSX.writeFile(finalWorkbook, outputPath, {
    bookType: "xlsx",
    cellStyles: true,
    compression: true,
  });
  console.log(JSON.stringify({ outputPath, restoredFormulaCaches: true }, null, 2));
  process.exit(0);
}

const workbook = XLSX.readFile(sourcePath, {
  cellFormula: true,
  cellStyles: true,
  cellDates: true,
});

const sourceSheetName = workbook.SheetNames[0];
const sourceSheet = workbook.Sheets[sourceSheetName];
const auditSheetName = "Oriģinālā tāme";

if (sourceSheetName !== auditSheetName) {
  workbook.Sheets[auditSheetName] = sourceSheet;
  delete workbook.Sheets[sourceSheetName];
  workbook.SheetNames = workbook.SheetNames.map((name) =>
    name === sourceSheetName ? auditSheetName : name,
  );
}

const groupedSheet = {};
const merges = [];
const rowHeights = [];
const detailRows = [];
const subtotalRows = [];

const palette = {
  navy: "1F4E78",
  blue: "D9EAF7",
  paleBlue: "EAF3F8",
  light: "F4F7FA",
  gold: "FFF2CC",
  green: "E2F0D9",
  white: "FFFFFF",
  dark: "1F2937",
  border: "9CA3AF",
};

const border = {
  top: { style: "thin", color: { rgb: palette.border } },
  bottom: { style: "thin", color: { rgb: palette.border } },
  left: { style: "thin", color: { rgb: palette.border } },
  right: { style: "thin", color: { rgb: palette.border } },
};

const styles = {
  title: {
    font: { name: "Arial", sz: 16, bold: true, color: { rgb: palette.white } },
    fill: { patternType: "solid", fgColor: { rgb: palette.navy } },
    alignment: { horizontal: "left", vertical: "center" },
  },
  meta: {
    font: { name: "Arial", sz: 10, bold: true, color: { rgb: palette.dark } },
    fill: { patternType: "solid", fgColor: { rgb: palette.paleBlue } },
    alignment: { vertical: "center" },
  },
  note: {
    font: { name: "Arial", sz: 9, italic: true, color: { rgb: "4B5563" } },
    fill: { patternType: "solid", fgColor: { rgb: palette.light } },
    alignment: { wrapText: true, vertical: "center" },
  },
  header: {
    font: { name: "Arial", sz: 9, bold: true, color: { rgb: palette.white } },
    fill: { patternType: "solid", fgColor: { rgb: palette.navy } },
    alignment: { wrapText: true, horizontal: "center", vertical: "center" },
    border,
  },
  group: {
    font: { name: "Arial", sz: 10, bold: true, color: { rgb: palette.dark } },
    fill: { patternType: "solid", fgColor: { rgb: palette.blue } },
    alignment: { vertical: "center" },
    border,
  },
  text: {
    font: { name: "Arial", sz: 9, color: { rgb: palette.dark } },
    alignment: { wrapText: true, vertical: "center" },
    border,
  },
  center: {
    font: { name: "Arial", sz: 9, color: { rgb: palette.dark } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  },
  number: {
    font: { name: "Arial", sz: 9, color: { rgb: palette.dark } },
    alignment: { horizontal: "right", vertical: "center" },
    border,
    numFmt: "#,##0.00",
  },
  subtotal: {
    font: { name: "Arial", sz: 9, bold: true, color: { rgb: palette.dark } },
    fill: { patternType: "solid", fgColor: { rgb: palette.light } },
    alignment: { horizontal: "right", vertical: "center" },
    border,
    numFmt: "#,##0.00",
  },
  total: {
    font: { name: "Arial", sz: 10, bold: true, color: { rgb: palette.dark } },
    fill: { patternType: "solid", fgColor: { rgb: palette.gold } },
    alignment: { horizontal: "right", vertical: "center" },
    border,
    numFmt: "#,##0.00",
  },
  grandTotal: {
    font: { name: "Arial", sz: 11, bold: true, color: { rgb: palette.white } },
    fill: { patternType: "solid", fgColor: { rgb: palette.navy } },
    alignment: { horizontal: "right", vertical: "center" },
    border,
    numFmt: "#,##0.00",
  },
  control: {
    font: { name: "Arial", sz: 9, bold: true, color: { rgb: "375623" } },
    fill: { patternType: "solid", fgColor: { rgb: palette.green } },
    alignment: { horizontal: "right", vertical: "center" },
    border,
    numFmt: "#,##0.00;[Red]-#,##0.00;—",
  },
};

function setCell(address, value, style) {
  const cell = typeof value === "object" && value !== null && ("v" in value || "f" in value)
    ? { ...value }
    : { t: typeof value === "number" ? "n" : "s", v: value };
  if (style) cell.s = style;
  groupedSheet[address] = cell;
}

function mergeRow(row, startColumn, endColumn) {
  merges.push({ s: { r: row - 1, c: startColumn - 1 }, e: { r: row - 1, c: endColumn - 1 } });
}

function sourceValue(column, row) {
  return Number(sourceSheet[`${column}${row}`]?.v ?? 0);
}

function sourceText(column, row) {
  return String(sourceSheet[`${column}${row}`]?.v ?? "");
}

function sumRows(column, rows) {
  return Math.round(rows.reduce((sum, row) => sum + sourceValue(column, row), 0) * 100) / 100;
}

function sourceFormula(column, rows) {
  const refs = rows.map((row) => `'${auditSheetName}'!${column}${row}`);
  return rows.length === 1 ? refs[0] : `SUM(${refs.join(",")})`;
}

function roundedSourceFormula(column, rows) {
  const terms = rows.map((row) => `ROUND('${auditSheetName}'!${column}${row},2)`);
  return terms.length === 1 ? terms[0] : `SUM(${terms.join(",")})`;
}

function preservedValueFormula(column, rows) {
  const values = rows.map((row) => sourceValue(column, row).toFixed(2));
  return values.length === 1 ? values[0] : `SUM(${values.join(",")})`;
}

function formulaCell(formula, cachedValue) {
  return { t: "n", f: formula, v: cachedValue };
}

setCell("A1", "Cenu piedāvājums Nr.G 033 V/26 I — grupēts pēc līdzīgiem darbiem", styles.title);
mergeRow(1, 1, 15);
rowHeights[0] = { hpt: 28 };

setCell("A2", "OBJEKTS: Šmerļa ielā 3a, Rīgā.", styles.meta);
mergeRow(2, 1, 11);
setCell("L2", "Datums: 16.06.2026", styles.meta);
mergeRow(2, 12, 15);
rowHeights[1] = { hpt: 20 };

setCell(
  "A4",
  "Vienā rindā apvienotas tikai salīdzināmas pozīcijas ar vienādu efektīvo biezumu un vienības izmaksām. Kolonnā “Avota pozīcijas” saglabāta saite uz sākotnējās tāmes sadaļām.",
  styles.note,
);
mergeRow(4, 1, 15);
rowHeights[3] = { hpt: 30 };

const headers = [
  "Npk.",
  "Darbu grupa",
  "Darbu un izdevumu nosaukums",
  "Biezums / mm",
  "Mērv.",
  "Daudzums",
  "Darbs / vien.",
  "Materiāli / vien.",
  "Mehānismi / vien.",
  "Vienības cena",
  "Darbs kopā",
  "Materiāli kopā",
  "Mehānismi kopā",
  "Summa EUR",
  "Avota pozīcijas",
];

headers.forEach((header, index) => setCell(`${XLSX.utils.encode_col(index)}6`, header, styles.header));
rowHeights[5] = { hpt: 36 };

const groups = [
  {
    name: "1. Sagatavošana un pamatne",
    rows: [
      {
        name: "Smilts līdzināšana (vid. 25 mm)",
        sourceRows: [62, 67, 72, 77],
        sourcePositions: "PA1.6; PA1.7; PA1.8; PA1.9",
      },
    ],
  },
  {
    name: "2. Siltumizolācija",
    rows: [
      {
        name: "ThermoWhite izolācijas slānis (vid. 45 mm)",
        sourceRows: [42, 50, 55],
        sourcePositions: "PA1.1; PA1.3; PA1.4",
      },
      {
        name: "XPS putupolistirols 300 kPa (150 mm)",
        sourceRows: [63, 68, 73, 78],
        sourcePositions: "PA1.6; PA1.7; PA1.8; PA1.9",
      },
    ],
  },
  {
    name: "3. Plēves un starpslāņi",
    rows: [
      {
        name: "PEPI TRAFO 7 mm starpslānis",
        sourceRows: [43, 47, 51, 56],
        sourcePositions: "PA1.1; PA1.2; PA1.3; PA1.4",
      },
      {
        name: "Plēve atbilstoši ThermoWhite sistēmai",
        sourceRows: [44, 52, 57],
        sourcePositions: "PA1.1; PA1.3; PA1.4",
      },
      {
        name: "Hidroizolācijas plēve",
        sourceRows: [64, 69, 74, 79],
        sourcePositions: "PA1.6; PA1.7; PA1.8; PA1.9",
      },
    ],
  },
  {
    name: "4. Betona un Estrich grīdas",
    rows: [
      {
        name: "Sausā betona grīda (vid. 60 mm)",
        sourceRows: [41, 49, 54, 76],
        sourcePositions: "PA1.1; PA1.3; PA1.4; PA1.9",
      },
      {
        name: "Sausā betona grīda (vid. 85 mm)",
        sourceRows: [46],
        sourcePositions: "PA1.2",
      },
      {
        name: "Sausā betona grīda (vid. 120 mm)",
        sourceRows: [59],
        sourcePositions: "PA1.5",
      },
      {
        name: "Sausā betona grīda (vid. 70 mm)",
        sourceRows: [61],
        sourcePositions: "PA1.6",
      },
      {
        name: "Sausā betona grīda (vid. 55 mm)",
        sourceRows: [66],
        sourcePositions: "PA1.7",
      },
      {
        name: sourceText("C", 71) || "Dzelzsbetona grīda C25/30",
        sourceRows: [71],
        sourcePositions: "PA1.8",
      },
    ],
  },
];

let currentRow = 7;
let itemNumber = 1;

for (const group of groups) {
  const groupStart = currentRow;
  setCell(`A${currentRow}`, group.name, styles.group);
  mergeRow(currentRow, 1, 15);
  rowHeights[currentRow - 1] = { hpt: 20 };
  currentRow += 1;

  const groupDetailRows = [];
  for (const item of group.rows) {
    const firstSourceRow = item.sourceRows[0];
    const row = currentRow;
    groupDetailRows.push(row);
    detailRows.push(row);

    setCell(`A${row}`, itemNumber, styles.center);
    setCell(`B${row}`, group.name.replace(/^\d+\.\s*/, ""), styles.text);
    setCell(`C${row}`, item.name, styles.text);
    setCell(`D${row}`, sourceSheet[`D${firstSourceRow}`]?.v ?? "", styles.center);
    setCell(`E${row}`, sourceText("E", firstSourceRow), styles.center);
    setCell(`F${row}`, formulaCell(sourceFormula("F", item.sourceRows), sumRows("F", item.sourceRows)), styles.number);
    setCell(`G${row}`, formulaCell(sourceFormula("G", [firstSourceRow]), sourceValue("G", firstSourceRow)), styles.number);
    setCell(`H${row}`, formulaCell(sourceFormula("H", [firstSourceRow]), sourceValue("H", firstSourceRow)), styles.number);
    setCell(`I${row}`, formulaCell(sourceFormula("I", [firstSourceRow]), sourceValue("I", firstSourceRow)), styles.number);
    setCell(`J${row}`, formulaCell(`SUM(G${row}:I${row})`, sumRows("J", [firstSourceRow])), styles.number);
    setCell(`K${row}`, formulaCell(sourceFormula("K", item.sourceRows), sumRows("K", item.sourceRows)), styles.number);
    setCell(`L${row}`, formulaCell(sourceFormula("L", item.sourceRows), sumRows("L", item.sourceRows)), styles.number);
    setCell(`M${row}`, formulaCell(sourceFormula("M", item.sourceRows), sumRows("M", item.sourceRows)), styles.number);
    setCell(`N${row}`, formulaCell(preservedValueFormula("N", item.sourceRows), sumRows("N", item.sourceRows)), styles.number);
    setCell(`O${row}`, item.sourcePositions, styles.center);
    rowHeights[row - 1] = { hpt: 30 };

    itemNumber += 1;
    currentRow += 1;
  }

  const subtotalRow = currentRow;
  subtotalRows.push(subtotalRow);
  setCell(`A${subtotalRow}`, "Grupas starpsumma", styles.subtotal);
  mergeRow(subtotalRow, 1, 9);
  setCell(`J${subtotalRow}`, "", styles.subtotal);
  for (const column of ["K", "L", "M", "N"]) {
    const cached = Math.round(groupDetailRows.reduce((sum, row) => sum + Number(groupedSheet[`${column}${row}`]?.v ?? 0), 0) * 100) / 100;
    setCell(
      `${column}${subtotalRow}`,
      formulaCell(`SUM(${column}${groupDetailRows[0]}:${column}${groupDetailRows.at(-1)})`, cached),
      styles.subtotal,
    );
  }
  setCell(`O${subtotalRow}`, "", styles.subtotal);
  rowHeights[subtotalRow - 1] = { hpt: 19 };
  currentRow += 2;

  if (groupStart === currentRow) throw new Error("Group did not advance rows");
}

const baseTotal = Math.round(subtotalRows.reduce((sum, row) => sum + Number(groupedSheet[`N${row}`]?.v ?? 0), 0) * 100) / 100;
const overheadRate = Number(sourceSheet.J83?.v ?? 0.05);
const overhead = Math.round(baseTotal * overheadRate * 100) / 100;
const grandTotal = Math.round((baseTotal + overhead) * 100) / 100;

const baseTotalRow = currentRow;
setCell(`A${baseTotalRow}`, "DARBU IZMAKSAS KOPĀ", styles.total);
mergeRow(baseTotalRow, 1, 13);
setCell(
  `N${baseTotalRow}`,
  formulaCell(`SUM(${subtotalRows.map((row) => `N${row}`).join(",")})`, baseTotal),
  styles.total,
);
setCell(`O${baseTotalRow}`, "", styles.total);

const overheadRow = currentRow + 1;
setCell(`A${overheadRow}`, "Virsizdevumi", styles.total);
mergeRow(overheadRow, 1, 9);
setCell(`J${overheadRow}`, overheadRate, { ...styles.total, numFmt: "0%" });
mergeRow(overheadRow, 10, 13);
setCell(`N${overheadRow}`, formulaCell(`ROUND(N${baseTotalRow}*J${overheadRow},2)`, overhead), styles.total);
setCell(`O${overheadRow}`, "", styles.total);

const grandTotalRow = currentRow + 2;
setCell(`A${grandTotalRow}`, "PAVISAM KOPĀ", styles.grandTotal);
mergeRow(grandTotalRow, 1, 13);
setCell(`N${grandTotalRow}`, formulaCell(`N${baseTotalRow}+N${overheadRow}`, grandTotal), styles.grandTotal);
setCell(`O${grandTotalRow}`, "", styles.grandTotal);

const controlRow = currentRow + 4;
setCell(`A${controlRow}`, "Kontrole pret oriģinālās tāmes darbu izmaksām", styles.control);
mergeRow(controlRow, 1, 13);
setCell(
  `N${controlRow}`,
  formulaCell(`N${baseTotalRow}-${sourceValue("N", 82).toFixed(2)}`, 0),
  styles.control,
);
setCell(`O${controlRow}`, "0,00 = sakrīt", styles.control);

let notesRow = controlRow + 3;
setCell(`A${notesRow}`, "Sākotnējās tāmes piezīmes un nosacījumi", styles.group);
mergeRow(notesRow, 1, 15);
notesRow += 1;

for (let sourceRow = 83; sourceRow <= 98; sourceRow += 1) {
  const values = [];
  for (let column = 0; column < 16; column += 1) {
    const cell = sourceSheet[`${XLSX.utils.encode_col(column)}${sourceRow}`];
    if (cell?.v !== undefined && cell.v !== "") values.push(String(cell.v));
  }
  if (values.length === 0) continue;
  setCell(`A${notesRow}`, values.join("  "), styles.note);
  mergeRow(notesRow, 1, 15);
  rowHeights[notesRow - 1] = { hpt: 24 };
  notesRow += 1;
}

groupedSheet["!ref"] = `A1:O${notesRow - 1}`;
groupedSheet["!merges"] = merges;
groupedSheet["!rows"] = rowHeights;
groupedSheet["!cols"] = [
  { wch: 7 },
  { wch: 23 },
  { wch: 48 },
  { wch: 13 },
  { wch: 9 },
  { wch: 13 },
  { wch: 13 },
  { wch: 14 },
  { wch: 14 },
  { wch: 14 },
  { wch: 14 },
  { wch: 15 },
  { wch: 15 },
  { wch: 15 },
  { wch: 28 },
];
groupedSheet["!margins"] = { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
groupedSheet["!pageSetup"] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
groupedSheet["!printArea"] = `A1:O${notesRow - 1}`;

workbook.Sheets["Grupēta tāme"] = groupedSheet;
workbook.SheetNames = ["Grupēta tāme", ...workbook.SheetNames.filter((name) => name !== "Grupēta tāme")];
workbook.Workbook ??= {};
workbook.Workbook.CalcPr = {
  calcMode: "manual",
  fullCalcOnLoad: false,
  forceFullCalc: false,
};
workbook.Props = {
  ...(workbook.Props ?? {}),
  Title: "Šmerļa iela 3a — grupēta tāme",
  Subject: "Darbi pārgrupēti pēc līdzīgām pozīcijām",
};

XLSX.writeFile(workbook, outputPath, {
  bookType: "xlsx",
  cellStyles: true,
  compression: true,
});

console.log(JSON.stringify({ outputPath, baseTotal, overhead, grandTotal, detailCount: detailRows.length }, null, 2));
