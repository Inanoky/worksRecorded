export const ZTC_ONE_X_COEFFICIENT_TASK = "X koeficients";
export const ZTC_TWO_X_COEFFICIENT_TASK = "X X koeficients";
export const ZTC_DEFAULT_ONE_X_COEFFICIENT = "1.2";
export const ZTC_DEFAULT_TWO_X_COEFFICIENT = "1.5";
export const ZTC_ONE_NUMBER_COEFFICIENT_TASK = "1 koeficients";
export const ZTC_TWO_ONE_NUMBER_COEFFICIENT_TASK = "1 1 koeficients";
export const ZTC_TWO_NUMBER_COEFFICIENT_TASK = "2 koeficients";
export const ZTC_TWO_TWO_NUMBER_COEFFICIENT_TASK = "2 2 koeficients";
export const ZTC_THREE_NUMBER_COEFFICIENT_TASK = "3 koeficients";
export const ZTC_TWO_THREE_NUMBER_COEFFICIENT_TASK = "3 3 koeficients";
export const ZTC_ALL_PROJECTS_RATE_NAME = "Visi projekti";

export const ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS = [
  { task: ZTC_ONE_X_COEFFICIENT_TASK, defaultRate: ZTC_DEFAULT_ONE_X_COEFFICIENT },
  { task: ZTC_TWO_X_COEFFICIENT_TASK, defaultRate: ZTC_DEFAULT_TWO_X_COEFFICIENT },
  { task: ZTC_ONE_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { task: ZTC_TWO_ONE_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { task: ZTC_TWO_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { task: ZTC_TWO_TWO_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { task: ZTC_THREE_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { task: ZTC_TWO_THREE_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
] as const;

export function isZtcComplexityCoefficientTask(value: unknown) {
  const task = String(value ?? "").trim().toLowerCase();
  return ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS.some(
    (entry) => task === entry.task.toLowerCase(),
  );
}

type ZtcCoefficientProjectRates = {
  projectName: string;
  works: Array<{ task: string; rate: string }>;
};

export function getZtcComplexityCoefficient(args: {
  marks: 0 | 1 | 2;
  projectName?: string | null;
  projects: ZtcCoefficientProjectRates[];
}) {
  if (args.marks === 0) return "1";

  const task =
    args.marks === 2
      ? ZTC_TWO_X_COEFFICIENT_TASK
      : ZTC_ONE_X_COEFFICIENT_TASK;
  const normalizedProject = String(args.projectName ?? "").trim().toLowerCase();
  const projectRates = args.projects.find(
    (project) => project.projectName.trim().toLowerCase() === normalizedProject,
  );
  const allProjectRates = args.projects.find(
    (project) =>
      project.projectName.trim().toLowerCase() ===
      ZTC_ALL_PROJECTS_RATE_NAME.toLowerCase(),
  );
  const findCoefficient = (project: ZtcCoefficientProjectRates | undefined) =>
    project?.works.find(
      (entry) => entry.task.trim().toLowerCase() === task.toLowerCase(),
    )?.rate;
  const fallback =
    args.marks === 2
      ? ZTC_DEFAULT_TWO_X_COEFFICIENT
      : ZTC_DEFAULT_ONE_X_COEFFICIENT;

  return findCoefficient(projectRates) ?? findCoefficient(allProjectRates) ?? fallback;
}
