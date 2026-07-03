import {
  getZtcComplexityCoefficientByCode,
  isZtcComplexityCoefficientTask,
  ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS,
  ZTC_ONE_X_COEFFICIENT_TASK,
  ZTC_TWO_X_COEFFICIENT_TASK,
} from "@/components/sitediary/ZTC/ztc-rate-constants";

const projects = [
  {
    projectName: "Visi projekti",
    works: [
      { task: ZTC_ONE_X_COEFFICIENT_TASK, rate: "1.2" },
      { task: ZTC_TWO_X_COEFFICIENT_TASK, rate: "1.5" },
    ],
  },
  {
    projectName: "Project A",
    works: [
      { task: ZTC_ONE_X_COEFFICIENT_TASK, rate: "1.35" },
      { task: ZTC_TWO_X_COEFFICIENT_TASK, rate: "1.8" },
      { task: "2 koeficients", rate: "2.1" },
      { task: "3 3 koeficients", rate: "3.3" },
    ],
  },
];

describe("getZtcComplexityCoefficient", () => {
  it("uses a project-specific X coefficient", () => {
    expect(
      getZtcComplexityCoefficientByCode({
        code: "X",
        projectName: "Project A",
        projects,
      }),
    ).toBe("1.35");
  });

  it("uses a project-specific X X coefficient", () => {
    expect(
      getZtcComplexityCoefficientByCode({
        code: "X X",
        projectName: "Project A",
        projects,
      }),
    ).toBe("1.8");
  });

  it("falls back to Visi projekti when the project has no override", () => {
    expect(
      getZtcComplexityCoefficientByCode({
        code: "X X",
        projectName: "Project B",
        projects,
      }),
    ).toBe("1.5");
  });

  it("recognizes all configured coefficient rows", () => {
    for (const row of ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS) {
      expect(isZtcComplexityCoefficientTask(row.task)).toBe(true);
    }
  });

  it("uses numeric drawing coefficient codes", () => {
    expect(
      getZtcComplexityCoefficientByCode({
        code: "2",
        projectName: "Project A",
        projects,
      }),
    ).toBe("2.1");

    expect(
      getZtcComplexityCoefficientByCode({
        code: "3 3",
        projectName: "Project A",
        projects,
      }),
    ).toBe("3.3");
  });
});
