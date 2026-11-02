import type {
	FimaActReference,
	FimaActsData,
	FimaActsVersions,
} from "./act-register";
export const fimaActReferenceKey = (value: FimaActReference) =>
	JSON.stringify([value.siteId, value.caseId, value.collection, value.id]);
export type FimaActsDelta =
	| { kind: "unchanged" }
	| { kind: "denied" }
	| {
			kind: "delta";
			siteId: string;
			cache: FimaActsVersions;
			meta?: Pick<FimaActsData, "siteId" | "siteName" | "caseId" | "checkedAt">;
			rows: FimaActsData["rows"];
			choices: FimaActsData["choices"];
			references: NonNullable<FimaActsData["references"]>;
			removed: { rows: string[]; choices: string[]; references: string[] };
	  };
export function mergeFimaActsDelta(
	current: FimaActsData,
	delta: Extract<FimaActsDelta, { kind: "delta" }>,
): FimaActsData {
	if (current.siteId !== delta.siteId)
		throw new Error("Saņemti cita projekta akti.");
	function merge<T>(
		old: T[],
		changed: T[],
		removed: string[],
		key: (entry: T) => string,
	) {
		const values = new Map(old.map((value) => [key(value), value]));
		for (const id of removed) values.delete(id);
		for (const value of changed) values.set(key(value), value);
		return [...values.values()];
	}
	const order = new Map(
		Object.keys(delta.cache.rows).map((key, index) => [key, index]),
	);
	return {
		...current,
		...delta.meta,
		cache: delta.cache,
		rows: merge(
			current.rows,
			delta.rows,
			delta.removed.rows,
			(row) => row.key,
		).sort(
			(a, b) => (order.get(a.key) ?? Infinity) - (order.get(b.key) ?? Infinity),
		),
		choices: merge(
			current.choices,
			delta.choices,
			delta.removed.choices,
			fimaActReferenceKey,
		),
		references: merge(
			current.references ?? [],
			delta.references,
			delta.removed.references,
			fimaActReferenceKey,
		),
	};
}
