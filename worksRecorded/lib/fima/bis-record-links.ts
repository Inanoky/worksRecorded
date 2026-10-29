export type FimaBisRecordType =
	| "performed_work"
	| "received_construction_product";
export type FimaBisRecordLink = {
	id: string;
	number: string | null;
	type?: FimaBisRecordType;
};

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
	const receipts = new Map<string, FimaBisRecordLink>();
	const activeId = fimaBisRecordNumber(activeBisId);
	const add = (raw: unknown, defaultType?: FimaBisRecordType) => {
		const entry = object(raw);
		const id = fimaBisRecordNumber(entry.id);
		const type = entry.type ?? defaultType ?? "performed_work";
		if (
			!id ||
			(type !== "performed_work" && type !== "received_construction_product")
		)
			return;
		const number = fimaBisRecordNumber(entry.number);
		if (type === "received_construction_product") {
			receipts.set(id, {
				id,
				number: number ?? receipts.get(id)?.number ?? null,
				type,
			});
		} else {
			importedIds.add(id);
			numbers.set(id, number ?? numbers.get(id) ?? null);
		}
	};
	for (const raw of Array.isArray(imported) ? imported : []) {
		add(raw);
	}
	const receiptRecords = object(value.fimaMaterialReceiptPlan).bisRecords;
	for (const raw of Array.isArray(receiptRecords) ? receiptRecords : []) {
		add(raw, "received_construction_product");
	}
	for (const [key, data] of Object.entries(value)) {
		if (!/^fimaBisDraftCreation(?:\d{8})?$/.test(key)) continue;
		const records = object(data).records;
		for (const raw of Array.isArray(records) ? records : []) {
			const entry = object(raw);
			if (
				entry.type === "performed_work" ||
				entry.type === "received_construction_product"
			)
				add(entry);
		}
	}
	for (const raw of Array.isArray(snapshot) ? snapshot : []) {
		const entry = object(raw);
		const id = fimaBisRecordNumber(entry.bisId);
		const number = fimaBisRecordNumber(entry.number);
		if (id && number) numbers.set(id, number);
	}
	const ids =
		activeId && !receipts.has(activeId) ? [activeId] : [...importedIds];
	return [
		...ids
			.filter((id) => !receipts.has(id))
			.map((id) => ({ id, number: numbers.get(id) ?? null })),
		...receipts.values(),
	];
}

export function isFimaBisWorkRecordLink(link: FimaBisRecordLink) {
	return !link.type || link.type === "performed_work";
}

export function getFimaBisRecordUrl(
	id: string,
	type: FimaBisRecordType = "performed_work",
) {
	if (!/^\d+$/.test(id)) return null;
	if (type === "received_construction_product")
		return `https://bis.gov.lv/bisp/lv/portal/logbooks/received_construction_products/${id}/edit`;
	return type === "performed_work"
		? `https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/${id}/edit?entry_ids%5B%5D=${id}`
		: null;
}
