import { buildDefaultConstructionScopeSummary } from "./site-diary-summary";

describe("default-construction site diary summaries", () => {
  const rows = [
    {
      Date: "2026-07-01T00:00:00.000Z",
      Location: "Floor 1",
      Works: "Masonry",
      Units: "m2",
      Amounts: 12.5,
      WorkersInvolved: 3,
      TimeInvolved: 8,
    },
    {
      Date: "2026-07-03T00:00:00.000Z",
      Location: "Floor 1",
      Works: "masonry",
      Units: "m2",
      Amounts: 7.5,
      WorkersInvolved: 2,
      TimeInvolved: 6,
    },
    {
      Date: "2026-07-02T00:00:00.000Z",
      Location: "Floor 1",
      Works: "Material delivery",
      Units: "tn",
      Amounts: 1.25,
      WorkersInvolved: null,
      TimeInvolved: 1,
    },
  ];

  it("aggregates a location and breaks it down by work and unit", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "location",
      value: "Floor 1",
      rows,
    });

    expect(result).toMatchObject({
      records: 3,
      workers: 5,
      hours: 15,
      quantities: [
        { unit: "m2", amount: 20 },
        { unit: "tn", amount: 1.25 },
      ],
      comparison: { comparableGroups: 0, totalGroups: 2, status: "neutral" },
    });
    expect(result.breakdown).toEqual([
      expect.objectContaining({ label: "Masonry", unit: "m2", amount: 20, hours: 14 }),
      expect.objectContaining({ label: "Material delivery", unit: "tn", amount: 1.25, hours: 1 }),
    ]);
  });

  it("aggregates all project rows with the same mapping rules", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "project",
      value: "project",
      rows: [
        ...rows,
        { ...rows[0], Location: "Floor 2", Amounts: 2.5, TimeInvolved: 1 },
      ],
      productivitySettings: [
        { work: "Masonry", unit: "m2", laborNormHoursPerUnit: 0.5 },
      ],
    });

    expect(result).toMatchObject({
      scope: "project",
      records: 4,
      comparison: {
        comparableGroups: 1,
        totalGroups: 2,
        plannedHours: 11.25,
        actualHours: 15,
        hoursDifference: 3.75,
        status: "behind",
      },
    });
  });

  it("lists productivity-mapped rows before other rows in project summaries", () => {
    const projectRows = [
      { ...rows[0], Works: "A other work", Units: "tn" },
      { ...rows[0], Works: "Z planned work", Units: "m2" },
    ];
    const settings = [
      { work: "Z planned work", unit: "m2", laborNormHoursPerUnit: 0.5 },
    ];

    const project = buildDefaultConstructionScopeSummary({
      scope: "project",
      value: "project",
      rows: projectRows,
      productivitySettings: settings,
    });
    const location = buildDefaultConstructionScopeSummary({
      scope: "location",
      value: "Floor 1",
      rows: projectRows,
      productivitySettings: settings,
    });

    expect(project.breakdown.map((row) => row.label)).toEqual([
      "Z planned work",
      "A other work",
    ]);
    expect(location.breakdown.map((row) => row.label)).toEqual([
      "A other work",
      "Z planned work",
    ]);
  });

  it("groups a clicked work by unit without splitting by location", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "work",
      value: "Masonry",
      rows: [
        ...rows.slice(0, 2),
        { ...rows[0], Location: "Floor 2", Amounts: 4, TimeInvolved: 2 },
        { ...rows[0], Location: "Floor 3", Units: "pcs", Amounts: 3, TimeInvolved: 1 },
      ],
    });

    expect(result.breakdown).toEqual([
      expect.objectContaining({ label: "Masonry", unit: "m2", amount: 24, hours: 16 }),
      expect.objectContaining({ label: "Masonry", unit: "pcs", amount: 3, hours: 1 }),
    ]);
    expect(result.breakdown.every((row) => !row.label.includes("Floor"))).toBe(true);
  });

  it("calculates planned and actual productivity only for a matching unit", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "work",
      value: "Masonry",
      rows: [
        ...rows.slice(0, 2),
        { ...rows[0], Units: "pcs", Amounts: 3, TimeInvolved: 1 },
      ],
      productivitySettings: [
        {
          work: "MASONRY",
          unit: "m2",
          laborNormHoursPerUnit: 0.5,
          hourlyCost: 20,
        },
      ],
    });

    expect(result.breakdown[0]).toMatchObject({
      unit: "m2",
      plannedHours: 10,
      hours: 14,
      plannedNorm: 0.5,
      actualNorm: 0.7,
      hoursDifference: 4,
      normDifference: 0.2,
      hourlyCost: 20,
      plannedCost: 200,
      actualCost: 280,
      costDifference: 80,
      plannedUnitCost: 10,
      actualUnitCost: 14,
      comparisonStatus: "behind",
      matchesConfiguredUnit: true,
      hasConfiguredPlan: true,
      isComparable: true,
    });
    expect(result.breakdown[1]).toMatchObject({
      unit: "pcs",
      plannedHours: null,
      actualNorm: null,
      hoursDifference: null,
      comparisonStatus: "neutral",
      matchesConfiguredUnit: false,
      hasConfiguredPlan: false,
      isComparable: false,
    });
    expect(result.comparison).toEqual({
      comparableGroups: 1,
      totalGroups: 2,
      plannedHours: 10,
      actualHours: 14,
      hoursDifference: 4,
      status: "behind",
      costComparableGroups: 1,
      plannedCost: 200,
      actualCost: 280,
      costDifference: 80,
      costStatus: "behind",
    });
  });

  it("marks work at or below planned hours green", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "work",
      value: "Masonry",
      rows: [{ ...rows[0], Amounts: 10, TimeInvolved: 5 }],
      productivitySettings: [
        { work: "Masonry", unit: "m2", laborNormHoursPerUnit: 0.5 },
      ],
    });

    expect(result.breakdown[0].comparisonStatus).toBe("on_or_ahead");
    expect(result.breakdown[0].hoursDifference).toBe(0);
  });

  it("compares complete rows without treating an incomplete row as zero hours", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "work",
      value: "Masonry",
      rows: [
        { ...rows[0], Amounts: 10, TimeInvolved: 5 },
        { ...rows[0], Amounts: 2, TimeInvolved: null },
      ],
      productivitySettings: [
        {
          work: "Masonry",
          unit: "m2",
          laborNormHoursPerUnit: 1,
          hourlyCost: 20,
        },
      ],
    });

    expect(result.breakdown[0]).toMatchObject({
      amount: 12,
      hours: 5,
      comparedAmount: 10,
      comparedHours: 5,
      comparedRecords: 1,
      excludedRecords: 1,
      plannedHours: 10,
      actualNorm: 0.5,
      hoursDifference: -5,
      plannedUnitCost: 20,
      actualUnitCost: 8.33,
      plannedCost: 200,
      actualCost: 100,
      comparisonStatus: "on_or_ahead",
      isComparable: true,
    });
    expect(result.comparison).toMatchObject({
      plannedHours: 10,
      actualHours: 5,
      hoursDifference: -5,
      status: "on_or_ahead",
    });
  });

  it.each([
    { Amounts: null, TimeInvolved: 5 },
    { Amounts: 10, TimeInvolved: null },
  ])("keeps incomplete groups neutral: %o", (incomplete) => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "work",
      value: "Masonry",
      rows: [{ ...rows[0], ...incomplete }],
      productivitySettings: [
        { work: "Masonry", unit: "m2", laborNormHoursPerUnit: 0.5 },
      ],
    });

    expect(result.breakdown[0]).toMatchObject({
      isComparable: false,
      comparisonStatus: "neutral",
      plannedHours: null,
    });
  });
});
