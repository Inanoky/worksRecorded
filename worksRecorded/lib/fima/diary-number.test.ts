import {
	formatFimaDiaryNumber,
	matchesFimaDiaryNumber,
	parseFimaDiaryNumber,
} from "./diary-number";

it.each([
	[1, "FIMA-000001"],
	[42, "FIMA-000042"],
	[1234567, "FIMA-1234567"],
])("formats stored number %s", (number, expected) => {
	expect(formatFimaDiaryNumber(number)).toBe(expected);
});
it.each([null, undefined, 0, -1, 1.5, "42", Number.NaN])(
	"does not invent a local number for %s",
	(number) => {
		expect(formatFimaDiaryNumber(number)).toBe("—");
	},
);

it.each([
	"FIMA-003383",
	"fima-003383",
	"FIMA003383",
	" FIMA - 003383 ",
	"003383",
	"3383",
])("recognizes the complete identifier %s", (keyword) => {
	expect(parseFimaDiaryNumber(keyword)).toBe(3383);
	expect(matchesFimaDiaryNumber(3383, keyword)).toBe(true);
	expect(matchesFimaDiaryNumber(338, keyword)).toBe(false);
	expect(matchesFimaDiaryNumber(null, keyword)).toBe(false);
});

it.each([
	undefined,
	null,
	"",
	"FIMA-",
	"FIMA--3383",
	"FIMA-003383x",
	"-3383",
	"0",
	"1.5",
	"1e3",
	"2147483648",
	"999999999999999999999999",
	"work at mast 3-83",
])("does not turn %s into a record-number search", (keyword) => {
	expect(parseFimaDiaryNumber(keyword)).toBeNull();
});

it("accepts the highest database integer", () => {
	expect(parseFimaDiaryNumber("FIMA-2147483647")).toBe(2_147_483_647);
});
