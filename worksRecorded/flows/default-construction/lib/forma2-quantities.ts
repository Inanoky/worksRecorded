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

export function getForma2QuantityExclusion(
	quantity: number | null,
	sourceUnit: string,
	contractUnit: string,
) {
	if (quantity === null || !Number.isFinite(quantity))
		return "missing-quantity";
	const unit = normalizeForma2QuantityUnit(contractUnit);
	if (!unit || unit !== normalizeForma2QuantityUnit(sourceUnit))
		return "unit-mismatch";
	return null;
}

export function getForma2ReportedQuantity(source: {
	quantity: number | null;
	reportedQuantity?: number | null;
}) {
	return source.reportedQuantity === undefined
		? source.quantity
		: source.reportedQuantity;
}

export function getForma2QuantityComparison(
	actual: number | null,
	contract: number | null,
) {
	if (
		actual === null ||
		contract === null ||
		!Number.isFinite(actual) ||
		!Number.isFinite(contract)
	)
		return "neutral";
	const difference = Number((actual - contract).toFixed(6));
	return difference > 0 ? "above" : difference < 0 ? "below" : "neutral";
}
