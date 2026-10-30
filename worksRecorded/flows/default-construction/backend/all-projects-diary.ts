import { readFimaBisRecordLinks } from "@/lib/fima/bis-record-links";
import type { FimaDiaryFilters } from "@/lib/fima/diary-filters";
import { parseFimaDiaryNumber } from "@/lib/fima/diary-number";
import { createFimaActCoverageReader } from "@/lib/fima/acceptance-acts";
import { buildFimaDiaryFilterWhere } from "./fima-diary-filters";
import { buildFimaDocumentKeywordWhere, findFimaDocumentRecordIds } from "./fima-document-search";
import { withFimaExampleSources } from "./fima-example-sources";
import type { Prisma } from "@prisma/client";

import { isFimaDiary, readFimaCollaboration } from "@/lib/fima/diary-collaboration";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import { getDiaryImagePageRange } from "../lib/diary-image-pages";
import {
  hasInlineDiaryPhotos,
  normalizeDiaryPhotoUrls,
} from "../lib/diary-photos";
import {
  getDefaultConstructionQuantityComparison,
  hasDefaultConstructionQuantityProfile,
} from "@/flows/default-construction/lib/quantity-plan-actual";
import { createDefaultConstructionRecordCostCalculator } from "@/flows/default-construction/lib/site-diary-productivity-settings";
import { prisma } from "@/lib/utils/db";
import {
  readSbPlan,
  SB_STOMME_ORGANIZATION_ID,
} from "../sb-stomme-inline-plan/model";

export const ALL_PROJECTS_DIARY_PAGE_SIZE = 50;

const allProjectsDiaryOrderBy = [
  { Date: { sort: "desc", nulls: "last" } },
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.sitediaryrecordsOrderByWithRelationInput[];

const allProjectsDiaryRecordSelect = {
  id: true,
  fimaNumber: true,
  siteId: true,
  Date: true,
  createdAt: true,
  Location: true,
  Works: true,
  Units: true,
  Amounts: true,
  WorkersInvolved: true,
  TimeInvolved: true,
  Comments: true,
  Photos: true,
  Comments_Custom_1: true,
  Comments_Custom_2: true,
  Works_Custom_1: true,
  Works_Custom_2: true,
  BISId: true,
  bisStatus: true,
  evalMetadata: true,
  originalUserComment: true,
  originalAudioUrl: true,
  Site: { select: { name: true, bisCaseId: true, bisCaseNumber: true } },
} satisfies Prisma.sitediaryrecordsSelect;

type AllProjectsDiaryDatabaseRecord = Prisma.sitediaryrecordsGetPayload<{
  select: typeof allProjectsDiaryRecordSelect;
}>;

function addActualCosts(
  records: AllProjectsDiaryDatabaseRecord[],
  organizationId: string,
  sites: { id: string; siteDiaryRecordsMap: unknown }[],
) {
  const configs = new Map(sites.map((site) => [site.id, site.siteDiaryRecordsMap]));
  const actReaders = new Map<
    string,
    ReturnType<typeof createFimaActCoverageReader>
  >();
  const calculatorBySite = new Map<
    string,
    ReturnType<typeof createDefaultConstructionRecordCostCalculator>
  >();

  return records.map(
    ({
      Site,
      Works_Custom_1,
      Works_Custom_2,
      Comments_Custom_2,
      evalMetadata,
      bisStatus,
      ...record
    }) => {
      const calculatorKey = record.siteId ?? "__default__";
      const config = configs.get(calculatorKey);
      let calculateCost = calculatorBySite.get(calculatorKey);
      if (!calculateCost) {
        const siteConfig =
          config &&
          typeof config === "object" &&
          !Array.isArray(config)
            ? (config as Record<string, unknown>)
            : (defaultConfig as Record<string, unknown>);
        calculateCost =
          createDefaultConstructionRecordCostCalculator(siteConfig);
        calculatorBySite.set(calculatorKey, calculateCost);
      }

      const quantityComparison = getDefaultConstructionQuantityComparison(
        record,
        config as Record<string, any> | null,
      );

      const fimaBisRecords = readFimaBisRecordLinks(evalMetadata, record.BISId);
      let readActs = actReaders.get(calculatorKey);
      if (!readActs) {
        readActs = createFimaActCoverageReader(config, Site?.bisCaseId);
        actReaders.set(calculatorKey, readActs);
      }

      return {
        ...record,
        ...(isFimaDiary(config) ? {
          bisStatus,
          Works_Custom_1,
          Works_Custom_2,
          hasFimaBisReferences: fimaBisRecords.length > 0,
          fimaBisRecords,
          fimaActCoverage: readActs(fimaBisRecords),
          fimaCollaboration: readFimaCollaboration(evalMetadata),
          bisCaseId: Site?.bisCaseId ?? null,
          bisCaseNumber: Site?.bisCaseNumber ?? null,
        } : {}),
        sbPlan:
          organizationId === SB_STOMME_ORGANIZATION_ID
            ? readSbPlan({ Works_Custom_1, Works_Custom_2, Comments_Custom_2 })
            : null,
        Site: Site ? { name: Site.name } : null,
        actualCost: calculateCost({ ...record, evalMetadata }).actualCost,
        quantityPlanFactEnabled: quantityComparison.enabled,
        plannedAmount: quantityComparison.plannedAmount,
        actualAmount: quantityComparison.actualAmount,
        quantityComparisonStatus: quantityComparison.status,
      };
    },
  );
}

export type AllProjectsDiaryFilters = FimaDiaryFilters & {
  page?: number;
  projectId?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
};

function normalizedText(value: string | undefined) {
  const text = value?.trim();
  return text || undefined;
}

function normalizedPage(value: number | undefined) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 1;
}

