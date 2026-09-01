import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/utils/db";

export const ALL_PROJECTS_DIARY_PAGE_SIZE = 50;

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
			orderBy: [
				{ Date: { sort: "desc", nulls: "last" } },
				{ createdAt: "desc" },
				{ id: "desc" },
			],
			skip,
			take: ALL_PROJECTS_DIARY_PAGE_SIZE,
			select: {
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
				Site: { select: { name: true } },
			},
		}),
		prisma.sitediaryrecords.count({ where }),
	]);

	return {
		projects,
		records,
		page,
		pageSize: ALL_PROJECTS_DIARY_PAGE_SIZE,
		totalCount,
		totalPages: Math.max(
			1,
			Math.ceil(totalCount / ALL_PROJECTS_DIARY_PAGE_SIZE),
		),
	};
}
