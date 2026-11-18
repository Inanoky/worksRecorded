import { groundDiarySourceQuotes } from "./diarySourceQuotes";

it("tolerates punctuation, spacing, case and decimal notation without changing facts", () => {
	const source =
		"Darbus veica divi cilvēki, astoņas stundas, un iebūvēti 22,09 metri.";
	expect(
		groundDiarySourceQuotes(source, [
			"Darbus veica divi cilvēki,  astoņas stundas.",
		]),
	).toBe("Darbus veica divi cilvēki, astoņas stundas");
	expect(groundDiarySourceQuotes(source, ["Un iebūvēti 22.09 metri!"])).toBe(
		"un iebūvēti 22,09 metri.",
	);
});

it("grounds separate passages without requiring an invented continuous quote", () => {
	const source =
		"Iebūvēts ūdensvads D63. Iebūvēta aka AU1-4. Ūdensvads 22 metri.";
	expect(
		groundDiarySourceQuotes(source, [
			"Iebūvēts ūdensvads D63.",
			"Ūdensvads 22 metri.",
		]),
	).toBe("Iebūvēts ūdensvads D63.\nŪdensvads 22 metri.");
	expect(
		groundDiarySourceQuotes(source, [
			"Iebūvēts ūdensvads D63. Ūdensvads 22 metri.",
		]),
	).toBeNull();
});

it.each([
	["Iebūvēti 22,09 metri ūdensvada.", "Iebūvēti 22,9 metri ūdensvada."],
	["Iebūvēti 22 metri ūdensvada.", "Iebūvēti 22 kubikmetri ūdensvada."],
	["Iebūvēts ūdensvads D63.", "Iebūvēts ūdensvads D200."],
	["Aka AK1-6 ir iebūvēta.", "Aka AK1-7 ir iebūvēta."],
	["Nav iebūvēts ūdensvads D63.", "Iebūvēts ūdensvads D63."],
	["Iebūvēts ūdensvads D63.", "Nav iebūvēts ūdensvads D63."],
	["Izrakti 1, 5 metri.", "Izrakti 1.5 metri."],
	["Atzīme -3 metri tranšejā.", "Atzīme 3 metri tranšejā."],
])("rejects altered facts in %s", (source, quote) => {
	expect(groundDiarySourceQuotes(source, [quote])).toBeNull();
});

it("rejects reordered, empty and tiny passages", () => {
	const source = "Iebūvēts ūdensvads D63. Ūdensvads 22 metri.";
	expect(
		groundDiarySourceQuotes(source, [
			"Ūdensvads 22 metri.",
			"Iebūvēts ūdensvads D63.",
		]),
	).toBeNull();
	expect(groundDiarySourceQuotes(source, [])).toBeNull();
	expect(groundDiarySourceQuotes(source, ["22"])).toBeNull();
});
