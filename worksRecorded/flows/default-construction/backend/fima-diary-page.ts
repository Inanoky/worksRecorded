import type { Prisma } from "@prisma/client";
import { createFimaActCoverageReader } from "@/lib/fima/acceptance-acts";
import { readFimaBisRecordLinks } from "@/lib/fima/bis-record-links";
import { readFimaCollaboration } from "@/lib/fima/diary-collaboration";
import { summarizeFimaCollaboration } from "@/lib/fima/diary-list-summary";
import { parseFimaDiaryNumber } from "@/lib/fima/diary-number";
import {
	commonDiaryListSelect,
	mapCommonDiaryListRecord,
} from "@/lib/site-diary/list-record";
import { prisma } from "@/lib/utils/db";
import {
	type AllProjectsDiaryFilters,
	buildAllProjectsDiaryWhere,
} from "./all-projects-diary";
import { withFimaExampleSources } from "./fima-example-sources";

export type FimaPageFilters = AllProjectsDiaryFilters & {
	projectView?: boolean;
	workFilter?: string;
	floorFilter?: string;
};

export function buildFimaDiaryPageWhere(
	organizationId: string,
	filters: FimaPageFilters,
): Prisma.sitediaryrecordsWhereInput {
	const where: Prisma.sitediaryrecordsWhereInput = {
		...buildAllProjectsDiaryWhere(organizationId, filters),
		Site: {
			organizationId,
			siteDiaryRecordsMap: {
				path: ["otherSettings", "fimaCollaboration"],
				equals: true,
			},
		},
		...(filters.workFilter && filters.workFilter !== "__ALL__"
			? { Works: filters.workFilter }
			: {}),
		...(filters.floorFilter && filters.floorFilter !== "__ALL__"
			? { Location: filters.floorFilter }
			: {}),
	};
	if (filters.projectView && filters.keyword?.trim()) {
		const contains = {
			contains: filters.keyword.trim(),
			mode: "insensitive" as const,
		};
		const fimaNumber = parseFimaDiaryNumber(filters.keyword);
		where.OR = [
			...(fimaNumber !== null ? [{ fimaNumber }] : []),
			...[
				"Works",
				"Works_Custom_1",
				"Works_Custom_2",
				"Location",
				"Location_Custom_1",
				"Location_Custom_2",
				"Comments",
				"Comments_Custom_1",
				"Comments_Custom_2",
				"Units",
				"originalUserComment",
			].map((field) => ({ [field]: contains })),
			{
				User: { is: { OR: [{ firstName: contains }, { lastName: contains }] } },
			},
			{ Worker: { is: { OR: [{ name: contains }, { surname: contains }] } } },
		];
	}
	return where;
}

export async function loadFimaDiaryPage(
	organizationId: string,
	filters: FimaPageFilters,
) {
	const pageSize = filters.projectView ? 75 : 50;
	const requestedPage =
		Number.isSafeInteger(filters.page) && Number(filters.page) > 0
			? Number(filters.page)
			: 1;
	const where = buildFimaDiaryPageWhere(organizationId, filters);
	const orderBy: Prisma.sitediaryrecordsOrderByWithRelationInput[] = [
		filters.projectView
			? { Date: "desc" }
			: { Date: { sort: "desc", nulls: "last" } },
		{ createdAt: "desc" },
		{ id: "desc" },
	];
	const findPage = (page: number) =>
		prisma.sitediaryrecords.findMany({
			where,
			orderBy,
			skip: (page - 1) * pageSize,
			take: pageSize,
			select: {
				...commonDiaryListSelect,
				fimaNumber: true,
				siteId: true,
				evalMetadata: true,
				Site: { select: { name: true, bisCaseId: true, bisCaseNumber: true } },
			},
		});
	const [requestedRecords, totalCount] = await Promise.all([
		findPage(requestedPage),
		prisma.sitediaryrecords.count({ where }),
	]);
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
	const page = Math.min(requestedPage, totalPages);
	const records =
		page === requestedPage ? requestedRecords : await findPage(page);
	const sites = records.length
		? await prisma.site.findMany({
				where: {
					organizationId,
					id: {
						in: [
							...new Set(
								records.flatMap((record) =>
									record.siteId ? [record.siteId] : [],
								),
							),
						],
					},
				},
				select: { id: true, bisCaseId: true, siteDiaryRecordsMap: true },
			})
		: [];
	const actReaders = new Map(
		sites.map((site) => [
			site.id,
			createFimaActCoverageReader(site.siteDiaryRecordsMap, site.bisCaseId),
		]),
	);
	const rows = records.map(
		({ evalMetadata, Site, User, Worker, ...record }) => {
			const fimaBisRecords = readFimaBisRecordLinks(evalMetadata, record.BISId);
			const key = record.siteId ?? "";
			const readActs = actReaders.get(key);
			return {
				...(filters.projectView
					? mapCommonDiaryListRecord({ ...record, User, Worker })
					: record),
				id: record.id,
				fimaNumber: record.fimaNumber,
				siteId: record.siteId,
				Site: Site ? { name: Site.name } : null,
				bisCaseId: Site?.bisCaseId ?? null,
				bisCaseNumber: Site?.bisCaseNumber ?? null,
				fimaBisRecords,
				fimaActCoverage: readActs?.(fimaBisRecords),
				hasFimaBisReferences: fimaBisRecords.length > 0,
				fimaCollaboration: summarizeFimaCollaboration(
					readFimaCollaboration(evalMetadata),
				),
			};
		},
	);
	return {
		rows: await withFimaExampleSources(organizationId, rows),
		page,
		pageSize,
		totalCount,
		totalPages,
	};
}
