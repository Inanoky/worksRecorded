import { getZtcPayrollValues } from "@/components/sitediary/ZTC/ztc-site-diary-utils";

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
});
