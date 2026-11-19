function shiftDecimal(value: number, places: number) {
	const [coefficient, exponent = "0"] = String(value).split("e");
	return Number(`${coefficient}e${Number(exponent) + places}`);
}

export function roundDiaryAmounts<T extends Record<string, unknown>>(
	rows: T[],
): T[] {
	return rows.map((row) => {
		const amount = row.Amounts;
		if (typeof amount !== "number" || !Number.isFinite(amount)) return row;
		const shifted = shiftDecimal(Math.abs(amount), 2);
		if (!Number.isFinite(shifted)) return row;
		const rounded = Math.sign(amount) * shiftDecimal(Math.round(shifted), -2);
		return rounded === amount
			? row
			: { ...row, Amounts: rounded === 0 ? 0 : rounded };
	});
}
