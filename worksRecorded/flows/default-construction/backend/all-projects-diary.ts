import type { Prisma } from "@prisma/client";

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
  originalUserComment: true,
  originalAudioUrl: true,
  Site: { select: { name: true, siteDiaryRecordsMap: true } },
} satisfies Prisma.sitediaryrecordsSelect;

type AllProjectsDiaryDatabaseRecord = Prisma.sitediaryrecordsGetPayload<{
  select: typeof allProjectsDiaryRecordSelect;
}>;

function addActualCosts(
  records: AllProjectsDiaryDatabaseRecord[],
  organizationId: string,
) {
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
      ...record
    }) => {
      const calculatorKey = record.siteId ?? "__default__";
      let calculateCost = calculatorBySite.get(calculatorKey);
      if (!calculateCost) {
        const siteConfig =
          Site?.siteDiaryRecordsMap &&
          typeof Site.siteDiaryRecordsMap === "object" &&
          !Array.isArray(Site.siteDiaryRecordsMap)
            ? (Site.siteDiaryRecordsMap as Record<string, unknown>)
            : (defaultConfig as Record<string, unknown>);
        calculateCost =
          createDefaultConstructionRecordCostCalculator(siteConfig);
        calculatorBySite.set(calculatorKey, calculateCost);
      }

      const quantityComparison = getDefaultConstructionQuantityComparison(
        record,
        Site?.siteDiaryRecordsMap as Record<string, any> | null,
      );

      return {
        ...record,
        sbPlan:
          organizationId === SB_STOMME_ORGANIZATION_ID
            ? readSbPlan({ Works_Custom_1, Works_Custom_2, Comments_Custom_2 })
            : null,
        Site: Site ? { name: Site.name } : null,
        actualCost: calculateCost(record).actualCost,
        quantityPlanFactEnabled: quantityComparison.enabled,
        plannedAmount: quantityComparison.plannedAmount,
        actualAmount: quantityComparison.actualAmount,
        quantityComparisonStatus: quantityComparison.status,
      };
    },
  );
}

export type AllProjectsDiaryFilters = {
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
): Prisma.sitediaryrecordsWhereInput {
  const projectId = normalizedText(filters.projectId);
  const keyword = normalizedText(filters.keyword);
  const dateFrom = parseDateOnly(filters.dateFrom);
  const dateTo = parseDateOnly(filters.dateTo);
  const dateFilter: Prisma.DateTimeNullableFilter = {};

  if (dateFrom) dateFilter.gte = dateFrom;
  if (dateTo) dateFilter.lt = nextUtcDay(dateTo);

  return {
    archivedAt: null,
    Site: { organizationId },
    ...(projectId ? { siteId: projectId } : {}),
    ...(Object.keys(dateFilter).length ? { Date: dateFilter } : {}),
    ...(keyword
      ? {
          OR: [
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
  const where = buildAllProjectsDiaryWhere(organizationId, filters);
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
    projects: projects.map(({ siteDiaryRecordsMap: _, ...project }) => project),
    records: addActualCosts(records, organizationId),
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
  const records = await prisma.sitediaryrecords.findMany({
    where: buildAllProjectsDiaryWhere(organizationId, filters),
    orderBy: allProjectsDiaryOrderBy,
    select: allProjectsDiaryRecordSelect,
  });

  return addActualCosts(records, organizationId);
}
