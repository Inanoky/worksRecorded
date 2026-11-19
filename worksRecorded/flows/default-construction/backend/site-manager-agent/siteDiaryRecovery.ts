import { buildDiaryReviewComment } from "./diaryReviewNotes";
import { groundDiarySourceQuotes } from "./diarySourceQuotes";
import type { SiteDiaryExtractionCheckerResult } from "./siteDiaryExtractionChecker";

type Row = Record<string, unknown>;

export function preserveAcceptedDiaryRows(
	original: Row[],
	repaired: Row[],
	qualities: DiaryRowQuality[],
) {
	const key = (row: Row) => JSON.stringify([row.Works, row.Location ?? null]);
	const result = repaired.map((row) => ({ ...row }));
	for (const [index, row] of original.entries()) {
		if (qualities[index]?.status !== "accepted") continue;
		const matches = result
			.map((candidate, position) =>
				key(candidate) === key(row) ? position : -1,
			)
			.filter((position) => position >= 0);
		if (
			matches.length !== 1 ||
			original.filter((candidate) => key(candidate) === key(row)).length !== 1
		)
			return original.map((item) => ({ ...item }));
		result[matches[0]] = { ...row };
	}
	return result;
}
export type DiaryRowQuality = {
	status: "accepted" | "needs_review";
	reason: string;
};

export function recoverReviewedDiaryRows(args: {
	rows: Row[];
	checker: SiteDiaryExtractionCheckerResult;
	source: string;
	notesCategory?: string;
	measurementIsSupported?: (row: Row, source: string) => boolean;
}) {
	const { rows, checker, source, notesCategory } = args;
	const reviews = checker.rowReviews ?? [];
	if (
		!notesCategory ||
		rows.length < 2 ||
		checker.coverageComplete !== true ||
		checker.expectedRecordCount !== rows.length ||
		reviews.length !== rows.length
	)
		return null;
	const byIndex = new Map(reviews.map((review) => [review.rowIndex, review]));
	if (
		byIndex.size !== rows.length ||
		reviews.some(
			(review) => review.rowIndex < 0 || review.rowIndex >= rows.length,
		)
	)
		return null;
	if (
		rows.some(
			(row) =>
				typeof row.Date !== "string" ||
				!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(row.Date) ||
				!Number.isFinite(new Date(row.Date).getTime()),
		)
	)
		return null;
	const qualities: DiaryRowQuality[] = [];
	const recovered = rows.map((row, index) => {
		const review = byIndex.get(index);
		if (!review) throw new Error("Missing reviewed row");
		const groundedSource = groundDiarySourceQuotes(
			source,
			review.sourceSpans?.length ? review.sourceSpans : [review.sourceText],
		);
		if (review.status === "accept" && groundedSource) {
			qualities.push({ status: "accepted", reason: review.reason });
			return { ...row };
		}
		const reason = groundedSource
			? review.reason
			: `Nav pārbaudāma precīza saite uz avota tekstu. ${review.reason}`;
		qualities.push({ status: "needs_review", reason });
		const measured =
			groundedSource !== null &&
			!checker.repairActions?.some(
				(action) =>
					action.rowIndex === index &&
					(action.field === "Amounts" || action.field === "Units") &&
					action.operation === "set_null",
			) &&
			args.measurementIsSupported?.(row, groundedSource) === true;
		return {
			Date: row.Date,
			Works: notesCategory,
			Comments: buildDiaryReviewComment(groundedSource ?? source),
			Location: null,
			Amounts: measured ? row.Amounts : null,
			Units: measured ? row.Units : null,
			WorkersInvolved: null,
			TimeInvolved: null,
		};
	});
	if (
		!qualities.some((quality) => quality.status === "accepted") ||
		!qualities.some((quality) => quality.status === "needs_review")
	)
		return null;
	return {
		rows: recovered,
		qualities,
		reviewCount: qualities.filter(
			(quality) => quality.status === "needs_review",
		).length,
	};
}
