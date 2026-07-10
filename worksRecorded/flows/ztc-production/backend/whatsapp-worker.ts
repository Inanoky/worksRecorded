import { UTApi } from "uploadthing/server";
import OpenAI, { toFile } from "openai";
import { prisma } from "@/lib/utils/db";
import {
  fetchWhatsAppMediaAsBuffer,
  getString,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/sender";
import ztcSiteDiaryRecordsMap from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { getConfig } from "@/server/actions/site-diary-actions";
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url";
import {
  getZtcComplexityCoefficientByCode,
  isZtcComplexityCoefficientTask,
  normalizeZtcComplexityCode,
  type ZtcComplexityCode,
  ZTC_ALL_PROJECTS_RATE_NAME,
  ZTC_COMPLEXITY_COEFFICIENT_RATE_ROWS,
} from "@/flows/ztc-production/lib/ztc-rate-constants";
import {
  normalizeZtcRateUnit,
  type ZtcRateUnit,
} from "@/flows/ztc-production/lib/ztc-rate-units";
import { findZtcDefaultRateForTask } from "@/flows/ztc-production/lib/ztc-rate-matching";
import {
  getZtcTaskIdentityKey,
  rebalanceZtcCompletedTaskAmounts,
} from "@/flows/ztc-production/lib/ztc-task-amount-allocation";
import { normalizeZtcProjectName } from "@/flows/ztc-production/lib/ztc-project-name";
import {
  attachZtcLaborNormToMetadata,
  clearZtcLaborNormFromMetadata,
  normalizeZtcLaborNorm,
} from "@/flows/ztc-production/lib/ztc-labor-norm";
import { cleanZtcWorkName } from "@/flows/ztc-production/lib/ztc-work-name-cleanup";
import { ZTC_CANCELLED_SESSION_PREFIX } from "@/flows/ztc-production/lib/ztc-session-markers";

export const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";
export const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";
const FINISH_PENDING_PREFIX = "__ZTC_FINISH_PENDING__";
const PHOTO_PENDING_FINISH_PREFIX = "__ZTC_PHOTO_PENDING_FINISH__";
const DIAGONAL_FIRST_PHOTO_PENDING_PREFIX = "__ZTC_DIAGONAL_FIRST_PHOTO_PENDING__";
const DIAGONAL_FIRST_MEASURE_PENDING_PREFIX = "__ZTC_DIAGONAL_FIRST_MEASURE_PENDING__";
const DIAGONAL_SECOND_PHOTO_PENDING_PREFIX = "__ZTC_DIAGONAL_SECOND_PHOTO_PENDING__";
const DIAGONAL_SECOND_MEASURE_PENDING_PREFIX = "__ZTC_DIAGONAL_SECOND_MEASURE_PENDING__";
const DIAGONALS_PENDING_PREFIX = "__ZTC_DIAGONALS_PENDING__";
const DIAGONALS_CONFIRM_PREFIX = "__ZTC_DIAGONALS_CONFIRM__";
const PHOTO_BATCH_CONFIRM_PREFIX = "__ZTC_PHOTO_BATCH_CONFIRM__";
const DRAWING_CONTEXT_SUPERSEDED_BY_ADDITIONAL_WORK_PREFIX =
  "__ZTC_DRAWING_CONTEXT_SUPERSEDED_BY_ADDITIONAL_WORK__";
const PHOTO_BATCH_CONFIRM_WINDOW_MS = 45_000;
const TL_WORK_PHOTO_BATCH_GRACE_MS = 30_000;
const ZTC_MEDIA_TIMEOUT_MS = 30_000;
const ZTC_UPLOAD_TIMEOUT_MS = 30_000;
const ZTC_VISION_TIMEOUT_MS = 120_000;
const ZTC_TEXT_TIMEOUT_MS = 30_000;
const ZTC_TRANSCRIPTION_TIMEOUT_MS = 30_000;
const ZTC_DROPDOWN_CACHE_MS = 60_000;
const ZTC_COMMENT_POLISH_TIMEOUT_MS = 15_000;
const ZTC_DEFAULT_VISION_MODEL = "gpt-5.4";

export type ProductionDrawingExtractionProfile = "ztc" | "default-production";

const ZTC_DRAWING_EXTRACTION_SYSTEM_PROMPT =
  "You validate production factory drawing photos. Return only JSON with keys: isConstructionDrawing boolean, hasReadableProjectName boolean, hasReadableElementName boolean, hasReadableWorkList boolean, qualityOk boolean, projectName string|null, elementName string|null, totalAreaM2 number|null, workList string[], workItems array of {name string, amountM2 number|null, complexityCode string}, issue string|null. Accept this production legend format when its bottom framed tables are readable. Ignore the large drawing views, dimensions, revision stamp, designer names, company address, logo, and unrelated notes. The works are always in the left framed table. Read its rows from top to bottom, commonly in this order: L4/B4, L3/B3, L2/B2, L1/B1, TL, L0, R1/T1, R2/T2, R3/T3, R4/T4, R5/T5. Extract only rows with a visible work description after the hyphen and omit rows whose description is empty. Preserve each visible prefix and description, for example \"L2/B2 - Latojums 45x45\", \"TL - Koka karkass 245 mm\", or \"R3/T3 - Latojums 28x70\". Normalize an OCR-only T or T1 timber-frame prefix to TL only when it is clearly the standalone timber-frame row; preserve R1/T1 and other printed paired row codes exactly. The two narrow handwritten coefficient cells are immediately to the left of every work row. For each extracted work, set complexityCode to exactly one of \"\", \"X\", \"X X\", \"1\", \"2\", \"3\", \"4\", \"5\", \"6\". Use \"\" when the aligned coefficient cells are empty. Use \"X\" when one aligned coefficient cell has a handwritten X and \"X X\" only when both aligned coefficient cells on that row have handwritten X marks. For numeric handwritten coefficients, return only the visible number from 1 to 6; do not return doubled numeric codes such as \"1 1\", \"2 2\", or \"3 3\". If the photo is rotated, mentally rotate it so the work table is horizontal before aligning coefficient cells to rows. Read only the coefficient cells aligned with that exact work row; do not count printed grid lines, work-code letters, checkmarks, dimensions, or marks from adjacent rows. The element number must be extracted only from the value after the label \"Paneļa numurs:\". Tolerate minor spelling/OCR variants such as \"Paneļa nummurs:\", \"Panela numurs:\", or \"Panela nummurs:\", plus minor spacing around the colon. Example: \"Paneļa numurs: 3S-03\" means elementName=\"3S-03\". The total element area must be extracted only from the numeric value after the label \"Paneļa laukums:\". Tolerate OCR variants such as \"Panela laukums:\" or \"Paneļā laukums:\" and minor spacing. Example: \"Paneļa laukums: 11.66 m²\" means totalAreaM2=11.66. The project name must be extracted only from the value on the BP row immediately after \"BP:\" or \"BP :\". Example: \"BP : Zemgales Prospekts 11 (ZP)\" means projectName=\"Zemgales Prospekts 11 (ZP)\". Do not use the company address, customer, designer, date, or drawing-size fields as projectName. Set hasReadableProjectName, hasReadableElementName, and hasReadableWorkList according to these exact locations. If work-specific areas are not printed in the left work table, set every workItems amountM2 to totalAreaM2. Reject ordinary photos, selfies, unrelated documents, and drawings where BP project name, Paneļa numurs, Paneļa laukums, or the left work table cannot be read. Preserve Latvian diacritics and original spelling in extracted values; do not transliterate.";

const DEFAULT_PRODUCTION_DRAWING_EXTRACTION_SYSTEM_PROMPT =
  "You validate production factory drawing photos. Return only JSON with keys: isConstructionDrawing boolean, hasReadableProjectName boolean, hasReadableElementName boolean, hasReadableWorkList boolean, qualityOk boolean, projectName string|null, elementName string|null, totalAreaM2 number|null, workList string[], workItems array of {name string, amountM2 number|null, complexityCode string}, issue string|null. Accept generic production drawing title blocks and legends when the framed tables are readable. Ignore the large drawing views, dimensions, revision stamp, designer names, company address, logo, and unrelated notes. Extract works from the framed work/item table, usually the left table. Rows may use any visible code prefix before a hyphen, including but not limited to PC1, PC2, PC3, PC4, L1/B1, TL, R1/T1, or similar production item codes. Extract only rows with a visible work or item description after the hyphen and omit rows whose description is empty. Preserve each visible prefix and description exactly, for example \"PC1 - INSULATION 340*300*250\" or \"L2/B2 - Latojums 45x45\". If handwritten coefficient cells exist next to work rows, set complexityCode to exactly one of \"\", \"X\", \"X X\", \"1\", \"2\", \"3\", \"4\", \"5\", \"6\". Use \"\" when no aligned coefficient is visible or when the coefficient is unclear. Do not invent coefficients. If the photo is rotated, mentally rotate it before reading. The element number must be extracted only from the value after labels like \"Paneļa numurs:\", \"Panela numurs:\", \"Element number:\", \"Panel number:\", or close OCR variants. The total element area must be extracted only from the numeric value after labels like \"Paneļa laukums:\", \"Panela laukums:\", \"Panel area:\", or close OCR variants. The project name should be extracted from the value on the BP row when present; otherwise use the clearest project/customer/building row in the title block, not the manufacturer address, designer, date, drawing-size field, or logo. Set every workItems amountM2 to totalAreaM2 when row-specific quantities are not printed. Reject ordinary photos, selfies, unrelated documents, and drawings where project name, element number, total area, or the work/item table cannot be read. Preserve original spelling in extracted values; do not transliterate.";

function getDrawingExtractionPrompt(profile: ProductionDrawingExtractionProfile) {
  return profile === "default-production"
    ? {
        system: DEFAULT_PRODUCTION_DRAWING_EXTRACTION_SYSTEM_PROMPT,
        user:
          "Read the production drawing legend/title block. Extract works/items from the framed work table, projectName from BP or the main project/customer row, elementName from the panel/element number, totalAreaM2 from the panel area, and any handwritten coefficient code aligned with each work row.",
      }
    : {
        system: ZTC_DRAWING_EXTRACTION_SYSTEM_PROMPT,
        user:
          "Read the bottom ZTC legend. Extract works only from the left table, projectName from BP, elementName from Paneļa numurs, totalAreaM2 from Paneļa laukums, and the handwritten coefficient code from the cells aligned with each work row.",
      };
}

class ZtcTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "ZtcTimeoutError";
  }
}

export type ZtcWorker = {
  id: string;
  name: string | null;
  surname: string | null;
  role?: string | null;
  phone: string | null;
  siteId: string | null;
  organizationId: string | null;
  ztcFlowContext?: ZtcFlowContext | null;
};

export type ZtcFlowContext = {
  siteId: string;
  organizationId: string;
};

export function getZtcFlowContext(worker?: Pick<ZtcWorker, "siteId" | "organizationId" | "ztcFlowContext"> | null): ZtcFlowContext {
  return {
    siteId: worker?.ztcFlowContext?.siteId ?? worker?.siteId ?? ZTC_SITE_ID,
    organizationId: worker?.ztcFlowContext?.organizationId ?? worker?.organizationId ?? ZTC_ORGANIZATION_ID,
  };
}

export type DrawingExtraction = {
  isConstructionDrawing: boolean;
  hasReadableProjectName: boolean;
  hasReadableElementName: boolean;
  hasReadableWorkList: boolean;
  qualityOk: boolean;
  projectName: string | null;
  elementName: string | null;
  totalAreaM2: number | null;
  workList: string[];
  workItems: Array<{
    name: string;
    amountM2: number | null;
    complexityCode?: ZtcComplexityCode | null;
  }>;
  issue: string | null;
};

type WorkExtraction = {
  isGibberish: boolean;
  isFinish: boolean;
  isAdditionalWork: boolean;
  polishedText?: string | null;
  additionalWorkDescription: string | null;
  additionalDetails?: Array<{
    description: string;
    quantity: number | null;
  }>;
  workOption: string | null;
  amountCompleted: number | null;
  units: string | null;
  issue: string | null;
};

type DiagonalMeasureExtraction = {
  isValid: boolean;
  measureMm: number | null;
  normalizedText?: string | null;
  issue: string | null;
};

type ZtcConfigField = {
  DropDownOptions?: Record<string, unknown>;
};

type ZtcConfigMap = Record<string, ZtcConfigField | undefined>;
type ZtcDropdownOptions = {
  workOptions: string[];
  unitOptions: string[];
};
type ZtcRateCategory = "works" | "additionalDetails" | "additionalWorks";
type ZtcDefaultTaskRate = {
  task: string;
  rate: string;
  unit: ZtcRateUnit;
  laborNorm?: string | null;
  relatesToElement?: boolean;
};
type ZtcProjectTaskRates = {
  projectName: string;
  works: ZtcDefaultTaskRate[];
  additionalDetails: ZtcDefaultTaskRate[];
  additionalWorks: ZtcDefaultTaskRate[];
};

const ztcDropdownOptionsCache = new Map<string, { value: ZtcDropdownOptions; expiresAt: number }>();

type OpenZtcSession = NonNullable<Awaited<ReturnType<typeof getOpenZtcSession>>>;

type ZtcDrawingMetadata = {
  type: "ztc_drawing_context";
  version: 1;
  projectName: string;
  elements: Array<{
    elementName: string;
    totalAreaM2: number | null;
    works: Array<{
      name: string;
      amountM2: number | null;
      complexityCode?: ZtcComplexityCode | null;
    }>;
  }>;
};

type ZtcDiagonalPayload = {
  completedText: string;
  additionalDetails?: WorkExtraction["additionalDetails"];
  workPhotoBatchPromptedAt?: number;
  workPhotoBatchGraceUntil?: number;
  firstPhotoUrl?: string;
  firstMeasureMm?: number;
  secondPhotoUrl?: string;
  secondMeasureMm?: number;
};

type ZtcFinishPendingPayload = {
  completedText: string;
  additionalDetails?: WorkExtraction["additionalDetails"];
};

const utapi = new UTApi();

function getDropdownLabels(config: ZtcConfigMap, fieldKey: string) {
  const options = config?.[fieldKey]?.DropDownOptions;
  if (!options || typeof options !== "object") return [];
  return Object.values(options)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function normalizeZtcWorkName(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/^T\s*\d+(?=\s|[-/]|$)/i, "TL")
    .replace(/^T(?!L)(?=\s|[-/]|$)/i, "TL");
}

function normalizeZtcDrawingWorkName(value: string | null | undefined) {
  return cleanZtcWorkName(normalizeZtcWorkName(value));
}

function normalizeZtcWorkOptions(values: string[]) {
  const seen = new Set<string>();
  const options: string[] = [];

  for (const value of values) {
    const normalized = normalizeZtcWorkName(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(normalized);
  }

  return options;
}

async function getZtcDropdownOptions(worker?: ZtcWorker | null) {
  const context = getZtcFlowContext(worker);
  const now = Date.now();
  const cached = ztcDropdownOptionsCache.get(context.siteId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const config = ((await getConfig(context.siteId)) ??
    ztcSiteDiaryRecordsMap) as ZtcConfigMap;

  const value = {
    workOptions: normalizeZtcWorkOptions(getDropdownLabels(config, "Works")),
    unitOptions: getDropdownLabels(config, "Units"),
  };

  ztcDropdownOptionsCache.set(context.siteId, {
    value,
    expiresAt: now + ZTC_DROPDOWN_CACHE_MS,
  });

  return value;
}

function normalizeAllowedOption(value: string | null | undefined, allowed: string[]) {
  const normalized = value?.trim();
  if (!normalized) return null;

  return (
    allowed.find((option) => option.toLowerCase() === normalized.toLowerCase()) ??
    null
  );
}

function normalizePayrollTextNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;
  return Number.isFinite(Number(normalized)) ? normalized : null;
}

const ZTC_RATE_CATEGORIES: ZtcRateCategory[] = ["works", "additionalDetails", "additionalWorks"];

function normalizeTaskRateEntries(
  value: unknown,
  fallbackUnit: ZtcRateUnit,
): ZtcDefaultTaskRate[] {
  if (!Array.isArray(value)) return [];

  const rates: ZtcDefaultTaskRate[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const task = normalizeZtcWorkName((item as Record<string, unknown>)?.task as string | null | undefined);
    const rate = normalizePayrollTextNumber((item as Record<string, unknown>)?.rate);
    const unit = normalizeZtcRateUnit(
      (item as Record<string, unknown>)?.unit,
      fallbackUnit,
    );
    const laborNorm = normalizeZtcLaborNorm(
      (item as Record<string, unknown>)?.laborNorm,
    );
    const relatesToElement =
      (item as Record<string, unknown>)?.relatesToElement === true;
    if (!task || rate == null) continue;

    const key = task.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rates.push({
      task,
      rate,
      unit,
      ...(laborNorm !== undefined && laborNorm !== null ? { laborNorm } : {}),
      relatesToElement,
    });
  }

  return rates;
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
          normalizeZtcWorkName(entry.task).toLowerCase() ===
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
          works: [],
          additionalDetails: [],
          additionalWorks: [],
        },
      ],
  );
}

