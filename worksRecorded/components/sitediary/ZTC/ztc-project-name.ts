export function getZtcProjectNameKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ")")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("lv")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function findCanonicalZtcProjectName(
  projectName: string | null | undefined,
  candidates: Array<string | null | undefined>,
) {
  const projectKey = getZtcProjectNameKey(projectName);
  if (!projectKey) return null;

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const trimmed = String(candidate ?? "").trim().replace(/\s+/g, " ");
    const candidateKey = getZtcProjectNameKey(trimmed);
    if (!candidateKey || seen.has(candidateKey)) continue;
    seen.add(candidateKey);
    if (candidateKey === projectKey) return trimmed;
  }

  return null;
}
