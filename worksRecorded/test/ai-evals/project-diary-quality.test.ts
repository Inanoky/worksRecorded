import { projectDiaryCorpora } from "./project-diary-corpora";
import { validateReviewedDiaryCase } from "./reviewed-diary-validators";

it("reports a quantity error separately from correctly chosen work and units", () => {
	const corpus = projectDiaryCorpora.ocelt;
	const item = corpus.cases[0];
	const rows = item.expectedRecords.map((row) => ({
		...row,
		comment: row.reviewedComment,
	}));
	rows[0].amount = 999;
	const result = validateReviewedDiaryCase(
		item,
		rows.reverse(),
		corpus.project.positions,
	);
	expect(result.status).toBe("fail");
	expect(result.quality.missingWorks).toBe(0);
	expect(result.quality.fields.amount.correct).toBe(rows.length - 1);
	expect(result.quality.fields.unit.correct).toBe(rows.length);
});

it("scores floor locations independently when the same work is repeated on multiple floors", () => {
	const corpus = projectDiaryCorpora["sbstomme-hus-k"];
	const item = corpus.cases.find((item) => item.id.includes("five-works"));
	if (!item) throw new Error("Missing multi-floor reference");
	const rows = item.expectedRecords.map((row) => ({
		...row,
		comment: row.reviewedComment,
	}));
	rows[0].location = "Plan 99";
	const result = validateReviewedDiaryCase(
		item,
		rows.reverse(),
		corpus.project.positions,
	);
	expect(result.status).toBe("fail");
	expect(result.quality.matchedWorks).toBe(rows.length);
	expect(result.quality.fields.location.correct).toBe(rows.length - 1);
});

it("allows a known catalog unit alongside an unknown quantity without inventing quantity", () => {
	const corpus = projectDiaryCorpora["sbstomme-hus-k"];
	const item = corpus.cases.find(
		(item) =>
			item.expectedRecords.length === 1 &&
			item.expectedRecords[0].quantityAlternatives?.length,
	);
	if (!item) throw new Error("Missing unknown-quantity reference");
	const expected = item.expectedRecords[0];
	const row = {
		...expected,
		unit: expected.quantityAlternatives?.[1].unit ?? null,
		comment: expected.reviewedComment,
	};
	expect(
		validateReviewedDiaryCase(item, [row], corpus.project.positions).status,
	).toBe("pass");
	expect(
		validateReviewedDiaryCase(
			item,
			[{ ...row, amount: 99 }],
			corpus.project.positions,
		).status,
	).toBe("fail");
});

it("accepts diacritic variants of configured non-Forma2 categories without equating distinct categories", () => {
	const corpus = projectDiaryCorpora["stoneandtree-waterfront"];
	const item = corpus.cases.find(
		(item) => item.expectedRecords[0].work === "Dīkstave",
	);
	if (!item) throw new Error("Missing downtime reference");
	const row = {
		...item.expectedRecords[0],
		work: "Dīkstāve",
		comment: item.expectedRecords[0].reviewedComment,
	};
	expect(validateReviewedDiaryCase(item, [row], []).status).toBe("pass");
	expect(
		validateReviewedDiaryCase(item, [{ ...row, work: "Kavēšanās" }], []).status,
	).toBe("fail");
});
