export function validateZtcDrawingProjectCode<T extends { projectName: string | null; hasReadableProjectName: boolean; qualityOk: boolean; issue: string | null }>(value: T): T {
  if (/^\p{L}{2}$/u.test(String(value.projectName ?? "").trim())) return value;
  return {
    ...value,
    projectName: null,
    hasReadableProjectName: false,
    qualityOk: false,
    issue: "Lūdzu atsūtiet salasāmu rakstlaukuma augšējo kreiso stūri ar projekta divu burtu kodu.",
  };
}
