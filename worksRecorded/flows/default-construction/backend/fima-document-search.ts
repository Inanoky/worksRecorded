import { Prisma } from "@prisma/client";
import {
	createFimaActCoverageReader,
	type FimaActCoverageIndex,
} from "@/lib/fima/acceptance-acts";
import { readFimaBisRecordLinks } from "@/lib/fima/bis-record-links";
import { prisma } from "@/lib/utils/db";
import { fimaBisLinkMetadataSql } from "./fima-bis-link-projection";

export function buildFimaDocumentKeywordWhere(
	keyword: string,
	recordIds: string[] = [],
): Prisma.sitediaryrecordsWhereInput[] {
	const contains = { contains: keyword, mode: "insensitive" as const };
	return [
		...(recordIds.length ? [{ id: { in: recordIds } }] : []),
		{
			Site: {
				siteDiaryRecordsMap: {
					path: ["otherSettings", "fimaCollaboration"],
					equals: true,
				},
				OR: [{ bisCaseId: contains }, { bisCaseNumber: contains }],
			},
		},
	];
}

export async function findFimaDocumentRecordIds(
	organizationId: string,
	keyword?: string,
	projectId?: string,
) {
	const needle = keyword?.trim().toLowerCase();
	if (!needle || /^fima\s*[-#]?\s*\d+$/.test(needle)) return [];
	const projects = await prisma.$queryRaw<
		{
			id: string;
			bisCaseId: string | null;
			coverage: FimaActCoverageIndex | null;
		}[]
	>`
		SELECT id, "bisCaseId", "siteDiaryRecordsMap" #> '{otherSettings,fimaBisActCoverage}' AS coverage
		FROM public."Site"
		WHERE "organizationId" = ${organizationId}
		AND "siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb
		AND (${projectId ?? null}::text IS NULL OR id = ${projectId ?? null})
	`;
	if (!projects.length) return [];
	const numeric = /^\d+$/.test(needle);
	const readers = new Map(
		projects.map((project) => [
			project.id,
			createFimaActCoverageReader(
				{ otherSettings: { fimaBisActCoverage: project.coverage } },
				project.bisCaseId,
			),
		]),
	);
	if (
		!numeric &&
		!projects.some((project) =>
			project.coverage?.acts?.some((act) =>
				act.number?.toLowerCase().includes(needle),
			),
		)
	)
		return [];
	const rows = await prisma.$queryRaw<
		{ id: string; siteId: string; BISId: string | null; metadata: unknown }[]
	>(Prisma.sql`
		SELECT r.id, r."siteId", r."BISId",
		(${fimaBisLinkMetadataSql}) AS metadata
		FROM public.sitediaryrecords r JOIN public."Site" s ON s.id = r."siteId"
		WHERE s."organizationId" = ${organizationId} AND r."archivedAt" IS NULL
		AND r."siteId" IN (${Prisma.join(projects.map((project) => project.id))})
		AND s."siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb
	`);
	return rows
		.filter((row) => {
			const links = readFimaBisRecordLinks(row.metadata, row.BISId);
			return (
				(numeric &&
					links.some((link) => (link.number ?? link.id).includes(needle))) ||
				readers
					.get(row.siteId)?.(links)
					?.acts.some((act) => act.number?.toLowerCase().includes(needle))
			);
		})
		.map((row) => row.id);
}
