import {
  calculateDefaultConstructionWorkCost,
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
        costCalculationMode: "output",
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
            {
              work: "masonry",
              unit: "m2",
              laborNormHoursPerUnit: 0.4,
              hourlyCost: 18.5,
            },
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
        costCalculationMode: "output",
      },
    ]);
  });

  it("preserves the visible checkbox choice while migrating version 3", () => {
    const result = getDefaultConstructionProductivitySettings({
      Works: {
        DropDownOptions: { Unchecked: "Unchecked", Checked: "Checked" },
      },
      otherSettings: {
        defaultConstructionProductivity: {
          version: 3,
          works: [
            { work: "Unchecked", costCalculationMode: "hourly" },
            { work: "Checked", costCalculationMode: "output" },
          ],
        },
      },
    });

    expect(result.version).toBe(4);
    expect(result.works).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          work: "Unchecked",
          costCalculationMode: "output",
        }),
        expect.objectContaining({
          work: "Checked",
          costCalculationMode: "hourly",
        }),
      ]),
    );
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
          costCalculationMode: "output",
        },
      ]),
    ).toEqual([
      {
        work: "New work name",
        unit: "m3",
        laborNormHoursPerUnit: 0.75,
        hourlyCost: 22,
        costCalculationMode: "output",
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
        costCalculationMode: "output",
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

  it("switches factual cost between output and hourly formulas", () => {
    const common = {
      unit: "m2",
      amount: 10,
      hours: 100,
    };
    const setting = {
      work: "Masonry",
      unit: "m2",
      laborNormHoursPerUnit: 0.5,
      hourlyCost: 20,
    };

    expect(
      calculateDefaultConstructionWorkCost({
        ...common,
        setting: { ...setting, costCalculationMode: "output" },
      }),
    ).toMatchObject({ unitRate: 10, actualCost: 100 });
    expect(
      calculateDefaultConstructionWorkCost({
        ...common,
        setting: { ...setting, costCalculationMode: "hourly" },
      }),
    ).toMatchObject({ hourlyRate: 20, actualCost: 2000 });
  });
});