function getDefaultTaskRatesFromConfig(config: Record<string, any> | null | undefined): ZtcProjectTaskRates[] {
  const rawRates = config?.otherSettings?.ztcDefaultTaskRates;
  return normalizeProjectRates(rawRates);
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

function normalizeAdditionalDetailDescription(value: string | null | undefined) {
  return normalizeZtcWorkName(value)
    .replace(/^\s*\d+(?:[.,]\d+)?\s*/i, "")
    .replace(/\b(gab\.?|gabali?|vienibas?|vienības?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function taskRateMatchTokens(value: string) {
  const normalized = normalizeZtcWorkName(value);
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
      (entry) => normalizeZtcWorkName(entry.task).toLowerCase() === normalizeZtcWorkName(override.task).toLowerCase(),
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

async function getDefaultRateForWork(
  workName: string | null | undefined,
  options: { projectName?: string | null; category?: ZtcRateCategory; worker?: ZtcWorker | null; siteId?: string | null } = {},
) {
  return (await getDefaultRateMatchForWork(workName, options))?.rate ?? null;
}

async function getDefaultRateMatchForWork(
  workName: string | null | undefined,
  options: { projectName?: string | null; category?: ZtcRateCategory; worker?: ZtcWorker | null; siteId?: string | null } = {},
) {
  const context = getZtcFlowContext(options.worker);
  const config = ((await getConfig(options.siteId ?? context.siteId)) ??
    ztcSiteDiaryRecordsMap) as Record<string, any>;
  const rates = getProjectCategoryRates(
    getDefaultTaskRatesFromConfig(config),
    options.projectName,
    options.category ?? "works",
  );
  const best = findZtcDefaultRateForTask(workName, rates, {
    category: options.category,
  });

  return best ? { ...best.entry, score: best.score } : null;
}

function normalizeAllowedWorkOption(value: string | null | undefined, allowed: string[]) {
  const normalized = normalizeZtcWorkName(value);
  if (!normalized) return null;

  return (
    allowed.find(
      (option) =>
        normalizeZtcWorkName(option).toLowerCase() === normalized.toLowerCase(),
    ) ?? null
  );
}

function getFallbackOtherWorkOption(allowed: string[]) {
  return (
    allowed.find((option) => option.toLowerCase() === "cits") ??
    allowed.find((option) => option.toLowerCase().includes("cits")) ??
    "Cits"
  );
}

function hasPapilddarbiKeyword(text: string) {
  return /\b(papild(?:us)?\s*dar\w*|papilddar\w*)\b/i.test(text);
}

function hasFrameKeyword(text: string) {
  return /\b(karkas\w*|timber\s*frame|timberkarkas\w*|koka\s*karkas\w*)\b/i.test(text);
}

function isTlWork(workName: string | null | undefined) {
  return /^TL(\b|\s*[-/])/i.test(normalizeZtcWorkName(workName));
}

function hasDiagonalMeasurementsInComments(value: string | null | undefined) {
  const text = String(value ?? "");
  return /Diagon[āa]le\s*1\s*:/i.test(text) && /Diagon[āa]le\s*2\s*:/i.test(text);
}

async function findExistingTlDiagonalReport(session: OpenZtcSession) {
  if (!isTlWork(session.Works) || !session.Location || !session.Location_Custom_1) {
    return null;
  }

  const relatedRows = await prisma.ztcRecords.findMany({
    where: {
      organizationId: session.organizationId ?? ZTC_ORGANIZATION_ID,
      Location: session.Location,
      Location_Custom_1: session.Location_Custom_1,
      Date_Custom_2: { not: null },
      Comments: { contains: "Diagon" },
      NOT: [
        { id: session.id },
        { Comments_Custom_1: { startsWith: ZTC_CANCELLED_SESSION_PREFIX } },
      ],
    },
    orderBy: { Date_Custom_2: "desc" },
    take: 20,
    select: {
      id: true,
      workerId: true,
      Location: true,
      Location_Custom_1: true,
      Works: true,
      Comments: true,
      Date_Custom_2: true,
    },
  });

  return (
    relatedRows.find(
      (row) => isTlWork(row.Works) && hasDiagonalMeasurementsInComments(row.Comments),
    ) ?? null
  );
}

export function workerFullName(worker: ZtcWorker) {
  return [worker.name, worker.surname].filter(Boolean).join(" ").trim() || "Darbinieks";
}

function formatSessionWork(session: Pick<OpenZtcSession, "Location" | "Location_Custom_1" | "Works">) {
  return [
    session.Works,
    session.Location_Custom_1 ? `elements ${session.Location_Custom_1}` : null,
    session.Location ? `projekts ${session.Location}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function isAdditionalWorkSession(
  session: Pick<OpenZtcSession, "Location" | "Works_Custom_1"> | null | undefined,
) {
  return session?.Location === "Papilddarbi" || session?.Works_Custom_1 === "Papilddarbi";
}

function isElementRelatedAdditionalWorkSession(
  session: Pick<OpenZtcSession, "Location" | "Location_Custom_1" | "Works_Custom_1"> | null | undefined,
) {
  return Boolean(
    session?.Works_Custom_1 === "Papilddarbi" &&
      session.Location &&
      session.Location !== "Papilddarbi" &&
      session.Location_Custom_1,
  );
}

function isZtcHourlyUnit(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/\.$/, "");
  return ["st", "h", "hr", "hour", "hours", "stunda", "stundas"].includes(normalized);
}

function hasCompletedWorkPhoto(session: Pick<OpenZtcSession, "Location" | "Works_Custom_1" | "Photos">) {
  const photoCount = session.Photos?.length ?? 0;
  return isAdditionalWorkSession(session) ? photoCount >= 1 : photoCount >= 2;
}

function logZtcSession(
  event: string,
  args: {
    session?: Partial<OpenZtcSession> | null;
    worker?: ZtcWorker | null;
    details?: Record<string, unknown>;
  } = {},
) {
  const session = args.session;
  console.log("[ZTC session]", {
    event,
    sitediaryrecordId: session?.id ?? null,
    workerId: args.worker?.id ?? session?.workerId ?? null,
    workerName: args.worker ? workerFullName(args.worker) : null,
    project: session?.Location ?? null,
    element: session?.Location_Custom_1 ?? null,
    work: session?.Works ?? null,
    details: args.details ?? {},
  });
}

export function logZtcTiming(
  event: string,
  startedAt: number,
  details: Record<string, unknown> = {},
) {
  console.log("[ZTC timing]", {
    event,
    durationMs: Date.now() - startedAt,
    ...details,
  });
}

function withZtcTimeout<T>(promise: Promise<T>, label: string, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new ZtcTimeoutError(label, timeoutMs)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

export function isZtcTimeoutError(error: unknown) {
  return error instanceof ZtcTimeoutError || (error instanceof Error && error.name === "ZtcTimeoutError");
}

function readPhotoBatchConfirmAt(value: string | null | undefined) {
  const raw = readMarkerPayload(value, PHOTO_BATCH_CONFIRM_PREFIX);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecentPhotoBatchConfirmation(value: string | null | undefined, now = Date.now()) {
  const confirmedAt = readPhotoBatchConfirmAt(value);
  return confirmedAt != null && now - confirmedAt < PHOTO_BATCH_CONFIRM_WINDOW_MS;
}

function photoBatchMarker(now = Date.now()) {
  return `${PHOTO_BATCH_CONFIRM_PREFIX} ${now}`;
}

export async function sendZtcMessage(to: string | null, message: string) {
  const startedAt = Date.now();
  try {
    await sendMessage(to, message);
  } finally {
    logZtcTiming("send_whatsapp_message", startedAt, {
      to,
      messageLength: message.length,
    });
  }
}

function stripWorkerPrefix(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return "";
  const separatorIndex = normalized.indexOf(" : ");
  return separatorIndex >= 0
    ? normalized.slice(separatorIndex + 3).trim()
    : normalized;
}

function normalizeCommentLabel(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function stripCommentLabel(value: string, label: string) {
  return normalizeCommentLabel(value).startsWith(normalizeCommentLabel(label))
    ? value.slice(label.length).trim()
    : value;
}

function getCommentLineText(value: string, labels: string[]) {
  for (const label of labels) {
    if (normalizeCommentLabel(value).startsWith(normalizeCommentLabel(label))) {
      return value.slice(label.length).trim();
    }
  }
  return null;
}

export async function polishZtcCommentText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text || text.length < 3) return text;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await withZtcTimeout(
      openai.chat.completions.create({
        model: process.env.ZTC_TEXT_MODEL || "gpt-5.4-mini",
        messages: [
          {
            role: "system",
            content:
              "Correct this factory worker comment in Latvian. Preserve the original meaning, technical terms, project names, element names, work codes, numbers, units, and names. Do not add details. Return only the corrected comment text without quotes.",
          },
          { role: "user", content: text },
        ],
      }),
      "ztc_comment_polish",
      ZTC_COMMENT_POLISH_TIMEOUT_MS,
    );

    return response.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.warn("[ZTC workflow] comment polish failed", error);
    return text;
  }
}

async function buildPolishedZtcUserComments(args: {
  startText?: string | null;
  finishText?: string | null;
  diagonalOneMm?: number | null;
  diagonalTwoMm?: number | null;
}) {
  const [startText, finishText] = await Promise.all([
    polishZtcCommentText(stripCommentLabel(args.startText?.trim() ?? "", "Sākums:")),
    polishZtcCommentText(stripCommentLabel(args.finishText?.trim() ?? "", "Beigas:")),
  ]);

  return buildZtcUserComments({
    ...args,
    startText,
    finishText,
  });
}

async function polishZtcCommentBlock(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const polishedLines: string[] = [];

  for (const line of lines) {
    const startText = getCommentLineText(line, ["Sākums:", "Sakums:"]);
    if (startText !== null) {
      polishedLines.push(`Sākums: ${await polishZtcCommentText(startText)}`);
      continue;
    }

    const finishText = getCommentLineText(line, ["Beigas:"]);
    if (finishText !== null) {
      polishedLines.push(`Beigas: ${await polishZtcCommentText(finishText)}`);
      continue;
    }

    polishedLines.push(
      line
        .replace(/^Diagonale\s+1:/i, "Diagonāle 1:")
        .replace(/^Diagonale\s+2:/i, "Diagonāle 2:"),
    );
  }

  return polishedLines.join("\n");
}

function getSessionStartMessage(session: OpenZtcSession) {
  const comments = session.Comments?.trim();
  const startLine = comments
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) => getCommentLineText(line, ["Sākums:", "Sakums:"]) !== null);

  if (startLine) return getCommentLineText(startLine, ["Sākums:", "Sakums:"]) ?? "";

  const originalMessage = stripWorkerPrefix(session.originalUserComment);
  if (originalMessage) return originalMessage;

  if (!comments || comments.includes("Darbinieks:") || comments.includes("Projekts:")) {
    return "";
  }

  return stripCommentLabel(comments, "Sākums:");
}

function buildZtcUserComments(args: {
  startText?: string | null;
  finishText?: string | null;
  diagonalOneMm?: number | null;
  diagonalTwoMm?: number | null;
}) {
  const startText = stripCommentLabel(args.startText?.trim() ?? "", "Sākums:");
  const finishText = stripCommentLabel(args.finishText?.trim() ?? "", "Beigas:");

  return [
    startText ? `Sākums: ${startText}` : null,
    finishText ? `Beigas: ${finishText}` : null,
    args.diagonalOneMm != null ? `Diagonāle 1: ${args.diagonalOneMm} mm` : null,
    args.diagonalTwoMm != null ? `Diagonāle 2: ${args.diagonalTwoMm} mm` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function findFirstMediaIndex(formData: FormData, numMedia: number, prefix: string) {
  for (let i = 0; i < numMedia; i += 1) {
    const contentType = (getString(formData, `MediaContentType${i}`) || "").toLowerCase();
    if (contentType.startsWith(prefix)) return i;
  }

  return -1;
}

export function findMediaIndexes(formData: FormData, numMedia: number, prefix: string) {
  const indexes: number[] = [];
  for (let i = 0; i < numMedia; i += 1) {
    const contentType = (getString(formData, `MediaContentType${i}`) || "").toLowerCase();
    if (contentType.startsWith(prefix)) indexes.push(i);
  }
  return indexes;
}

function inferAudioExtension(contentType: string) {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("m4a") || normalized.includes("mp4")) return "m4a";
  return "ogg";
}

export function parseJsonObject<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readMarkerPayload(value: string | null | undefined, prefix: string) {
  if (!value?.startsWith(prefix)) return "";
  return value.slice(prefix.length).trim();
}

function buildFinishPendingMarker(payload: ZtcFinishPendingPayload) {
  return `${FINISH_PENDING_PREFIX} ${JSON.stringify(payload)}`;
}

function readFinishPendingPayload(value: string | null | undefined): ZtcFinishPendingPayload {
  const raw = readMarkerPayload(value, FINISH_PENDING_PREFIX);
  if (!raw) return { completedText: "" };
  if (raw.startsWith("{")) {
    return parseJsonObject<ZtcFinishPendingPayload>(raw, { completedText: "" });
  }
  return { completedText: raw };
}

export function parseOriginalAudioUrls(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return [];

  if (normalized.startsWith("[")) {
    const parsed = parseJsonObject<unknown>(normalized, null);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
    }
  }

  return normalized
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mergeOriginalAudioUrls(...values: Array<string | null | undefined>) {
  const urls = values.flatMap(parseOriginalAudioUrls);
  const uniqueUrls = Array.from(new Set(urls));
  if (uniqueUrls.length === 0) return undefined;
  if (uniqueUrls.length === 1) return uniqueUrls[0];
  return JSON.stringify(uniqueUrls);
}

function parseDiagonalNumbers(text: string): [number, number] | null {
  const matches = text.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  const numbers = matches
    .map((match) => Number(match.replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (numbers.length < 2) return null;
  return [numbers[0], numbers[1]];
}

function isPositiveConfirmation(text: string) {
  return /\b(ja|jā|yes|ok|pareizi|apstiprinu|apstiprinats|apstiprināts|labi|correct)\b/i.test(text);
}

function isNegativeConfirmation(text: string) {
  return /\b(ne|nē|no|nepareizi|labot|kluda|kļuda|kļūda|redo|again)\b/i.test(text);
}

function buildDiagonalComment(args: {
  session: OpenZtcSession;
  completedText: string;
  diagonalA: number;
  diagonalB: number;
}) {
  return buildZtcUserComments({
    startText: getSessionStartMessage(args.session),
    finishText: args.completedText,
    diagonalOneMm: args.diagonalA,
    diagonalTwoMm: args.diagonalB,
  });
}

function parseDiagonalMeasureMm(text: string): number | null {
  const matches = text.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  const numbers = matches
    .map((match) => Number(match.replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);

  return numbers[0] ?? null;
}

function pickDiagonalMeasureMmFromText(text: string) {
  const normalized = text.toLowerCase();
  const matches = normalized.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  const numbers = matches
    .map((match) => Number(match.replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!numbers.length) return null;

  const mentionsCentimeters = /\b(cm|centimetr\w*|centimetrs|centimetri|santimetr\w*)\b/i.test(normalized);
  const mentionsMeters = /\b(m|metr\w*|metrs|metri|meter|meters)\b/i.test(normalized) && !mentionsCentimeters;

  const converted = numbers.map((value) => {
    if (mentionsMeters && value < 50) return value * 1000;
    if (mentionsCentimeters && value < 2000) return value * 10;
    return value;
  });

  return (
    converted.find((value) => value >= 1000 && value <= 30000) ??
    converted.find((value) => value >= 100) ??
    converted[0] ??
    null
  );
}

function normalizeDiagonalMeasureMm(value: unknown) {
  const measure = Number(value);
  if (!Number.isFinite(measure) || measure <= 0) return null;
  return Math.round(measure);
}

async function extractDiagonalMeasureMm(text: string) {
  const normalized = text.trim();
  if (!normalized) return null;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await withZtcTimeout(
      openai.chat.completions.create({
        model: process.env.ZTC_TEXT_MODEL || "gpt-5.4-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Convert a WhatsApp voice transcript into one timber frame diagonal measurement. Return only JSON with keys: isValid boolean, measureMm number|null, normalizedText string|null, issue string|null. The worker usually speaks Latvian, Russian, or English. The final unit must be millimeters. Convert spoken numbers to digits. If the worker dictates digits one by one, concatenate them into one number: 'pieci divi četri nulle', 'five two four zero', or 'пять два четыре ноль' means 5240. Convert meters and centimeters to millimeters. Ignore filler words, photo/order numbers, and words like first/second diagonal unless they are the only numbers. A realistic diagonal is usually between 1000 and 30000 mm. If no clear single measurement is present, return isValid=false and measureMm=null. Do not guess.",
          },
          {
            role: "user",
            content: `Voice transcript: ${normalized}

Examples:
- "pirmā diagonāle pieci divi četri nulle" -> {"isValid":true,"measureMm":5240,"normalizedText":"pirmā diagonāle 5240 mm","issue":null}
- "otrā diagonāle five thousand two hundred thirty eight" -> {"isValid":true,"measureMm":5238,"normalizedText":"otrā diagonāle 5238 mm","issue":null}
- "диагональ пять два три восемь" -> {"isValid":true,"measureMm":5238,"normalizedText":"diagonāle 5238 mm","issue":null}`,
          },
        ],
      }),
      "ztc_diagonal_measure_extraction",
      ZTC_TEXT_TIMEOUT_MS,
    );

    const extracted = parseJsonObject<DiagonalMeasureExtraction>(
      response.choices[0]?.message?.content,
      {
        isValid: false,
        measureMm: null,
        issue: "Could not extract diagonal measurement.",
      },
    );
    const measure = extracted.isValid ? normalizeDiagonalMeasureMm(extracted.measureMm) : null;
    if (measure != null) return measure;

    const normalizedTextMeasure = normalizeDiagonalMeasureMm(
      pickDiagonalMeasureMmFromText(extracted.normalizedText ?? ""),
    );
    if (extracted.isValid && normalizedTextMeasure != null) return normalizedTextMeasure;
  } catch (error) {
    console.warn("[ZTC workflow] diagonal measure extraction failed", error);
  }

  const numericFallback = normalizeDiagonalMeasureMm(pickDiagonalMeasureMmFromText(normalized) ?? parseDiagonalMeasureMm(normalized));
  return numericFallback != null && numericFallback >= 100 ? numericFallback : null;
}

function isDiagonalPhotoMeasureFlow(value: string | null | undefined) {
  return Boolean(
    value?.startsWith(DIAGONAL_FIRST_PHOTO_PENDING_PREFIX) ||
      value?.startsWith(DIAGONAL_FIRST_MEASURE_PENDING_PREFIX) ||
      value?.startsWith(DIAGONAL_SECOND_PHOTO_PENDING_PREFIX) ||
      value?.startsWith(DIAGONAL_SECOND_MEASURE_PENDING_PREFIX),
  );
}

function readDiagonalPhotoMeasurePayload(
  value: string | null | undefined,
  prefix: string,
): ZtcDiagonalPayload {
  return parseJsonObject<ZtcDiagonalPayload>(readMarkerPayload(value, prefix), {
    completedText: "",
  });
}

function isAnyDiagonalFlow(value: string | null | undefined) {
  return Boolean(
    isDiagonalPhotoMeasureFlow(value) ||
      value?.startsWith(DIAGONALS_PENDING_PREFIX) ||
      value?.startsWith(DIAGONALS_CONFIRM_PREFIX),
  );
}

function readAnyDiagonalPayload(value: string | null | undefined): ZtcDiagonalPayload {
  if (value?.startsWith(DIAGONAL_FIRST_PHOTO_PENDING_PREFIX)) {
    return readDiagonalPhotoMeasurePayload(value, DIAGONAL_FIRST_PHOTO_PENDING_PREFIX);
  }
  if (value?.startsWith(DIAGONAL_FIRST_MEASURE_PENDING_PREFIX)) {
    return readDiagonalPhotoMeasurePayload(value, DIAGONAL_FIRST_MEASURE_PENDING_PREFIX);
  }
  if (value?.startsWith(DIAGONAL_SECOND_PHOTO_PENDING_PREFIX)) {
    return readDiagonalPhotoMeasurePayload(value, DIAGONAL_SECOND_PHOTO_PENDING_PREFIX);
  }
  if (value?.startsWith(DIAGONAL_SECOND_MEASURE_PENDING_PREFIX)) {
    return readDiagonalPhotoMeasurePayload(value, DIAGONAL_SECOND_MEASURE_PENDING_PREFIX);
  }
  if (value?.startsWith(DIAGONALS_PENDING_PREFIX)) {
    return { completedText: readMarkerPayload(value, DIAGONALS_PENDING_PREFIX) };
  }
  if (value?.startsWith(DIAGONALS_CONFIRM_PREFIX)) {
    return parseJsonObject<ZtcDiagonalPayload>(
      readMarkerPayload(value, DIAGONALS_CONFIRM_PREFIX),
      { completedText: "" },
    );
  }
  return { completedText: "" };
}

function getMetaMessageTimestampMs(formData: FormData) {
  const raw = getString(formData, "MessageTimestamp");
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

function isTlWorkPhotoBatchGraceActive(
  session: Pick<OpenZtcSession, "Comments_Custom_1">,
  formData: FormData,
) {
  const state = session.Comments_Custom_1;
  if (!state?.startsWith(DIAGONAL_FIRST_PHOTO_PENDING_PREFIX)) return false;

  const payload = readDiagonalPhotoMeasurePayload(state, DIAGONAL_FIRST_PHOTO_PENDING_PREFIX);
  const graceUntil = Number(payload.workPhotoBatchGraceUntil ?? 0);
  if (!Number.isFinite(graceUntil) || graceUntil <= Date.now()) return false;

  const promptedAt = Number(payload.workPhotoBatchPromptedAt ?? 0);
  const messageTimestampMs = getMetaMessageTimestampMs(formData);
  if (!Number.isFinite(promptedAt) || promptedAt <= 0 || messageTimestampMs == null) {
    return false;
  }

  return messageTimestampMs <= promptedAt + 1000;
}

function buildDiagonalPhotoMeasureComment(args: {
  session: OpenZtcSession;
  payload: ZtcDiagonalPayload;
}) {
  return buildZtcUserComments({
    startText: getSessionStartMessage(args.session),
    finishText: args.payload.completedText,
    diagonalOneMm: args.payload.firstMeasureMm,
    diagonalTwoMm: args.payload.secondMeasureMm,
  });
}

function normalizeDrawingExtraction(value: DrawingExtraction): DrawingExtraction {
  const isNonEmptyDrawingWork = (work: string) =>
    !/^(?:L\d\/B\d|R\d\/T\d|TL|L0)\s*-\s*$/i.test(normalizeZtcWorkName(work));

  const workItems = Array.isArray(value.workItems)
    ? value.workItems
        .map((item) => ({
          name: normalizeZtcDrawingWorkName(item?.name),
          amountM2:
            item?.amountM2 == null || !Number.isFinite(Number(item.amountM2))
              ? null
              : Number(item.amountM2),
          complexityCode: normalizeZtcComplexityCode(
            (item as Record<string, unknown>)?.complexityCode,
          ),
        }))
        .filter((item) => item.name && isNonEmptyDrawingWork(item.name))
    : [];
  const workList = Array.isArray(value.workList)
    ? value.workList
        .map((work) => normalizeZtcDrawingWorkName(work))
        .filter((work) => work && isNonEmptyDrawingWork(work))
    : [];

  return {
    ...value,
    projectName: normalizeZtcProjectName(value.projectName) || null,
    totalAreaM2:
      value.totalAreaM2 == null || !Number.isFinite(Number(value.totalAreaM2))
        ? null
        : Number(value.totalAreaM2),
    workList: workList.length ? workList : workItems.map((item) => item.name),
    workItems,
  };
}

function parseZtcDrawingMetadata(value: string | null | undefined): ZtcDrawingMetadata | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as ZtcDrawingMetadata;
    if (parsed?.type !== "ztc_drawing_context" || !Array.isArray(parsed.elements)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function hasZtcDrawingContext(session: Pick<OpenZtcSession, "Comments_Custom_2"> | null | undefined) {
  return Boolean(parseZtcDrawingMetadata(session?.Comments_Custom_2));
}

function getDrawingWorksCustomValue(
  source: Pick<OpenZtcSession, "Comments_Custom_2" | "Works_Custom_1"> | null | undefined,
) {
  const metadata = parseZtcDrawingMetadata(source?.Comments_Custom_2);
  const metadataWorks = metadata?.elements
    ?.flatMap((element) => element.works ?? [])
    .map((work) => String(work.name ?? "").trim())
    .filter(Boolean);

  if (metadataWorks?.length) {
    return Array.from(new Set(metadataWorks)).join("; ");
  }

  const existing = String(source?.Works_Custom_1 ?? "").trim();
  return existing.toLowerCase() === "papilddarbi" ? null : existing || null;
}

function getDrawingElementMetadata(
  metadata: ZtcDrawingMetadata | null,
  elementName: string | null | undefined,
) {
  const normalizedElement = String(elementName ?? "").trim().toLowerCase();
  if (!metadata || !normalizedElement) return null;

  return (
    metadata.elements.find(
      (element) =>
        String(element.elementName ?? "").trim().toLowerCase() === normalizedElement,
    ) ?? null
  );
}

function canonicalizeDrawingExtractionFromMetadata(
  extraction: DrawingExtraction,
  metadata: ZtcDrawingMetadata | null,
) {
  const element = getDrawingElementMetadata(metadata, extraction.elementName);
  if (!element?.works?.length) return extraction;

  const canonicalWorks = new Map(
    element.works
      .map((work) => [getZtcTaskIdentityKey(work.name), work] as const)
      .filter(([key, work]) => key && work.name),
  );
  if (!canonicalWorks.size) return extraction;

  const canonicalizeWorkItem = (
    item: DrawingExtraction["workItems"][number],
  ): DrawingExtraction["workItems"][number] => {
    const canonical = canonicalWorks.get(getZtcTaskIdentityKey(item.name));
    if (!canonical?.name) return item;

    return {
      ...item,
      name: normalizeZtcDrawingWorkName(canonical.name),
    };
  };

  const workItems = extraction.workItems.map(canonicalizeWorkItem);
  const workList = extraction.workList.map((workName) => {
    const canonical = canonicalWorks.get(getZtcTaskIdentityKey(workName));
    return normalizeZtcDrawingWorkName(canonical?.name ?? workName);
  });

  return {
    ...extraction,
    workItems,
    workList: workList.length ? workList : workItems.map((item) => item.name),
  };
}

async function canonicalizeDrawingExtractionFromPreviousContext(
  extraction: DrawingExtraction,
  worker: ZtcWorker,
) {
  const projectName = String(extraction.projectName ?? "").trim();
  const elementName = String(extraction.elementName ?? "").trim();
  if (!projectName || !elementName) return extraction;

  const canonicalProjectName = normalizeZtcProjectName(projectName);
  const projectCanonicalized =
    canonicalProjectName === projectName
      ? extraction
      : { ...extraction, projectName: canonicalProjectName };

  const context = getZtcFlowContext(worker);
  const previousContexts = await prisma.ztcRecords.findMany({
    where: {
      siteId: context.siteId,
      organizationId: context.organizationId,
      Location_Custom_1: elementName,
      Comments_Custom_2: { contains: "ztc_drawing_context" },
    },
    orderBy: [{ Date_Custom_1: "desc" }, { createdAt: "desc" }],
    take: 10,
    select: {
      Location: true,
      Comments_Custom_2: true,
    },
  });

  for (const context of previousContexts.filter(
    (context) => normalizeZtcProjectName(context.Location) === canonicalProjectName,
  )) {
    const canonicalized = canonicalizeDrawingExtractionFromMetadata(
      projectCanonicalized,
      parseZtcDrawingMetadata(context.Comments_Custom_2),
    );
    if (canonicalized !== projectCanonicalized) return canonicalized;
  }

  return projectCanonicalized;
}

export function buildDrawingMetadata(extraction: DrawingExtraction): ZtcDrawingMetadata {
  const worksSource = extraction.workItems.length
    ? extraction.workItems
    : extraction.workList.map((name) => ({
        name: normalizeZtcDrawingWorkName(name),
        amountM2: extraction.totalAreaM2,
        complexityCode: "" as const,
      }));

  return {
    type: "ztc_drawing_context",
    version: 1,
    projectName: extraction.projectName ?? "",
    elements: [
      {
        elementName: extraction.elementName ?? "",
        totalAreaM2: extraction.totalAreaM2,
        works: worksSource.map((work) => ({
          name: normalizeZtcDrawingWorkName(work.name),
          amountM2: work.amountM2 ?? extraction.totalAreaM2,
          complexityCode: normalizeZtcComplexityCode(work.complexityCode),
        })),
      },
    ],
  };
}

function getSessionWorkOptions(session: OpenZtcSession | null) {
  const metadata = parseZtcDrawingMetadata(session?.Comments_Custom_2);
  const element = metadata?.elements.find(
    (item) =>
      item.elementName.toLowerCase() ===
      String(session?.Location_Custom_1 ?? "").trim().toLowerCase(),
  );

  return normalizeZtcWorkOptions(element?.works.map((work) => work.name).filter(Boolean) ?? []);
}

function getSessionWorkAmountM2(session: OpenZtcSession, workName: string | null | undefined) {
  const normalizedWork = normalizeZtcWorkName(workName).toLowerCase();
  if (!normalizedWork) return null;

  const metadata = parseZtcDrawingMetadata(session.Comments_Custom_2);
  const element = metadata?.elements.find(
    (item) =>
      item.elementName.toLowerCase() ===
      String(session.Location_Custom_1 ?? "").trim().toLowerCase(),
  );
  const work = element?.works.find(
    (item) => normalizeZtcWorkName(item.name).toLowerCase() === normalizedWork,
  );

  return work?.amountM2 ?? element?.totalAreaM2 ?? null;
}

function getSessionElementAreaM2(
  session: Pick<OpenZtcSession, "Comments_Custom_2" | "Location_Custom_1">,
) {
  const metadata = parseZtcDrawingMetadata(session.Comments_Custom_2);
  const element = getDrawingElementMetadata(metadata, session.Location_Custom_1);
  return element?.totalAreaM2 ?? null;
}

function getSessionWorkComplexityCode(
  session: OpenZtcSession,
  workName: string | null | undefined,
): ZtcComplexityCode {
  const normalizedWork = normalizeZtcWorkName(workName).toLowerCase();
  if (!normalizedWork) return "";

  const metadata = parseZtcDrawingMetadata(session.Comments_Custom_2);
  const element = metadata?.elements.find(
    (item) =>
      item.elementName.toLowerCase() ===
      String(session.Location_Custom_1 ?? "").trim().toLowerCase(),
  );
  const work = element?.works.find(
    (item) => normalizeZtcWorkName(item.name).toLowerCase() === normalizedWork,
  );

  return normalizeZtcComplexityCode(work?.complexityCode);
}

async function getComplexityForCode(
  code: ZtcComplexityCode,
  projectName: string | null | undefined,
  worker?: ZtcWorker | null,
) {
  if (!code) return "1";

  const context = getZtcFlowContext(worker);
  const config = ((await getConfig(context.siteId)) ??
    ztcSiteDiaryRecordsMap) as Record<string, any>;
  const projects = getDefaultTaskRatesFromConfig(config);
  return getZtcComplexityCoefficientByCode({ code, projectName, projects });
}

export function formatExtractedWorksForMessage(extraction: DrawingExtraction) {
  const items = extraction.workItems.length
    ? extraction.workItems
    : extraction.workList.map((name) => ({
        name,
        amountM2: extraction.totalAreaM2,
        complexityCode: "" as const,
      }));

  return items
    .map((item, index) => {
      const amount = item.amountM2 ?? extraction.totalAreaM2;
      const code = normalizeZtcComplexityCode(item.complexityCode);
      const marks = code ? ` - ${code}` : "";
      return `${index + 1}. ${normalizeZtcDrawingWorkName(item.name)}${amount != null ? ` - ${amount} m2` : ""}${marks}`;
    })
    .join("\n");
}

type FetchedMediaImage = {
  buffer: Buffer;
  contentType: string;
};

async function fetchMediaImage(formData: FormData, idx: number): Promise<FetchedMediaImage> {
  const startedAt = Date.now();
  const mediaUrl = getString(formData, `MediaUrl${idx}`);
  const contentType = (getString(formData, `MediaContentType${idx}`) || "image/jpeg").toLowerCase();

  if (!mediaUrl) throw new Error("Image media URL is missing");

  const buffer = await withZtcTimeout(
    fetchWhatsAppMediaAsBuffer(mediaUrl),
    "ztc_image_media_fetch",
    ZTC_MEDIA_TIMEOUT_MS,
  );

  logZtcTiming("image_media_fetch", startedAt, {
    mediaIndex: idx,
    contentType,
    bufferBytes: buffer.byteLength,
  });

  return { buffer, contentType };
}

async function uploadFetchedMediaImage(image: FetchedMediaImage) {
  const startedAt = Date.now();
  const { buffer, contentType } = image;
  const ext = contentType.split("/")[1] || "jpg";
  const file = new File([buffer], `ztc_whatsapp_${Date.now()}.${ext}`, {
    type: contentType,
  });

  const uploaded = await withZtcTimeout(
    utapi.uploadFiles([file]),
    "ztc_image_upload",
    ZTC_UPLOAD_TIMEOUT_MS,
  );
  const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;

  if (first?.error || !first?.data) {
    throw new Error(first?.error?.message || "Failed to upload image");
  }

  const publicUrl = getUploadThingFileUrl(first.data);

  if (!publicUrl) {
    throw new Error("UploadThing upload completed without a file URL");
  }

  logZtcTiming("image_upload", startedAt, {
    contentType,
    bufferBytes: buffer.byteLength,
    publicUrl,
  });

  return {
    publicUrl,
    contentType,
  };
}

export async function uploadMediaImage(formData: FormData, idx: number) {
  return uploadFetchedMediaImage(await fetchMediaImage(formData, idx));
}

export async function uploadAndExtractDrawingInfo(
  formData: FormData,
  idx: number,
  options: { drawingProfile?: ProductionDrawingExtractionProfile } = {},
) {
  const startedAt = Date.now();
  const imageBytes = await fetchMediaImage(formData, idx);
  const imageDataUrl = `data:${imageBytes.contentType};base64,${imageBytes.buffer.toString("base64")}`;
  const [image, extraction] = await Promise.all([
    uploadFetchedMediaImage(imageBytes),
    extractDrawingInfo(imageDataUrl, options),
  ]);

  logZtcTiming("drawing_upload_and_extract", startedAt, {
    mediaIndex: idx,
    contentType: imageBytes.contentType,
    bufferBytes: imageBytes.buffer.byteLength,
    publicUrl: image.publicUrl,
    isConstructionDrawing: extraction.isConstructionDrawing,
    projectName: extraction.projectName,
    elementName: extraction.elementName,
    workCount: extraction.workList.length,
    drawingProfile: options.drawingProfile ?? "ztc",
  });

  return { image, extraction };
}

async function uploadZtcImages(formData: FormData, idxs: number[], context: string) {
  const results = await Promise.allSettled(idxs.map((idx) => uploadMediaImage(formData, idx)));
  const uploaded = results
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof uploadMediaImage>>> => result.status === "fulfilled")
    .map((result) => result.value);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length > 0) {
    console.warn("[ZTC workflow]", {
      event: "image_upload_partial_failure",
      context,
      requestedPhotoCount: idxs.length,
      uploadedPhotoCount: uploaded.length,
      failedPhotoCount: failed.length,
      errors: failed.map((result) =>
        result.reason instanceof Error ? result.reason.message : String(result.reason),
      ),
    });
  }

  return uploaded;
}

async function uploadOriginalAudioBuffer(buffer: Buffer, contentType: string) {
  const startedAt = Date.now();
  const file = new File([buffer], `ztc_voice_${Date.now()}.${inferAudioExtension(contentType)}`, {
    type: contentType || "audio/ogg",
  });

  const uploaded = await withZtcTimeout(
    utapi.uploadFiles([file]),
    "ztc_audio_upload",
    ZTC_UPLOAD_TIMEOUT_MS,
  );
  const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;

  if (first?.error || !first?.data) {
    throw new Error(first?.error?.message || "Failed to upload audio");
  }

  const publicUrl = getUploadThingFileUrl(first.data);
  logZtcTiming("audio_upload", startedAt, {
    contentType,
    bufferBytes: buffer.byteLength,
    publicUrl,
  });

  return publicUrl;
}

export async function transcribeAudioWithSource(formData: FormData, idx: number) {
  const startedAt = Date.now();
  const mediaUrl = getString(formData, `MediaUrl${idx}`);
  const contentType = (getString(formData, `MediaContentType${idx}`) || "").toLowerCase();

  if (!mediaUrl) throw new Error("Audio media URL is missing");

  const fetchStartedAt = Date.now();
  const buffer = await withZtcTimeout(
    fetchWhatsAppMediaAsBuffer(mediaUrl),
    "ztc_audio_media_fetch",
    ZTC_MEDIA_TIMEOUT_MS,
  );
  logZtcTiming("audio_media_fetch", fetchStartedAt, {
    mediaIndex: idx,
    contentType,
    bufferBytes: buffer.byteLength,
  });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const [originalAudioUrl, transcript] = await Promise.all([
    uploadOriginalAudioBuffer(buffer, contentType),
    (async () => {
      const transcriptionStartedAt = Date.now();
      const file = await toFile(buffer, `voice-message.${inferAudioExtension(contentType)}`);
      const result = await withZtcTimeout(
        openai.audio.transcriptions.create({
          file,
          model: "gpt-4o-transcribe",
          prompt:
            "This is a production factory WhatsApp voice note. Preserve diagonal measurements carefully. If the speaker says measurement digits one by one in Latvian, Russian, or English, transcribe them as digits when possible, for example 'pieci divi četri nulle' as '5240'.",
        }),
        "ztc_audio_transcription",
        ZTC_TRANSCRIPTION_TIMEOUT_MS,
      );
      logZtcTiming("audio_transcription", transcriptionStartedAt, {
        mediaIndex: idx,
        contentType,
        bufferBytes: buffer.byteLength,
        transcriptLength: result.text?.trim().length ?? 0,
      });
      return result;
    })(),
  ]);

  const result = {
    text: transcript.text?.trim() || "",
    originalAudioUrl,
  };

  logZtcTiming("audio_transcribe_with_source_total", startedAt, {
    mediaIndex: idx,
    contentType,
    bufferBytes: buffer.byteLength,
    transcriptLength: result.text.length,
    hasOriginalAudioUrl: Boolean(originalAudioUrl),
  });

  return result;
}

export async function transcribeAudio(formData: FormData, idx: number) {
  return (await transcribeAudioWithSource(formData, idx)).text;
}

export async function extractDrawingInfo(
  imageUrl: string,
  options: { drawingProfile?: ProductionDrawingExtractionProfile } = {},
): Promise<DrawingExtraction> {
  const startedAt = Date.now();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const openaiStartedAt = Date.now();
  const drawingProfile = options.drawingProfile ?? "ztc";
  const prompt = getDrawingExtractionPrompt(drawingProfile);
  const response = await withZtcTimeout(
    openai.chat.completions.create({
      model: process.env.ZTC_VISION_MODEL || ZTC_DEFAULT_VISION_MODEL,
      response_format: { type: "json_object" },
      messages: drawingProfile === "default-production" ? [
        {
          role: "system",
          content: prompt.system,
        },
        {
          role: "system",
          content:
            "The only coefficient field is complexityCode. If a handwritten coefficient is unclear, use an empty string instead of guessing.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt.user,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ] : [
        {
          role: "system",
          content:
            "You validate production factory drawing photos. Return only JSON with keys: isConstructionDrawing boolean, hasReadableProjectName boolean, hasReadableElementName boolean, hasReadableWorkList boolean, qualityOk boolean, projectName string|null, elementName string|null, totalAreaM2 number|null, workList string[], workItems array of {name string, amountM2 number|null, complexityCode string}, issue string|null. Accept this production legend format when its bottom framed tables are readable. Ignore the large drawing views, dimensions, revision stamp, designer names, company address, logo, and unrelated notes. The works are always in the left framed table. Read its rows from top to bottom, commonly in this order: L4/B4, L3/B3, L2/B2, L1/B1, TL, L0, R1/T1, R2/T2, R3/T3, R4/T4, R5/T5. Extract only rows with a visible work description after the hyphen and omit rows whose description is empty. Preserve each visible prefix and description, for example \"L2/B2 - Latojums 45x45\", \"TL - Koka karkass 245 mm\", or \"R3/T3 - Latojums 28x70\". Normalize an OCR-only T or T1 timber-frame prefix to TL only when it is clearly the standalone timber-frame row; preserve R1/T1 and other printed paired row codes exactly. The two narrow handwritten coefficient cells are immediately to the left of every work row. For each extracted work, set complexityCode to exactly one of \"\", \"X\", \"X X\", \"1\", \"2\", \"3\", \"4\", \"5\", \"6\". Use \"\" when the aligned coefficient cells are empty. Use \"X\" when one aligned coefficient cell has a handwritten X and \"X X\" only when both aligned coefficient cells on that row have handwritten X marks. For numeric handwritten coefficients, return only the visible number from 1 to 6; do not return doubled numeric codes such as \"1 1\", \"2 2\", or \"3 3\". If the photo is rotated, mentally rotate it so the work table is horizontal before aligning coefficient cells to rows. Read only the coefficient cells aligned with that exact work row; do not count printed grid lines, work-code letters, checkmarks, dimensions, or marks from adjacent rows. The element number must be extracted only from the value after the label \"Paneļa numurs:\". Tolerate minor spelling/OCR variants such as \"Paneļa nummurs:\", \"Panela numurs:\", or \"Panela nummurs:\", plus minor spacing around the colon. Example: \"Paneļa numurs: 3S-03\" means elementName=\"3S-03\". The total element area must be extracted only from the numeric value after the label \"Paneļa laukums:\". Tolerate OCR variants such as \"Panela laukums:\" or \"Paneļā laukums:\" and minor spacing. Example: \"Paneļa laukums: 11.66 m²\" means totalAreaM2=11.66. The project name must be extracted only from the value on the BP row immediately after \"BP:\" or \"BP :\". Example: \"BP : Zemgales Prospekts 11 (ZP)\" means projectName=\"Zemgales Prospekts 11 (ZP)\". Do not use the company address, customer, designer, date, or drawing-size fields as projectName. Set hasReadableProjectName, hasReadableElementName, and hasReadableWorkList according to these exact locations. If work-specific areas are not printed in the left work table, set every workItems amountM2 to totalAreaM2. Reject ordinary photos, selfies, unrelated documents, and drawings where BP project name, Paneļa numurs, Paneļa laukums, or the left work table cannot be read. Preserve Latvian diacritics and original spelling in extracted values; do not transliterate.",
        },
        {
          role: "system",
          content:
            "The only coefficient field is complexityCode. If a handwritten coefficient is unclear, use an empty string instead of guessing.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read the bottom ZTC legend. Extract works only from the left table, projectName from BP, elementName from Paneļa numurs, totalAreaM2 from Paneļa laukums, and the handwritten coefficient code from the cells aligned with each work row.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    }),
    "ztc_drawing_extraction",
    ZTC_VISION_TIMEOUT_MS,
  );
  logZtcTiming("drawing_extraction_openai", openaiStartedAt, {
    model: process.env.ZTC_VISION_MODEL || ZTC_DEFAULT_VISION_MODEL,
    imageSource: imageUrl.startsWith("data:") ? "data_url" : "url",
    drawingProfile,
  });

  const content = response.choices[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("ZTC drawing extraction returned an empty response");
  }

  const parsed = parseJsonObject<DrawingExtraction | null>(content, null);
  if (!parsed) {
    throw new Error("ZTC drawing extraction returned invalid JSON");
  }

  const extraction = normalizeDrawingExtraction(parsed);
  logZtcTiming("drawing_extraction_total", startedAt, {
    isConstructionDrawing: extraction.isConstructionDrawing,
    qualityOk: extraction.qualityOk,
    projectName: extraction.projectName,
    elementName: extraction.elementName,
    workCount: extraction.workList.length,
    issue: extraction.issue,
    drawingProfile,
  });

  return extraction;
}

async function extractWorkInfo(
  text: string,
  allowedWorkOptions?: string[],
): Promise<WorkExtraction> {
  const startedAt = Date.now();
  const normalized = text.trim();
  const dropdownStartedAt = Date.now();
  const { workOptions, unitOptions } = await getZtcDropdownOptions();
  logZtcTiming("work_text_dropdown_options", dropdownStartedAt, {
    allowedWorkOptionCount: allowedWorkOptions?.length ?? null,
    configuredWorkOptionCount: workOptions.length,
    unitOptionCount: unitOptions.length,
  });

  const effectiveWorkOptions = normalizeZtcWorkOptions(
    allowedWorkOptions?.length ? allowedWorkOptions : workOptions,
  );

  if (!normalized) {
    const result = {
      isGibberish: true,
      isFinish: false,
      isAdditionalWork: false,
      additionalWorkDescription: null,
      additionalDetails: [],
      workOption: null,
      amountCompleted: null,
      units: null,
      issue: "No speech was recognized.",
    };
    logZtcTiming("work_text_extraction_total", startedAt, {
      textLength: 0,
      isGibberish: result.isGibberish,
      isFinish: result.isFinish,
      isAdditionalWork: result.isAdditionalWork,
      workOption: result.workOption,
    });
    return result;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const openaiStartedAt = Date.now();
  const response = await withZtcTimeout(
    openai.chat.completions.create({
      model: process.env.ZTC_TEXT_MODEL || "gpt-5.4-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `Classify a short worker WhatsApp transcript. Return only JSON with keys: isGibberish boolean, isFinish boolean, isAdditionalWork boolean, polishedText string|null, additionalWorkDescription string|null, additionalDetails array of {description string, quantity number|null}, workOption string|null, amountCompleted number|null, units string|null, issue string|null. For polishedText, correct the worker comment in Latvian while preserving the original meaning, technical terms, project names, element names, work codes, numbers, units, and names; do not add details. Mark gibberish for random words, empty/noisy transcripts, or text with no understandable work meaning. Mark isFinish true if the worker says work is finished/done/completed. Mark isAdditionalWork true when the worker says "Papilddarbi", "papilddarbs", "saku papilddarbu", or a close Latvian derivative meaning additional work. For additionalWorkDescription, remove the additional-work keyword and keep the actual work description if present. Extract additionalDetails only when the worker reports extra parts/details used while finishing the main work, for example "papildus detaļas", "papilddetāļas", "vēl divas detaļas", "papildus 3 kronšteini". If two or more different detail types are mentioned, return a separate additionalDetails item for each type, for example "2 kronšteini un 4 skrūves" -> [{description:"kronšteini",quantity:2},{description:"skrūves",quantity:4}]. Use a concise detail description without the quantity words; if a detail is clearly mentioned without quantity use quantity null. Do not combine different detail types into one description. Do not put normal work names into additionalDetails. For workOption, choose exactly one label from this allowed Darbi list if it clearly matches the worker's activity: ${JSON.stringify(effectiveWorkOptions)}. A drawing work prefixed with "TL" means timber frame / timberkarkass / karkass; when the worker says karkass, koka karkass, timber frame, or frame, match the most relevant TL option and return its exact label. Treat T and T1 prefixes as TL, and never return a T1 work option. If none clearly match, return null for workOption. For units, choose exactly one label from this allowed Mervieniba list if the worker mentions a completed quantity unit: ${JSON.stringify(unitOptions)}. If no allowed unit clearly matches, return null for units. Do not invent work options or unit values. If the worker says how much was completed, extract the numeric amount but only set units from the allowed list. Normalize obvious spoken numbers to digits, for example 'twelve panels' with allowed unit 'gab' -> amountCompleted 12, units 'gab', '8 square meters' with allowed unit 'm2' -> amountCompleted 8, units 'm2'. If no completed quantity is mentioned, use null for both amountCompleted and units.`,
        },
        { role: "user", content: normalized },
      ],
    }),
    "ztc_work_text_extraction",
    ZTC_TEXT_TIMEOUT_MS,
  );
  logZtcTiming("work_text_extraction_openai", openaiStartedAt, {
    model: process.env.ZTC_TEXT_MODEL || "gpt-5.4-mini",
    textLength: normalized.length,
    effectiveWorkOptionCount: effectiveWorkOptions.length,
  });

  const extracted = parseJsonObject<WorkExtraction>(response.choices[0]?.message?.content, {
    isGibberish: true,
    isFinish: false,
    isAdditionalWork: false,
    additionalWorkDescription: null,
    additionalDetails: [],
    workOption: null,
    amountCompleted: null,
    units: null,
    issue: "Could not understand the work message.",
  });

  const result = {
    ...extracted,
    isAdditionalWork: extracted.isAdditionalWork || hasPapilddarbiKeyword(normalized),
    polishedText: String(extracted.polishedText ?? "").trim() || normalized,
    additionalDetails: Array.isArray(extracted.additionalDetails)
      ? extracted.additionalDetails
          .map((detail) => ({
            description: String(detail?.description ?? "").trim(),
            quantity:
              detail?.quantity == null || !Number.isFinite(Number(detail.quantity))
                ? null
                : Number(detail.quantity),
          }))
          .filter((detail) => detail.description)
      : [],
    workOption:
      normalizeAllowedWorkOption(extracted.workOption, effectiveWorkOptions) ??
      (hasFrameKeyword(normalized) && effectiveWorkOptions.filter(isTlWork).length === 1
        ? effectiveWorkOptions.filter(isTlWork)[0]
        : null),
    units: normalizeAllowedOption(extracted.units, unitOptions),
  };

  logZtcTiming("work_text_extraction_total", startedAt, {
    textLength: normalized.length,
    isGibberish: result.isGibberish,
    isFinish: result.isFinish,
    isAdditionalWork: result.isAdditionalWork,
    workOption: result.workOption,
    amountCompleted: result.amountCompleted,
    units: result.units,
    additionalDetailCount: result.additionalDetails?.length ?? 0,
  });

  return result;
}

async function getOpenZtcSession(worker: ZtcWorker) {
  const context = getZtcFlowContext(worker);
  return prisma.ztcRecords.findFirst({
    where: {
      workerId: worker.id,
      organizationId: context.organizationId,
      Date_Custom_2: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getLatestZtcDrawingContext(worker: ZtcWorker) {
  const context = getZtcFlowContext(worker);
  return prisma.ztcRecords.findFirst({
    where: {
      workerId: worker.id,
      organizationId: context.organizationId,
      Location: { not: null },
      Location_Custom_1: { not: null },
      Comments_Custom_2: { contains: "ztc_drawing_context" },
      NOT: [
        { Location: "Papilddarbi" },
        { Works_Custom_1: "Papilddarbi" },
        { Works_Custom_1: "Papilddetāļas" },
        { Comments_Custom_1: { startsWith: DRAWING_CONTEXT_SUPERSEDED_BY_ADDITIONAL_WORK_PREFIX } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

async function closeOpenDrawingContextsForStandaloneAdditionalWork(worker: ZtcWorker, now: Date) {
  const context = getZtcFlowContext(worker);
  const result = await prisma.ztcRecords.updateMany({
    where: {
      workerId: worker.id,
      organizationId: context.organizationId,
      Date_Custom_2: null,
      Works: null,
      Comments_Custom_2: { contains: "ztc_drawing_context" },
    },
    data: {
      Date_Custom_2: now,
      Comments_Custom_1: `${DRAWING_CONTEXT_SUPERSEDED_BY_ADDITIONAL_WORK_PREFIX} ${now.toISOString()}`,
    },
  });

  if (result.count > 0) {
    logZtcSession("drawing_contexts_closed_for_standalone_additional_work", {
      worker,
      details: {
        closedCount: result.count,
      },
    });
  }
}

async function ensureSessionHasDrawingContext(args: {
  session: OpenZtcSession;
  drawingContext: OpenZtcSession | null;
  worker: ZtcWorker;
}) {
  const { session, drawingContext, worker } = args;
  if (hasZtcDrawingContext(session) || !drawingContext) return session;

  const repaired = await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      Location: drawingContext.Location,
      Location_Custom_1: drawingContext.Location_Custom_1,
      Works_Custom_1: getDrawingWorksCustomValue(drawingContext),
      Comments_Custom_2: drawingContext.Comments_Custom_2,
      Photos: drawingContext.Photos?.[0] ? [drawingContext.Photos[0]] : session.Photos ?? [],
    },
  });

  logZtcSession("session_drawing_context_repaired", {
    session: repaired,
    worker,
    details: {
      drawingContextRecordId: drawingContext.id,
      previousMetadata: session.Comments_Custom_2,
    },
  });

  return repaired;
}

async function getRecentCompletedPhotoBatchSession(worker: ZtcWorker) {
  const context = getZtcFlowContext(worker);
  const cutoff = new Date(Date.now() - PHOTO_BATCH_CONFIRM_WINDOW_MS);
  const session = await prisma.ztcRecords.findFirst({
    where: {
      workerId: worker.id,
      organizationId: context.organizationId,
      Date_Custom_2: { gte: cutoff },
      Comments_Custom_1: { startsWith: PHOTO_BATCH_CONFIRM_PREFIX },
    },
    orderBy: { Date_Custom_2: "desc" },
  });

  return isRecentPhotoBatchConfirmation(session?.Comments_Custom_1) ? session : null;
}

function calculateHours(start: Date | null | undefined, end: Date) {
  if (!start) return undefined;
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours < 0) return undefined;
  return Number(hours.toFixed(2));
}

type ZtcPauseInterval = {
  start: string;
  end: string;
};

function normalizeZtcCommand(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isPauseCommand(text: string) {
  return normalizeZtcCommand(text) === "pauze";
}

function isResumeCommand(text: string) {
  return normalizeZtcCommand(text) === "turpinu";
}

function isCancelCommand(text: string) {
  const command = normalizeZtcCommand(text);
  return command === "atcelt" || command === "cancel";
}

function isCancelWorkCommand(text: string) {
  const command = normalizeZtcCommand(text);
  return [
    "atcelt darbu",
    "atcelt visu",
    "cancel work",
    "cancel all",
  ].includes(command);
}

function normalizePauseIntervals(value: unknown): ZtcPauseInterval[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const start = new Date(String((item as Record<string, unknown>).start ?? ""));
      const end = new Date(String((item as Record<string, unknown>).end ?? ""));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      if (end.getTime() < start.getTime()) return null;
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    })
    .filter((item): item is ZtcPauseInterval => Boolean(item));
}

function closeActivePauseInterval(
  session: Pick<OpenZtcSession, "pausedAt" | "pauseIntervals">,
  now: Date,
) {
  const intervals = normalizePauseIntervals(session.pauseIntervals);
  if (!session.pausedAt) return intervals;

  const pauseStart = new Date(session.pausedAt);
  if (Number.isNaN(pauseStart.getTime()) || now.getTime() <= pauseStart.getTime()) {
    return intervals;
  }

  return [
    ...intervals,
    {
      start: pauseStart.toISOString(),
      end: now.toISOString(),
    },
  ];
}

function calculatePauseHours(intervals: ZtcPauseInterval[]) {
  const milliseconds = intervals.reduce((sum, interval) => {
    const start = new Date(interval.start).getTime();
    const end = new Date(interval.end).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return sum;
    return sum + (end - start);
  }, 0);

  return milliseconds / 3_600_000;
}

function calculateEffectiveHours(
  session: Pick<OpenZtcSession, "Date" | "pausedAt" | "pauseIntervals">,
  end: Date,
) {
  const grossHours = calculateHours(session.Date, end);
  if (grossHours == null) return undefined;

  const pauseHours = calculatePauseHours(closeActivePauseInterval(session, end));
  const effectiveHours = grossHours - pauseHours;
  if (!Number.isFinite(effectiveHours) || effectiveHours < 0) return 0;
  return Number(effectiveHours.toFixed(2));
}

async function pauseZtcSession(args: {
  session: OpenZtcSession;
  worker: ZtcWorker;
  to: string | null;
}) {
  const { session, worker, to } = args;
  if (!session.Works) {
    await sendZtcMessage(to, "Pauzi var sākt tikai aktīvam darbam. Lūdzu, vispirms sāciet darbu.");
    return;
  }

  if (session.pausedAt) {
    await sendZtcMessage(to, `Darbs jau ir pauzē: ${formatSessionWork(session) || "darbs"}.`);
    return;
  }

  const now = new Date();
  const updated = await prisma.ztcRecords.update({
    where: { id: session.id },
    data: { pausedAt: now },
  });

  logZtcSession("session_paused", {
    session: updated,
    worker,
    details: { pausedAt: now.toISOString() },
  });

  await sendZtcMessage(to, `Pauze sākta: ${formatSessionWork(session) || "darbs"}.`);
}

async function resumeZtcSession(args: {
  session: OpenZtcSession;
  worker: ZtcWorker;
  to: string | null;
}) {
  const { session, worker, to } = args;
  if (!session.Works) {
    await sendZtcMessage(to, "Nav aktīva darba, ko turpināt.");
    return;
  }

  if (!session.pausedAt) {
    await sendZtcMessage(to, `Darbs nav pauzē: ${formatSessionWork(session) || "darbs"}.`);
    return;
  }

  const now = new Date();
  const intervals = closeActivePauseInterval(session, now);
  const pauseStart = new Date(session.pausedAt);
  const pausedHours = Number(((now.getTime() - pauseStart.getTime()) / 3_600_000).toFixed(2));
  const updated = await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      pausedAt: null,
      pauseIntervals: intervals,
    },
  });

  logZtcSession("session_resumed", {
    session: updated,
    worker,
    details: {
      resumedAt: now.toISOString(),
      pauseHours: pausedHours,
      pauseCount: intervals.length,
    },
  });

  await sendZtcMessage(
    to,
    `Darbs turpināts: ${formatSessionWork(session) || "darbs"}. Pauzes laiks: ${pausedHours} stundas.`,
  );
}

async function cancelWholeZtcSession(args: {
  session: OpenZtcSession;
  worker: ZtcWorker;
  to: string | null;
}) {
  const { session, worker, to } = args;
  const now = new Date();
  const pauseIntervals = closeActivePauseInterval(session, now);
  const timeInvolved = calculateEffectiveHours(session, now);
  const cancellationPayload = {
    cancelledAt: now.toISOString(),
    work: session.Works ?? null,
    project: session.Location ?? null,
    element: session.Location_Custom_1 ?? null,
  };

  const updated = await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      Date_Custom_2: now,
      pausedAt: null,
      pauseIntervals,
      TimeInvolved: timeInvolved,
      Comments_Custom_1: `${ZTC_CANCELLED_SESSION_PREFIX} ${JSON.stringify(cancellationPayload)}`,
      Comments: session.Comments
        ? `${session.Comments}\nAtcelts: lietotāja komanda.`
        : "Atcelts: lietotāja komanda.",
    },
  });

  logZtcSession("session_cancelled", {
    session: updated,
    worker,
    details: cancellationPayload,
  });

  await sendZtcMessage(
    to,
    `Atcelts: ${formatSessionWork(session) || "aktīvā sesija"}.`,
  );
}

