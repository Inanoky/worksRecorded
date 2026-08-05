import { ZTC_ALL_PROJECTS_RATE_NAME } from "@/flows/ztc-production/lib/ztc-rate-constants";
import {
  findZtcDefaultRateForTask,
  normalizeZtcRateTaskName,
  type ZtcDefaultTaskRate,
} from "@/flows/ztc-production/lib/ztc-rate-matching";
import { cleanZtcWorkName } from "@/flows/ztc-production/lib/ztc-work-name-cleanup";
import {
  getZtcExcludedRateTaskKeys,
  type ZtcProjectRateExclusions,
} from "@/flows/ztc-production/lib/ztc-rate-exclusions";

export type ZtcRateProject = {
  projectName: string;
  excludedTasks?: ZtcProjectRateExclusions;
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
  const excludedTaskKeys = getZtcExcludedRateTaskKeys(
    projectRates?.excludedTasks,
    "works",
  );
  const merged = (allProjectRates?.works ?? []).filter(
    (entry) => !excludedTaskKeys.has(normalizeResolverText(entry.task)),
  );

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
  const extractedTask = cleanZtcWorkName(String(row.Works ?? ""));
  if (!extractedTask) return null;

  const match = findZtcDefaultRateForTask(
    extractedTask,
    getZtcProjectWorkRates(defaultRates, row.Location),
    { category: "works" },
  )?.entry;
  if (!match?.task) return null;

  const canonicalTask = cleanZtcWorkName(match.task);
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
