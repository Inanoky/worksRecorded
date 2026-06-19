import {
  getZtcComplexityCoefficient,
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
    ],
  },
];

describe("getZtcComplexityCoefficient", () => {
  it("uses a project-specific X coefficient", () => {
    expect(
      getZtcComplexityCoefficient({
        marks: 1,
        projectName: "Project A",
        projects,
      }),
    ).toBe("1.35");
  });

  it("uses a project-specific X X coefficient", () => {
    expect(
      getZtcComplexityCoefficient({
        marks: 2,
        projectName: "Project A",
        projects,
      }),
    ).toBe("1.8");
  });

  it("falls back to Visi projekti when the project has no override", () => {
    expect(
      getZtcComplexityCoefficient({
        marks: 2,
        projectName: "Project B",
        projects,
      }),
    ).toBe("1.5");
  });
});