async function cancelTlDiagonalAttempt(args: {
  session: OpenZtcSession;
  worker: ZtcWorker;
  to: string | null;
}) {
  const { session, worker, to } = args;
  const state = session.Comments_Custom_1;
  const payload = readAnyDiagonalPayload(state);
  const resetPayload: ZtcDiagonalPayload = {
    completedText: payload.completedText ?? "",
    additionalDetails: payload.additionalDetails ?? [],
  };
  const removedPhotoUrls = [payload.firstPhotoUrl, payload.secondPhotoUrl]
    .map((url) => String(url ?? "").trim())
    .filter(Boolean);
  const nextPhotos = removedPhotoUrls.length
    ? (session.Photos ?? []).filter((url) => !removedPhotoUrls.includes(url))
    : session.Photos ?? [];

  const updated = await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      Comments_Custom_1: `${DIAGONAL_FIRST_PHOTO_PENDING_PREFIX} ${JSON.stringify(resetPayload)}`,
      Photos: nextPhotos,
    },
  });

  logZtcSession("tl_diagonal_attempt_cancelled", {
    session: updated,
    worker,
    details: {
      previousState: state,
      removedPhotoCount: removedPhotoUrls.length,
    },
  });

  await sendZtcMessage(
    to,
    `Diagonāļu mērīšana atcelta. TL darbu nevar pabeigt bez diagonālēm. Lūdzu, atsūtiet foto ar pirmās rāmja diagonāles mērījumu vai rakstiet "Atcelt darbu", lai atceltu visu darbu.`,
  );
}

function positiveNumberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function createAdditionalDetailRows(args: {
  session: OpenZtcSession;
  details: WorkExtraction["additionalDetails"];
  completedText?: string | null;
}) {
  const detailMap = new Map<string, { description: string; quantity: number | null }>();
  for (const detail of args.details ?? []) {
    const description = normalizeAdditionalDetailDescription(detail.description);
    if (!description) continue;
    const key = description.toLowerCase();
    const existing = detailMap.get(key);
    const quantity = positiveNumberOrNull(detail.quantity);
    detailMap.set(key, {
      description,
      quantity:
        existing?.quantity != null || quantity != null
          ? (existing?.quantity ?? 0) + (quantity ?? 0)
          : null,
    });
  }
  const details = Array.from(detailMap.values());
  if (!details.length) return;

  const now = new Date();
  const context = {
    siteId: args.session.siteId ?? ZTC_SITE_ID,
    organizationId: args.session.organizationId ?? ZTC_ORGANIZATION_ID,
  };
  const rows = await Promise.all(
    details.map(async (detail) => {
      const defaultRateMatch = await getDefaultRateMatchForWork(detail.description, {
        projectName: args.session.Location,
        category: "additionalDetails",
        siteId: context.siteId,
      });
      const mappedDescription = defaultRateMatch?.task?.trim() || detail.description;

      return {
        workerId: args.session.workerId,
        siteId: context.siteId,
        organizationId: context.organizationId,
        Date: now,
        Date_Custom_1: args.session.Date_Custom_1 ?? args.session.Date ?? now,
        Date_Custom_2: now,
        Location: args.session.Location,
        Location_Custom_1: args.session.Location_Custom_1,
        Works_Custom_1: "Papilddetāļas",
        Works: mappedDescription,
        Location_Custom_2: defaultRateMatch?.rate ?? null,
        Works_Custom_2: args.session.Works_Custom_2 ?? null,
        Units: defaultRateMatch?.unit ?? "gab",
        Amounts: positiveNumberOrNull(detail.quantity) ?? 1,
        TimeInvolved: 0,
        Comments: args.completedText?.trim()
          ? `Papilddetāļas: ${args.completedText.trim()}`
          : "Papilddetāļas",
        Comments_Custom_2: JSON.stringify({
          type: "ztc_additional_detail",
          parentSessionId: args.session.id,
          projectName: args.session.Location,
          elementName: args.session.Location_Custom_1,
          mainWork: args.session.Works,
          extractedWork: detail.description,
          matchedRateTask: defaultRateMatch?.task ?? null,
        }),
        originalUserComment: args.completedText?.trim() ?? null,
        Photos: [],
      };
    }),
  );

  await prisma.ztcRecords.createMany({ data: rows });
}

