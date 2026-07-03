export const ZTC_ONE_X_COEFFICIENT_TASK = "X koeficients";
export const ZTC_TWO_X_COEFFICIENT_TASK = "X X koeficients";
export const ZTC_DEFAULT_ONE_X_COEFFICIENT = "1.2";
export const ZTC_DEFAULT_TWO_X_COEFFICIENT = "1.5";
export const ZTC_ONE_NUMBER_COEFFICIENT_TASK = "1 koeficients";
export const ZTC_TWO_NUMBER_COEFFICIENT_TASK = "2 koeficients";
export const ZTC_THREE_NUMBER_COEFFICIENT_TASK = "3 koeficients";
export const ZTC_FOUR_NUMBER_COEFFICIENT_TASK = "4 koeficients";
export const ZTC_FIVE_NUMBER_COEFFICIENT_TASK = "5 koeficients";
export const ZTC_SIX_NUMBER_COEFFICIENT_TASK = "6 koeficients";
export const ZTC_ALL_PROJECTS_RATE_NAME = "Visi projekti";

export const ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS = [
  { code: "X", task: ZTC_ONE_X_COEFFICIENT_TASK, defaultRate: ZTC_DEFAULT_ONE_X_COEFFICIENT },
  { code: "X X", task: ZTC_TWO_X_COEFFICIENT_TASK, defaultRate: ZTC_DEFAULT_TWO_X_COEFFICIENT },
  { code: "1", task: ZTC_ONE_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { code: "2", task: ZTC_TWO_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { code: "3", task: ZTC_THREE_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { code: "4", task: ZTC_FOUR_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { code: "5", task: ZTC_FIVE_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
  { code: "6", task: ZTC_SIX_NUMBER_COEFFICIENT_TASK, defaultRate: "1" },
] as const;

export type ZtcComplexityCode = "" | (typeof ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS)[number]["code"];

export function normalizeZtcComplexityCode(value: unknown): ZtcComplexityCode {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[×✕✖]/g, "X")
    .replace(/[^X1-6]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compactPair = normalized.replace(/\s+/g, "");
  const normalizedWithPairSpacing =
    compactPair === "XX"
      ? "X X"
      : normalized;

  const row = ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS.find(
    (entry) => entry.code.toUpperCase() === normalizedWithPairSpacing,
  );
  return row?.code ?? "";
}

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

export function getZtcComplexityCoefficientByCode(args: {
  code: ZtcComplexityCode | string | null | undefined;
  projectName?: string | null;
  projects: ZtcCoefficientProjectRates[];
}) {
  const code = normalizeZtcComplexityCode(args.code);
  if (!code) return "1";

  const coefficientRow = ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS.find(
    (entry) => entry.code === code,
  );
  if (!coefficientRow) return "1";

  const task = coefficientRow.task;
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

  return findCoefficient(projectRates) ?? findCoefficient(allProjectRates) ?? coefficientRow.defaultRate;
}
