import { ZTC_ALL_PROJECTS_RATE_NAME } from "@/flows/ztc-production/lib/ztc-rate-constants";
import {
  findZtcDefaultRateForTask,
  normalizeZtcRateTaskName,
  type ZtcDefaultTaskRate,
} from "@/flows/ztc-production/lib/ztc-rate-matching";

export type ZtcRateProject = {
  projectName: string;
  works?: ZtcDefaultTaskRate[];
};

export type ZtcResolvedRateTask = {
  canonicalTask: string;
  extractedTask: string;
  matched: boolean;
  differs: boolean;
  entry: ZtcDefaultTaskRate;
};

function normalizeResolverText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function getZtcProjectWorkRates(
  defaultRates: ZtcRateProject[] | null | undefined,
  projectName: unknown,
) {
  const allProjectRates = defaultRates?.find(
    (project) =>
      normalizeResolverText(project.projectName) ===
      normalizeResolverText(ZTC_ALL_PROJECTS_RATE_NAME),
  );
  const projectRates = defaultRates?.find(
    (project) =>
      normalizeResolverText(project.projectName) === normalizeResolverText(projectName),
  );
  const merged = [...(allProjectRates?.works ?? [])];

  for (const override of projectRates?.works ?? []) {
    const index = merged.findIndex(
      (entry) =>
        normalizeResolverText(entry.task) === normalizeResolverText(override.task),
    );
    if (index >= 0) {
      merged[index] = { ...merged[index], ...override };
    } else {
      merged.push(override);
    }
  }

  return merged;
}

export function resolveZtcRateTaskForRow(
  row: Record<string, unknown>,
  defaultRates: ZtcRateProject[] | null | undefined,
) {
  const extractedTask = String(row.Works ?? "").trim();
  if (!extractedTask) return null;

  const match = findZtcDefaultRateForTask(
    extractedTask,
    getZtcProjectWorkRates(defaultRates, row.Location),
    { category: "works" },
  )?.entry;
  if (!match?.task) return null;

  const canonicalTask = String(match.task).trim();
  const differs =
    normalizeZtcRateTaskName(canonicalTask).toLowerCase() !==
    normalizeZtcRateTaskName(extractedTask).toLowerCase();

  return {
    canonicalTask,
    extractedTask,
    matched: true,
    differs,
    entry: match,
  } satisfies ZtcResolvedRateTask;
}
