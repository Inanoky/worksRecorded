import { oceltScenarioCases } from "./ocelt-scenario-cases";
import { reviewedDiaryCorpus } from "./reviewed-diary-cases";
import {
	type ReviewedDiaryActualRow,
	validateReviewedDiaryCase,
} from "./reviewed-diary-validators";

const expectedRows = (index: number): ReviewedDiaryActualRow[] =>
	oceltScenarioCases[index].expectedRecords.map((row) => ({
		...row,
		comment: row.commentSignals.join(" "),
		needsReview: row.reviewRequired === true,
	}));
const validate = (index: number, rows = expectedRows(index)) =>
	validateReviewedDiaryCase(
		oceltScenarioCases[index],
		rows,
		reviewedDiaryCorpus.project.positions,
	);

it("freezes the two source-derived requests and their independent expected results", () => {
	expect(oceltScenarioCases).toHaveLength(2);
	expect(oceltScenarioCases[0].sourceText).toContain(
		"3,33 kubikmetri grunts uz katru iebūvēto caurules metru",
	);
	expect(
		oceltScenarioCases[0].expectedRecords.map((row) => row.amount),
	).toEqual([22.09, 73.56, 6.63]);
	expect(oceltScenarioCases[1].sourceText).toContain(
		"Šai ūdensvada akai norādu tāmes pozīciju 2.4.",
	);
	for (const index of [0, 1]) expect(validate(index).status).toBe("pass");
});

it("accepts either source-preserved or blank review-note quantities without permitting mismatched pairs", () => {
	const rows = expectedRows(1);
	rows[2].amount = 1;
	rows[2].unit = "kompl";
	expect(validate(1, rows).status).toBe("pass");
	rows[2].unit = "m";
	expect(validate(1, rows).status).toBe("fail");
	rows[2].unit = "kompl";
	rows[2].amount = 999;
	expect(validate(1, rows).status).toBe("fail");
});

it("requires a marked review note and does not accept silent assignment to either the stated pipe or presumed well", () => {
	for (const code of ["2.4", "1.4"]) {
		const rows = expectedRows(1);
		rows[2].forma2PositionId =
			reviewedDiaryCorpus.project.positions.find(
				(position) => position.code === code && position.kind === "work",
			)?.id ?? "unknown";
		expect(validate(1, rows).status).toBe("fail");
	}
	const unmarked = expectedRows(1);
	unmarked[2].needsReview = false;
	expect(validate(1, unmarked).status).toBe("fail");
});

it("continues to reject review rows for cases expecting fully accepted work", () => {
	const rows = expectedRows(0);
	rows[1].needsReview = true;
	expect(validate(0, rows).status).toBe("fail");
});
