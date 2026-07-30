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
      expect.objectContaining({
        label: "Masonry",
        unit: "m2",
        amount: 20,
        hours: 14,
      }),
      expect.objectContaining({
        label: "Material delivery",
        unit: "tn",
        amount: 1.25,
        hours: 1,
      }),
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
        actualHours: 16,
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

  it("orders summary rows by numeric work prefixes", () => {
    const numberedRows = [
      { ...rows[0], Works: "18.1 Dažādi darbi", Units: "m2" },
      { ...rows[0], Works: "3.1 Grīdu flīzēšana", Units: "m2" },
      { ...rows[0], Works: "1.10 Demontāžas darbi", Units: "m2" },
      { ...rows[0], Works: "1.9 Demontāžas darbi", Units: "m2" },
    ];

    const result = buildDefaultConstructionScopeSummary({
      scope: "project",
      value: "project",
      rows: numberedRows,
      productivitySettings: [
        { work: "18.1 Dažādi darbi", unit: "m2", laborNormHoursPerUnit: 0.5 },
      ],
    });

    expect(result.breakdown.map((row) => row.label)).toEqual([
      "1.9 Demontāžas darbi",
      "1.10 Demontāžas darbi",
      "3.1 Grīdu flīzēšana",
      "18.1 Dažādi darbi",
    ]);
  });

  it("groups a clicked work by unit without splitting by location", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "work",
      value: "Masonry",
      rows: [
        ...rows.slice(0, 2),
        { ...rows[0], Location: "Floor 2", Amounts: 4, TimeInvolved: 2 },
        {
          ...rows[0],
          Location: "Floor 3",
          Units: "pcs",
          Amounts: 3,
          TimeInvolved: 1,
        },
      ],
    });

    expect(result.breakdown).toEqual([
      expect.objectContaining({
        label: "Masonry",
        unit: "m2",
        amount: 24,
        hours: 16,
      }),
      expect.objectContaining({
        label: "Masonry",
        unit: "pcs",
        amount: 3,
        hours: 1,
      }),
    ]);
    expect(result.breakdown.every((row) => !row.label.includes("Floor"))).toBe(
      true,
    );
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
          costCalculationMode: "hourly",
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
      plannedGroups: 1,
      actualGroups: 2,
      plannedHours: 10,
      actualHours: 15,
      hoursDifference: 4,
      status: "behind",
      costComparableGroups: 1,
      plannedCostGroups: 1,
      actualCostGroups: 2,
      plannedCost: 200,
      actualCost: 300,
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
          costCalculationMode: "hourly",
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
      plannedHours: 12,
      actualNorm: 0.5,
      hoursDifference: -5,
      plannedUnitCost: 20,
      actualUnitCost: 8.33,
      plannedCost: 240,
      actualCost: 100,
      comparisonStatus: "on_or_ahead",
      isComparable: true,
    });
    expect(result.comparison).toMatchObject({
      plannedHours: 12,
      actualHours: 5,
      hoursDifference: -5,
      status: "on_or_ahead",
    });
  });

  it("does not calculate a plan without an amount", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "work",
      value: "Masonry",
      rows: [{ ...rows[0], Amounts: null, TimeInvolved: 5 }],
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

  it("calculates planned values when actual hours are blank", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "project",
      value: "project",
      rows: [
        {
          Works: "5.3 Logu bloki un ailu apdare",
          Units: "m",
          Amounts: 68,
          TimeInvolved: null,
        },
      ],
      productivitySettings: [
        {
          work: "5.3 Logu bloki un ailu apdare",
          unit: "m",
          laborNormHoursPerUnit: 0.48,
          hourlyCost: 15,
          costCalculationMode: "hourly",
        },
      ],
    });

    expect(result.breakdown[0]).toMatchObject({
      amount: 68,
      plannedHours: 32.64,
      plannedUnitCost: 7.2,
      plannedCost: 489.6,
      actualCost: null,
      comparisonStatus: "neutral",
      isComparable: false,
    });
    expect(result.comparison).toMatchObject({
      plannedGroups: 1,
      actualGroups: 0,
      plannedHours: 32.64,
      plannedCostGroups: 1,
      actualCostGroups: 0,
      plannedCost: 489.6,
      comparableGroups: 0,
    });
  });

  it("uses the completed quantity for both planned and factual output cost", () => {
    const result = buildDefaultConstructionScopeSummary({
      scope: "work",
      value: "Masonry",
      rows: [
        {
          Works: "Masonry",
          Units: "m2",
          Amounts: 10,
          TimeInvolved: 100,
        },
      ],
      productivitySettings: [
        {
          work: "Masonry",
          unit: "m2",
          laborNormHoursPerUnit: 0.5,
          hourlyCost: 20,
          costCalculationMode: "output",
        },
      ],
    });

    expect(result.breakdown[0]).toMatchObject({
      costCalculationMode: "output",
      plannedUnitCost: 10,
      actualUnitCost: 10,
      plannedCost: 100,
      actualCost: 100,
      costDifference: 0,
      isCostComparable: true,
    });
    expect(result.comparison).toMatchObject({
      plannedCost: 100,
      actualCost: 100,
      costDifference: 0,
      costStatus: "on_or_ahead",
    });
  });
});
