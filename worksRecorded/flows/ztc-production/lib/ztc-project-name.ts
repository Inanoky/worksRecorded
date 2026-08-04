export function normalizeZtcProjectName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/,/g, ".")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ")")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("lv");
}

export type ZtcCanonicalProjectResolution = {
  projectName: string;
  source: "manual" | "configured" | "existing" | "new";
};

export function getZtcProjectIdentityKey(value: unknown) {
  return normalizeZtcProjectName(value)
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function getNumberTokens(value: string) {
  return value.match(/\d+/g) ?? [];
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous = current;
  }

  return previous[right.length];
}

function uniqueProjectNames(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const projectName = String(value ?? "").trim();
    const key = getZtcProjectIdentityKey(projectName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(projectName);
  }

  return result;
}

function findCanonicalProjectMatch(
  extractedName: string,
  candidates: string[],
) {
  const extractedKey = getZtcProjectIdentityKey(extractedName);
  if (!extractedKey) return null;

  const uniqueCandidates = uniqueProjectNames(candidates);
  const exact = uniqueCandidates.find(
    (candidate) => getZtcProjectIdentityKey(candidate) === extractedKey,
  );
  if (exact) return exact;
  if (extractedKey.length < 10) return null;

  const extractedNumbers = getNumberTokens(extractedKey).join(":");
  const ranked = uniqueCandidates
    .map((candidate) => {
      const candidateKey = getZtcProjectIdentityKey(candidate);
      if (getNumberTokens(candidateKey).join(":") !== extractedNumbers) {
        return null;
      }
      const distance = levenshteinDistance(extractedKey, candidateKey);
      const score =
        1 - distance / Math.max(extractedKey.length, candidateKey.length);
      return { candidate, distance, score };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate),
    )
    .sort(
      (left, right) =>
        right.score - left.score || left.distance - right.distance,
    );

  const best = ranked[0];
  if (!best || best.score < 0.88) return null;

  const second = ranked[1];
  if (second && best.score - second.score < 0.05) return null;

  return best.candidate;
}

export function resolveZtcCanonicalProjectName(args: {
  extractedProjectName: unknown;
  manualProjectNames?: string[];
  configuredProjectNames?: string[];
  existingProjectNames?: string[];
}): ZtcCanonicalProjectResolution {
  const normalizedExtractedName = normalizeZtcProjectName(
    args.extractedProjectName,
  );
  if (!normalizedExtractedName) {
    return { projectName: "", source: "new" };
  }

  const manualMatch = findCanonicalProjectMatch(
    normalizedExtractedName,
    args.manualProjectNames ?? [],
  );
  if (manualMatch) {
    return { projectName: manualMatch, source: "manual" };
  }

  const configuredMatch = findCanonicalProjectMatch(
    normalizedExtractedName,
    args.configuredProjectNames ?? [],
  );
  if (configuredMatch) {
    return { projectName: configuredMatch, source: "configured" };
  }

  const existingMatch = findCanonicalProjectMatch(
    normalizedExtractedName,
    args.existingProjectNames ?? [],
  );
  if (existingMatch) {
    return { projectName: existingMatch, source: "existing" };
  }

  return { projectName: normalizedExtractedName, source: "new" };
}
