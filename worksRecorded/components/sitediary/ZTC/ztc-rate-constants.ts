export const ZTC_ONE_X_COEFFICIENT_TASK = "X koeficients";
export const ZTC_TWO_X_COEFFICIENT_TASK = "X X koeficients";
export const ZTC_DEFAULT_ONE_X_COEFFICIENT = "1.2";
export const ZTC_DEFAULT_TWO_X_COEFFICIENT = "1.5";

export function isZtcComplexityCoefficientTask(value: unknown) {
  const task = String(value ?? "").trim().toLowerCase();
  return (
    task === ZTC_ONE_X_COEFFICIENT_TASK.toLowerCase() ||
    task === ZTC_TWO_X_COEFFICIENT_TASK.toLowerCase()
  );
}
