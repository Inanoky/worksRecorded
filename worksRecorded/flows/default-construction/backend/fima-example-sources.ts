import type { Prisma } from "@prisma/client";
import {
	isFimaBisWorkRecordLink,
	readFimaBisRecordLinks,
} from "@/lib/fima/bis-record-links";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import type {
	FimaExampleSource,
	FimaExampleSources,
} from "@/lib/fima/example-sources";
import { prisma } from "@/lib/utils/db";

export function buildFimaExampleSourceWhere(
	organizationId: string,
	bisIds: string[],
): Prisma.sitediaryrecordsWhereInput {
	return {
		archivedAt: null,
		Site: {
			organizationId,
			siteDiaryRecordsMap: {
				path: ["otherSettings", "fimaCollaboration"],
				equals: true,
			},
		},
		OR: [
			{ BISId: { in: bisIds } },
			...bisIds.flatMap((id) => [
				{
					evalMetadata: {
						path: ["kuceImport", "bisLinks"],
						array_contains: [{ id }],
					},
				},
				...(Number.isSafeInteger(Number(id))
					? [
							{
								evalMetadata: {
									path: ["kuceImport", "bisLinks"],
									array_contains: [{ id: Number(id) }],
								},
							},
						]
					: []),
			]),
		],
	};
}

export async function withFimaExampleSources<
	T extends { fimaCollaboration?: FimaCollaboration },
>(
	organizationId: string,
	rows: T[],
): Promise<(T & { fimaExampleSources?: FimaExampleSources })[]> {
	const ids = [
		...new Set(
			rows.flatMap(
				(row) =>
					row.fimaCollaboration?.examples?.entries.map((entry) => entry.id) ??
					[],
			),
		),
	].filter((id) => /^\d+$/.test(id));
	if (!ids.length) return rows;
	const records = await prisma.sitediaryrecords.findMany({
		where: buildFimaExampleSourceWhere(organizationId, ids),
		select: {
			id: true,
			siteId: true,
			fimaNumber: true,
			Works: true,
			BISId: true,
			evalMetadata: true,
		},
		orderBy: [{ fimaNumber: "asc" }, { id: "asc" }],
	});
	const sources: FimaExampleSources = Object.fromEntries(
		ids.map((id) => [id, []]),
	);
	for (const record of records) {
		if (!record.siteId) continue;
		const source: FimaExampleSource = {
			id: record.id,
			siteId: record.siteId,
			fimaNumber: record.fimaNumber,
			work: record.Works ?? "",
		};
		const linkedIds = new Set([
			...readFimaBisRecordLinks(record.evalMetadata)
				.filter(isFimaBisWorkRecordLink)
				.map((link) => link.id),
			...(record.BISId ? [record.BISId] : []),
		]);
		for (const id of linkedIds) if (sources[id]) sources[id].push(source);
	}
	return rows.map((row) => ({
		...row,
		...(row.fimaCollaboration?.examples?.entries.length
			? {
					fimaExampleSources: Object.fromEntries(
						row.fimaCollaboration.examples.entries.map((entry) => [
							entry.id,
							sources[entry.id] ?? [],
						]),
					),
				}
			: {}),
	}));
}
