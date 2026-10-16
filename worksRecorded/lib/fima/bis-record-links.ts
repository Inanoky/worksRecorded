export type FimaBisRecordLink = { id: string; number: string | null };

function object(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function fimaBisRecordNumber(value: unknown) {
	if (typeof value !== "string" && typeof value !== "number") return null;
	const number = String(value).trim();
	return /^\d+$/.test(number) ? number : null;
}

export function readFimaBisRecordLinks(
	metadata: unknown,
	activeBisId?: string | null,
): FimaBisRecordLink[] {
	const value = object(metadata);
	const imported = object(value.kuceImport).bisLinks;
	const snapshot = object(object(value.fimaCollaboration).bisMaterials).entries;
	const numbers = new Map<string, string | null>();
	const importedIds = new Set<string>();
	for (const raw of Array.isArray(imported) ? imported : []) {
		const entry = object(raw);
		const id = fimaBisRecordNumber(entry.id);
		if (!id) continue;
		importedIds.add(id);
		numbers.set(
			id,
			fimaBisRecordNumber(entry.number) ?? numbers.get(id) ?? null,
		);
	}
	for (const raw of Array.isArray(snapshot) ? snapshot : []) {
		const entry = object(raw);
		const id = fimaBisRecordNumber(entry.bisId);
		const number = fimaBisRecordNumber(entry.number);
		if (id && number) numbers.set(id, number);
	}
	const activeId = fimaBisRecordNumber(activeBisId);
	const ids = activeId ? [activeId] : [...importedIds];
	return ids.map((id) => ({ id, number: numbers.get(id) ?? null }));
}

export function getFimaBisRecordUrl(id: string) {
	return /^\d+$/.test(id)
		? `https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/${id}/edit?entry_ids%5B%5D=${id}`
		: null;
}
