import {
  assertDefaultConstructionSystemWorksPreserved,
  calculateDefaultConstructionWorkCost,
  createDefaultConstructionRecordCostCalculator,
  DEFAULT_CONSTRUCTION_SYSTEM_WORKS,
  getDefaultConstructionProductivitySettings,
  normalizeDefaultConstructionWorkSettings,
} from "./site-diary-productivity-settings";

describe("default-construction productivity settings", () => {
  it("adds default works and blank tracker fields when no settings exist", () => {
    const result = getDefaultConstructionProductivitySettings({
      Works: { DropDownOptions: { Masonry: "Masonry" } },
    }).works;

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          work: "Masonry",
          unit: "",
          laborNormHoursPerUnit: null,
          hourlyCost: null,
          costCalculationMode: "output",
        }),
        expect.objectContaining({
          work: "Piezīmes",
          source: { type: "systemDefault", locked: true },
        }),
      ]),
    );
    expect(result.map((row) => row.work)).toEqual(
      expect.arrayContaining([...DEFAULT_CONSTRUCTION_SYSTEM_WORKS, "Masonry"]),
    );
  });

  it("de-dupes default works case-insensitively and uses canonical labels", () => {
    const result = getDefaultConstructionProductivitySettings({
      Works: {
        DropDownOptions: {
          custom: "Custom work",
          duplicateDefault: "piezīmes",
        },
      },
    }).works;

    expect(result.filter((row) => row.work === "Piezīmes")).toHaveLength(1);
    expect(result.some((row) => row.work === "piezīmes")).toBe(false);
    expect(result.map((row) => row.work)).toEqual(
      expect.arrayContaining(["Custom work", "Piezīmes"]),
    );
  });

  it("preserves custom saved settings and drops non-dropdown deleted works", () => {
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

    expect(result.works).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          work: "Masonry",
          unit: "m2",
          laborNormHoursPerUnit: 0.4,
          hourlyCost: 18.5,
          costCalculationMode: "output",
        }),
      ]),
    );
    expect(result.works.some((row) => row.work === "Deleted")).toBe(false);
  });

  it("rejects removing or renaming a default work", () => {
    expect(() =>
      assertDefaultConstructionSystemWorksPreserved(
        DEFAULT_CONSTRUCTION_SYSTEM_WORKS.filter(
          (work) => work !== "Piezīmes",
        ).map((work) => ({
          work,
          unit: "",
          laborNormHoursPerUnit: null,
        })),
      ),
    ).toThrow("Default work names cannot be renamed or deleted");

    expect(() =>
      assertDefaultConstructionSystemWorksPreserved(
        DEFAULT_CONSTRUCTION_SYSTEM_WORKS.map((work) => ({
          work: work === "Piezīmes" ? "Piezimes" : work,
          unit: "",
          laborNormHoursPerUnit: null,
        })),
      ),
    ).toThrow("Default work names cannot be renamed or deleted");
  });

  it("accepts defaults plus custom works", () => {
    expect(() =>
      assertDefaultConstructionSystemWorksPreserved([
        ...DEFAULT_CONSTRUCTION_SYSTEM_WORKS.map((work) => ({
          work,
          unit: "",
          laborNormHoursPerUnit: null,
        })),
        {
          work: "Custom work",
          unit: "m2",
          laborNormHoursPerUnit: 1,
        },
      ]),
    ).not.toThrow();
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

    expect(result.works.map((row) => row.work).slice(0, 4)).toEqual([
      "1.9 Demontāža",
      "1.10 Demontāža",
      "3.1 Grīdu flīzēšana",
      "18.1 Dažādi darbi",
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

  it("calculates a record cost from the saved work mode", () => {
    const calculateRecordCost = createDefaultConstructionRecordCostCalculator({
      Works: {
        DropDownOptions: {
          output: "Masonry",
          hourly: "Preparation",
        },
      },
      otherSettings: {
        defaultConstructionProductivity: {
          version: 4,
          works: [
            {
              work: "Masonry",
              unit: "m2",
              laborNormHoursPerUnit: 0.5,
              hourlyCost: 20,
              costCalculationMode: "output",
            },
            {
              work: "Preparation",
              unit: "h",
              laborNormHoursPerUnit: null,
              hourlyCost: 15,
              costCalculationMode: "hourly",
            },
          ],
        },
      },
    });

    expect(
      calculateRecordCost({
        Works: "masonry",
        Units: "m2",
        Amounts: "10",
      }).actualCost,
    ).toBe(100);
    expect(
      calculateRecordCost({
        Works: "Preparation",
        WorkersInvolved: "3",
        TimeInvolved: "2",
      }).actualCost,
    ).toBe(90);

    const calculateProfileRecordCost =
      createDefaultConstructionRecordCostCalculator({
        Works: {
          DropDownOptions: { output: "Masonry" },
        },
        otherSettings: {
          defaultConstructionProductivity: {
            version: 4,
            works: [
              {
                work: "Masonry",
                unit: "m2",
                laborNormHoursPerUnit: 0.5,
                hourlyCost: 20,
                costCalculationMode: "output",
              },
            ],
          },
          defaultConstructionQuantityPlanActual: { enabled: true },
        },
      });

    expect(
      calculateProfileRecordCost({
        Works: "Masonry",
        Units: "m2",
        Amounts: "100",
        Comments_Custom_1: "12",
      }).actualCost,
    ).toBe(120);
  });
});
