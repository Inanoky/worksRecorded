import { Prisma } from "@prisma/client";
import {
	actChoices,
	allocateFimaActNumbers,
	type FimaActDiaryRecord,
	type FimaActRegister,
	type FimaActSite,
	type FimaActsData,
	fimaActWorkScope,
	makeFimaActRows,
	readFimaActRegister,
	readTrackedFimaActs,
} from "@/lib/fima/act-register";
import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { prisma } from "@/lib/utils/db";
import { fimaBisLinkMetadataSql } from "./fima-bis-link-projection";

type Database = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
export async function loadFimaActRecords(
	db: Database,
	organizationId: string,
	siteId?: string,
) {
	return db.$queryRaw<FimaActDiaryRecord[]>(Prisma.sql`
		SELECT r.id, r."siteId", r."fimaNumber", r."BISId", r."Date"::text AS "Date", r."Works", r."Works_Custom_1", r."Location", r."Amounts", r."Units", r."bisStatus",
		(${fimaBisLinkMetadataSql}) AS metadata, r."evalMetadata" -> 'fimaBisActDraftLinks' AS drafts
		FROM public.sitediaryrecords r JOIN public."Site" s ON s.id = r."siteId"
		WHERE s."organizationId" = ${organizationId} ${siteId ? Prisma.sql`AND s.id = ${siteId}` : Prisma.empty} AND r."archivedAt" IS NULL
		AND s."siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb
	`);
}
export async function loadFimaActSites(db: Database, organizationId: string) {
	return db.$queryRaw<FimaActSite[]>`
		SELECT id, name, "bisCaseId", jsonb_build_object('otherSettings', jsonb_build_object('fimaBisActCoverage', "siteDiaryRecordsMap" #> '{otherSettings,fimaBisActCoverage}')) AS config
		FROM public."Site" WHERE "organizationId" = ${organizationId}
		AND "siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb
	`;
}
export async function lockFimaActSite(
	db: Database,
	organizationId: string,
	siteId: string,
) {
	const sites = await db.$queryRaw<FimaActSite[]>`
		SELECT id, name, "bisCaseId", "siteDiaryRecordsMap" AS config FROM public."Site"
		WHERE id = ${siteId} AND "organizationId" = ${organizationId}
		AND "siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb FOR UPDATE
	`;
	if (!sites[0]?.bisCaseId)
		throw new Error("FIMA akti šajā projektā nav pieejami.");
	return sites[0];
}
export async function saveFimaActRegister(
	db: Database,
	organizationId: string,
	siteId: string,
	register: FimaActRegister,
) {
	const count = await db.$executeRaw`
		UPDATE public."Site" SET "siteDiaryRecordsMap" = jsonb_set("siteDiaryRecordsMap", '{otherSettings,fimaActRegister}', ${JSON.stringify(register)}::jsonb, true), "updatedAt" = NOW()
		WHERE id = ${siteId} AND "organizationId" = ${organizationId} AND "siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb
	`;
	if (count !== 1) throw new Error("Neizdevās saglabāt aktu reģistru.");
}
export async function ensureFimaActNumbers(
	organizationId: string,
	siteId: string,
	observed: { caseId: string; keys: string[] },
) {
	return prisma.$transaction(async (db) => {
		const site = await lockFimaActSite(db, organizationId, siteId);
		if (site.bisCaseId !== observed.caseId)
			throw new Error("Projekta BIS lieta ir mainīta. Atjaunojiet datus.");
		const records = await loadFimaActRecords(db, organizationId, siteId);
		const acts = readTrackedFimaActs(site, records);
		const before = readFimaActRegister(site.config);
		const register = allocateFimaActNumbers(before, [
			...observed.keys,
			...acts.map((act) => act.key),
		]);
		if (register.nextNumber !== before.nextNumber)
			await saveFimaActRegister(db, organizationId, siteId, register);
		return register;
	});
}
export async function loadFimaActs(
	organizationId: string,
	siteId: string,
	options: { assignNumbers?: boolean } = {},
): Promise<FimaActsData | null> {
	const site = await prisma.site.findFirst({
		where: { id: siteId, organizationId },
		select: {
			id: true,
			name: true,
			bisCaseId: true,
			siteDiaryRecordsMap: true,
		},
	});
	if (!site?.bisCaseId || !isFimaDiary(site.siteDiaryRecordsMap)) return null;
	const current = { ...site, config: site.siteDiaryRecordsMap };
	const [allRecords, sites] = await Promise.all([
		loadFimaActRecords(prisma, organizationId),
		loadFimaActSites(prisma, organizationId),
	]);
	const records = allRecords.filter((record) => record.siteId === siteId);
	const acts = readTrackedFimaActs(current, records);
	const register = options.assignNumbers
		? await ensureFimaActNumbers(organizationId, siteId, {
				caseId: site.bisCaseId,
				keys: acts.map((act) => act.key),
			})
		: allocateFimaActNumbers(
				readFimaActRegister(current.config),
				acts.map((act) => act.key),
			);
	const sources = sites.map((source) => ({
		site: source,
		acts:
			source.id === siteId
				? acts
				: readTrackedFimaActs(
						source,
						allRecords.filter((record) => record.siteId === source.id),
					),
	}));
	const choices = sources.flatMap((source) =>
		actChoices(source.site, source.acts),
	);
	const references = sources.flatMap((source) =>
		source.site.bisCaseId
			? source.acts.map((act) => ({
					...fimaActWorkScope(source.site.id, act),
					caseId: source.site.bisCaseId as string,
					collection: act.collection,
					id: act.id,
				}))
			: [],
	);
	const index = (
		site.siteDiaryRecordsMap as {
			otherSettings?: {
				fimaBisActCoverage?: { fetchedAt?: string; caseId?: string };
			};
		}
	)?.otherSettings?.fimaBisActCoverage;
	return {
		siteId,
		siteName: site.name,
		caseId: site.bisCaseId,
		checkedAt:
			index?.caseId === site.bisCaseId ? (index.fetchedAt ?? null) : null,
		rows: makeFimaActRows(siteId, acts, register, choices),
		choices,
		references,
	};
}
