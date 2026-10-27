"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fetchFimaAcceptanceActCoverage } from "@/lib/bis/acceptance-act-coverage";
import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { prisma } from "@/lib/utils/db";
import {
	getBisBaseUrl,
	requireBisAccessTokenForSite,
} from "@/server/actions/BIS/service";
import { bisFetch } from "@/server/actions/BIS/TestBisEnv/relay";

export async function refreshFimaAcceptanceActs(siteId: string) {
	z.string().uuid().parse(siteId);
	const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);
	const site = await prisma.site.findUnique({
		where: { id: siteId },
		select: {
			organizationId: true,
			siteDiaryRecordsMap: true,
			bisCaseId: true,
		},
	});
	if (
		!site?.organizationId ||
		site.bisCaseId !== bisCaseId ||
		!isFimaDiary(site.siteDiaryRecordsMap)
	)
		throw new Error("BIS aktu pārbaude šajā projektā nav pieejama.");
	const previous =
		(
			site.siteDiaryRecordsMap as {
				otherSettings?: { fimaBisActCoverage?: { fetchedAt?: string } };
			}
		)?.otherSettings?.fimaBisActCoverage?.fetchedAt ?? null;
	const baseUrl = getBisBaseUrl();
	const index = await fetchFimaAcceptanceActCoverage(
		bisCaseId,
		async (path) => {
			const response = await bisFetch(baseUrl, `${baseUrl}${path}`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/vnd.api+json",
				},
				cache: "no-store",
				signal: AbortSignal.timeout(30_000),
			});
			if (!response.ok)
				throw new Error(
					`Neizdevās pārbaudīt BIS aktus (HTTP ${response.status}).`,
				);
			return response.json();
		},
	);
	const updated = await prisma.$executeRaw`
		UPDATE public."Site"
		SET "siteDiaryRecordsMap" = jsonb_set("siteDiaryRecordsMap", '{otherSettings,fimaBisActCoverage}', ${JSON.stringify(index)}::jsonb, true), "updatedAt" = NOW()
		WHERE id = ${siteId} AND "organizationId" = ${site.organizationId} AND "bisCaseId" = ${bisCaseId}
		AND "siteDiaryRecordsMap" #>> '{otherSettings,fimaBisActCoverage,fetchedAt}' IS NOT DISTINCT FROM ${previous}
		AND "siteDiaryRecordsMap" #> '{otherSettings,fimaCollaboration}' = 'true'::jsonb
	`;
	if (updated !== 1)
		throw new Error(
			"Projekts ir mainīts. Atjaunojiet datus un mēģiniet vēlreiz.",
		);
	revalidatePath(`/dashboard/sites/${siteId}/dashboard`);
	revalidatePath("/dashboard/all-projects");
	return { checkedAt: index.fetchedAt, actCount: index.acts.length };
}
