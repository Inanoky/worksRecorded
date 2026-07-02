"use server";

import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import ztcSiteDiaryRecordsMap from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { getOrganizationIdByUserId, orgCheck } from "@/server/actions/shared-actions";
import {
  getZtcComplexityCoefficient,
  getZtcComplexityCoefficientByCode,
  getZtcComplexityCodeFromMarks,
  isZtcComplexityCoefficientTask,
  normalizeZtcComplexityCode,
  type ZtcComplexityCode,
  ZTC_ALL_PROJECTS_RATE_NAME,
  ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS,
} from "@/components/sitediary/ZTC/ztc-rate-constants";
import {
  normalizeZtcRateUnit,
  type ZtcRateUnit,
} from "@/components/sitediary/ZTC/ztc-rate-units";
import { findZtcDefaultRateForTask } from "@/components/sitediary/ZTC/ztc-rate-matching";

const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";
const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";
const ZTC_DEFAULT_TASK_RATES_KEY = "ztcDefaultTaskRates";
const ZTC_RATE_CATEGORIES = ["works", "additionalDetails", "additionalWorks"] as const;

export type ZtcRateCategory = (typeof ZTC_RATE_CATEGORIES)[number];

export type ZtcDefaultTaskRate = {
  task: string;
  rate: string;
  unit: ZtcRateUnit;
  relatesToElement?: boolean;
};

export type ZtcProjectTaskRates = {
  projectName: string;
  manual?: boolean;
  works: ZtcDefaultTaskRate[];
  additionalDetails: ZtcDefaultTaskRate[];
  additionalWorks: ZtcDefaultTaskRate[];
};

function ensureZtcSite(siteId: string | null | undefined) {
  if (siteId !== ZTC_SITE_ID) {
    throw new Error("ZTC darbības var izmantot tikai ZTC objektam.");
  }
}

async function requireZtcAccess(siteId: string) {
  ensureZtcSite(siteId);
  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);
  const organizationId = await getOrganizationIdByUserId(user.id);

  if (!site || organizationId !== ZTC_ORGANIZATION_ID) {
    throw new Error("Jums nav piekļuves ZTC būvdarbu žurnālam.");
  }

  return user;
}

function normalizeDate(value: unknown) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeNullableDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : undefined;
}

function normalizePayrollTextNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;
  return Number.isFinite(Number(normalized)) ? normalized : undefined;
}

function normalizeTaskName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/^T\s*\d+(?=\s|[-/]|$)/i, "TL")
    .replace(/^T(?!L)(?=\s|[-/]|$)/i, "TL");
}

function normalizeTaskRateEntries(
  value: unknown,
  fallbackUnit: ZtcRateUnit,
): ZtcDefaultTaskRate[] {
  if (!Array.isArray(value)) return [];

  const entries: ZtcDefaultTaskRate[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const task = normalizeTaskName((item as Record<string, unknown>)?.task);
    const rate = normalizePayrollTextNumber((item as Record<string, unknown>)?.rate);
    const unit = normalizeZtcRateUnit(
      (item as Record<string, unknown>)?.unit,
      fallbackUnit,
    );
    const relatesToElement =
      (item as Record<string, unknown>)?.relatesToElement === true;
    if (!task || rate === undefined || rate === null) continue;

    const key = task.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ task, rate, unit, relatesToElement });
  }

  return entries;
}

function normalizeProjectRateName(value: unknown) {
  const name = String(value ?? "").trim();
  return name || ZTC_ALL_PROJECTS_RATE_NAME;
}

function ensureZtcComplexityCoefficientRows(
  projects: ZtcProjectTaskRates[],
): ZtcProjectTaskRates[] {
  const sanitizedProjects = projects.map((project) => ({ ...project }));
  let allProjects = sanitizedProjects.find(
    (project) =>
      project.projectName.toLowerCase() === ZTC_ALL_PROJECTS_RATE_NAME.toLowerCase(),
  );

  if (!allProjects) {
    allProjects = {
      projectName: ZTC_ALL_PROJECTS_RATE_NAME,
      manual: false,
      works: [],
      additionalDetails: [],
      additionalWorks: [],
    };
    sanitizedProjects.unshift(allProjects);
  }

  const normalWorks = allProjects.works.filter(
    (entry) => !isZtcComplexityCoefficientTask(entry.task),
  );
  allProjects.works = [
    ...ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS.map((coefficient) => {
      const existing = allProjects.works.find(
        (entry) =>
          normalizeTaskName(entry.task).toLowerCase() ===
          coefficient.task.toLowerCase(),
      );
      return {
        task: coefficient.task,
        rate: existing?.rate ?? coefficient.defaultRate,
        unit: "m2" as const,
      };
    }),
    ...normalWorks,
  ];

  return sanitizedProjects;
}

