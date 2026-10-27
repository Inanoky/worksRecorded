import type { FimaBisRecordLink } from "./bis-record-links";

export const fimaActCoverageKey = "fimaBisActCoverage";

export type FimaAcceptanceAct = {
	id: string;
	collection: string;
	number: string | null;
	date: string | null;
	status: string;
	works: { id: string; quantity: number | null }[];
};

export type FimaActCoverageIndex = {
	version: 1;
	caseId: string;
	fetchedAt: string;
	collections: string[];
	acts: FimaAcceptanceAct[];
};

export type FimaRecordActCoverage = {
	caseId: string;
	checkedAt: string;
	acts: (Omit<FimaAcceptanceAct, "works"> & {
		works: { id: string; number: string | null; quantity: number | null }[];
	})[];
};

export function getFimaAcceptanceActUrl(collection: string, id: string) {
	return /^[a-z][a-z_]*_acts$/.test(collection) && /^\d+$/.test(id)
		? `https://bis.gov.lv/bisp/lv/portal/logbooks/${collection}/${id}/edit`
		: null;
}

export function getFimaActStatusLabel(status: string) {
	const labels: Record<string, string> = {
		approved: "Apstiprināts",
		approving: "Nodots apstiprināšanā",
		draft: "Sagatavošanā",
		opened_for_update: "Labošanā",
		rejected: "Noraidīts",
		cancelled: "Atcelts",
		canceled: "Atcelts",
		deleted: "Dzēsts",
	};
	return labels[status] ?? status;
}

export function createFimaActCoverageReader(config: unknown, caseId: unknown) {
	const stored = (
		config as { otherSettings?: { fimaBisActCoverage?: FimaActCoverageIndex } }
	)?.otherSettings?.fimaBisActCoverage;
	const valid =
		stored?.version === 1 &&
		typeof caseId === "string" &&
		/^\d+$/.test(caseId) &&
		stored.caseId === caseId &&
		typeof stored.fetchedAt === "string" &&
		Number.isFinite(Date.parse(stored.fetchedAt)) &&
		Array.isArray(stored.acts);
	const byWork = new Map<string, FimaAcceptanceAct[]>();
	if (valid) {
		for (const act of stored.acts) {
			if (
				!getFimaAcceptanceActUrl(act.collection, act.id) ||
				!Array.isArray(act.works) ||
				typeof act.status !== "string"
			)
				continue;
			for (const id of new Set(act.works.map((work) => work.id))) {
				const entries = byWork.get(id) ?? [];
				entries.push(act);
				byWork.set(id, entries);
			}
		}
	}
	return (links: FimaBisRecordLink[]): FimaRecordActCoverage | undefined => {
		if (!valid) return undefined;
		const matched = new Map<string, FimaRecordActCoverage["acts"][number]>();
		for (const link of links) {
			for (const act of byWork.get(link.id) ?? []) {
				const key = `${act.collection}/${act.id}`;
				let result = matched.get(key);
				if (!result) {
					result = { ...act, works: [] };
					matched.set(key, result);
				}
				if (result.works.some((work) => work.id === link.id)) continue;
				const quantities = act.works
					.filter((work) => work.id === link.id)
					.map((work) => work.quantity);
				result.works.push({
					id: link.id,
					number: link.number,
					quantity: quantities.every(
						(value): value is number =>
							typeof value === "number" && Number.isFinite(value),
					)
						? quantities.reduce((sum, value) => sum + value, 0)
						: null,
				});
			}
		}
		return {
			caseId: stored.caseId,
			checkedAt: stored.fetchedAt,
			acts: [...matched.values()].sort(
				(a, b) =>
					(b.date ?? "").localeCompare(a.date ?? "") ||
					(a.number ?? a.id).localeCompare(b.number ?? b.id),
			),
		};
	};
}

export function formatFimaActCoverage(coverage?: FimaRecordActCoverage) {
	return (
		coverage?.acts
			.map(
				(act) =>
					`${act.number ?? act.id} · ${getFimaActStatusLabel(act.status)}`,
			)
			.join("\n") ?? ""
	);
}
