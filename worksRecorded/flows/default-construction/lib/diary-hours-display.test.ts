import { formatLimeniDiaryHours } from "./diary-hours-display";

describe("Limeni diary hours display", () => {
	it.each([
		[6.341666666666667, "6,34"],
		[6.346, "6,35"],
		["6.341666666666667", "6,34"],
		["6,341666666666667", "6,34"],
		[12, "12"],
		[0, "—"],
		["0", "—"],
		[null, "—"],
		[undefined, "—"],
		["", "—"],
		[NaN, "—"],
		[Infinity, "—"],
	])(
		"formats %s as %s without changing the source quantity",
		(value, expected) => {
			expect(formatLimeniDiaryHours(value, "lv-LV")).toBe(expected);
		},
	);

	it("uses the selected language's decimal separator", () => {
		expect(formatLimeniDiaryHours(6.341666666666667, "en-US")).toBe("6.34");
	});
});
