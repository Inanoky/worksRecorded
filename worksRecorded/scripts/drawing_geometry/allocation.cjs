function allocateCents(total, weights) {
	if (
		!weights.length ||
		weights.some((weight) => !Number.isFinite(weight) || weight < 0)
	) {
		throw new Error("Invalid measured area weights");
	}
	if (total === null) return weights.map(() => null);
	if (
		!Number.isSafeInteger(total) ||
		weights.reduce((sum, weight) => sum + weight, 0) <= 0
	) {
		throw new Error("Invalid source cents or measured area total");
	}
	const magnitude = Math.abs(total);
	const sum = weights.reduce((value, weight) => value + weight, 0);
	const exact = weights.map((weight) => (magnitude * weight) / sum);
	const shares = exact.map(Math.floor);
	const order = exact
		.map((value, index) => ({ index, remainder: value - shares[index] }))
		.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
	for (
		let remaining =
				magnitude - shares.reduce((value, share) => value + share, 0),
			index = 0;
		remaining > 0;
		remaining--, index++
	) {
		shares[order[index % order.length].index]++;
	}
	return shares.map((share) => (total < 0 ? -share : share));
}

module.exports = { allocateCents };
