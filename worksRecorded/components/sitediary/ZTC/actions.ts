"use server";

import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import ztcSiteDiaryRecordsMap from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { getOrganizationIdByUserId, orgCheck } from "@/server/actions/shared-actions";
import {
  getZtcComplexityCoefficient,
  isZtcComplexityCoefficientTask,
  ZTC_ALL_PROJECTS_RATE_NAME,
  ZTC_DEFAULT_ONE_X_COEFFICIENT,
  ZTC_DEFAULT_TWO_X_COEFFICIENT,
  ZTC_ONE_X_COEFFICIENT_TASK,
  ZTC_TWO_X_COEFFICIENT_TASK,
} from "@/components/sitediary/ZTC/ztc-rate-constants";
import {
  normalizeZtcRateUnit,
  resolveZtcAdditionalWorkUnit,
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
    if (!task || rate === undefined || rate === null) continue;

    const key = task.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ task, rate, unit });
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
  const oneX = allProjects.works.find(
    (entry) =>
      normalizeTaskName(entry.task).toLowerCase() ===
      ZTC_ONE_X_COEFFICIENT_TASK.toLowerCase(),
  );
  const twoX = allProjects.works.find(
    (entry) =>
      normalizeTaskName(entry.task).toLowerCase() ===
      ZTC_TWO_X_COEFFICIENT_TASK.toLowerCase(),
  );

  allProjects.works = [
    {
      task: ZTC_ONE_X_COEFFICIENT_TASK,
      rate: oneX?.rate ?? ZTC_DEFAULT_ONE_X_COEFFICIENT,
      unit: "m2",
    },
    {
      task: ZTC_TWO_X_COEFFICIENT_TASK,
      rate: twoX?.rate ?? ZTC_DEFAULT_TWO_X_COEFFICIENT,
      unit: "m2",
    },
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

function getZtcRateCategoryForRow(row: Record<string, any>): ZtcRateCategory {
  if (row.Works_Custom_1 === "Papilddetāļas") return "additionalDetails";
  if (row.Location === "Papilddarbi" || row.Units === "st") return "additionalWorks";
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
      merged[index] = override;
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

function getZtcComplexityForMarks(
  marks: 0 | 1 | 2,
  projects: ZtcProjectTaskRates[],
  projectName: string | null | undefined,
) {
  return Number(
    getZtcComplexityCoefficient({ marks, projectName, projects }),
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
  const defaultComplexity = getZtcComplexityForMarks(
    complexityMarks,
    defaultRates,
    row.Location,
  );
  const units =
    category === "additionalWorks"
      ? resolveZtcAdditionalWorkUnit({
          configuredUnit: defaultRate?.unit,
          reportedUnit: row.Units,
        })
      : row.Units ||
        (category === "additionalDetails" ? "gab" : "m2");
  const works =
    (category === "additionalWorks" || category === "additionalDetails") &&
    defaultRate?.task?.trim()
      ? defaultRate.task.trim()
      : row.Works || null;

  return {
    Date: normalizeDate(row.Date) ?? null,
    Date_Custom_1: normalizeNullableDate(row.Date_Custom_1),
    Date_Custom_2: normalizeNullableDate(row.Date_Custom_2),
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
    Amounts: normalizeNumber(row.Amounts) ?? null,
    WorkersInvolved: normalizeNumber(row.WorkersInvolved) ?? defaultComplexity,
    TimeInvolved: normalizeNumber(row.TimeInvolved) ?? null,
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

  const [config, rows] = await Promise.all([
    loadZtcSiteDiaryConfig(args.siteId),
    loadZtcSiteDiaryRecords({ date: args.date }),
  ]);

  return { config, rows };
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