function parseDateOnly(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function nextUtcDay(value: Date) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function buildAllProjectsDiaryWhere(
  organizationId: string,
  filters: AllProjectsDiaryFilters,
  documentRecordIds: string[] = [],
): Prisma.sitediaryrecordsWhereInput {
  const projectId = normalizedText(filters.projectId);
  const keyword = normalizedText(filters.keyword);
  const fimaNumber = parseFimaDiaryNumber(keyword);
  const dateFrom = parseDateOnly(filters.dateFrom);
  const dateTo = parseDateOnly(filters.dateTo);
  const dateFilter: Prisma.DateTimeNullableFilter = {};
  const fimaFilters = buildFimaDiaryFilterWhere(filters);

  if (dateFrom) dateFilter.gte = dateFrom;
  if (dateTo) dateFilter.lt = nextUtcDay(dateTo);

  return {
    archivedAt: null,
    Site: { organizationId },
    ...(fimaFilters.length ? { AND: fimaFilters } : {}),
    ...(projectId ? { siteId: projectId } : {}),
    ...(Object.keys(dateFilter).length ? { Date: dateFilter } : {}),
    ...(keyword
      ? {
          OR: [
            ...buildFimaDocumentKeywordWhere(keyword, documentRecordIds),
            ...(fimaNumber !== null ? [{ fimaNumber }] : []),
            ...(organizationId === SB_STOMME_ORGANIZATION_ID
              ? [
                  {
                    Works_Custom_1: {
                      contains: keyword,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    Works_Custom_2: {
                      contains: keyword,
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : []),
            { Works: { contains: keyword, mode: "insensitive" } },
            { Location: { contains: keyword, mode: "insensitive" } },
            { Comments: { contains: keyword, mode: "insensitive" } },
            {
              originalUserComment: {
                contains: keyword,
                mode: "insensitive",
              },
            },
            { Site: { name: { contains: keyword, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function loadAllProjectsDiary(
  organizationId: string,
  filters: AllProjectsDiaryFilters = {},
) {
  const page = normalizedPage(filters.page);
  const pageSize = hasInlineDiaryPhotos(organizationId) ? 30 : ALL_PROJECTS_DIARY_PAGE_SIZE;
  const documentRecordIds = await findFimaDocumentRecordIds(organizationId, filters.keyword, filters.projectId);
  const where = buildAllProjectsDiaryWhere(organizationId, filters, documentRecordIds);
  const skip = (page - 1) * pageSize;

  const [projects, records, totalCount, photoRecords] = await Promise.all([
    prisma.site.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, siteDiaryRecordsMap: true },
    }),
    prisma.sitediaryrecords.findMany({
      where,
      orderBy: allProjectsDiaryOrderBy,
      skip,
      take: pageSize,
      select: allProjectsDiaryRecordSelect,
    }),
    prisma.sitediaryrecords.count({ where }),
    hasInlineDiaryPhotos(organizationId)
      ? prisma.sitediaryrecords.findMany({
          where,
          orderBy: allProjectsDiaryOrderBy,
          ...getDiaryImagePageRange(page, pageSize),
          select: { Photos: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    fimaCollaborationEnabled: projects.some((project) => isFimaDiary(project.siteDiaryRecordsMap)),
    projects: projects.map(({ siteDiaryRecordsMap: _, ...project }) => project),
    records: await withFimaExampleSources(organizationId, addActualCosts(records, organizationId, projects)),
    photoUrls: normalizeDiaryPhotoUrls(
      photoRecords.flatMap((record) => record.Photos ?? []),
    ).sort(),
    quantityPlanFactEnabled: projects.some((project) =>
      hasDefaultConstructionQuantityProfile(
        project.siteDiaryRecordsMap as Record<string, any> | null,
      ),
    ),
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(
      1,
      Math.ceil(totalCount / pageSize),
    ),
  };
}

export async function loadAllProjectsDiaryExportRecords(
  organizationId: string,
  filters: AllProjectsDiaryFilters = {},
) {
  const documentRecordIds = await findFimaDocumentRecordIds(organizationId, filters.keyword, filters.projectId);
  const records = await prisma.sitediaryrecords.findMany({
    where: buildAllProjectsDiaryWhere(organizationId, filters, documentRecordIds),
    orderBy: allProjectsDiaryOrderBy,
    select: allProjectsDiaryRecordSelect,
  });

  const sites = records.length ? await prisma.site.findMany({
    where: { organizationId, id: { in: [...new Set(records.flatMap(record => record.siteId ? [record.siteId] : []))] } },
    select: { id: true, siteDiaryRecordsMap: true },
  }) : [];
  return addActualCosts(records, organizationId, sites);
}
