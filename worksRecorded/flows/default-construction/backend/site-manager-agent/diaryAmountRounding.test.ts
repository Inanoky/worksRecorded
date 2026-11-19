import { roundDiaryAmounts } from "./diaryAmountRounding";

it.each([
	[73.5597, 73.56],
	[6.627, 6.63],
	[22.09, 22.09],
	[1.005, 1.01],
	[10.075, 10.08],
	[1, 1],
	[0, 0],
	[0.004, 0],
	[0.005, 0.01],
	[1e-7, 0],
	[-1.005, -1.01],
])("rounds quantity %s to %s using decimal precision", (amount, expected) => {
	expect(roundDiaryAmounts([{ Amounts: amount }])[0].Amounts).toBe(expected);
});

it("preserves null quantities, other fields, source rows and large finite values", () => {
	const rows = [
		{ Amounts: null, TimeInvolved: 1.2345 },
		{ Amounts: 6.627, TimeInvolved: 2.3456 },
		{ Amounts: 1e308, TimeInvolved: null },
	];
	const rounded = roundDiaryAmounts(rows);
	expect(rounded).toEqual([
		{ Amounts: null, TimeInvolved: 1.2345 },
		{ Amounts: 6.63, TimeInvolved: 2.3456 },
		{ Amounts: 1e308, TimeInvolved: null },
	]);
	expect(rows[1].Amounts).toBe(6.627);
	expect(roundDiaryAmounts(rounded)).toEqual(rounded);
	expect(
		roundDiaryAmounts([{ Comments: "Tikai piezīme" }])[0],
	).not.toHaveProperty("Amounts");
});
