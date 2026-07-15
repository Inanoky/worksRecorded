export function normalizeZtcProjectName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/,/g, ".")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ")")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("lv");
}
