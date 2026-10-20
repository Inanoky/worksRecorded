import { formatFimaDiaryNumber } from "./diary-number";

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