function normalizeProjectRates(value: unknown): ZtcProjectTaskRates[] {
  if (Array.isArray(value)) {
    const looksLikeProjectRates = value.some(
      (item) =>
        item &&
        typeof item === "object" &&
        ("projectName" in item || "works" in item || "additionalDetails" in item || "additionalWorks" in item),
    );
    if (looksLikeProjectRates) {
      return normalizeProjectRates({ projects: value });
    }

    return ensureZtcComplexityCoefficientRows([
      {
        projectName: ZTC_ALL_PROJECTS_RATE_NAME,
        works: normalizeTaskRateEntries(value, "m2"),
        additionalDetails: [],
        additionalWorks: [],
      },
    ]);
  }

  const rawProjects = Array.isArray((value as Record<string, unknown> | null)?.projects)
    ? ((value as Record<string, unknown>).projects as unknown[])
    : [];
  const projects = rawProjects.map((project) => {
    const raw = project as Record<string, unknown>;
    return {
      projectName: normalizeProjectRateName(raw.projectName),
      manual: raw.manual === true,
      works: normalizeTaskRateEntries(raw.works, "m2"),
      additionalDetails: normalizeTaskRateEntries(raw.additionalDetails, "gab"),
      additionalWorks: normalizeTaskRateEntries(raw.additionalWorks, "st"),
    };
  });

  return ensureZtcComplexityCoefficientRows(
    projects.length
      ? projects
      : [
        {
          projectName: ZTC_ALL_PROJECTS_RATE_NAME,
          manual: false,
          works: [],
          additionalDetails: [],
          additionalWorks: [],
        },
      ],
  );
}

function getDefaultTaskRatesFromConfig(config: Record<string, any> | null | undefined) {
  return normalizeProjectRates(config?.otherSettings?.[ZTC_DEFAULT_TASK_RATES_KEY]);
}

const ZTC_RATE_STOP_WORDS = new Set([
  "papild",
  "papildus",
  "papilddetala",
  "papilddetalas",
  "detala",
  "detalas",
  "detalu",
  "detali",
  "gab",
  "gabals",
  "gabali",
  "mm",
  "cm",
  "m",
  "m2",
  "vieniba",
  "vienibas",
  "viens",
  "viena",
  "divi",
  "divas",
  "tris",
  "cetri",
  "cetras",
  "pieci",
]);

function normalizeRateToken(token: string) {
  const normalized = token
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    normalized.length < 2 ||
    /^\d+(?:[.,]\d+)?$/.test(normalized) ||
    ZTC_RATE_STOP_WORDS.has(normalized)
  ) {
    return "";
  }
  return normalized;
}

function rateTokenVariants(token: string) {
  const normalized = normalizeRateToken(token);
  if (!normalized) return [];
  const stem = normalized.replace(/(iem|am|us|as|es|is|ai|ei|am|em|i|a|e|u|s)$/i, "");
  return Array.from(
    new Set([normalized, stem.length >= 3 ? stem : normalized].filter(Boolean)),
  );
}

function taskMatchTokens(value: string) {
  const normalized = normalizeTaskName(value);
  const normalizedSearchText = normalized
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const tokens = normalized
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(r[1-5]|tl|l[1-5])\s*[-:/]?\s*/i, "")
    .split(/[^a-z0-9]+/i)
    .flatMap(rateTokenVariants);

  if (/^tl(\b|\s*[-/:])/i.test(normalized)) {
    tokens.push("karkas", "karkass", "timber", "frame");
  }
  if (/\b(karkas\w*|timber|frame)\b/i.test(normalizedSearchText)) {
    tokens.push("tl", "karkas", "karkass");
  }

  return Array.from(new Set(tokens));
}

function findDefaultRateForTask(
  task: unknown,
  rates: ZtcDefaultTaskRate[],
  options: { category?: ZtcRateCategory } = {},
) {
  return findZtcDefaultRateForTask(task, rates, options)?.entry ?? null;
}

