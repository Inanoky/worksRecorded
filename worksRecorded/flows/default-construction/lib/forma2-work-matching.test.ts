import {
	constructionWorkConflicts,
	constructionWorkReference,
	constructionWorkSimilarity,
} from "./forma2-work-matching";

it("distinguishes explicit position references from decimal quantities", () => {
	expect(constructionWorkReference("2.4 m caurules")).toBe("");
	expect(constructionWorkReference("2.4 m caurules, pozīcija 1.1")).toBe("1.1");
	expect(constructionWorkReference("Ūdensvada aka, pozīcija 2.4.")).toBe("2.4");
});

it("recognizes Latvian speech variants and English construction categories", () => {
	expect(
		constructionWorkSimilarity(
			"ūdens trubas montāža",
			"water pipe installation",
		),
	).toBeGreaterThan(0.4);
	expect(
		constructionWorkConflicts(
			"Ūdensvada PE100 OD63 caurule",
			"Water supply PE100 pipe OD63",
		),
	).toEqual([]);
});

it.each([
	["Ūdensvada aka DN1000", "Kanalizācijas caurule D200"],
	["Water well DN1000", "Water pipe OD63"],
	["Ūdensvada PE caurule OD63", "Ūdensvada PP caurule OD63"],
])("detects explicit contradictions between %s and %s", (source, candidate) => {
	expect(constructionWorkConflicts(source, candidate).length).toBeGreaterThan(
		0,
	);
});

it("keeps generic categories and mixed-work passages eligible for semantic review", () => {
	expect(
		constructionWorkConflicts("Ūdensvada tranšejas rakšana OD63", "Trenching"),
	).toEqual([]);
	expect(
		constructionWorkConflicts(
			"Ūdensvads OD63 un kanalizācija D200",
			"Kanalizācijas caurule D200",
		),
	).toEqual([]);
});
