import {
  getDefaultConstructionProductivitySettings,
  normalizeDefaultConstructionWorkSettings,
} from "./site-diary-productivity-settings";

describe("default-construction productivity settings", () => {
  it("adds blank tracker fields to existing works when no settings exist", () => {
    expect(
      getDefaultConstructionProductivitySettings({
        Works: { DropDownOptions: { Masonry: "Masonry" } },
      }).works,
    ).toEqual([
      {
        work: "Masonry",
        unit: "",
        laborNormHoursPerUnit: null,
        hourlyCost: null,
      },
    ]);
  });

  it("matches saved settings case-insensitively and drops deleted works", () => {
    const result = getDefaultConstructionProductivitySettings({
      Works: { DropDownOptions: { Masonry: "Masonry" } },
      otherSettings: {
        defaultConstructionProductivity: {
          version: 1,
          works: [
            { work: "masonry", unit: "m2", laborNormHoursPerUnit: 0.4, hourlyCost: 18.5 },
            { work: "Deleted", unit: "pcs", laborNormHoursPerUnit: 1 },
          ],
        },
      },
    });

    expect(result.works).toEqual([
      {
        work: "Masonry",
        unit: "m2",
        laborNormHoursPerUnit: 0.4,
        hourlyCost: 18.5,
      },
    ]);
  });

  it("orders dropdown works by numeric prefixes", () => {
    const result = getDefaultConstructionProductivitySettings({
      Works: {
        DropDownOptions: {
          "18.1 Dažādi darbi": "18.1 Dažādi darbi",
          Piezīmes: "Piezīmes",
          "3.1 Grīdu flīzēšana": "3.1 Grīdu flīzēšana",
          "1.10 Demontāža": "1.10 Demontāža",
          "1.9 Demontāža": "1.9 Demontāža",
        },
      },
    });

    expect(result.works.map((row) => row.work)).toEqual([
      "1.9 Demontāža",
      "1.10 Demontāža",
      "3.1 Grīdu flīzēšana",
      "18.1 Dažādi darbi",
      "Piezīmes",
    ]);
  });

  it("preserves a setting when its work is renamed in the structured editor", () => {
    expect(
      normalizeDefaultConstructionWorkSettings([
        {
          work: "New work name",
          unit: "m3",
          laborNormHoursPerUnit: 0.75,
          hourlyCost: 22,
        },
      ]),
    ).toEqual([
      {
        work: "New work name",
        unit: "m3",
        laborNormHoursPerUnit: 0.75,
        hourlyCost: 22,
      },
    ]);
  });

  it("rejects non-positive norms", () => {
    expect(() =>
      normalizeDefaultConstructionWorkSettings([
        { work: "Masonry", unit: "m2", laborNormHoursPerUnit: 0 },
      ]),
    ).toThrow("Time norm");
  });

  it("preserves a zero hourly cost", () => {
    expect(
      normalizeDefaultConstructionWorkSettings([
        {
          work: "No labor cost",
          unit: "m2",
          laborNormHoursPerUnit: 0.5,
          hourlyCost: 0,
        },
      ]),
    ).toEqual([
      {
        work: "No labor cost",
        unit: "m2",
        laborNormHoursPerUnit: 0.5,
        hourlyCost: 0,
      },
    ]);
  });

  it("rejects negative hourly cost", () => {
    expect(() =>
      normalizeDefaultConstructionWorkSettings([
        {
          work: "Masonry",
          unit: "m2",
          laborNormHoursPerUnit: 0.5,
          hourlyCost: -1,
        },
      ]),
    ).toThrow("Hourly cost");
  });
});
