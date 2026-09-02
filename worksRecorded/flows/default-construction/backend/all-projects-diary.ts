import type { Prisma } from "@prisma/client";

import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import { createDefaultConstructionRecordCostCalculator } from "@/flows/default-construction/lib/site-diary-productivity-settings";
import { prisma } from "@/lib/utils/db";

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
	originalUserComment: true,
	originalAudioUrl: true,
	Site: { select: { name: true, siteDiaryRecordsMap: true } },
} satisfies Prisma.sitediaryrecordsSelect;

type AllProjectsDiaryDatabaseRecord = Prisma.sitediaryrecordsGetPayload<{
	select: typeof allProjectsDiaryRecordSelect;
}>;

function addActualCosts(records: AllProjectsDiaryDatabaseRecord[]) {
	const calculatorBySite = new Map<
		string,
		ReturnType<typeof createDefaultConstructionRecordCostCalculator>
	>();

	return records.map(({ Site, ...record }) => {
		const calculatorKey = record.siteId ?? "__default__";
		let calculateCost = calculatorBySite.get(calculatorKey);
		if (!calculateCost) {
			const siteConfig =
				Site?.siteDiaryRecordsMap &&
				typeof Site.siteDiaryRecordsMap === "object" &&
				!Array.isArray(Site.siteDiaryRecordsMap)
					? (Site.siteDiaryRecordsMap as Record<string, unknown>)
					: (defaultConfig as Record<string, unknown>);
			calculateCost = createDefaultConstructionRecordCostCalculator(siteConfig);
			calculatorBySite.set(calculatorKey, calculateCost);
		}

		return {
			...record,
			Site: Site ? { name: Site.name } : null,
			actualCost: calculateCost(record).actualCost,
		};
	});
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
	const where = buildAllProjectsDiaryWhere(organizationId, filters);
	const skip = (page - 1) * ALL_PROJECTS_DIARY_PAGE_SIZE;

	const [projects, records, totalCount] = await Promise.all([
		prisma.site.findMany({
			where: { organizationId },
			orderBy: { name: "asc" },
			select: { id: true, name: true },
		}),
		prisma.sitediaryrecords.findMany({
			where,
			orderBy: allProjectsDiaryOrderBy,
			skip,
			take: ALL_PROJECTS_DIARY_PAGE_SIZE,
			select: allProjectsDiaryRecordSelect,
		}),
		prisma.sitediaryrecords.count({ where }),
	]);

	return {
		projects,
		records: addActualCosts(records),
		page,
		pageSize: ALL_PROJECTS_DIARY_PAGE_SIZE,
		totalCount,
		totalPages: Math.max(
			1,
			Math.ceil(totalCount / ALL_PROJECTS_DIARY_PAGE_SIZE),
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

	return addActualCosts(records);
}