function isZtcAdditionalWorkRow(row: Record<string, any>) {
  return row.Location === "Papilddarbi" || row.Works_Custom_1 === "Papilddarbi";
}

function getZtcRateCategoryForRow(row: Record<string, any>): ZtcRateCategory {
  if (row.Works_Custom_1 === "Papilddetāļas") return "additionalDetails";
  if (isZtcAdditionalWorkRow(row) || row.Units === "st") return "additionalWorks";
  return "works";
}

function getProjectCategoryRates(
  projects: ZtcProjectTaskRates[],
  projectName: string | null | undefined,
  category: ZtcRateCategory,
) {
  const normalizedProject = normalizeProjectRateName(projectName).toLowerCase();
  const projectRates = projects.find(
    (project) => project.projectName.toLowerCase() === normalizedProject,
  );
  const allProjectRates = projects.find(
    (project) => project.projectName.toLowerCase() === ZTC_ALL_PROJECTS_RATE_NAME.toLowerCase(),
  );

  const merged = [...(allProjectRates?.[category] ?? [])];
  for (const override of projectRates?.[category] ?? []) {
    const index = merged.findIndex(
      (entry) => normalizeTaskName(entry.task).toLowerCase() === normalizeTaskName(override.task).toLowerCase(),
    );
    if (index >= 0) {
      merged[index] = {
        ...merged[index],
        ...override,
        relatesToElement:
          override.relatesToElement ?? merged[index]?.relatesToElement,
      };
    } else {
      merged.push(override);
    }
  }

  return merged;
}

function getZtcDrawingComplexityMarks(
  metadataValue: unknown,
  elementName: unknown,
  taskName: unknown,
): 0 | 1 | 2 {
  if (typeof metadataValue !== "string" || !metadataValue.trim()) return 0;

  try {
    const metadata = JSON.parse(metadataValue) as {
      type?: string;
      elements?: Array<{
        elementName?: string | null;
        works?: Array<{
          name?: string | null;
          complexityMarks?: number | null;
        }>;
      }>;
    };
    if (metadata.type !== "ztc_drawing_context" || !Array.isArray(metadata.elements)) {
      return 0;
    }

    const normalizedElement = String(elementName ?? "").trim().toLowerCase();
    const normalizedTask = normalizeTaskName(taskName).toLowerCase();
    const element = metadata.elements.find(
      (entry) => String(entry.elementName ?? "").trim().toLowerCase() === normalizedElement,
    );
    const work = element?.works?.find(
      (entry) => normalizeTaskName(entry.name).toLowerCase() === normalizedTask,
    );
    return Number(work?.complexityMarks) >= 2
      ? 2
      : Number(work?.complexityMarks) === 1
        ? 1
        : 0;
  } catch {
    return 0;
  }
}

function getZtcDrawingComplexityCode(
  metadataValue: unknown,
  elementName: unknown,
  taskName: unknown,
): ZtcComplexityCode {
  if (typeof metadataValue !== "string" || !metadataValue.trim()) return "";

  try {
    const metadata = JSON.parse(metadataValue) as {
      type?: string;
      elements?: Array<{
        elementName?: string | null;
        works?: Array<{
          name?: string | null;
          complexityMarks?: number | null;
          complexityCode?: string | null;
        }>;
      }>;
    };
    if (metadata.type !== "ztc_drawing_context" || !Array.isArray(metadata.elements)) {
      return "";
    }

    const normalizedElement = String(elementName ?? "").trim().toLowerCase();
    const normalizedTask = normalizeTaskName(taskName).toLowerCase();
    const element = metadata.elements.find(
      (entry) => String(entry.elementName ?? "").trim().toLowerCase() === normalizedElement,
    );
    const work = element?.works?.find(
      (entry) => normalizeTaskName(entry.name).toLowerCase() === normalizedTask,
    );
    return (
      normalizeZtcComplexityCode(work?.complexityCode) ||
      getZtcComplexityCodeFromMarks(
        Number(work?.complexityMarks) >= 2
          ? 2
          : Number(work?.complexityMarks) === 1
            ? 1
            : 0,
      )
    );
  } catch {
    return "";
  }
}

