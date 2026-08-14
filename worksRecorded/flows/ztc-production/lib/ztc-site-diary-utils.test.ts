import { attachZtcLaborNormToMetadata } from "@/flows/ztc-production/lib/ztc-labor-norm";
import {
  applyZtcElementNameChange,
  getZtcSplitTaskRenameGroupKey,
} from "@/flows/ztc-production/lib/ztc-project-edit";
import {
  buildZtcLaborNormSummaryRows,
  buildZtcLaborNormTotalSummary,
  buildZtcProductivityRows,
  buildZtcQualityDisplayStateByRowId,
  getZtcPayrollValues,
  getZtcProjectElementAreas,
  getZtcProjectTotalAreaM2,
  getZtcQualityRowToneClass,
} from "@/flows/ztc-production/lib/ztc-site-diary-utils";

describe("getZtcPayrollValues", () => {
  const baseRow = {
    Date: "2026-06-17T08:00:00.000Z",
    Works: "R3 / T3 - Latojums 28x70",
    Units: "m2",
    Amounts: 10,
    Location_Custom_2: 2,
  };

  it("multiplies rate by quality coefficient and complexity", () => {
    const payroll = getZtcPayrollValues({
      ...baseRow,
      Works_Custom_2: 0.9,
      WorkersInvolved: 1.5,
    });

    expect(payroll.coefficient).toBe(0.9);
    expect(payroll.complexity).toBe(1.5);
    expect(payroll.sum).toBe(27);
  });

  it("supports a manually adjusted complexity value", () => {
    const payroll = getZtcPayrollValues({
      ...baseRow,
      Works_Custom_2: 1,
      WorkersInvolved: 1.4,
    });

    expect(payroll.complexity).toBe(1.4);
    expect(payroll.sum).toBe(28);
  });

  it("defaults missing quality and complexity coefficients to one", () => {
    const payroll = getZtcPayrollValues(baseRow);

    expect(payroll.coefficient).toBe(1);
    expect(payroll.complexity).toBe(1);
    expect(payroll.sum).toBe(20);
  });

  it("compares planned labor norm from metadata with actual hours per m2", () => {
    const payroll = getZtcPayrollValues({
      ...baseRow,
      TimeInvolved: 3,
      Amounts: 10,
      Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.2", "m2"),
    });

    expect(payroll.laborNorm.planned).toBe(0.2);
    expect(payroll.laborNorm.actual).toBe(0.3);
    expect(payroll.laborNorm.difference).toBe(0.1);
  });

  it("does not show planned labor norm when the work has no matched rate", () => {
    const payroll = getZtcPayrollValues({
      ...baseRow,
      Location_Custom_2: null,
      TimeInvolved: 3,
      Amounts: 10,
      Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.2", "m2"),
    });

    expect(payroll.laborNorm.planned).toBeNull();
    expect(payroll.laborNorm.actual).toBe(0.3);
    expect(payroll.laborNorm.difference).toBeNull();
  });

  it("groups labor norm comparison by task", () => {
    const rows = buildZtcLaborNormSummaryRows([
      {
        ...baseRow,
        Works: "L1/B1 - Gipskartona plaksne",
        TimeInvolved: 2,
        Amounts: 10,
        Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.2", "m2"),
      },
      {
        ...baseRow,
        Works: "L1/B1 - Gipskartona plaksne",
        TimeInvolved: 1,
        Amounts: 5,
        Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.2", "m2"),
      },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        task: "L1/B1 - Gipskartona plaksne",
        planned: 0.2,
        actual: 0.2,
        difference: 0,
      }),
    ]);
  });

  it("calculates task planned hours from the task amount, not the project area", () => {
    const rows = buildZtcLaborNormSummaryRows([
      {
        ...baseRow,
        Works: "L0 - Paroc CGLTra minerālvates siltumizolācija / 245mm",
        TimeInvolved: 0.32,
        Amounts: 18.05,
        Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.06", "m2"),
      },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        amount: 18.05,
        planned: 0.06,
        plannedHours: 1.08,
        actual: 0.0177,
      }),
    ]);
  });

  it("does not include planned labor norm in summaries when the work has no matched rate", () => {
    const rows = [
      {
        ...baseRow,
        Location_Custom_2: null,
        Works: "R3/T3 - latojums 28x70",
        TimeInvolved: 0.35,
        Amounts: 4.16,
        Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.06", "m2"),
      },
    ];

    expect(buildZtcLaborNormSummaryRows(rows)).toEqual([
      expect.objectContaining({
        task: "R3/T3 - latojums 28x70",
        planned: null,
        actual: 0.0841,
        difference: null,
      }),
    ]);
    expect(buildZtcLaborNormTotalSummary(rows)).toEqual(
      expect.objectContaining({
        plannedHours: null,
        hoursDifference: null,
        planned: null,
        actual: 0.0841,
        difference: null,
      }),
    );
  });

  it("calculates total element labor norm from production hours divided by m2", () => {
    const summary = buildZtcLaborNormTotalSummary([
      {
        ...baseRow,
        Works: "L1/B1 - Gipskartona plaksne",
        TimeInvolved: 2,
        Amounts: 10,
        Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.2", "m2"),
      },
      {
        ...baseRow,
        Works: "L2/B2 - Gipskartona plaksne",
        TimeInvolved: 4,
        Amounts: 20,
        Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.3", "m2"),
      },
      {
        ...baseRow,
        Works: "Kvalitates kontrole",
        TimeInvolved: 100,
        Amounts: 10,
      },
      {
        ...baseRow,
        Works_Custom_1: "Papilddarbi",
        TimeInvolved: 100,
        Amounts: 10,
      },
    ]);

    expect(summary).toEqual({
      hours: 6,
      amount: 30,
      plannedHours: 8,
      hoursDifference: -2,
      planned: 0.2667,
      actual: 0.2,
      difference: -0.0667,
    });
  });

  it("uses element area for element summary planned hours and factual output per m2", () => {
    const summary = buildZtcLaborNormTotalSummary(
      [
        {
          ...baseRow,
          Works: "L1/B1 - Gipskartona plaksne",
          TimeInvolved: 2,
          Amounts: 10,
          Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.2", "m2"),
        },
        {
          ...baseRow,
          Works: "L2/B2 - Gipskartona plaksne",
          TimeInvolved: 4,
          Amounts: 10,
          Comments_Custom_2: attachZtcLaborNormToMetadata(null, "0.3", "m2"),
        },
      ],
      { plannedAmountM2: 10, actualAmountM2: 10 },
    );

    expect(summary).toEqual({
      hours: 6,
      amount: 20,
      plannedHours: 5,
      hoursDifference: 1,
      planned: 0.5,
      actual: 0.6,
      difference: 0.1,
    });
  });

  it("calculates hourly additional work from hours instead of area", () => {
    const payroll = getZtcPayrollValues({
      ...baseRow,
      Units: "st.",
      Amounts: 7.21,
      TimeInvolved: 0.09,
      Location_Custom_2: 0.3,
      Works_Custom_1: "Papilddarbi",
    });

    expect(payroll.payrollQuantity).toBe(0.09);
    expect(payroll.sum).toBe(0.03);
  });

  it("keeps m2 additional work calculated from amount", () => {
    const payroll = getZtcPayrollValues({
      ...baseRow,
      Units: "m2",
      Amounts: 7.21,
      TimeInvolved: 0.09,
      Location_Custom_2: 0.3,
      Works_Custom_1: "Papilddarbi",
    });

    expect(payroll.payrollQuantity).toBe(7.21);
    expect(payroll.sum).toBe(2.16);
  });

  it("treats a contaminated Papilddarbi marker as production when work matches drawing metadata", () => {
    const drawingMetadata = attachZtcLaborNormToMetadata(
      JSON.stringify({
        type: "ztc_drawing_context",
        version: 1,
        projectName: "zemgales prospekts 11 (zp)",
        elements: [
          {
            elementName: "3S-38",
            totalAreaM2: 25.11,
            works: [
              {
                name: "R1/T1 - Gipskartona plaksne GKF 15 mm",
                amountM2: 25.11,
              },
            ],
          },
        ],
      }),
      "0.3",
      "m2",
    );

    const payroll = getZtcPayrollValues({
      ...baseRow,
      Location: "zemgales prospekts 11 (zp)",
      Location_Custom_1: "3S-38",
      Works: "R1/T1 - Gipskartona plaksne GKF 15 mm",
      Works_Custom_1: "Papilddarbi",
      Amounts: 10,
      TimeInvolved: 2,
      Comments_Custom_2: drawingMetadata,
    });

    expect(payroll.laborNorm.planned).toBe(0.3);
    expect(payroll.laborNorm.actual).toBe(0.2);
  });

  it("keeps real element-related additional work as additional when work is not in drawing metadata", () => {
    const drawingMetadata = JSON.stringify({
      type: "ztc_drawing_context",
      version: 1,
      projectName: "zemgales prospekts 11 (zp)",
      elements: [
        {
          elementName: "3S-38",
          totalAreaM2: 25.11,
          works: [
            {
              name: "R1/T1 - Gipskartona plaksne GKF 15 mm",
              amountM2: 25.11,
            },
          ],
        },
      ],
    });

    const payroll = getZtcPayrollValues({
      ...baseRow,
      Location: "zemgales prospekts 11 (zp)",
      Location_Custom_1: "3S-38",
      Works: "Panelu iepakosana",
      Works_Custom_1: "Papilddarbi",
      Units: "st",
      Amounts: 10,
      TimeInvolved: 2,
      Comments_Custom_2: drawingMetadata,
    });

    expect(payroll.payrollQuantity).toBe(2);
    expect(payroll.laborNorm.planned).toBeNull();
    expect(payroll.laborNorm.actual).toBeNull();
  });

  it("sums unique drawing element areas for a project", () => {
    const firstElementMetadata = JSON.stringify({
      type: "ztc_drawing_context",
      version: 1,
      projectName: "zemgales prospekts 11 (zp)",
      elements: [
        {
          elementName: "3S-38",
          totalAreaM2: 25.11,
          works: [{ name: "L2/B2 - Gipskartona plaksne", amountM2: 25.11 }],
        },
      ],
    });
    const secondElementMetadata = JSON.stringify({
      type: "ztc_drawing_context",
      version: 1,
      projectName: "zemgales prospekts 11 (zp)",
      elements: [
        {
          elementName: "3S-39",
          totalAreaM2: 10.5,
          works: [{ name: "L2/B2 - Gipskartona plaksne", amountM2: 10.5 }],
        },
      ],
    });

    const total = getZtcProjectTotalAreaM2([
      {
        ...baseRow,
        Location: "zemgales prospekts 11 (zp)",
        Location_Custom_1: "3S-38",
        Comments_Custom_2: firstElementMetadata,
      },
      {
        ...baseRow,
        Location: "zemgales prospekts 11 (zp)",
        Location_Custom_1: "3S-38",
        Works: "R1/T1 - Gipskartona plaksne",
        Comments_Custom_2: firstElementMetadata,
      },
      {
        ...baseRow,
        Location: "zemgales prospekts 11 (zp)",
        Location_Custom_1: "3S-39",
        Comments_Custom_2: secondElementMetadata,
      },
      {
        ...baseRow,
        Location: "other project",
        Location_Custom_1: "3S-40",
        Comments_Custom_2: JSON.stringify({
          type: "ztc_drawing_context",
          version: 1,
          elements: [{ elementName: "3S-40", totalAreaM2: 100 }],
        }),
      },
    ], "Zemgales Prospekts 11 (ZP)");

    expect(total).toBe(35.61);
  });

  it("keeps the project summary correct after renaming every part of a split task", () => {
    const projectName = "Project RD";
    const splitTask = "R1/T1 - Difuzijas membrana Solitex";
    const splitMetadata = attachZtcLaborNormToMetadata(
      JSON.stringify({
        type: "ztc_drawing_context",
        version: 1,
        projectName,
        elements: [
          {
            elementName: "J-2-1",
            totalAreaM2: 10,
            works: [{ name: splitTask, amountM2: 10 }],
          },
        ],
      }),
      "0.2",
      "m2",
    );
    const controlTask = "L0 - Mineralvate";
    const controlMetadata = attachZtcLaborNormToMetadata(
      JSON.stringify({
        type: "ztc_drawing_context",
        version: 1,
        projectName,
        elements: [
          {
            elementName: "J-22",
            totalAreaM2: 5,
            works: [{ name: controlTask, amountM2: 5 }],
          },
        ],
      }),
      "0.1",
      "m2",
    );
    const rows = [
      {
        ...baseRow,
        id: "split-1",
        Date_Custom_2: "2026-06-17T09:00:00.000Z",
        Location: projectName,
        Location_Custom_1: "J-2-1",
        Location_Custom_2: 2,
        Works: splitTask,
        Amounts: 6,
        TimeInvolved: 1.2,
        Comments_Custom_2: splitMetadata,
      },
      {
        ...baseRow,
        id: "split-2",
        Date_Custom_2: "2026-06-17T10:00:00.000Z",
        Location: projectName,
        Location_Custom_1: "J-2-1",
        Location_Custom_2: 2,
        Works: splitTask,
        Amounts: 4,
        TimeInvolved: 0.8,
        Comments_Custom_2: splitMetadata,
      },
      {
        ...baseRow,
        id: "control",
        Date_Custom_2: "2026-06-17T11:00:00.000Z",
        Location: projectName,
        Location_Custom_1: "J-22",
        Location_Custom_2: 3,
        Works: controlTask,
        Amounts: 5,
        TimeInvolved: 1,
        Comments_Custom_2: controlMetadata,
      },
      {
        ...baseRow,
        id: "other-project",
        Date_Custom_2: "2026-06-17T12:00:00.000Z",
        Location: "Other project",
        Location_Custom_1: "X-1",
        Amounts: 100,
        TimeInvolved: 10,
        Comments_Custom_2: JSON.stringify({
          type: "ztc_drawing_context",
          elements: [{ elementName: "X-1", totalAreaM2: 100 }],
        }),
      },
    ];
    const summarizeProject = (summaryRows: typeof rows) => {
      const scopedRows = summaryRows.filter((row) => row.Location === projectName);
      const projectAreaM2 = getZtcProjectTotalAreaM2(scopedRows, projectName);
      const payroll = scopedRows.map(getZtcPayrollValues);
      const hours = payroll.reduce((sum, row) => sum + row.hours, 0);
      const money = payroll.reduce((sum, row) => sum + row.sum, 0);

      return {
        projectAreaM2,
        completedAmountM2: payroll.reduce((sum, row) => sum + row.amountM2, 0),
        hours,
        money,
        costPerM2:
          projectAreaM2 && projectAreaM2 > 0
            ? Number((money / projectAreaM2).toFixed(2))
            : null,
        laborNormTotal: buildZtcLaborNormTotalSummary(scopedRows, {
          plannedAmountM2: projectAreaM2,
          actualAmountM2: projectAreaM2,
        }),
      };
    };

    const splitGroupKey = getZtcSplitTaskRenameGroupKey(rows[0]);
    const renamedRows = rows.map((row) =>
      splitGroupKey && getZtcSplitTaskRenameGroupKey(row) === splitGroupKey
        ? applyZtcElementNameChange(row, "J-21")
        : row,
    );
    const before = summarizeProject(rows);
    const after = summarizeProject(renamedRows);

    expect(after).toEqual(before);
    expect(after).toEqual({
      projectAreaM2: 15,
      completedAmountM2: 15,
      hours: 3,
      money: 35,
      costPerM2: 2.33,
      laborNormTotal: {
        hours: 3,
        amount: 15,
        plannedHours: 2.5,
        hoursDifference: 0.5,
        planned: 0.1667,
        actual: 0.2,
        difference: 0.0333,
      },
    });
    expect(getZtcProjectElementAreas(renamedRows, projectName)).toEqual([
      { elementKey: "j-21", element: "J-21", area: 10 },
      { elementKey: "j-22", element: "J-22", area: 5 },
    ]);
  });
});

