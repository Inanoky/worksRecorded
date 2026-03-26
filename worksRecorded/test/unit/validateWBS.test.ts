import { validateWBS } from "@/lib/utils/SiteDiary/Settings/validateWBS";

describe("validateWBS", () => {
  it("accepts valid top-level and nested cascade", () => {
    const rows = [
      ["Task", "Type", "WBS"],
      ["Site", "Location", "1"],
      ["Foundation", "Work", "1.1"],
      ["Walls", "Work", "1.2"],
      ["Roof", "Work", "2"],
      ["Roof membrane", "Work", "2.1"],
    ];

    expect(() => validateWBS(rows)).not.toThrow();
  });

  it("rejects invalid format", () => {
    const rows = [
      ["Task", "Type", "WBS"],
      ["Site", "Location", "A.1"],
    ];

    expect(() => validateWBS(rows)).toThrow(/Invalid WBS format/i);
  });

  it("rejects child without parent", () => {
    const rows = [
      ["Task", "Type", "WBS"],
      ["Orphan child", "Work", "2.1"],
    ];

    expect(() => validateWBS(rows)).toThrow(/missing parent/i);
  });

  it("rejects top-level branch going backwards", () => {
    const rows = [
      ["Task", "Type", "WBS"],
      ["Branch 2", "Location", "2"],
      ["Branch 1", "Location", "1"],
    ];

    expect(() => validateWBS(rows)).toThrow(/out of order/i);
  });
});
