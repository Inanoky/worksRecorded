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
	if (!notesCategory || !rows.length || reviews.length > rows.length)
		return null;
	const byIndex = new Map(reviews.map((review) => [review.rowIndex, review]));
	if (
		byIndex.size !== reviews.length ||
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
	const grounded = rows.map((_, index) => {
		const review = byIndex.get(index);
		return review
			? groundDiarySourceQuotes(
					source,
					review.sourceSpans?.length ? review.sourceSpans : [review.sourceText],
				)
			: null;
	});
	const accepted = rows.map(
		(_, index) =>
			byIndex.get(index)?.status === "accept" && grounded[index] !== null,
	);
	if (!accepted.some(Boolean)) return null;
	const recovered: Row[] = [];
	const qualities: DiaryRowQuality[] = [];
	const notes = new Map<
		string,
		{ index: number; passages: string[]; count: number }
	>();
	const addNote = (
		date: string,
		passage: string,
		reason: string,
		measuredRow?: Row,
	) => {
		const key = date.slice(0, 10);
		const group = notes.get(key);
		if (group) {
			group.passages.push(passage);
			group.count++;
			recovered[group.index].Amounts = null;
			recovered[group.index].Units = null;
			qualities[group.index].reason += ` ${reason}`;
			return;
		}
		notes.set(key, { index: recovered.length, passages: [passage], count: 1 });
		recovered.push({
			Date: date,
			Works: notesCategory,
			Comments: "",
			Location: null,
			Amounts: measuredRow?.Amounts ?? null,
			Units: measuredRow?.Units ?? null,
			WorkersInvolved: null,
			TimeInvolved: null,
		});
		qualities.push({ status: "needs_review", reason });
	};
	for (const [index, row] of rows.entries()) {
		const review = byIndex.get(index);
		if (accepted[index]) {
			recovered.push({ ...row });
			qualities.push({
				status: "accepted",
				reason: review?.reason ?? "Avotā pamatots darbs",
			});
			continue;
		}
		const evidence = grounded[index];
		const measured =
			evidence !== null &&
			!checker.repairActions?.some(
				(action) =>
					action.rowIndex === index &&
					(action.field === "Amounts" || action.field === "Units") &&
					action.operation === "set_null",
			) &&
			args.measurementIsSupported?.(row, evidence) === true;
		addNote(
			String(row.Date),
			evidence ?? source,
			review?.reason ?? "Rinda nav pilnīgi pārbaudīta",
			measured ? row : undefined,
		);
	}
	if (checker.coverageComplete !== true) {
		let remainder = source;
		for (const [index, evidence] of grounded.entries()) {
			if (!accepted[index] || !evidence) continue;
			for (const passage of evidence.split("\n"))
				remainder = remainder.replace(passage, "");
		}
		addNote(
			String(rows[0].Date),
			remainder.trim() || source,
			"Avota pārklājums nav pilnīgi pārbaudīts",
		);
	}
	for (const { index, passages } of notes.values()) {
		const fragments = [
			...new Set(passages.flatMap((passage) => passage.split("\n"))),
		];
		const unique = fragments.filter(
			(fragment, index) =>
				!fragments.some(
					(other, otherIndex) =>
						index !== otherIndex && other.includes(fragment),
				),
		);
		unique.sort((a, b) => source.indexOf(a) - source.indexOf(b));
		recovered[index].Comments = buildDiaryReviewComment(unique.join("\n"));
	}
	if (!notes.size) return null;
	return { rows: recovered, qualities, reviewCount: notes.size };
}
