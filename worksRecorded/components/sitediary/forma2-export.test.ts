import { buildForma2Rows } from "@/components/sitediary/forma2-export";

describe("buildForma2Rows", () => {
  it("groups matching works and units and sums quantity and hours", () => {
    expect(
      buildForma2Rows([
        { Works: "Sienu izbūve", Units: "m2", Amounts: 10, TimeInvolved: 2 },
        { Works: "Sienu izbūve", Units: "m2", Amounts: "5,5", TimeInvolved: 1.25 },
      ]),
    ).toEqual([
      {
        Darbi: "Sienu izbūve",
        "Mērv.": "m2",
        Daudzums: 15.5,
        Stundas: 3.25,
      },
    ]);
  });

  it("keeps the same work with different units in separate rows", () => {
    expect(
      buildForma2Rows([
        { Works: "Tīrīšana", Units: "m2", Amounts: 20, TimeInvolved: 2 },
        { Works: "Tīrīšana", Units: "st", Amounts: 3, TimeInvolved: 3 },
      ]),
    ).toHaveLength(2);
  });

  it("omits records without a work name", () => {
    expect(
      buildForma2Rows([
        { Works: " ", Units: "m2", Amounts: 10, TimeInvolved: 2 },
      ]),
    ).toEqual([]);
  });
});
