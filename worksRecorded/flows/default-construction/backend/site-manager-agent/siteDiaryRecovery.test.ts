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

it("keeps checker instructions in audit data and uses only a short label with source facts in the note", () => {
	const technicalReason =
		"Izsauc labotāju, nomaini row-3 Works un pārbaudi payload pirms save_to_database.";
	const review: SiteDiaryExtractionCheckerResult = JSON.parse(
		JSON.stringify(checker),
	);
	if (!review.rowReviews) throw new Error("Missing row reviews");
	review.rowReviews[2].reason = technicalReason;
	const result = recover(review);
	expect(result?.rows[2].Comments).toBe(
		"Jāpārbauda.\nPiegādāts nezināms materiāls.",
	);
	expect(result?.rows[2].Comments).not.toContain(technicalReason);
	expect(result?.qualities[2]).toEqual({
		status: "needs_review",
		reason: technicalReason,
	});
	expect(result?.rows.slice(0, 2)).toEqual(rows.slice(0, 2));
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

it.each(["coverage", "count", "duplicate", "all-unsafe", "all-accepted"])(
	"refuses partial approval without reliable %s",
	(kind) => {
		const review = JSON.parse(JSON.stringify(checker));
		if (kind === "coverage") review.coverageComplete = false;
		if (kind === "count") review.expectedRecordCount = 4;
		if (kind === "duplicate") review.rowReviews[1].rowIndex = 0;
		if (kind === "all-unsafe")
			for (const item of review.rowReviews) item.status = "needs_review";
		if (kind === "all-accepted")
			for (const item of review.rowReviews) item.status = "accept";
		expect(recover(review)).toBeNull();
	},
);

it("quarantines a bad quote without discarding other accepted works", () => {
	const review: SiteDiaryExtractionCheckerResult = JSON.parse(
		JSON.stringify(checker),
	);
	if (!review.rowReviews) throw new Error("Missing reviews");
	review.rowReviews[0].sourceText = "Iebetonēti pamati 99 m3.";
	const result = recover(review);
	expect(result?.rows[1]).toEqual(rows[1]);
	expect(result?.rows[0]).toMatchObject({
		Works: "Piezīmes",
		Amounts: null,
		Units: null,
	});
	expect(result?.rows[0].Comments).toContain(source);
	expect(result?.qualities.map((quality) => quality.status)).toEqual([
		"needs_review",
		"accepted",
		"needs_review",
	]);
});

it("recovers labour when the checker changes a transcript comma to a period", () => {
	const source =
		"Ūdensvads 22 metri. Darbus veica divi cilvēki, astoņas stundas, un veikta rakšana.";
	const result = recoverReviewedDiaryRows({
		source,
		notesCategory: "Piezīmes",
		rows: [
			{ Date: "2026-11-17", Works: "Ūdensvads", Amounts: 22, Units: "m" },
			{
				Date: "2026-11-17",
				Works: "Piezīmes",
				WorkersInvolved: 2,
				TimeInvolved: 8,
			},
			{ Date: "2026-11-17", Works: "Rakšana" },
		],
		checker: {
			...checker,
			rowReviews: [
				{
					rowIndex: 0,
					status: "accept",
					reason: "Pamatots",
					sourceText: "Ūdensvads 22 metri.",
				},
				{
					rowIndex: 1,
					status: "accept",
					reason: "Kopīgais laiks",
					sourceText: "Darbus veica divi cilvēki, astoņas stundas.",
				},
				{
					rowIndex: 2,
					status: "needs_review",
					reason: "Nav apjoma",
					sourceText: "un veikta rakšana.",
				},
			],
		},
	});
	expect(result?.reviewCount).toBe(1);
	expect(result?.rows[1]).toMatchObject({
		WorkersInvolved: 2,
		TimeInvolved: 8,
	});
});

it("does not pass an unparseable date through partial recovery", () => {
	expect(
		recover(
			checker,
			rows.map((row) => ({ ...row, Date: "10. novembris" })),
		),
	).toBeNull();
});

it("does not restore a quantity explicitly rejected on the review row", () => {
	const result = recoverReviewedDiaryRows({
		rows,
		source,
		notesCategory: "Piezīmes",
		measurementIsSupported: () => true,
		checker: {
			...checker,
			repairActions: ["Amounts", "Units"].map((field) => ({
				rowIndex: 2,
				field: field as "Amounts" | "Units",
				operation: "set_null",
				reason: "Cita darba apjoms",
			})),
		},
	});
	expect(result?.rows[2]).toMatchObject({ Amounts: null, Units: null });
});

it("protects a work clarified by a later nonadjacent source passage", () => {
	const source =
		"Iebūvēts ūdensvads D63. Iebūvēta aka AU1-4. Ūdensvads 22 metri.";
	const rows = [
		{ Date: "2026-11-17", Works: "Ūdensvads D63", Amounts: 22, Units: "m" },
		{ Date: "2026-11-17", Works: "Neskaidra aka" },
	];
	const result = recoverReviewedDiaryRows({
		source,
		rows,
		notesCategory: "Piezīmes",
		checker: {
			...checker,
			expectedRecordCount: 2,
			rowReviews: [
				{
					rowIndex: 0,
					status: "accept",
					reason: "Atsevišķs precizējums",
					sourceText: "Iebūvēts ūdensvads D63. Ūdensvads 22 metri.",
					sourceSpans: ["Iebūvēts ūdensvads D63.", "Ūdensvads 22 metri."],
				},
				{
					rowIndex: 1,
					status: "needs_review",
					reason: "Nav akas specifikācijas",
					sourceText: "Iebūvēta aka AU1-4.",
				},
			],
		},
	});
	expect(result?.rows[0]).toEqual(rows[0]);
	expect(result?.qualities[0].status).toBe("accepted");
	expect(
		preserveAcceptedDiaryRows(
			rows,
			rows.map((row) => ({ ...row, Amounts: 999 })),
			result?.qualities ?? [],
		)[0],
	).toEqual(rows[0]);
});