describe("ZTC quality display state", () => {
  const qualityRow = {
    Date: "2026-06-17T08:00:00.000Z",
    Location: "Project A",
    Location_Custom_1: "Element 1",
    Works: "Kvalitātes kontrole",
  };

  it("does not color accepted quality checks green", () => {
    expect(
      getZtcQualityRowToneClass({
        ...qualityRow,
        Comments: "Koeficients: 1",
      }),
    ).toBe("");
  });

  it("clears an earlier defect color after a later accepted check", () => {
    const states = buildZtcQualityDisplayStateByRowId([
      {
        ...qualityRow,
        id: "defect",
        createdAt: "2026-06-17T08:00:00.000Z",
        Comments: "Koeficients: 0",
      },
      {
        ...qualityRow,
        id: "accepted",
        createdAt: "2026-06-17T10:00:00.000Z",
        Comments: "Koeficients: 1",
      },
    ]);

    expect(states.get("defect")).toEqual({
      toneClass: "",
      hasResolvedDefect: true,
    });
    expect(states.get("accepted")).toEqual({
      toneClass: "",
      hasResolvedDefect: false,
    });
  });

  it("keeps unresolved rejected and defect checks red or yellow", () => {
    const states = buildZtcQualityDisplayStateByRowId([
      {
        ...qualityRow,
        id: "rejected",
        Comments: "Koeficients: 0",
      },
      {
        ...qualityRow,
        id: "defect",
        Location_Custom_1: "Element 2",
        Comments: "Koeficients: 0.9",
      },
    ]);

    expect(states.get("rejected")?.toneClass).toContain("bg-red");
    expect(states.get("defect")?.toneClass).toContain("bg-yellow");
  });

  it("does not resolve a quality defect with acceptance for another selected work", () => {
    const qualityMetadata = (checkedWork: string) =>
      JSON.stringify({
        type: "ztc_quality_check",
        checkedWork,
      });

    const states = buildZtcQualityDisplayStateByRowId([
      {
        ...qualityRow,
        id: "l2-rejected",
        createdAt: "2026-06-17T08:00:00.000Z",
        Comments: "Koeficients: 0",
        Comments_Custom_2: qualityMetadata("L2/B2 - Gipskartona plaksne"),
      },
      {
        ...qualityRow,
        id: "r1-accepted",
        createdAt: "2026-06-17T09:00:00.000Z",
        Comments: "Koeficients: 1",
        Comments_Custom_2: qualityMetadata("R1/T1 - Gipskartona plaksne"),
      },
    ]);

    expect(states.get("l2-rejected")?.toneClass).toContain("bg-red");
    expect(states.get("l2-rejected")?.hasResolvedDefect).toBe(false);
    expect(states.get("r1-accepted")).toEqual({
      toneClass: "",
      hasResolvedDefect: false,
    });
  });

  it("resolves the same drawing row even when its OCR description changes", () => {
    const qualityMetadata = (checkedWork: string) =>
      JSON.stringify({ type: "ztc_quality_check", checkedWork });
    const states = buildZtcQualityDisplayStateByRowId([
      {
        ...qualityRow,
        id: "same-code-defect",
        createdAt: "2026-06-17T08:00:00.000Z",
        Comments: "Koeficients: 0.9",
        Comments_Custom_2: qualityMetadata("L2/B2 - latojums 25x45"),
      },
      {
        ...qualityRow,
        id: "same-code-accepted",
        createdAt: "2026-06-17T09:00:00.000Z",
        Comments: "Koeficients: 1",
        Comments_Custom_2: qualityMetadata("L2/B2 - latojums 28x45"),
      },
    ]);

    expect(states.get("same-code-defect")).toEqual({
      toneClass: "",
      hasResolvedDefect: true,
    });
  });

  it("does not resolve a work defect with an element-level acceptance", () => {
    const states = buildZtcQualityDisplayStateByRowId([
      {
        ...qualityRow,
        id: "work-defect",
        createdAt: "2026-06-17T08:00:00.000Z",
        Comments: "Koeficients: 0",
        Comments_Custom_2: JSON.stringify({
          type: "ztc_quality_check",
          qualityScope: "work",
          checkedWork: "R3/T3 - latojums 25x45",
        }),
      },
      {
        ...qualityRow,
        id: "element-accepted",
        createdAt: "2026-06-17T09:00:00.000Z",
        Comments: "Koeficients: 1",
        Comments_Custom_2: JSON.stringify({
          type: "ztc_quality_check",
          qualityScope: "element",
          checkedWork: null,
        }),
      },
    ]);

    expect(states.get("work-defect")?.toneClass).toContain("bg-red");
    expect(states.get("work-defect")?.hasResolvedDefect).toBe(false);
  });

  it("keeps a later rejection unresolved even if an earlier check was accepted", () => {
    const states = buildZtcQualityDisplayStateByRowId([
      {
        ...qualityRow,
        id: "accepted-first",
        createdAt: "2026-06-17T08:00:00.000Z",
        Comments: "Koeficients: 1",
      },
      {
        ...qualityRow,
        id: "rejected-later",
        createdAt: "2026-06-17T09:00:00.000Z",
        Comments: "Koeficients: 0",
      },
    ]);

    expect(states.get("rejected-later")?.toneClass).toContain("bg-red");
    expect(states.get("rejected-later")?.hasResolvedDefect).toBe(false);
  });

  it("keeps quality-control records out of payroll totals", () => {
    expect(
      getZtcPayrollValues({
        ...qualityRow,
        TimeInvolved: 8,
        Amounts: 100,
        Location_Custom_2: 50,
        Works_Custom_2: 1,
        WorkersInvolved: 2,
      }),
    ).toMatchObject({
      hours: 0,
      amountM2: 0,
      rate: 0,
      sum: 0,
      payrollQuantity: 0,
    });
  });
});

