import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { buildDefaultConstructionDiaryConfig } from "@/flows/default-construction/lib/diary-config";
import { createFimaActCoverageReader } from "@/lib/fima/acceptance-acts";
import {
	isFimaBisWorkRecordLink,
	readFimaBisRecordLinks,
} from "@/lib/fima/bis-record-links";
import type { FimaDiaryDelta } from "@/lib/fima/diary-workspace";
import { prisma } from "@/lib/utils/db";
import { loadFimaActRecords } from "./fima-acts";
import { fimaBisLinkMetadataSql } from "./fima-bis-link-projection";
import { loadFimaDiaryPage } from "./fima-diary-page";

const hash = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex");
type Database = Prisma.TransactionClient;
export async function readFimaDiaryManifest(
	db: Database,
	organizationId: string,
	siteId: string,
) {
	const site = await db.site.findFirst({
		where: {
			id: siteId,
			organizationId,
			siteDiaryRecordsMap: {
				path: ["otherSettings", "fimaCollaboration"],
				equals: true,
			},
		},
		select: {
			siteDiaryRecordsMap: true,
			bisCaseId: true,
			bisCaseNumber: true,
			organizationId: true,
		},
	});
	if (!site) throw new Error("Nav piekļuves FIMA projektam.");
	const [records, links] = await Promise.all([
		db.$queryRaw<
			{ id: string; version: string; examples: unknown }[]
		>`SELECT r.id,md5(jsonb_build_array(to_jsonb(r)-'evalMetadata',r."evalMetadata"->'fimaCollaboration',${fimaBisLinkMetadataSql},u."firstName",u."lastName",w.name,w.surname)::text) AS version,r."evalMetadata"#>'{fimaCollaboration,examples,entries}' AS examples FROM public.sitediaryrecords r JOIN public."Site" s ON s.id=r."siteId" LEFT JOIN public."User" u ON u.id=r."userId" LEFT JOIN public.workers w ON w.id=r."workerId" WHERE r."siteId"=${siteId} AND s."organizationId"=${organizationId} AND r."archivedAt" IS NULL ORDER BY r.id`,
		loadFimaActRecords(db, organizationId),
	]);
	const sourceMap = new Map<
		string,
		{ id: string; siteId: string; fimaNumber: number | null; work: string }[]
	>();
	const byId = new Map(links.map((row) => [row.id, row]));
	for (const record of links) {
		if (!record.siteId) continue;
		for (const id of new Set([
			...readFimaBisRecordLinks(record.metadata)
				.filter(isFimaBisWorkRecordLink)
				.map((link) => link.id),
			...(record.BISId ? [record.BISId] : []),
		])) {
			const sources = sourceMap.get(id) ?? [];
			sources.push({
				id: record.id,
				siteId: record.siteId,
				fimaNumber: record.fimaNumber,
				work: record.Works ?? "",
			});
			sourceMap.set(id, sources);
		}
	}
	for (const sources of sourceMap.values())
		sources.sort(
			(a, b) =>
				(a.fimaNumber ?? Infinity) - (b.fimaNumber ?? Infinity) ||
				a.id.localeCompare(b.id),
		);
	const readActs = createFimaActCoverageReader(
		site.siteDiaryRecordsMap,
		site.bisCaseId,
	);
	const versions = Object.fromEntries(
		records.map((record) => {
			const linked = byId.get(record.id);
			const examples = Array.isArray(record.examples)
				? (record.examples as { id: string }[])
				: [];
			return [
				record.id,
				hash([
					record.version,
					linked
						? readActs(readFimaBisRecordLinks(linked.metadata, linked.BISId))
						: null,
					examples.map((example) => sourceMap.get(example.id) ?? []),
				]),
			];
		}),
	);
	const raw = site.siteDiaryRecordsMap as Record<string, unknown>;
	const {
		fimaActRegister: _register,
		fimaBisActCoverage: _coverage,
		...otherSettings
	} = (raw.otherSettings ?? {}) as Record<string, unknown>;
	const config = buildDefaultConstructionDiaryConfig({
		...site,
		siteDiaryRecordsMap: { ...raw, otherSettings },
	});
	const configVersion = hash(config);
	return {
		revision: hash([configVersion, versions]),
		configVersion,
		versions,
		config,
	};
}
export async function getFimaDiaryRevision(
	organizationId: string,
	siteId: string,
) {
	return (await readFimaDiaryManifest(prisma, organizationId, siteId)).revision;
}
export async function loadFimaDiaryDelta(
	organizationId: string,
	siteId: string,
	known?: { versions: Record<string, string>; configVersion: string },
): Promise<FimaDiaryDelta> {
	return prisma.$transaction(
		async (db) => {
			const manifest = await readFimaDiaryManifest(db, organizationId, siteId);
			const ids = Object.keys(manifest.versions).filter(
				(id) => manifest.versions[id] !== known?.versions[id],
			);
			const rows = ids.length
				? (
						await loadFimaDiaryPage(
							organizationId,
							{ projectId: siteId, projectView: true },
							{ snapshot: true, ids, db },
						)
					).rows
				: [];
			return {
				siteId,
				revision: manifest.revision,
				configVersion: manifest.configVersion,
				versions: Object.fromEntries(
					ids.map((id) => [id, manifest.versions[id]]),
				),
				removed: Object.keys(known?.versions ?? {}).filter(
					(id) => !manifest.versions[id],
				),
				rows: rows as FimaDiaryDelta["rows"],
				...(known?.configVersion === manifest.configVersion
					? {}
					: { config: manifest.config }),
			};
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
			timeout: 60000,
		},
	);
}