async function completeSession(args: {
  session: OpenZtcSession;
  to: string | null;
  completedWork?: WorkExtraction | null;
  completedText?: string | null;
  finalComments?: string | null;
  originalAudioUrl?: string | null;
}) {
  const { session, to, completedWork, completedText, finalComments, originalAudioUrl } = args;
  const now = new Date();
  const completionTime = now;
  const pauseIntervals = closeActivePauseInterval(session, completionTime);
  const pauseHours = calculatePauseHours(pauseIntervals);
  const timeInvolved = calculateEffectiveHours(session, completionTime);
  const isAdditionalWork = isAdditionalWorkSession(session);
  const isElementRelatedAdditionalWork = isElementRelatedAdditionalWorkSession(session);
  const elementAreaM2 = isElementRelatedAdditionalWork
    ? getSessionElementAreaM2(session)
    : null;
  const additionalWorkRateMatch = isElementRelatedAdditionalWork
    ? await getDefaultRateMatchForWork(session.Works, {
        projectName: session.Location,
        category: "additionalWorks",
        siteId: session.siteId,
      })
    : null;
  const sessionUnit = isElementRelatedAdditionalWork
    ? normalizeZtcRateUnit(additionalWorkRateMatch?.unit ?? session.Units, "m2")
    : isAdditionalWork
      ? "st"
      : session.Units ?? "m2";
  const isHourlyAdditionalWork = isAdditionalWork && isZtcHourlyUnit(sessionUnit);
  const amountCompleted =
    isHourlyAdditionalWork
      ? timeInvolved
      : isElementRelatedAdditionalWork && sessionUnit === "m2"
      ? elementAreaM2 ?? session.Amounts ?? null
      : isAdditionalWork
        ? session.Amounts ?? completedWork?.amountCompleted ?? null
        : session.Amounts != null
        ? session.Amounts
        : completedWork?.amountCompleted != null
          ? completedWork.amountCompleted
          : null;
  const finalWorkerComment = finalComments?.trim()
    ? await polishZtcCommentBlock(finalComments)
    : completedWork?.polishedText?.trim()
      ? buildZtcUserComments({
          startText: getSessionStartMessage(session),
          finishText: completedWork.polishedText,
        })
    : await buildPolishedZtcUserComments({
      startText: getSessionStartMessage(session),
      finishText: completedText,
    });

  const updated = await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      Date_Custom_2: completionTime,
      TimeInvolved: timeInvolved,
      pausedAt: null,
      pauseIntervals,
      Amounts: amountCompleted ?? undefined,
      Units: sessionUnit,
      Comments_Custom_1: photoBatchMarker(),
      Comments: finalWorkerComment,
      originalAudioUrl: mergeOriginalAudioUrls(session.originalAudioUrl, originalAudioUrl),
    },
  });

  logZtcSession("session_completed", {
    session: updated,
    details: {
      timeInvolved,
      pauseHours: Number(pauseHours.toFixed(2)),
      pauseCount: pauseIntervals.length,
      amountCompleted,
      unit: sessionUnit,
      requestedAt: now.toISOString(),
      comments: finalWorkerComment,
    },
  });

  await sendZtcMessage(
    to,
    `Darbs pabeigts un saglabāts: ${formatSessionWork(session) || "darbs"}. Reģistrētais laiks: ${timeInvolved ?? 0} stundas.`,
  );

  try {
    const allocationResult = await rebalanceZtcCompletedTaskAmounts({
      recordId: updated.id,
      fallbackTotalAmount: amountCompleted,
    });

    if (allocationResult.updated > 1) {
      logZtcSession("task_amounts_rebalanced", {
        session: updated,
        details: allocationResult,
      });
    }
  } catch (error) {
    console.error("[ZTC] Failed to rebalance completed task amounts", {
      recordId: updated.id,
      error,
    });
  }

  await createAdditionalDetailRows({
    session,
    details: completedWork?.additionalDetails ?? [],
    completedText,
  });

}

