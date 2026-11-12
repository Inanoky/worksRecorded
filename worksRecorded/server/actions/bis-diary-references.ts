"use server";
import { bisActionResult } from "@/lib/bis/action-result";

import { bisClient } from "@/lib/bis/client";
import type { BisDiaryReferences } from "@/lib/bis/diary-references";
import { performedWorkReferences } from "@/lib/bis/diary-references";

const cache = new Map<
	string,
	{ expires: number; promise: Promise<BisDiaryReferences> }
>();

export async function getBisDiaryReferences(
	siteId: string,
	refresh = false,
): Promise<BisDiaryReferences> {
	const client = await bisClient(siteId);
	const round = client.site.bisConstructionRoundId;
	const scope = JSON.stringify([
		client.userId,
		client.base,
		siteId,
		client.bisCaseId,
		round,
	]);
	const current = cache.get(scope);
	if (!refresh && current && current.expires > Date.now())
		return current.promise;
	const promise = Promise.all([
		client.list("project"),
		client.list("estimate_positions"),
	]).then(([drawings, estimates]) => ({
		scope,
		drawings: drawings.map((row) => ({
			id: String(row.id),
			label: [
				row.attributes?.drawing_design,
				row.attributes?.original_number,
				row.attributes?.name || `Lapa ${row.id}`,
				row.attributes?.revision != null
					? `rev. ${row.attributes.revision}`
					: null,
			]
				.filter(Boolean)
				.join(" · "),
		})),
		estimates: estimates
			.filter((row) => {
				const a = row.attributes ?? {};
				if (a.type !== "element") return false;
				const rounds = a.related_case_construction_round_ids ?? [];
				return (
					round == null ||
					(a.case_construction_round_id == null && rounds.length === 0) ||
					String(a.case_construction_round_id) === String(round) ||
					rounds.some((id: unknown) => String(id) === String(round))
				);
			})
			.map((row) => ({
				id: String(row.id),
				label:
					[row.attributes?.position_number, row.attributes?.description]
						.filter(Boolean)
						.join(" · ") || `Pozīcija ${row.id}`,
			})),
	}));
	cache.set(scope, { expires: Date.now() + 10 * 60_000, promise });
	if (cache.size > 100) cache.delete(cache.keys().next().value!);
	try {
		return await promise;
	} catch (error) {
		if (cache.get(scope)?.promise === promise) cache.delete(scope);
		throw error;
	}
}

export async function validateBisDiaryReferences(
	siteId: string,
	selection: {
		projectDocumentIds?: string[];
		estimatePositionId?: string | null;
	},
) {
	return performedWorkReferences(
		await getBisDiaryReferences(siteId),
		selection,
	);
}

export async function loadBisDiaryReferenceOptions(
	siteId: string,
	refresh = false,
) {
	return bisActionResult(() => getBisDiaryReferences(siteId, refresh));
}