function getZtcComplexityForMarks(
  marks: 0 | 1 | 2,
  projects: ZtcProjectTaskRates[],
  projectName: string | null | undefined,
) {
  return Number(
    getZtcComplexityCoefficient({ marks, projectName, projects }),
  );
}

function getZtcComplexityForCode(
  code: ZtcComplexityCode,
  projects: ZtcProjectTaskRates[],
  projectName: string | null | undefined,
) {
  return Number(
    getZtcComplexityCoefficientByCode({ code, projectName, projects }),
  );
}

function getZtcElementAreaM2FromMetadata(
  metadataValue: unknown,
  elementName: unknown,
) {
  if (typeof metadataValue !== "string" || !metadataValue.trim()) return null;

  try {
    const metadata = JSON.parse(metadataValue) as {
      type?: string;
      elements?: Array<{
        elementName?: string | null;
        totalAreaM2?: number | string | null;
      }>;
    };
    if (metadata.type !== "ztc_drawing_context" || !Array.isArray(metadata.elements)) {
      return null;
    }

    const normalizedElement = String(elementName ?? "").trim().toLowerCase();
    const element = metadata.elements.find(
      (entry) => String(entry.elementName ?? "").trim().toLowerCase() === normalizedElement,
    );
    const area = Number(String(element?.totalAreaM2 ?? "").replace(",", "."));
    return Number.isFinite(area) && area > 0 ? area : null;
  } catch {
    return null;
  }
}

function calculateZtcHours(start: Date | null | undefined, end: Date | null | undefined) {
  if (!start || !end) return null;
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  return Number.isFinite(hours) && hours >= 0 ? Number(hours.toFixed(2)) : null;
}

function normalizeZtcUnitKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

function getZtcAmountUnitAliases(unit: string) {
  const normalizedUnit = normalizeZtcUnitKey(unit);
  if (normalizedUnit === "gab") return ["gab", "gab.", "gb", "pcs", "piece", "pieces"];
  if (normalizedUnit === "tn") return ["tn", "tn.", "t", "ton", "tons", "tonna", "tonnas"];
  if (normalizedUnit === "kg") return ["kg", "kilogrami", "kilograms"];
  if (normalizedUnit === "m3") return ["m3", "m³", "kub", "kubikmetri"];
  if (normalizedUnit === "tm" || normalizedUnit === "t.m") return ["t.m.", "tm", "t/m"];
  return [unit].filter(Boolean);
}

function extractZtcAmountForUnitFromText(text: unknown, unit: string) {
  const source = String(text ?? "");
  if (!source.trim()) return undefined;

  const aliases = getZtcAmountUnitAliases(unit)
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!aliases) return undefined;

  const match = source.match(
    new RegExp(`(?:^|\\s)(\\d+(?:[,.]\\d+)?)\\s*(?:${aliases})(?=\\s|\\.|,|;|:|$)`, "i"),
  );
  return normalizeNumber(match?.[1]);
}

function getZtcReportedAmountForUnit(row: Record<string, any>, unit: string) {
  return (
    normalizeNumber(row.Amounts) ??
    extractZtcAmountForUnitFromText(row.originalUserComment, unit) ??
    extractZtcAmountForUnitFromText(row.Comments, unit)
  );
}

