import type { SiteDiaryExtractionCheckerResult } from "./siteDiaryExtractionChecker";
import {
	preserveAcceptedDiaryRows,
	recoverReviewedDiaryRows,
} from "./siteDiaryRecovery";

const source =
	"Iebetonēti pamati 12 m3. Veikta grunts rakšana 80 m3. Piegādāts nezināms materiāls.";
const rows = [
	{
		Date: "2026-11-17",
		Works: "Betonēšana",
		Comments: "Pamati",
		Amounts: 12,
		Units: "m3",
	},
	{ Date: "2026-11-17", Works: "Rakšana", Amounts: 80, Units: "m3" },
	{
		Date: "2026-11-17",
		Works: "Izdomāta kategorija",
		Amounts: 999,
		Units: "m3",
		WorkersInvolved: 5,
	},
];
const checker: SiteDiaryExtractionCheckerResult = {
	verdict: "needs_model_repair",
	reason: "Jāprecizē trešā rinda",
	badSplitSignals: [],
	repairInstructions: "Precizēt materiālu",
	repairActions: [],
	expectedRecordCount: 3,
	coverageComplete: true,
	rowReviews: [
		{
			rowIndex: 0,
			status: "accept",
			reason: "Pamatots",
			sourceText: "Iebetonēti pamati 12 m3.",
		},
		{
			rowIndex: 1,
			status: "accept",
			reason: "Pamatots",
			sourceText: "Veikta grunts rakšana 80 m3.",
		},
		{
			rowIndex: 2,
			status: "needs_review",
			reason: "Nav zināms materiāls un apjoms",
			sourceText: "Piegādāts nezināms materiāls.",
		},
	],
};
const recover = (review = checker, proposed = rows) =>
	recoverReviewedDiaryRows({
		rows: proposed,
		checker: review,
		source,
		notesCategory: "Piezīmes",
	});

it("keeps accepted records unchanged and quarantines only the unresolved source clause", () => {
	const result = recover();
	expect(result?.rows.slice(0, 2)).toEqual(rows.slice(0, 2));
	expect(result?.rows[2]).toMatchObject({
		Works: "Piezīmes",
		Amounts: null,
		Units: null,
		WorkersInvolved: null,
	});
	expect(result?.rows[2].Comments).toContain("Piegādāts nezināms materiāls.");
	expect(result?.qualities.map((quality) => quality.status)).toEqual([
		"accepted",
		"accepted",
		"needs_review",
	]);
	expect(result?.reviewCount).toBe(1);
});

it("protects accepted rows when repair rewrites or drops them", () => {
	const qualities = recover()?.qualities ?? [];
	const rewritten = rows.map((row) => ({ ...row, Amounts: 9999 }));
	expect(
		preserveAcceptedDiaryRows(rows, rewritten, qualities).slice(0, 2),
	).toEqual(rows.slice(0, 2));
	expect(
		preserveAcceptedDiaryRows(rows, rewritten.slice(1), qualities),
	).toEqual(rows);
});

it.each([
	"coverage",
	"count",
	"duplicate",
	"quote",
	"all-unsafe",
	"all-accepted",
])("refuses partial approval without reliable %s", (kind) => {
	const review = JSON.parse(JSON.stringify(checker));
	if (kind === "coverage") review.coverageComplete = false;
	if (kind === "count") review.expectedRecordCount = 4;
	if (kind === "duplicate") review.rowReviews[1].rowIndex = 0;
	if (kind === "quote")
		review.rowReviews[0].sourceText = "Šāds darbs nav veikts";
	if (kind === "all-unsafe")
		for (const item of review.rowReviews) item.status = "needs_review";
	if (kind === "all-accepted")
		for (const item of review.rowReviews) item.status = "accept";
	expect(recover(review)).toBeNull();
});

it("does not pass an unparseable date through partial recovery", () => {
	expect(
		recover(
			checker,
			rows.map((row) => ({ ...row, Date: "10. novembris" })),
		),
	).toBeNull();
});
