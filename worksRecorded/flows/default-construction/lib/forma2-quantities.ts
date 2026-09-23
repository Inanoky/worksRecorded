import {
	hasDefaultConstructionQuantityProfile,
	parseDefaultConstructionQuantity,
} from "./quantity-plan-actual";

export function getForma2DiaryQuantity(
	record: { Amounts?: unknown; Comments_Custom_1?: unknown },
	config: Parameters<typeof hasDefaultConstructionQuantityProfile>[0],
) {
	return parseDefaultConstructionQuantity(
		hasDefaultConstructionQuantityProfile(config)
			? record.Comments_Custom_1
			: record.Amounts,
	);
}

export function normalizeForma2QuantityUnit(unit: string) {
	const normalized = unit
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[\s.^]/g, "");
	if (["gab", "gb", "pcs", "pc"].includes(normalized)) return "gab";
	return normalized;
}
