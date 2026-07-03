import {
  buildZtcLaborNormSummaryRows,
  buildZtcQualityDisplayStateByRowId,
  getZtcPayrollValues,
  getZtcQualityRowToneClass,
} from "@/components/sitediary/ZTC/ztc-site-diary-utils";
import { attachZtcLaborNormToMetadata } from "@/components/sitediary/ZTC/ztc-labor-norm";

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
});