describe("buildZtcProductivityRows", () => {
  it("exports paused time separately from unaccounted time", () => {
    const rows = buildZtcProductivityRows([
      {
        Date: "2026-07-03T08:00:00.000Z",
        Date_Custom_2: "2026-07-03T12:00:00.000Z",
        Works: "L1/B1 - Gipskartona plaksne",
        TimeInvolved: 3,
        createdBy: "Janis Berzins",
        pauseIntervals: [
          {
            start: "2026-07-03T10:00:00.000Z",
            end: "2026-07-03T10:30:00.000Z",
          },
        ],
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]["Kopējais laiks"]).toBe(4);
    expect(rows[0]["Efektīvais laiks"]).toBe(3.5);
    expect(rows[0]["Pauzes laiks"]).toBe(0.5);
    expect(rows[0]["Neuzskaitītais laiks"]).toBe(0);
  });

  it("splits overnight paused work and does not double-count nested additional work", () => {
    const rows = buildZtcProductivityRows([
      {
        Date: "2026-07-03T16:00:00.000Z",
        Date_Custom_2: "2026-07-04T12:00:00.000Z",
        Works: "Task A",
        TimeInvolved: 5,
        createdBy: "Janis Berzins",
        pauseIntervals: [
          {
            start: "2026-07-03T17:00:00.000Z",
            end: "2026-07-04T08:00:00.000Z",
          },
        ],
      },
      {
        Date: "2026-07-04T09:00:00.000Z",
        Date_Custom_2: "2026-07-04T10:00:00.000Z",
        Works: "Papilddarbi",
        Works_Custom_1: "Papilddarbi",
        TimeInvolved: 1,
        createdBy: "Janis Berzins",
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]["Kopējais laiks"]).toBe(1);
    expect(rows[0]["Efektīvais laiks"]).toBe(1);
    expect(rows[0]["Pauzes laiks"]).toBe(0);
    expect(rows[1]["Kopējais laiks"]).toBe(4);
    expect(rows[1]["Efektīvais laiks"]).toBe(4);
    expect(rows[1]["Pauzes laiks"]).toBe(0);
    expect(rows[1]["Neuzskaitītais laiks"]).toBe(0);
  });
});
