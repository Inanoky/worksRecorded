import { createHash } from "node:crypto";
import type { FimaActsData, FimaActsVersions } from "@/lib/fima/act-register";
import { type FimaActsDelta, fimaActReferenceKey } from "@/lib/fima/acts-sync";

const hash = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function versionFimaActs(
	data: FimaActsData,
): FimaActsData & { cache: FimaActsVersions } {
	const { siteId, siteName, caseId, checkedAt } = data;
	const parts = {
		meta: hash({ siteId, siteName, caseId, checkedAt }),
		rows: Object.fromEntries(data.rows.map((row) => [row.key, hash(row)])),
		choices: Object.fromEntries(
			data.choices.map((choice) => [fimaActReferenceKey(choice), hash(choice)]),
		),
		references: Object.fromEntries(
			(data.references ?? []).map((ref) => [
				fimaActReferenceKey(ref),
				hash(ref),
			]),
		),
	};
	return { ...data, cache: { ...parts, revision: hash(parts) } };
}
export function diffFimaActs(
	data: FimaActsData & { cache: FimaActsVersions },
	known: FimaActsVersions,
): FimaActsDelta {
	if (data.cache.revision === known.revision) return { kind: "unchanged" };
	const { siteId, siteName, caseId, checkedAt, cache } = data;
	return {
		kind: "delta",
		siteId,
		cache,
		...(known.meta === cache.meta
			? {}
			: { meta: { siteId, siteName, caseId, checkedAt } }),
		rows: data.rows.filter(
			(row) => known.rows[row.key] !== cache.rows[row.key],
		),
		choices: data.choices.filter(
			(row) =>
				known.choices[fimaActReferenceKey(row)] !==
				cache.choices[fimaActReferenceKey(row)],
		),
		references: (data.references ?? []).filter(
			(row) =>
				known.references[fimaActReferenceKey(row)] !==
				cache.references[fimaActReferenceKey(row)],
		),
		removed: {
			rows: Object.keys(known.rows).filter((key) => !cache.rows[key]),
			choices: Object.keys(known.choices).filter((key) => !cache.choices[key]),
			references: Object.keys(known.references).filter(
				(key) => !cache.references[key],
			),
		},
	};
}
