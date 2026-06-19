export type Forma2SourceRow = {
  Works?: string | null;
  Units?: string | null;
  Amounts?: number | string | null;
  TimeInvolved?: number | string | null;
};

export type Forma2Row = {
  Darbi: string;
  "Mērv.": string;
  Daudzums: number;
  Stundas: number;
};

function parseForma2Number(value: unknown) {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundForma2Number(value: number) {
  return Number(value.toFixed(2));
}

export function buildForma2Rows(rows: Forma2SourceRow[]): Forma2Row[] {
  const grouped = new Map<string, Forma2Row>();

  rows.forEach((row) => {
    const work = String(row.Works ?? "").trim();
    if (!work) return;

    const unit = String(row.Units ?? "").trim();
    const key = `${work.toLocaleLowerCase("lv")}::${unit.toLocaleLowerCase("lv")}`;
    const current = grouped.get(key) ?? {
      Darbi: work,
      "Mērv.": unit,
      Daudzums: 0,
      Stundas: 0,
    };

    current.Daudzums += parseForma2Number(row.Amounts);
    current.Stundas += parseForma2Number(row.TimeInvolved);
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      Daudzums: roundForma2Number(row.Daudzums),
      Stundas: roundForma2Number(row.Stundas),
    }))
    .sort(
      (a, b) =>
        a.Darbi.localeCompare(b.Darbi, "lv") ||
        a["Mērv."].localeCompare(b["Mērv."], "lv"),
    );
}

export async function exportForma2ToExcel(rows: Forma2SourceRow[]) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(buildForma2Rows(rows), {
    header: ["Darbi", "Mērv.", "Daudzums", "Stundas"],
  });
  worksheet["!cols"] = [
    { wch: 48 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Forma 2");
  XLSX.writeFile(workbook, "Forma-2.xlsx");
}
