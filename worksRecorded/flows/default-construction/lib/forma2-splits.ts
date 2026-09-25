export type Forma2Split = {
	mode: "quantity" | "percent" | "cost";
	parts: { positionId: string; value: number }[];
	basisTotal?: number;
};

export function calculateForma2Split(
	split: Forma2Split,
	source: { quantity: number | null; actualCost: number | null },
) {
	const cost = source.actualCost;
	if (cost == null || !Number.isFinite(cost) || cost < 0)
		throw new Error("invalid-cost");
	const denominator =
		split.mode === "quantity"
			? source.quantity
			: split.mode === "percent"
				? 100
				: split.mode === "cost"
					? cost
					: null;
	if (denominator == null || !Number.isFinite(denominator) || denominator <= 0)
		throw new Error("invalid-total");
	if (
		!Array.isArray(split.parts) ||
		!split.parts.length ||
		split.parts.length > 50
	)
		throw new Error("invalid-parts");
	const seen = new Set<string>();
	let used = 0;
	let allocatedCents = 0;
	const totalCents = Math.round(cost * 100);
	const parts = split.parts.map((part) => {
		if (
			!part.positionId ||
			seen.has(part.positionId) ||
			!Number.isFinite(part.value) ||
			part.value <= 0
		)
			throw new Error("invalid-parts");
		if (
			split.mode === "cost" &&
			Math.abs(part.value * 100 - Math.round(part.value * 100)) > 1e-6
		)
			throw new Error("invalid-parts");
		seen.add(part.positionId);
		used += part.value;
		if (used > denominator + 1e-8) throw new Error("over-allocated");
		const nextCents = Math.round(totalCents * Math.min(used / denominator, 1));
		const actualCost = (nextCents - allocatedCents) / 100;
		allocatedCents = nextCents;
		return {
			positionId: part.positionId,
			actualCost,
			quantity:
				source.quantity == null
					? null
					: Number(((source.quantity * part.value) / denominator).toFixed(6)),
		};
	});
	return {
		parts,
		remainingValue: Math.max(0, Number((denominator - used).toFixed(6))),
		remainingCost: (totalCents - allocatedCents) / 100,
		remainingQuantity:
			source.quantity == null
				? null
				: Math.max(
						0,
						Number(
							(source.quantity * (1 - Math.min(used / denominator, 1))).toFixed(
								6,
							),
						),
					),
	};
}