async function askForTlDiagonals(args: {
  session: OpenZtcSession;
  to: string | null;
  completedWork?: WorkExtraction | null;
  completedText?: string | null;
  originalAudioUrl?: string | null;
}) {
  const completedText = args.completedText?.trim() || "";
  const promptedAt = Date.now();

  const updated = await prisma.ztcRecords.update({
    where: { id: args.session.id },
    data: {
      Comments_Custom_1: `${DIAGONAL_FIRST_PHOTO_PENDING_PREFIX} ${JSON.stringify({
        completedText,
        additionalDetails: args.completedWork?.additionalDetails ?? [],
        workPhotoBatchPromptedAt: promptedAt,
        workPhotoBatchGraceUntil: promptedAt + TL_WORK_PHOTO_BATCH_GRACE_MS,
      })}`,
      Units: "m2",
      Amounts: args.session.Amounts ?? undefined,
      originalAudioUrl: mergeOriginalAudioUrls(args.session.originalAudioUrl, args.originalAudioUrl),
    },
  });

  logZtcSession("tl_diagonal_flow_started", {
    session: updated,
    details: { completedText, workPhotoBatchPromptedAt: promptedAt },
  });

  await sendZtcMessage(
    args.to,
    `Darbs pabeigts: ${formatSessionWork(args.session) || "TL/karkasa darbs"}. Pirms noslēgšanas lūdzu atsūtiet foto ar pirmās rāmja diagonāles mērījumu.`,
  );
}

async function finishSessionOrAskTlDiagonals(args: {
  session: OpenZtcSession;
  to: string | null;
  completedWork?: WorkExtraction | null;
  completedText?: string | null;
  originalAudioUrl?: string | null;
}) {
  if (isTlWork(args.session.Works)) {
    const existingDiagonalReport = await findExistingTlDiagonalReport(args.session);
    if (existingDiagonalReport) {
      logZtcSession("tl_diagonal_flow_skipped_existing_report", {
        session: args.session,
        details: {
          existingRecordId: existingDiagonalReport.id,
          existingWorkerId: existingDiagonalReport.workerId,
          existingCompletedAt: existingDiagonalReport.Date_Custom_2,
        },
      });

      await completeSession(args);
      return;
    }

    await askForTlDiagonals({
      session: args.session,
      to: args.to,
      completedWork: args.completedWork,
      completedText: args.completedText,
      originalAudioUrl: args.originalAudioUrl,
    });
    return;
  }

  await completeSession(args);
}

async function handleDiagonalMeasurementText(args: {
  session: OpenZtcSession;
  text: string;
  to: string | null;
}) {
  const completedText = readMarkerPayload(args.session.Comments_Custom_1, DIAGONALS_PENDING_PREFIX);
  const diagonals = parseDiagonalNumbers(args.text);

  if (!diagonals) {
    await sendZtcMessage(args.to, "Neatradu 2 diagonāļu skaitļus. Lūdzu, atsūtiet abus mērījumus, piemēram: 5240 5238.");
    return;
  }

  const payload = {
    completedText,
    diagonalA: diagonals[0],
    diagonalB: diagonals[1],
  };

  await prisma.ztcRecords.update({
    where: { id: args.session.id },
    data: {
      Comments_Custom_1: `${DIAGONALS_CONFIRM_PREFIX} ${JSON.stringify(payload)}`,
    },
  });

  await sendZtcMessage(
    args.to,
    `Saņēmu diagonāļu mērījumus: ${payload.diagonalA} un ${payload.diagonalB}. Vai pareizi? Atbildiet "jā" vai "nē".`,
  );
}

async function handleDiagonalConfirmationText(args: {
  session: OpenZtcSession;
  text: string;
  to: string | null;
}) {
  const rawPayload = readMarkerPayload(args.session.Comments_Custom_1, DIAGONALS_CONFIRM_PREFIX);
  const payload = parseJsonObject<{
    completedText: string;
    diagonalA: number;
    diagonalB: number;
  }>(rawPayload, {
    completedText: "",
    diagonalA: 0,
    diagonalB: 0,
  });

  const replacementDiagonals = parseDiagonalNumbers(args.text);
  if (replacementDiagonals && !isPositiveConfirmation(args.text) && !isNegativeConfirmation(args.text)) {
    await handleDiagonalMeasurementText({
      session: {
        ...args.session,
        Comments_Custom_1: `${DIAGONALS_PENDING_PREFIX} ${payload.completedText}`,
      },
      text: args.text,
      to: args.to,
    });
    return;
  }

  if (isNegativeConfirmation(args.text)) {
    await prisma.ztcRecords.update({
      where: { id: args.session.id },
      data: {
        Comments_Custom_1: `${DIAGONALS_PENDING_PREFIX} ${payload.completedText}`,
      },
    });
    await sendZtcMessage(args.to, "Labi, atsūtiet pareizos 2 diagonāļu mērījumus vēlreiz.");
    return;
  }

  if (!isPositiveConfirmation(args.text)) {
    await sendZtcMessage(args.to, `Lūdzu, apstipriniet mērījumus ${payload.diagonalA} un ${payload.diagonalB} ar "jā" vai "nē".`);
    return;
  }

  await completeSession({
    session: args.session,
    to: args.to,
    finalComments: buildDiagonalComment({
      session: args.session,
      completedText: payload.completedText,
      diagonalA: payload.diagonalA,
      diagonalB: payload.diagonalB,
    }),
  });
}

async function saveDiagonalMeasurePhoto(args: {
  worker: ZtcWorker;
  publicUrl: string;
  session: OpenZtcSession;
  label: string;
}) {
  const { worker, publicUrl, session, label } = args;

  await prisma.photos.create({
    data: {
      Date: new Date(),
      URL: publicUrl,
      fileUrl: publicUrl,
      Comment: [
        session.Location ?? "",
        session.Location_Custom_1 ?? "",
        session.Works ?? "",
        label,
        worker.name ?? "",
        worker.surname ?? "",
      ]
        .map((part) => String(part).trim())
        .filter(Boolean)
        .join(" - "),
      Location: session.Location ?? null,
      workerId: worker.id,
      siteId: getZtcFlowContext(worker).siteId,
      organizationId: getZtcFlowContext(worker).organizationId,
    },
  });
}

async function handleTlDiagonalMeasureText(args: {
  session: OpenZtcSession;
  text: string;
  to: string | null;
  originalAudioUrl?: string | null;
}) {
  const state = args.session.Comments_Custom_1;

  if (state?.startsWith(DIAGONAL_FIRST_PHOTO_PENDING_PREFIX)) {
    await sendZtcMessage(args.to, "Lūdzu, vispirms atsūtiet pirmās rāmja diagonāles foto.");
    return;
  }

  if (state?.startsWith(DIAGONAL_SECOND_PHOTO_PENDING_PREFIX)) {
    await sendZtcMessage(args.to, "Lūdzu, vispirms atsūtiet otrās rāmja diagonāles foto.");
    return;
  }

  if (state?.startsWith(DIAGONAL_FIRST_MEASURE_PENDING_PREFIX)) {
    const measure = await extractDiagonalMeasureMm(args.text);
    if (measure == null) {
      await sendZtcMessage(args.to, "Neatradu mērījumu. Lūdzu, atsūtiet balss ziņu ar pirmās diagonāles mērījumu milimetros, piemēram: 5240.");
      return;
    }

    const payload = {
      ...readDiagonalPhotoMeasurePayload(state, DIAGONAL_FIRST_MEASURE_PENDING_PREFIX),
      firstMeasureMm: measure,
    };

    const updated = await prisma.ztcRecords.update({
      where: { id: args.session.id },
      data: {
        Comments_Custom_1: `${DIAGONAL_SECOND_PHOTO_PENDING_PREFIX} ${JSON.stringify(payload)}`,
        originalAudioUrl: mergeOriginalAudioUrls(args.session.originalAudioUrl, args.originalAudioUrl),
      },
    });

    logZtcSession("tl_diagonal_one_measured", {
      session: updated,
      details: { measureMm: measure },
    });

    await sendZtcMessage(args.to, `Pirmās diagonāles mērījums: ${measure} mm. Tagad atsūtiet foto ar otrās rāmja diagonāles mērījumu.`);
    return;
  }

  if (state?.startsWith(DIAGONAL_SECOND_MEASURE_PENDING_PREFIX)) {
    const measure = await extractDiagonalMeasureMm(args.text);
    if (measure == null) {
      await sendZtcMessage(args.to, "Neatradu mērījumu. Lūdzu, atsūtiet balss ziņu ar otrās diagonāles mērījumu milimetros, piemēram: 5238.");
      return;
    }

    const payload = {
      ...readDiagonalPhotoMeasurePayload(state, DIAGONAL_SECOND_MEASURE_PENDING_PREFIX),
      secondMeasureMm: measure,
    };

    logZtcSession("tl_diagonal_two_measured", {
      session: args.session,
      details: { measureMm: measure },
    });

    await completeSession({
      session: args.session,
      to: args.to,
      completedWork: {
        isGibberish: false,
        isFinish: true,
        isAdditionalWork: false,
        additionalWorkDescription: null,
        additionalDetails: payload.additionalDetails ?? [],
        workOption: args.session.Works,
        amountCompleted: null,
        units: null,
        issue: null,
      },
      finalComments: buildDiagonalPhotoMeasureComment({
        session: args.session,
        payload,
      }),
      originalAudioUrl: args.originalAudioUrl,
    });
  }
}

async function handleTlDiagonalPhoto(args: {
  formData: FormData;
  idx: number;
  to: string | null;
  worker: ZtcWorker;
  session: OpenZtcSession;
}) {
  const state = args.session.Comments_Custom_1;

  if (state?.startsWith(DIAGONAL_FIRST_MEASURE_PENDING_PREFIX)) {
    logZtcSession("tl_diagonal_extra_photo_suppressed_waiting_for_first_measure", {
      session: args.session,
      worker: args.worker,
      details: {
        messageId: getString(args.formData, "MessageId"),
        messageTimestamp: getString(args.formData, "MessageTimestamp"),
        mediaIndex: args.idx,
      },
    });
    return;
  }

  if (state?.startsWith(DIAGONAL_SECOND_MEASURE_PENDING_PREFIX)) {
    logZtcSession("tl_diagonal_extra_photo_suppressed_waiting_for_second_measure", {
      session: args.session,
      worker: args.worker,
      details: {
        messageId: getString(args.formData, "MessageId"),
        messageTimestamp: getString(args.formData, "MessageTimestamp"),
        mediaIndex: args.idx,
      },
    });
    return;
  }

  if (state?.startsWith(DIAGONAL_FIRST_PHOTO_PENDING_PREFIX)) {
    const image = await uploadMediaImage(args.formData, args.idx);
    const payload = {
      ...readDiagonalPhotoMeasurePayload(state, DIAGONAL_FIRST_PHOTO_PENDING_PREFIX),
      firstPhotoUrl: image.publicUrl,
    };
    const nextPhotos = [...(args.session.Photos ?? []), image.publicUrl];

    const updated = await prisma.ztcRecords.update({
      where: { id: args.session.id },
      data: {
        Photos: nextPhotos,
        Comments_Custom_1: `${DIAGONAL_FIRST_MEASURE_PENDING_PREFIX} ${JSON.stringify(payload)}`,
      },
    });

    logZtcSession("tl_diagonal_one_photo_saved", {
      session: updated,
      worker: args.worker,
      details: { photoUrl: image.publicUrl },
    });

    await saveDiagonalMeasurePhoto({
      worker: args.worker,
      publicUrl: image.publicUrl,
      session: args.session,
      label: "Pirmā diagonāle",
    });

    await sendZtcMessage(args.to, "Pirmās diagonāles foto saņemts. Lūdzu, atsūtiet balss ziņu ar pirmās diagonāles mērījumu milimetros, piemēram: 5240.");
    return;
  }

  if (state?.startsWith(DIAGONAL_SECOND_PHOTO_PENDING_PREFIX)) {
    const image = await uploadMediaImage(args.formData, args.idx);
    const payload = {
      ...readDiagonalPhotoMeasurePayload(state, DIAGONAL_SECOND_PHOTO_PENDING_PREFIX),
      secondPhotoUrl: image.publicUrl,
    };
    const nextPhotos = [...(args.session.Photos ?? []), image.publicUrl];

    const updated = await prisma.ztcRecords.update({
      where: { id: args.session.id },
      data: {
        Photos: nextPhotos,
        Comments_Custom_1: `${DIAGONAL_SECOND_MEASURE_PENDING_PREFIX} ${JSON.stringify(payload)}`,
      },
    });

    logZtcSession("tl_diagonal_two_photo_saved", {
      session: updated,
      worker: args.worker,
      details: { photoUrl: image.publicUrl },
    });

    await saveDiagonalMeasurePhoto({
      worker: args.worker,
      publicUrl: image.publicUrl,
      session: args.session,
      label: "Otrā diagonāle",
    });

    await sendZtcMessage(args.to, "Otrās diagonāles foto saņemts. Lūdzu, atsūtiet balss ziņu ar otrās diagonāles mērījumu milimetros, piemēram: 5238.");
  }
}

