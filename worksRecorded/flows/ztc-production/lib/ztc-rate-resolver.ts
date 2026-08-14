import {
  isZtcComplexityCoefficientTask,
  ZTC_ALL_PROJECTS_RATE_NAME,
} from "@/flows/ztc-production/lib/ztc-rate-constants";
import {
  findZtcDefaultRateForTask,
  normalizeZtcRateTaskName,
  type ZtcDefaultTaskRate,
  type ZtcRateCategory,
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
  additionalDetails?: ZtcDefaultTaskRate[];
  additionalWorks?: ZtcDefaultTaskRate[];
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
  return getZtcProjectCategoryRates(defaultRates, projectName, "works");
}

export function getZtcProjectCategoryRates(
  defaultRates: ZtcRateProject[] | null | undefined,
  projectName: unknown,
  category: ZtcRateCategory,
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
    category,
  );
  const merged = (allProjectRates?.[category] ?? []).filter(
    (entry) => !excludedTaskKeys.has(normalizeResolverText(entry.task)),
  );

  for (const override of projectRates?.[category] ?? []) {
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

function normalizeSpecialLabel(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("lv")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getZtcFilterRateCategory(row: Record<string, unknown>): ZtcRateCategory {
  if (normalizeSpecialLabel(row.Works_Custom_1) === "papilddetalas") {
    return "additionalDetails";
  }
  if (
    normalizeSpecialLabel(row.Location) === "papilddarbi" ||
    normalizeSpecialLabel(row.Location_Custom_1) === "papilddarbi" ||
    normalizeSpecialLabel(row.Works_Custom_1) === "papilddarbi" ||
    normalizeSpecialLabel(row.Units) === "st"
  ) {
    return "additionalWorks";
  }
  return "works";
}

function resolveZtcRateTaskForCategory(
  row: Record<string, unknown>,
  defaultRates: ZtcRateProject[] | null | undefined,
  category: ZtcRateCategory,
) {
  const extractedTask = cleanZtcWorkName(String(row.Works ?? ""));
  if (!extractedTask) return null;

  const match = findZtcDefaultRateForTask(
    extractedTask,
    getZtcProjectCategoryRates(defaultRates, row.Location, category),
    { category },
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

export function resolveZtcRateTaskForRow(
  row: Record<string, unknown>,
  defaultRates: ZtcRateProject[] | null | undefined,
) {
  return resolveZtcRateTaskForCategory(row, defaultRates, "works");
}

export function resolveZtcFilterRateTaskForRow(
  row: Record<string, unknown>,
  defaultRates: ZtcRateProject[] | null | undefined,
) {
  return resolveZtcRateTaskForCategory(
    row,
    defaultRates,
    getZtcFilterRateCategory(row),
  );
}

function getAdditionalDetailMainWork(row: Record<string, unknown>) {
  if (normalizeSpecialLabel(row.Works_Custom_1) !== "papilddetalas") return null;
  try {
    const metadata = JSON.parse(String(row.Comments_Custom_2 ?? ""));
    return typeof metadata?.mainWork === "string" ? metadata.mainWork.trim() : null;
  } catch {
    return null;
  }
}

function normalizeWorkIdentity(value: unknown) {
  return normalizeZtcRateTaskName(cleanZtcWorkName(String(value ?? ""))).toLocaleLowerCase("lv");
}

export function ztcRowMatchesConfiguredWorkFilter(
  row: Record<string, unknown>,
  selectedWork: string,
  defaultRates: ZtcRateProject[] | null | undefined,
) {
  if (selectedWork === "__ALL__") return true;
  const normalizedSelected = normalizeSpecialLabel(selectedWork);
  if (normalizedSelected === "papilddetalas") {
    return normalizeSpecialLabel(row.Works_Custom_1) === "papilddetalas";
  }
  if (normalizedSelected === "papilddarbi") {
    return (
      normalizeSpecialLabel(row.Location) === "papilddarbi" ||
      normalizeSpecialLabel(row.Location_Custom_1) === "papilddarbi" ||
      normalizeSpecialLabel(row.Works_Custom_1) === "papilddarbi"
    );
  }

  const selectedIdentity = normalizeWorkIdentity(selectedWork);
  if (normalizeWorkIdentity(row.Works) === selectedIdentity) return true;
  if (normalizeWorkIdentity(getAdditionalDetailMainWork(row)) === selectedIdentity) return true;

  return (
    normalizeWorkIdentity(resolveZtcFilterRateTaskForRow(row, defaultRates)?.canonicalTask) ===
    selectedIdentity
  );
}

export function buildZtcConfiguredWorkFilterOptions(args: {
  rows: Array<Record<string, unknown>>;
  defaultRates: ZtcRateProject[] | null | undefined;
  projectName?: string | null;
  additionalOptions?: unknown[];
}) {
  const projectName = String(args.projectName ?? "").trim();
  const configuredProjectNames = projectName
    ? [projectName]
    : Array.from(
        new Set(
          (args.defaultRates ?? [])
            .map((project) => String(project.projectName ?? "").trim())
            .filter(Boolean),
        ),
      );
  const options = new Set<string>();

  for (const configuredProjectName of configuredProjectNames) {
    for (const category of ["works", "additionalDetails", "additionalWorks"] as const) {
      for (const entry of getZtcProjectCategoryRates(
        args.defaultRates,
        configuredProjectName,
        category,
      )) {
        const task = cleanZtcWorkName(entry.task);
        if (task && !isZtcComplexityCoefficientTask(task)) options.add(task);
      }
    }
  }

  for (const row of args.rows) {
    if (resolveZtcFilterRateTaskForRow(row, args.defaultRates)) continue;
    const task = cleanZtcWorkName(String(row.Works ?? ""));
    if (task) options.add(task);
  }

  for (const option of args.additionalOptions ?? []) {
    const task = String(option ?? "").trim();
    if (task) options.add(task);
  }

  return Array.from(options).sort((left, right) => left.localeCompare(right, "lv"));
}

export function buildZtcRecordedWorkFilterOptions(args: {
  rows: Array<Record<string, unknown>>;
  defaultRates: ZtcRateProject[] | null | undefined;
}) {
  const options = new Set<string>();
  for (const row of args.rows) {
    const groupName = resolveZtcFilterRateTaskForRow(
      row,
      args.defaultRates,
    )?.canonicalTask;
    if (groupName) options.add(groupName);
  }

  return Array.from(options).sort((left, right) => left.localeCompare(right, "lv"));
}