function sanitizeZtcRecordRow(row: Record<string, any>) {
  const defaultRates = normalizeProjectRates(row.__ztcDefaultTaskRates);
  const category = getZtcRateCategoryForRow(row);
  const defaultRate = findDefaultRateForTask(
    row.Works,
    getProjectCategoryRates(defaultRates, row.Location, category),
    { category },
  );
  const complexityMarks = getZtcDrawingComplexityMarks(
    row.Comments_Custom_2,
    row.Location_Custom_1,
    row.Works,
  );
  const complexityCode = getZtcDrawingComplexityCode(
    row.Comments_Custom_2,
    row.Location_Custom_1,
    row.Works,
  );
  const defaultComplexity = getZtcComplexityForCode(
    complexityCode || getZtcComplexityCodeFromMarks(complexityMarks),
    defaultRates,
    row.Location,
  );
  const startDate = normalizeDate(row.Date) ?? null;
  const endDate = normalizeNullableDate(row.Date_Custom_2);
  const isElementRelatedAdditionalWork =
    category === "additionalWorks" &&
    defaultRate?.relatesToElement === true &&
    row.Location &&
    row.Location !== "Papilddarbi" &&
    row.Location_Custom_1;
  const elementAreaM2 = isElementRelatedAdditionalWork
    ? getZtcElementAreaM2FromMetadata(row.Comments_Custom_2, row.Location_Custom_1)
    : null;
  const timeInvolved =
    normalizeNumber(row.TimeInvolved) ?? calculateZtcHours(startDate, endDate);
  const additionalWorkUnit =
    category === "additionalWorks"
      ? isElementRelatedAdditionalWork
        ? defaultRate?.unit ?? normalizeZtcRateUnit(row.Units, "st")
        : "st"
      : null;
  const units =
    category === "additionalWorks"
      ? additionalWorkUnit
      : row.Units ||
        (category === "additionalDetails" ? "gab" : "m2");
  const normalizedAdditionalWorkUnit = normalizeZtcUnitKey(units);
  const reportedAmount = getZtcReportedAmountForUnit(row, units);
  const amounts =
    category === "additionalWorks"
      ? isElementRelatedAdditionalWork && normalizedAdditionalWorkUnit === "m2"
        ? elementAreaM2 ?? normalizeNumber(row.Amounts) ?? null
        : normalizedAdditionalWorkUnit === "st"
          ? timeInvolved ?? reportedAmount ?? null
          : reportedAmount ?? null
      : normalizeNumber(row.Amounts) ?? null;
  const works =
    (category === "additionalWorks" || category === "additionalDetails") &&
    defaultRate?.task?.trim()
      ? defaultRate.task.trim()
      : row.Works || null;

  return {
    Date: startDate,
    Date_Custom_1: normalizeNullableDate(row.Date_Custom_1),
    Date_Custom_2: endDate,
    Location: row.Location || null,
    Location_Custom_1: row.Location_Custom_1 || null,
    Location_Custom_2: row.Location_Custom_2 || defaultRate?.rate || null,
    Works: works,
    Works_Custom_1: row.Works_Custom_1 || null,
    Works_Custom_2: row.Works_Custom_2 || null,
    Comments: row.Comments || null,
    Comments_Custom_1: row.Comments_Custom_1 || null,
    Comments_Custom_2: row.Comments_Custom_2 || null,
    originalUserComment: row.originalUserComment || null,
    Units: units,
    Amounts: amounts,
    WorkersInvolved: normalizeNumber(row.WorkersInvolved) ?? defaultComplexity,
    TimeInvolved: timeInvolved,
  };
}

function formatCreatorName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

function getCreatorNameFromOriginalComment(value: unknown) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(.+?)\s+:\s+/);
  return match?.[1]?.trim() ?? "";
}

function mapZtcRecord(rec: any) {
  const createdBy = rec.User
    ? formatCreatorName(rec.User.firstName, rec.User.lastName)
    : rec.Worker
      ? formatCreatorName(rec.Worker.name, rec.Worker.surname)
      : getCreatorNameFromOriginalComment(rec.originalUserComment);

  return {
    id: rec.id,
    Date: rec.Date,
    Date_Custom_1: rec.Date_Custom_1,
    Date_Custom_2: rec.Date_Custom_2,
    Location: rec.Location || "",
    Location_Custom_1: rec.Location_Custom_1 || "",
    Location_Custom_2: rec.Location_Custom_2 || "",
    Works: rec.Works || "",
    Works_Custom_1: rec.Works_Custom_1 || "",
    Works_Custom_2: rec.Works_Custom_2 || "",
    Units: rec.Units || "m2",
    Amounts: rec.Amounts?.toString() || "",
    WorkersInvolved: rec.WorkersInvolved?.toString() || "",
    TimeInvolved: rec.TimeInvolved?.toString() || "",
    pausedAt: rec.pausedAt || null,
    pauseIntervals: rec.pauseIntervals ?? [],
    Comments: rec.Comments || "",
    Comments_Custom_1: rec.Comments_Custom_1 || "",
    Comments_Custom_2: rec.Comments_Custom_2 || "",
    originalUserComment: rec.originalUserComment || "",
    originalAudioUrl: rec.originalAudioUrl || "",
    Photos: Array.isArray(rec.Photos) ? rec.Photos : [],
    createdBy: createdBy || "N/A",
  };
}

