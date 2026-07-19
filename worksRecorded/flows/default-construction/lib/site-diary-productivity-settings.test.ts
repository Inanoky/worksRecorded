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
      { work: "Masonry", unit: "", laborNormHoursPerUnit: null },
    ]);
  });

  it("matches saved settings case-insensitively and drops deleted works", () => {
    const result = getDefaultConstructionProductivitySettings({
      Works: { DropDownOptions: { Masonry: "Masonry" } },
      otherSettings: {
        defaultConstructionProductivity: {
          version: 1,
          works: [
            { work: "masonry", unit: "m2", laborNormHoursPerUnit: 0.4 },
            { work: "Deleted", unit: "pcs", laborNormHoursPerUnit: 1 },
          ],
        },
      },
    });

    expect(result.works).toEqual([
      { work: "Masonry", unit: "m2", laborNormHoursPerUnit: 0.4 },
    ]);
  });

  it("preserves a setting when its work is renamed in the structured editor", () => {
    expect(
      normalizeDefaultConstructionWorkSettings([
        { work: "New work name", unit: "m3", laborNormHoursPerUnit: 0.75 },
      ]),
    ).toEqual([
      { work: "New work name", unit: "m3", laborNormHoursPerUnit: 0.75 },
    ]);
  });

  it("rejects non-positive norms", () => {
    expect(() =>
      normalizeDefaultConstructionWorkSettings([
        { work: "Masonry", unit: "m2", laborNormHoursPerUnit: 0 },
      ]),
    ).toThrow("Time norm");
  });
});
