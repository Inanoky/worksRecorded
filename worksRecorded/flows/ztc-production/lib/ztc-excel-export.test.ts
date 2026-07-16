import { formatZtcRowsForExcel } from "@/flows/ztc-production/lib/ztc-excel-export";

describe("formatZtcRowsForExcel", () => {
  it("keeps additional-detail records and exposes their classification", () => {
    const [exportedRow] = formatZtcRowsForExcel([
      {
        Date: "2026-07-15T11:20:18.672Z",
        Location: "zemgales prospekts 11 (zp)",
        Location_Custom_1: "3S-02",
        Works: "cilpu iestrāde",
        Works_Custom_1: "Papilddetāļas",
        Units: "gab",
        Amounts: 1,
        TimeInvolved: 0,
      },
    ]);

    expect(exportedRow).toEqual(
      expect.objectContaining({
        Darbi: "cilpu iestrāde",
        "Rasējuma darbi": "Papilddetāļas",
        Daudzums: 1,
        Stundas: 0,
      }),
    );
  });

  it("normalizes commas in exported work names", () => {
    const [exportedRow] = formatZtcRowsForExcel([
      {
        Date: "2026-07-16T09:45:00.000Z",
        Works: "R1/T1 - Blue GKFI 12,5",
        Works_Custom_1: "R1/T1 - Blue GKFI 12,5; R2/T2 - Membrāna",
      },
    ]);

    expect(exportedRow.Darbi).toBe("R1/T1 - Blue GKFI 12.5");
    expect(exportedRow["Rasējuma darbi"]).toBe(
      "R1/T1 - Blue GKFI 12.5; R2/T2 - Membrāna",
    );
  });
});