async function saveCompletedWorkPhoto(args: {
  worker: ZtcWorker;
  publicUrl: string;
  session: OpenZtcSession;
}) {
  const { worker, publicUrl, session } = args;

  await prisma.photos.create({
    data: {
      Date: new Date(),
      URL: publicUrl,
      fileUrl: publicUrl,
      Comment: [
        session.Location ?? "",
        session.Location_Custom_1 ?? "",
        session.Works ?? "",
        worker.name ?? "",
        worker.surname ?? "",
      ]
        .map((part) => String(part).trim())
        .filter(Boolean)
        .join(" - "),
      Location: session.Location ?? null,
      workerId: worker.id,
      siteId: getZtcFlowContext(worker).siteId,
      organizationId: getZtcFlowContext(worker).organizationId,
    },
  });
}

function shouldAutoAppendToRecentCompletedSession(args: {
  session: OpenZtcSession;
  formData: FormData;
  imageCount: number;
  caption?: string | null;
}) {
  if (args.imageCount > 1) {
    return { shouldAppend: true, reason: "multiple_images_same_message" };
  }

  const normalizedCaption = String(args.caption ?? "").trim().toLowerCase();
  if (
    /\b(papildu|vel|v[eē]l|extra|additional|late)\b/i.test(normalizedCaption) &&
    /\b(foto|photo|bild|att[eē]l)\w*\b/i.test(normalizedCaption)
  ) {
    return { shouldAppend: true, reason: "caption_requests_extra_photo_append" };
  }

  const completedAt = readPhotoBatchConfirmAt(args.session.Comments_Custom_1);
  const messageTimestampMs = getMetaMessageTimestampMs(args.formData);
  if (completedAt != null && messageTimestampMs != null && messageTimestampMs <= completedAt + 1000) {
    return { shouldAppend: true, reason: "image_sent_before_or_at_completion" };
  }

  return { shouldAppend: false, reason: "single_image_prefers_new_drawing_flow" };
}

async function appendPhotosToRecentCompletedSession(args: {
  formData: FormData;
  idxs: number[];
  worker: ZtcWorker;
  caption?: string | null;
}) {
  const session = await getRecentCompletedPhotoBatchSession(args.worker);
  if (!session) return false;

  const appendDecision = shouldAutoAppendToRecentCompletedSession({
    session,
    formData: args.formData,
    imageCount: args.idxs.length,
    caption: args.caption,
  });
  if (!appendDecision.shouldAppend) {
    logZtcSession("recent_completed_work_photo_append_skipped_for_new_drawing_check", {
      session,
      worker: args.worker,
      details: {
        reason: appendDecision.reason,
        requestedPhotoCount: args.idxs.length,
        caption: args.caption ?? "",
        messageTimestamp: getString(args.formData, "MessageTimestamp"),
      },
    });
    return false;
  }

  await sendZtcMessage(getString(args.formData, "From"), "Foto saņemts, pievienoju iepriekš pabeigtajam darbam...");

  const images = await uploadZtcImages(args.formData, args.idxs, "recent_completed_append");
  const uploadedUrls = images.map((image) => image.publicUrl);
  if (uploadedUrls.length === 0) {
    logZtcSession("recent_completed_work_photo_append_upload_skipped", {
      session,
      worker: args.worker,
      details: { requestedPhotoCount: args.idxs.length, reason: appendDecision.reason },
    });
    return true;
  }

  const nextPhotos = [...(session.Photos ?? []), ...uploadedUrls];

  const updated = await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      Photos: nextPhotos,
      Comments_Custom_1: photoBatchMarker(),
    },
  });

  await Promise.all(
    uploadedUrls.map((publicUrl) =>
      saveCompletedWorkPhoto({
        worker: args.worker,
        publicUrl,
        session,
      }),
    ),
  );

  logZtcSession("recent_completed_work_photos_appended", {
    session: updated,
    worker: args.worker,
    details: {
      addedPhotoCount: uploadedUrls.length,
      photoUrls: uploadedUrls,
      reason: appendDecision.reason,
    },
  });

  return true;
}

async function appendTlWorkPhotosDuringDiagonalGrace(args: {
  formData: FormData;
  idxs: number[];
  worker: ZtcWorker;
  session: OpenZtcSession;
}) {
  if (!isTlWorkPhotoBatchGraceActive(args.session, args.formData)) return false;

  const images = await uploadZtcImages(args.formData, args.idxs, "tl_completion_album_late_photos");
  const uploadedUrls = images.map((image) => image.publicUrl);
  if (uploadedUrls.length === 0) {
    logZtcSession("tl_completion_album_late_photos_append_skipped", {
      session: args.session,
      worker: args.worker,
      details: { requestedPhotoCount: args.idxs.length },
    });
    return true;
  }

  const nextPhotos = [...(args.session.Photos ?? []), ...uploadedUrls];
  const updated = await prisma.ztcRecords.update({
    where: { id: args.session.id },
    data: { Photos: nextPhotos },
  });

  await Promise.all(
    uploadedUrls.map((publicUrl) =>
      saveCompletedWorkPhoto({
        worker: args.worker,
        publicUrl,
        session: args.session,
      }),
    ),
  );

  logZtcSession("tl_completion_album_late_photos_appended_as_work_photos", {
    session: updated,
    worker: args.worker,
    details: {
      addedPhotoCount: uploadedUrls.length,
      photoUrls: uploadedUrls,
      messageTimestamp: getString(args.formData, "MessageTimestamp"),
    },
  });

  return true;
}

async function handleDrawingPhoto(args: {
  formData: FormData;
  idx: number;
  to: string | null;
  worker: ZtcWorker;
  drawingProfile?: ProductionDrawingExtractionProfile;
}) {
  const { formData, idx, to, worker } = args;

  const existing = await getOpenZtcSession(worker);
  if (existing?.Works) {
    await sendZtcMessage(to, `Jums jau ir aktīva ZTC darba sesija: ${formatSessionWork(existing) || "darbs"}. Lūdzu, pabeidziet to pirms jauna rasējuma sūtīšanas.`);
    return;
  }

  logZtcSession("drawing_photo_received", {
    worker,
    details: { mediaIndex: idx },
  });

  await sendZtcMessage(to, "Rasējuma foto saņemts, lūdzu uzgaidiet...");

  logZtcSession("drawing_photo_upload_started", {
    worker,
    details: { mediaIndex: idx },
  });
  const { image, extraction } = await uploadAndExtractDrawingInfo(formData, idx, {
    drawingProfile: args.drawingProfile,
  });
  logZtcSession("drawing_photo_upload_completed", {
    worker,
    details: { mediaIndex: idx, publicUrl: image.publicUrl, contentType: image.contentType },
  });

  logZtcSession("drawing_extraction_started", {
    worker,
    details: { imageUrl: image.publicUrl },
  });
  logZtcSession("drawing_extraction_completed", {
    worker,
    details: {
      isConstructionDrawing: extraction.isConstructionDrawing,
      hasReadableProjectName: extraction.hasReadableProjectName,
      hasReadableElementName: extraction.hasReadableElementName,
      hasReadableWorkList: extraction.hasReadableWorkList,
      qualityOk: extraction.qualityOk,
      projectName: extraction.projectName,
      elementName: extraction.elementName,
      workCount: extraction.workList.length,
      issue: extraction.issue,
    },
  });

  if (
    !extraction.isConstructionDrawing ||
    !extraction.qualityOk ||
    !extraction.hasReadableProjectName ||
    !extraction.hasReadableElementName ||
    !extraction.hasReadableWorkList ||
    !extraction.projectName ||
    !extraction.elementName ||
    extraction.totalAreaM2 == null ||
    extraction.workList.length === 0
  ) {
    await sendZtcMessage(
      to,
      "Lūdzu, atsūtiet skaidru ražošanas rasējuma foto, kur redzams projekta nosaukums, elementa numurs, kopplatība m2 un darbu saraksts.",
    );
    return;
  }

  const canonicalExtraction = await canonicalizeDrawingExtractionFromPreviousContext(extraction, worker);
  const drawingWorks = canonicalExtraction.workList.join("; ");
  const drawingMetadata = JSON.stringify(buildDrawingMetadata(canonicalExtraction));

  if (existing && !existing.Works) {
    const updated = await prisma.ztcRecords.update({
      where: { id: existing.id },
      data: {
        Date_Custom_1: new Date(),
        Location: canonicalExtraction.projectName,
        Location_Custom_1: canonicalExtraction.elementName,
        Works_Custom_1: drawingWorks,
        Comments_Custom_2: drawingMetadata,
        Comments: null,
        Photos: [image.publicUrl],
      },
    });

    logZtcSession("drawing_context_updated", {
      session: updated,
      worker,
      details: {
        drawingPhotoUrl: image.publicUrl,
        extractedWorks: canonicalExtraction.workList,
      },
    });
  } else {
    const created = await prisma.ztcRecords.create({
      data: {
        workerId: worker.id,
        siteId: getZtcFlowContext(worker).siteId,
        organizationId: getZtcFlowContext(worker).organizationId,
        Date_Custom_1: new Date(),
        Location: canonicalExtraction.projectName,
        Location_Custom_1: canonicalExtraction.elementName,
        Works_Custom_1: drawingWorks,
        Comments_Custom_2: drawingMetadata,
        Comments: null,
        originalUserComment: `${workerFullName(worker)} : rasējuma foto`,
        Photos: [image.publicUrl],
      },
    });

    logZtcSession("drawing_context_created", {
      session: created,
      worker,
      details: {
        drawingPhotoUrl: image.publicUrl,
        extractedWorks: canonicalExtraction.workList,
      },
    });
  }

  await sendZtcMessage(
    to,
    `Rasējums pieņemts.\nProjekts: ${canonicalExtraction.projectName}\nElementa numurs: ${canonicalExtraction.elementName}\nPlatība: ${canonicalExtraction.totalAreaM2} m2\nDarbi:\n${formatExtractedWorksForMessage(canonicalExtraction)}\n\nTagad atsūtiet balss ziņu vai tekstu ar darbu, ko sākat darīt.`,
  );
}

async function createSessionFromLatestDrawing(worker: ZtcWorker) {
  const previous = await getLatestZtcDrawingContext(worker);
  if (!previous) return null;

  const created = await prisma.ztcRecords.create({
    data: {
      workerId: worker.id,
      siteId: getZtcFlowContext(worker).siteId,
      organizationId: getZtcFlowContext(worker).organizationId,
      Date_Custom_1: new Date(),
      Location: previous.Location,
      Location_Custom_1: previous.Location_Custom_1,
      Works_Custom_1: getDrawingWorksCustomValue(previous),
      Comments_Custom_2: previous.Comments_Custom_2,
      Comments: null,
      originalUserComment: `${workerFullName(worker)} : atkārtots darbs pie tā paša rasējuma`,
      Photos: previous.Photos?.[0] ? [previous.Photos[0]] : [],
    },
  });

  logZtcSession("session_created_from_latest_drawing", {
    session: created,
    worker,
    details: { previousRecordId: previous.id },
  });

  return created;
}

async function createAdditionalWorkSession(args: {
  worker: ZtcWorker;
  work: WorkExtraction;
  text: string;
  originalAudioUrl?: string | null;
  drawingContext?: OpenZtcSession | null;
}) {
  const { worker, work, text, originalAudioUrl, drawingContext } = args;
  const { workOptions } = await getZtcDropdownOptions(worker);
  const workOption = work.workOption ?? getFallbackOtherWorkOption(workOptions);
  const now = new Date();
  const comments = work.polishedText?.trim()
    ? buildZtcUserComments({ startText: work.polishedText })
    : await buildPolishedZtcUserComments({ startText: text });
  const defaultRateMatch = await getDefaultRateMatchForWork(
    work.additionalWorkDescription || workOption,
    {
      projectName: drawingContext?.Location,
      category: "additionalWorks",
    },
  );
  const mappedWorkOption = defaultRateMatch?.task?.trim() || workOption;
  const relatesToElement = defaultRateMatch?.relatesToElement === true;
  const shouldAttachToProject = Boolean(drawingContext?.Location);
  const shouldAttachToElement =
    shouldAttachToProject &&
    relatesToElement &&
    Boolean(drawingContext?.Location_Custom_1);
  const elementAreaM2 =
    shouldAttachToElement && drawingContext
      ? getSessionElementAreaM2(drawingContext)
      : null;
  const additionalWorkUnit = shouldAttachToElement
    ? normalizeZtcRateUnit(defaultRateMatch?.unit, "m2")
    : "st";
  if (!shouldAttachToProject) {
    await closeOpenDrawingContextsForStandaloneAdditionalWork(worker, now);
  }

  const data = {
      workerId: worker.id,
      siteId: getZtcFlowContext(worker).siteId,
      organizationId: getZtcFlowContext(worker).organizationId,
      Date: now,
      Date_Custom_1: now,
      Location: shouldAttachToProject ? drawingContext?.Location : "Papilddarbi",
      Location_Custom_1: shouldAttachToElement
        ? drawingContext?.Location_Custom_1
        : shouldAttachToProject
          ? "Papilddarbi"
          : null,
      Works_Custom_1: shouldAttachToProject ? "Papilddarbi" : null,
      Comments_Custom_2: shouldAttachToProject ? drawingContext?.Comments_Custom_2 : null,
      Photos: shouldAttachToProject && drawingContext?.Photos?.[0] ? [drawingContext.Photos[0]] : [],
      Works: mappedWorkOption,
      Location_Custom_2: defaultRateMatch?.rate ?? null,
      Units: additionalWorkUnit,
      Amounts: shouldAttachToElement && additionalWorkUnit === "m2" ? elementAreaM2 ?? undefined : undefined,
      Comments: comments,
      originalUserComment: `${workerFullName(worker)} : ${text}`,
      originalAudioUrl: originalAudioUrl ?? undefined,
  };

  const created =
    shouldAttachToElement && drawingContext && !drawingContext.Works
      ? await prisma.ztcRecords.update({
          where: { id: drawingContext.id },
          data,
        })
      : await prisma.ztcRecords.create({ data });

  logZtcSession("additional_work_started", {
    session: created,
    worker,
    details: {
      startText: text,
      extractedWork: work.additionalWorkDescription || workOption,
      mappedWork: mappedWorkOption,
      matchedRate: defaultRateMatch?.rate ?? null,
      relatesToElement,
      attachedToProject: shouldAttachToProject,
      attachedToElement: shouldAttachToElement,
      projectName: shouldAttachToProject ? drawingContext?.Location : null,
      elementName: shouldAttachToElement
        ? drawingContext?.Location_Custom_1
        : shouldAttachToProject
          ? "Papilddarbi"
          : null,
      elementAreaM2,
      configuredUnit: defaultRateMatch?.unit ?? "st",
      reportedUnit: work.units,
      savedUnit: created.Units,
    },
  });

  return created;
}

