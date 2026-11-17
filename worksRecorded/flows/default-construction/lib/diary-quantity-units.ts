import { normalizeForma2QuantityUnit } from "./forma2-quantities";
import { parseDefaultConstructionQuantity } from "./quantity-plan-actual";

type QuantityRow = {
	Units?: unknown;
	Amounts?: unknown;
	Comments?: unknown;
	Comments_Custom_1?: unknown;
};

type QuantityPatch = {
	Units?: string;
	Amounts?: number | null;
	Comments?: string;
	Comments_Custom_1?: string | null;
};

const conversions: Record<string, { dimension: string; scale: number }> = {
	mm: { dimension: "length", scale: 0.001 },
	cm: { dimension: "length", scale: 0.01 },
	m: { dimension: "length", scale: 1 },
	km: { dimension: "length", scale: 1000 },
	mm2: { dimension: "area", scale: 0.000001 },
	cm2: { dimension: "area", scale: 0.0001 },
	m2: { dimension: "area", scale: 1 },
	ha: { dimension: "area", scale: 10000 },
	cm3: { dimension: "volume", scale: 0.000001 },
	l: { dimension: "volume", scale: 0.001 },
	m3: { dimension: "volume", scale: 1 },
	g: { dimension: "mass", scale: 0.001 },
	kg: { dimension: "mass", scale: 1 },
	t: { dimension: "mass", scale: 1000 },
	min: { dimension: "time", scale: 1 / 60 },
	st: { dimension: "time", scale: 1 },
};

export function normalizeDiaryQuantityUnit(value: unknown) {
	const unit = normalizeForma2QuantityUnit(String(value ?? ""));
	if (["stunda", "stundas", "h", "hr", "hour", "hours"].includes(unit))
		return "st";
	if (["minute", "minutes", "minūte", "minūtes"].includes(unit)) return "min";
	if (["tn", "tonna", "tonnas"].includes(unit)) return "t";
	if (["set", "sets", "komplekti"].includes(unit)) return "komplekts";
	return unit;
}

export function reconcileDiaryQuantityUnit(
	row: QuantityRow,
	targetUnit: string | null | undefined,
	quantityProfile = false,
): QuantityPatch {
	if (!targetUnit?.trim()) return {};
	const sourceKey = normalizeDiaryQuantityUnit(row.Units);
	const targetKey = normalizeDiaryQuantityUnit(targetUnit);
	const patch: QuantityPatch = { Units: targetUnit };
	if (!sourceKey || sourceKey === targetKey) return patch;
	const source = conversions[sourceKey];
	const target = conversions[targetKey];
	const amount = parseDefaultConstructionQuantity(row.Amounts);
	const actual = quantityProfile
		? parseDefaultConstructionQuantity(row.Comments_Custom_1)
		: null;
	if (source && target && source.dimension === target.dimension) {
		const factor = source.scale / target.scale;
		if (amount !== null)
			patch.Amounts = Number((amount * factor).toPrecision(12));
		if (actual !== null)
			patch.Comments_Custom_1 = String(
				Number((actual * factor).toPrecision(12)),
			);
		return patch;
	}
	patch.Amounts = null;
	if (quantityProfile) patch.Comments_Custom_1 = null;
	const reported = quantityProfile
		? [
				amount !== null ? `plāns ${amount} ${row.Units}` : "",
				actual !== null ? `fakts ${actual} ${row.Units}` : "",
			]
				.filter(Boolean)
				.join(", ")
		: amount !== null
			? `${amount} ${row.Units}`
			: "";
	if (reported) {
		const explanation = `Mērvienību neatbilstība. Ziņots ${reported}. Tāmes mērvienība ${targetUnit}. Daudzums atstāts tukšs.`;
		const comments = String(row.Comments ?? "").trim();
		patch.Comments = comments.includes(explanation)
			? comments
			: [explanation, comments].filter(Boolean).join("\n");
	}
	return patch;
}
