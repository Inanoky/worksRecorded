import { normalizeForma2PositionCode } from "./forma2-position-code";

it.each([
	["1,1,2", "1.1.2"],
	["4.1,2", "4.1.2"],
	["1,10", "1.10"],
	["01,010.", "01.010."],
	["1.1.2", "1.1.2"],
	["1,10 Caurule 2,5 mm", "1.10 Caurule 2,5 mm"],
	["4,1,2: Caurule 2,5 mm", "4.1.2: Caurule 2,5 mm"],
	["Caurule 2,5 mm", "Caurule 2,5 mm"],
	["A1,2", "A1,2"],
	["1,2A", "1,2A"],
	["", ""],
	[null, ""],
])(
	"normalizes position-code prefix %s without altering the description",
	(input, expected) => {
		expect(normalizeForma2PositionCode(input)).toBe(expected);
	},
);