async function handleWorkText(args: {
  text: string;
  to: string | null;
  worker: ZtcWorker;
  originalAudioUrl?: string | null;
}) {
  const startedAt = Date.now();
  let outcome = "started";
  try {
  const { text, to, worker, originalAudioUrl } = args;
  let openSession = await getOpenZtcSession(worker);

  if (isCancelWorkCommand(text)) {
    if (!openSession) {
      outcome = "cancel_work_without_session";
      await sendZtcMessage(to, "Nav aktīvas sesijas, ko atcelt.");
      return;
    }
    outcome = "session_cancelled_by_command";
    await cancelWholeZtcSession({ session: openSession, worker, to });
    return;
  }

  if (isCancelCommand(text)) {
    if (!openSession) {
      outcome = "cancel_without_session";
      await sendZtcMessage(to, "Nav aktīvas sesijas, ko atcelt.");
      return;
    }

    if (isAnyDiagonalFlow(openSession.Comments_Custom_1)) {
      outcome = "tl_diagonal_attempt_cancelled";
      await cancelTlDiagonalAttempt({ session: openSession, worker, to });
      return;
    }

    outcome = "session_cancelled_by_command";
    await cancelWholeZtcSession({ session: openSession, worker, to });
    return;
  }

  if (isPauseCommand(text)) {
    if (!openSession) {
      outcome = "pause_without_session";
      await sendZtcMessage(to, "Nav aktīva darba, ko pauzēt.");
      return;
    }
    outcome = "session_paused";
    await pauseZtcSession({ session: openSession, worker, to });
    return;
  }

  if (isResumeCommand(text)) {
    if (!openSession) {
      outcome = "resume_without_session";
      await sendZtcMessage(to, "Nav aktīva darba, ko turpināt.");
      return;
    }
    outcome = "session_resumed";
    await resumeZtcSession({ session: openSession, worker, to });
    return;
  }

  if (openSession && isDiagonalPhotoMeasureFlow(openSession.Comments_Custom_1)) {
    outcome = "diagonal_photo_measure_flow";
    await handleTlDiagonalMeasureText({ session: openSession, text, to, originalAudioUrl });
    return;
  }

  const isAdditionalWorkRequest = hasPapilddarbiKeyword(text);
  const latestDrawingContext =
    openSession && hasZtcDrawingContext(openSession)
      ? null
      : await getLatestZtcDrawingContext(worker);
  const contextSession = hasZtcDrawingContext(openSession) ? openSession : latestDrawingContext;
  const workOptionsForSession = getSessionWorkOptions(contextSession);
  const work = await extractWorkInfo(text, workOptionsForSession);

  if (work.isGibberish) {
    outcome = "gibberish";
    await sendZtcMessage(to, "Neizdevās saprast ziņu. Lūdzu, mēģiniet vēlreiz.");
    return;
  }

  if (work.isAdditionalWork && !work.isFinish) {
    if (openSession?.Works && isAdditionalWorkSession(openSession)) {
      outcome = "additional_work_already_active";
      await sendZtcMessage(
        to,
        `Papilddarbs jau ir aktīva sesija: ${formatSessionWork(openSession) || "darbs"}. Lūdzu, pabeidziet to pirms jauna papilddarba sākšanas.`,
      );
      return;
    }

    await createAdditionalWorkSession({
      worker,
      work,
      text,
      originalAudioUrl,
      drawingContext:
        openSession && hasZtcDrawingContext(openSession) ? openSession : null,
    });
    outcome = "additional_work_started";
    await sendZtcMessage(
      to,
      `Papilddarbs sākts${work.workOption ? `: ${work.workOption}` : ""}. Kad darbs ir pabeigts, atsūtiet foto un pasakiet, ka darbs ir pabeigts.`,
    );
    return;
  }

  let session = work.isFinish
    ? openSession
    : openSession ?? (await createSessionFromLatestDrawing(worker));

  if (!session) {
    outcome = "missing_drawing";
    await sendZtcMessage(to, "Lūdzu, sāciet ar skaidru ražošanas rasējuma foto.");
    return;
  }

  if (!work.isFinish) {
    session = await ensureSessionHasDrawingContext({
      session,
      drawingContext: latestDrawingContext,
      worker,
    });
  }

  const now = new Date();

  if (work.isFinish) {
    if (!session.Works) {
      outcome = "finish_without_started_work";
      await sendZtcMessage(to, "Rasējums ir saņemts, bet vēl nav darba sākšanas ziņas. Lūdzu, pasakiet vai uzrakstiet, kādu darbu sākat.");
      return;
    }

    if (!hasCompletedWorkPhoto(session)) {
      const dbStartedAt = Date.now();
      const pendingUnits = isElementRelatedAdditionalWorkSession(session)
        ? normalizeZtcRateUnit(session.Units, "m2")
        : isAdditionalWorkSession(session)
          ? "st"
          : "m2";
      const updated = await prisma.ztcRecords.update({
        where: { id: session.id },
        data: {
          Amounts: session.Amounts ?? undefined,
          Units: pendingUnits,
          Comments_Custom_1: buildFinishPendingMarker({
            completedText: work.polishedText?.trim() || text,
            additionalDetails: work.additionalDetails ?? [],
          }),
          originalAudioUrl: mergeOriginalAudioUrls(session.originalAudioUrl, originalAudioUrl),
        },
      });
      logZtcTiming("finish_pending_db_update", dbStartedAt, {
        workerId: worker.id,
        sessionId: session.id,
      });

      logZtcSession("finish_voice_waiting_for_photo", {
        session: updated,
        worker,
        details: { finishText: text },
      });

      await sendZtcMessage(
        to,
        `Pabeigšanas ziņa saņemta par darbu: ${formatSessionWork(session) || "darbs"}. Lūdzu, atsūtiet pabeigta darba foto.`,
      );
      outcome = "finish_waiting_for_photo";
      return;
    }

    await finishSessionOrAskTlDiagonals({
      session,
      to,
      completedWork: work,
      completedText: work.polishedText?.trim() || text,
      originalAudioUrl,
    });
    outcome = "finish_completed_or_diagonals";
    return;
  }

  if (session.Works) {
    if (session.Comments_Custom_1?.startsWith(PHOTO_PENDING_FINISH_PREFIX)) {
      outcome = "work_active_photo_pending_finish";
      await sendZtcMessage(
        to,
        `Pabeigta darba foto ir saņemts darbam: ${formatSessionWork(session) || "darbs"}. Lūdzu, pasakiet vai uzrakstiet, ka darbs ir pabeigts, lai es varu noslēgt sesiju.`,
      );
      return;
    }

    outcome = "work_already_active";
    await sendZtcMessage(
      to,
      `Jums jau ir aktīva darba sesija: ${formatSessionWork(session) || "darbs"}. Lūdzu, vispirms atsūtiet pabeigta darba foto un pasakiet, ka darbs ir pabeigts.`,
    );
    return;
  }

  if (!work.workOption) {
    outcome = "no_matching_work";
    await sendZtcMessage(to, "Neatradu atbilstošu darbu sarakstā. Lūdzu, pasakiet vai uzrakstiet darbu vēlreiz.");
    return;
  }

  const amountM2 = getSessionWorkAmountM2(session, work.workOption);
  const complexityCode = getSessionWorkComplexityCode(session, work.workOption);
  const comments = work.polishedText?.trim()
    ? buildZtcUserComments({ startText: work.polishedText })
    : await buildPolishedZtcUserComments({ startText: text });
  const rateStartedAt = Date.now();
  const defaultRateMatch = await getDefaultRateMatchForWork(work.workOption, {
    projectName: session.Location,
    category: "works",
    worker,
  });
  logZtcTiming("default_rate_lookup", rateStartedAt, {
    workerId: worker.id,
    workOption: work.workOption,
    projectName: session.Location,
    matchedRate: defaultRateMatch?.rate ?? null,
  });

  const complexityStartedAt = Date.now();
  const complexity = await getComplexityForCode(
    complexityCode,
    session.Location,
    worker,
  );
  logZtcTiming("complexity_lookup", complexityStartedAt, {
    workerId: worker.id,
    workOption: work.workOption,
    projectName: session.Location,
    complexityCode,
    complexity,
  });

  const dbStartedAt = Date.now();
  const updated = await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      Date: now,
      Works: work.workOption,
      Location_Custom_2: session.Location_Custom_2 ?? defaultRateMatch?.rate ?? null,
      WorkersInvolved: Number(complexity),
      Units: "m2",
      Amounts: amountM2 ?? undefined,
      Comments: comments,
      Comments_Custom_2: defaultRateMatch?.rate
        ? attachZtcLaborNormToMetadata(
            session.Comments_Custom_2,
            defaultRateMatch.laborNorm,
            "m2",
          )
        : clearZtcLaborNormFromMetadata(session.Comments_Custom_2),
      originalUserComment: `${workerFullName(worker)} : ${text}`,
      originalAudioUrl: mergeOriginalAudioUrls(session.originalAudioUrl, originalAudioUrl),
    },
  });
  logZtcTiming("work_started_db_update", dbStartedAt, {
    workerId: worker.id,
    sessionId: session.id,
    workOption: work.workOption,
  });

  logZtcSession("work_started", {
    session: updated,
    worker,
    details: {
      startText: text,
      amountM2,
      complexityCode,
      complexity,
      matchedRate: defaultRateMatch?.rate ?? null,
    },
  });

  await sendZtcMessage(
    to,
    `Sākts darbs: ${work.workOption}\nProjekts: ${session.Location}\nElementa numurs: ${session.Location_Custom_1}\nApjoms: ${amountM2 ?? 0} m2\nSarežģītība: ${complexity}${complexityCode ? ` (${complexityCode})` : ""}\nKad darbs ir pabeigts, atsūtiet pabeigta darba foto un pasakiet, ka darbs ir pabeigts.`,
  );
  outcome = "work_started";
  } finally {
    logZtcTiming("handle_work_text_total", startedAt, {
      workerId: args.worker.id,
      textLength: args.text.trim().length,
      outcome,
    });
  }
}

async function handleFinishedPhoto(args: {
  formData: FormData;
  idxs: number[];
  to: string | null;
  worker: ZtcWorker;
  caption: string;
}) {
  const { formData, idxs, to, worker, caption } = args;
  const firstIdx = idxs[0];
  const session = await getOpenZtcSession(worker);

  if (!session?.Works) {
    await sendZtcMessage(to, "Pirms pabeigta darba foto, lūdzu, atsūtiet rasējuma foto un balss ziņu vai tekstu par darba sākšanu.");
    return;
  }

  if (firstIdx == null) {
    await sendZtcMessage(to, "Neatradu foto. Lūdzu, atsūtiet pabeigta darba foto vēlreiz.");
    return;
  }

  if (isDiagonalPhotoMeasureFlow(session.Comments_Custom_1)) {
    if (
      await appendTlWorkPhotosDuringDiagonalGrace({
        formData,
        idxs,
        worker,
        session,
      })
    ) {
      return;
    }

    await handleTlDiagonalPhoto({ formData, idx: firstIdx, to, worker, session });
    return;
  }

  const alreadyConfirmedPhotoBatch = isRecentPhotoBatchConfirmation(session.Comments_Custom_1);
  const alreadyAcknowledgedByBatchCollector = Number(getString(formData, "MetaBatchSize") || "0") > 0;
  if (!alreadyConfirmedPhotoBatch && !alreadyAcknowledgedByBatchCollector) {
    await sendZtcMessage(to, "Foto saņemts, lūdzu uzgaidiet...");
  }

  const images = await uploadZtcImages(formData, idxs, "completed_work_photos");
  const uploadedUrls = images.map((image) => image.publicUrl);
  if (uploadedUrls.length === 0) {
    await sendZtcMessage(to, "Neizdevās saglabāt pabeigtā darba foto. Lūdzu, atsūtiet foto vēlreiz.");
    return;
  }

  const nextPhotos = [...(session.Photos ?? []), ...uploadedUrls];
  const shouldPreservePendingState =
    session.Comments_Custom_1?.startsWith(FINISH_PENDING_PREFIX) ||
    isDiagonalPhotoMeasureFlow(session.Comments_Custom_1);
  const nextPhotoState = shouldPreservePendingState
    ? session.Comments_Custom_1
    : photoBatchMarker();

  await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      Photos: nextPhotos,
      Comments_Custom_1: nextPhotoState,
    },
  });

  logZtcSession("completed_work_photo_saved", {
    session: {
      ...session,
      Photos: nextPhotos,
    },
    worker,
    details: { photoUrls: uploadedUrls, photoCount: uploadedUrls.length, caption },
  });

  await Promise.all(
    uploadedUrls.map((publicUrl) =>
      saveCompletedWorkPhoto({
        worker,
        publicUrl,
        session,
      }),
    ),
  );

  if (session.Comments_Custom_1?.startsWith(FINISH_PENDING_PREFIX)) {
    const finishPayload = readFinishPendingPayload(session.Comments_Custom_1);

    await finishSessionOrAskTlDiagonals({
      session: {
        ...session,
        Photos: nextPhotos,
      },
      to,
      completedWork: {
        isGibberish: false,
        isFinish: true,
        isAdditionalWork: false,
        additionalWorkDescription: null,
        additionalDetails: finishPayload.additionalDetails ?? [],
        workOption: session.Works,
        amountCompleted: null,
        units: null,
        issue: null,
      },
      completedText: finishPayload.completedText,
    });
    return;
  }

  if (session.Comments_Custom_1?.startsWith(DIAGONALS_PENDING_PREFIX)) {
    await sendZtcMessage(to, "Foto saņemts. Lūdzu, atsūtiet 2 rāmja diagonāļu mērījumus.");
    return;
  }

  if (session.Comments_Custom_1?.startsWith(DIAGONALS_CONFIRM_PREFIX)) {
    const rawPayload = readMarkerPayload(session.Comments_Custom_1, DIAGONALS_CONFIRM_PREFIX);
    const payload = parseJsonObject<{ diagonalA: number; diagonalB: number }>(rawPayload, {
      diagonalA: 0,
      diagonalB: 0,
    });
    await sendZtcMessage(to, `Foto saņemts. Lūdzu, apstipriniet diagonāļu mērījumus ${payload.diagonalA} un ${payload.diagonalB} ar "jā" vai "nē".`);
    return;
  }

  if (caption.trim()) {
    await handleWorkText({ text: caption, to, worker });
    return;
  }

  if (alreadyConfirmedPhotoBatch) {
    logZtcSession("completed_work_photo_confirmation_suppressed", {
      session: {
        ...session,
        Photos: nextPhotos,
      },
      worker,
      details: { addedPhotoCount: uploadedUrls.length },
    });
    return;
  }

  await sendZtcMessage(
    to,
    `Saņemti ${uploadedUrls.length} pabeigta darba foto darbam: ${formatSessionWork(session) || "darbs"}. Lūdzu, atsūtiet balss ziņu vai tekstu, ka darbs ir pabeigts.`,
  );
}

export async function handleZtcWorkerRoute(args: {
  formData: FormData;
  worker: ZtcWorker;
  drawingProfile?: ProductionDrawingExtractionProfile;
}) {
  const startedAt = Date.now();
  const { formData, worker } = args;
  const from = getString(formData, "From");
  const body = (getString(formData, "Body") || "").trim();
  const numMedia = Number(getString(formData, "NumMedia") || "0") || 0;
  const imageIndexes = findMediaIndexes(formData, numMedia, "image/");
  const imageIdx = imageIndexes[0] ?? -1;
  const audioIdx = findFirstMediaIndex(formData, numMedia, "audio/");
  let outcome = "started";

  try {
    if (imageIndexes.length > 0) {
      const openSession = await getOpenZtcSession(worker);
      if (openSession?.Works) {
        outcome = "finished_photo";
        await handleFinishedPhoto({ formData, idxs: imageIndexes, to: from, worker, caption: body });
      } else if (await appendPhotosToRecentCompletedSession({ formData, idxs: imageIndexes, worker, caption: body })) {
        // Multi-image completion upload, or a caption explicitly saying this is an extra photo.
        outcome = "appended_recent_completed_photos";
      } else {
        outcome = "drawing_photo";
        await handleDrawingPhoto({
          formData,
          idx: imageIdx,
          to: from,
          worker,
          drawingProfile: args.drawingProfile,
        });
      }
      return;
    }

    if (audioIdx >= 0) {
      await sendZtcMessage(from, "Balss ziņa saņemta, lūdzu uzgaidiet...");
      const transcript = await transcribeAudioWithSource(formData, audioIdx);
      await handleWorkText({
        text: transcript.text,
        to: from,
        worker,
        originalAudioUrl: transcript.originalAudioUrl,
      });
      outcome = "audio_work_text";
      return;
    }

    if (body) {
      await handleWorkText({ text: body, to: from, worker });
      outcome = "body_work_text";
      return;
    }

    outcome = "empty_message";
    await sendZtcMessage(from, "Lūdzu, atsūtiet rasējuma foto, balss ziņu, tekstu vai pabeigta darba foto.");
  } catch (error) {
    outcome = "error";
    console.error("[ZTC workflow] failed", error);
    if (isZtcTimeoutError(error)) {
      logZtcSession("workflow_timeout", {
        worker,
        details: {
          message: error instanceof Error ? error.message : String(error),
          imageIdx,
          audioIdx,
          hasBody: Boolean(body),
        },
      });
      await sendZtcMessage(
        from,
        imageIdx >= 0
          ? "Tīkla vai foto apstrādes kļūda. Lūdzu, atsūtiet foto vēlreiz."
          : "Ziņas apstrāde aizņēma pārāk ilgu laiku. Lūdzu, mēģiniet vēlreiz pēc brīža.",
      );
      return;
    }

    await sendZtcMessage(
      from,
      imageIdx >= 0
        ? "Tīkla vai foto apstrādes kļūda. Lūdzu, atsūtiet foto vēlreiz."
        : "Atvainojiet, ražošanas plūsma nevarēja apstrādāt šo ziņu. Lūdzu, mēģiniet vēlreiz.",
    );
  } finally {
    logZtcTiming("handle_ztc_worker_route_total", startedAt, {
      workerId: worker.id,
      outcome,
      numMedia,
      imageCount: imageIndexes.length,
      hasAudio: audioIdx >= 0,
      hasBody: Boolean(body),
    });
  }
}