async function loadZtcSiteDiaryConfig(siteId: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { siteDiaryRecordsMap: true },
  });

  const baseMap = structuredClone(ztcSiteDiaryRecordsMap as Record<string, any>);
  const savedMap =
    site?.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
      ? (site.siteDiaryRecordsMap as Record<string, any>)
      : null;

  if (!savedMap) return baseMap;

  baseMap.otherSettings = {
    ...(baseMap.otherSettings ?? {}),
    ...((savedMap.otherSettings && typeof savedMap.otherSettings === "object")
      ? savedMap.otherSettings
      : {}),
  };

  for (const [fieldKey, fieldConfig] of Object.entries(savedMap)) {
    if (
      fieldConfig &&
      typeof fieldConfig === "object" &&
      "DropDownOptions" in fieldConfig &&
      baseMap[fieldKey]
    ) {
      baseMap[fieldKey] = {
        ...baseMap[fieldKey],
        DropDownOptions: (fieldConfig as Record<string, any>).DropDownOptions,
      };
    }
  }

  return baseMap;
}

async function loadZtcSiteDiaryRecords(args: { date: string }) {
  const start = new Date(args.date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(args.date);
  end.setHours(23, 59, 59, 999);

  const records = await prisma.ztcRecords.findMany({
    where: {
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
      Date_Custom_2: { not: null },
      NOT: [{ Date: null }, { Works: null }, { Works: "" }],
      OR: [
        { Date: { gte: start, lte: end } },
        { Date_Custom_1: { gte: start, lte: end } },
      ],
    },
    orderBy: [{ Date: "desc" }, { Date_Custom_1: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      Date: true,
      Date_Custom_1: true,
      Date_Custom_2: true,
      Location: true,
      Location_Custom_1: true,
      Location_Custom_2: true,
      Works: true,
      Works_Custom_1: true,
      Works_Custom_2: true,
      Units: true,
      Amounts: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      pausedAt: true,
      pauseIntervals: true,
      Comments: true,
      Comments_Custom_1: true,
      Comments_Custom_2: true,
      originalUserComment: true,
      originalAudioUrl: true,
      Photos: true,
      User: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      Worker: {
        select: {
          name: true,
          surname: true,
        },
      },
    },
  });

  return records.map(mapZtcRecord);
}

export async function getZtcSiteDiaryConfig(siteId: string) {
  await requireZtcAccess(siteId);
  return loadZtcSiteDiaryConfig(siteId);
}

export async function getZtcDefaultTaskRates(siteId: string) {
  await requireZtcAccess(siteId);
  const config = await loadZtcSiteDiaryConfig(siteId);
  return getDefaultTaskRatesFromConfig(config);
}

export async function updateZtcDefaultTaskRates(args: {
  siteId: string;
  rates: ZtcProjectTaskRates[];
}) {
  await requireZtcAccess(args.siteId);

  const site = await prisma.site.findUnique({
    where: { id: args.siteId },
    select: { siteDiaryRecordsMap: true },
  });
  if (!site) throw new Error("ZTC objekts nav atrasts.");

  const currentMap =
    site.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
      ? structuredClone(site.siteDiaryRecordsMap as Record<string, any>)
      : structuredClone(ztcSiteDiaryRecordsMap as Record<string, any>);

  const rates = normalizeProjectRates({ projects: args.rates });
  currentMap.otherSettings = {
    ...(currentMap.otherSettings ?? {}),
    [ZTC_DEFAULT_TASK_RATES_KEY]: { projects: rates },
  };

  await prisma.site.update({
    where: { id: args.siteId },
    data: { siteDiaryRecordsMap: currentMap },
  });

  return { ok: true, rates };
}

export async function getZtcSiteDiaryRecords(args: { siteId: string; date: string }) {
  await requireZtcAccess(args.siteId);
  return loadZtcSiteDiaryRecords({ date: args.date });
}

export async function getZtcDialogPrefetchData(args: { siteId: string; date: string }) {
  await requireZtcAccess(args.siteId);

  const [config, rows, rates] = await Promise.all([
    loadZtcSiteDiaryConfig(args.siteId),
    loadZtcSiteDiaryRecords({ date: args.date }),
    getZtcDefaultTaskRates(args.siteId),
  ]);

  return { config, rows, rates };
}

export async function createZtcSiteDiaryRecords(args: {
  siteId: string;
  rows: Array<Record<string, any>>;
}) {
  const user = await requireZtcAccess(args.siteId);
  const defaultRates = await getZtcDefaultTaskRates(args.siteId);

  const rows = args.rows.map((row) => ({
    userId: user.id,
    siteId: ZTC_SITE_ID,
    organizationId: ZTC_ORGANIZATION_ID,
    ...sanitizeZtcRecordRow({ ...row, __ztcDefaultTaskRates: defaultRates }),
    Photos: [],
  }));

  if (!rows.length) return { ok: false, message: "Nav ierakstu, ko pievienot." };

  await prisma.ztcRecords.createMany({ data: rows });
  return { ok: true, count: rows.length };
}

export async function saveZtcSiteDiaryDialogRows(args: {
  siteId: string;
  existingRows: Array<Record<string, any> & { id: string }>;
  newRows: Array<Record<string, any>>;
}) {
  const user = await requireZtcAccess(args.siteId);
  const defaultRates = await getZtcDefaultTaskRates(args.siteId);

  const existingRows = args.existingRows
    .filter((row) => row.id)
    .map((row) => {
      const { id, siteId, _tempId, createdBy, ...data } = row;
      return {
        id,
        data: sanitizeZtcRecordRow({ ...data, __ztcDefaultTaskRates: defaultRates }),
      };
    });

  const newRows = args.newRows.map((row) => ({
    userId: user.id,
    siteId: ZTC_SITE_ID,
    organizationId: ZTC_ORGANIZATION_ID,
    ...sanitizeZtcRecordRow({ ...row, __ztcDefaultTaskRates: defaultRates }),
    Photos: [],
  }));

  if (!existingRows.length && !newRows.length) {
    return { ok: true, updated: 0, created: 0 };
  }

  await prisma.$transaction([
    ...existingRows.map((row) =>
      prisma.ztcRecords.updateMany({
        where: {
          id: row.id,
          siteId: ZTC_SITE_ID,
          organizationId: ZTC_ORGANIZATION_ID,
        },
        data: row.data,
      }),
    ),
    ...(newRows.length
      ? [prisma.ztcRecords.createMany({ data: newRows })]
      : []),
  ]);

  return { ok: true, updated: existingRows.length, created: newRows.length };
}

export async function updateZtcSiteDiaryRecord(args: {
  siteId: string;
  id: string;
  [key: string]: any;
}) {
  await requireZtcAccess(args.siteId);
  const { id, siteId, _tempId, createdBy, ...row } = args;
  const defaultRates = await getZtcDefaultTaskRates(siteId);

  const result = await prisma.ztcRecords.updateMany({
    where: {
      id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
    },
    data: sanitizeZtcRecordRow({ ...row, __ztcDefaultTaskRates: defaultRates }),
  });

  if (result.count !== 1) {
    return { ok: false, message: "ZTC ieraksts nav atrasts." };
  }

  const record = await prisma.ztcRecords.findUnique({ where: { id } });
  return { ok: true, record };
}

export async function deleteZtcSiteDiaryRecord(args: { siteId: string; id: string }) {
  await requireZtcAccess(args.siteId);

  await prisma.ztcRecords.deleteMany({
    where: {
      id: args.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
    },
  });

  return { success: true };
}

export async function updateZtcPayrollFields(args: {
  siteId: string;
  id: string;
  rate?: string | number | null;
  coefficient?: string | number | null;
  complexity?: string | number | null;
}) {
  await requireZtcAccess(args.siteId);

  const rate = normalizePayrollTextNumber(args.rate);
  const coefficient = normalizePayrollTextNumber(args.coefficient);
  const complexity = normalizeNumber(args.complexity);

  if (rate === undefined) {
    return { ok: false, message: "Algas likmei jābūt derīgam skaitlim." };
  }

  if (coefficient === undefined) {
    return { ok: false, message: "Algas koeficientam jābūt derīgam skaitlim." };
  }

  if (args.complexity !== "" && args.complexity != null && complexity === undefined) {
    return { ok: false, message: "Sarežģītības koeficientam jābūt derīgam skaitlim." };
  }

  const result = await prisma.ztcRecords.updateMany({
    where: {
      id: args.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
    },
    data: {
      Location_Custom_2: rate,
      Works_Custom_2: coefficient,
      WorkersInvolved: complexity ?? null,
    },
  });

  if (result.count !== 1) {
    return { ok: false, message: "ZTC ieraksts nav atrasts." };
  }

  return { ok: true };
}
