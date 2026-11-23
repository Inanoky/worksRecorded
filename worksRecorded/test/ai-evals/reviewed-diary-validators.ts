import type { DiaryExtractionEvalCase } from "./reviewed-diary-cases";

export type ReviewedDiaryActualRow = {
	id: string;
	dateISO: string | null;
	work: string | null;
	location: string | null;
	comment: string | null;
	amount: number | null;
	unit: string | null;
	workers: number | null;
	hours: number | null;
	forma2PositionId: string | null;
	needsReview?: boolean;
};
type Check = {
	name: string;
	status: "pass" | "fail";
	severity: "critical";
	message: string;
};
export function reviewedDiaryUnit(value: string | null) {
	const unit = (value ?? "")
		.normalize("NFKC")
		.toLocaleLowerCase("lv")
		.replace(/[\s.^]/g, "");
	if (["kompl", "komplekts", "komplekti", "kpl", "set", "sets"].includes(unit))
		return "kompl";
	if (["gab", "gb", "pcs", "pc"].includes(unit)) return "gab";
	return unit;
}
function numberMatches(actual: number | null, expected: number | null) {
	return expected === null
		? actual === null
		: typeof actual === "number" &&
				Number.isFinite(actual) &&
				Math.abs(actual - expected) < 0.005;
}
const workKey = (value: string) =>
	value
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLocaleLowerCase("lv")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
const locationKey = (value: string | null) =>
	(value ?? "").toLocaleLowerCase("lv").replace(/\s+/gu, "");
const requiresNarrative = (
	row: DiaryExtractionEvalCase["expectedRecords"][number],
) =>
	row.commentSignals.length > 0 ||
	(/^(?:piezīmes?|notes?|dīkst[aā]ve|kavēšanās)$/iu.test(row.work) &&
		row.amount === null &&
		row.workers === null &&
		row.hours === null);
function identityMatches(
	actual: ReviewedDiaryActualRow,
	expected: DiaryExtractionEvalCase["expectedRecords"][number],
) {
	return (
		actual.forma2PositionId === expected.forma2PositionId &&
		(expected.forma2PositionId !== null ||
			(expected.workAlternatives ?? [expected.work]).some(
				(work) => workKey(work) === workKey(actual.work ?? ""),
			))
	);
}
function fieldMatches(
	actual: ReviewedDiaryActualRow,
	expected: DiaryExtractionEvalCase["expectedRecords"][number],
) {
	const quantities = expected.quantityAlternatives ?? [
		{ amount: expected.amount, unit: expected.unit },
	];
	return {
		date: actual.dateISO === expected.dateISO,
		amount: quantities.some((quantity) =>
			numberMatches(actual.amount, quantity.amount),
		),
		unit: quantities.some(
			(quantity) =>
				reviewedDiaryUnit(actual.unit) === reviewedDiaryUnit(quantity.unit),
		),
		workers: numberMatches(actual.workers, expected.workers),
		hours: numberMatches(actual.hours, expected.hours),
		location:
			!expected.checkLocation ||
			(expected.locationAlternatives ?? [expected.location]).some(
				(location) => locationKey(location) === locationKey(actual.location),
			),
		content:
			expected.commentSignals.every((signal) =>
				(actual.comment ?? "")
					.toLocaleLowerCase("lv")
					.includes(signal.toLocaleLowerCase("lv")),
			) &&
			(!requiresNarrative(expected) || Boolean(actual.comment?.trim())),
		reviewState:
			Boolean(actual.needsReview) === Boolean(expected.reviewRequired),
	};
}
function rowMatches(
	actual: ReviewedDiaryActualRow,
	expected: DiaryExtractionEvalCase["expectedRecords"][number],
) {
	return (
		identityMatches(actual, expected) &&
		Object.values(fieldMatches(actual, expected)).every(Boolean) &&
		(
			expected.quantityAlternatives ?? [
				{ amount: expected.amount, unit: expected.unit },
			]
		).some(
			(quantity) =>
				numberMatches(actual.amount, quantity.amount) &&
				reviewedDiaryUnit(actual.unit) === reviewedDiaryUnit(quantity.unit),
		)
	);
}
export function validateReviewedDiaryCase(
	evalCase: DiaryExtractionEvalCase,
	rows: ReviewedDiaryActualRow[],
	positions: Array<{ id: string }>,
) {
	const results: Check[] = [];
	const check = (name: string, passed: boolean, message: string): void => {
		results.push({
			name,
			status: passed ? "pass" : "fail",
			severity: "critical",
			message,
		});
	};
	check(
		"record-count",
		rows.length === evalCase.expectedRecords.length,
		`Sagaidīti ${evalCase.expectedRecords.length} ieraksti, saņemti ${rows.length}.`,
	);
	const knownPositions = new Set(positions.map((position) => position.id));
	check(
		"catalog-position-scope",
		rows.every(
			(row) =>
				row.forma2PositionId === null ||
				knownPositions.has(row.forma2PositionId),
		),
		"Forma2 piesaistes drīkst norādīt tikai uz fiksētā projekta katalogu.",
	);
	const owner = new Map<number, number>();
	const assign = (expectedIndex: number, seen: Set<number>): boolean => {
		for (const [actualIndex, row] of rows.entries()) {
			if (
				seen.has(actualIndex) ||
				!rowMatches(row, evalCase.expectedRecords[expectedIndex])
			)
				continue;
			seen.add(actualIndex);
			const previous = owner.get(actualIndex);
			if (previous === undefined || assign(previous, seen)) {
				owner.set(actualIndex, expectedIndex);
				return true;
			}
		}
		return false;
	};
	for (const index of evalCase.expectedRecords.keys()) assign(index, new Set());
	const matched = new Set(owner.values());
	const pairs = new Map(
		[...owner].map(([actualIndex, expectedIndex]) => [
			expectedIndex,
			actualIndex,
		]),
	);
	const used = new Set(owner.keys());
	for (const [expectedIndex, expected] of evalCase.expectedRecords.entries()) {
		if (pairs.has(expectedIndex)) continue;
		const best = rows
			.map((row, index) => ({
				row,
				index,
				score: Object.values(fieldMatches(row, expected)).filter(Boolean)
					.length,
			}))
			.filter(
				({ row, index }) => !used.has(index) && identityMatches(row, expected),
			)
			.sort(
				(a, b) =>
					b.score - a.score ||
					JSON.stringify(a.row).localeCompare(JSON.stringify(b.row)),
			)[0];
		if (best) {
			pairs.set(expectedIndex, best.index);
			used.add(best.index);
		}
	}
	const fields = [
		"date",
		"amount",
		"unit",
		"workers",
		"hours",
		"location",
		"content",
		"reviewState",
	] as const;
	const quality = {
		expectedRecords: evalCase.expectedRecords.length,
		actualRecords: rows.length,
		matchedWorks: pairs.size,
		missingWorks: evalCase.expectedRecords.length - pairs.size,
		unexpectedWorks: rows.length - pairs.size,
		fields: Object.fromEntries(
			fields.map((field) => [
				field,
				{
					correct: [...pairs]
						.filter(
							([expectedIndex]) =>
								field !== "location" ||
								evalCase.expectedRecords[expectedIndex].checkLocation,
						)
						.filter(
							([expectedIndex]) =>
								field !== "content" ||
								requiresNarrative(evalCase.expectedRecords[expectedIndex]),
						)
						.filter(
							([expectedIndex, actualIndex]) =>
								fieldMatches(
									rows[actualIndex],
									evalCase.expectedRecords[expectedIndex],
								)[field],
						).length,
					total:
						field === "location"
							? evalCase.expectedRecords.filter((row) => row.checkLocation)
									.length
							: field === "content"
								? evalCase.expectedRecords.filter(requiresNarrative).length
								: evalCase.expectedRecords.length,
				},
			]),
		),
	};
	for (const field of fields) {
		const metric = quality.fields[field];
		check(
			`quality:${field}`,
			metric.correct === metric.total,
			`${field}: pareizi ${metric.correct}/${metric.total} sagaidāmajiem ierakstiem.`,
		);
	}
	for (const [index, expected] of evalCase.expectedRecords.entries()) {
		check(
			`expected-record:${index + 1}`,
			matched.has(index),
			matched.has(index)
				? `Atrasts ${expected.work}: ${expected.amount ?? "null"} ${expected.unit ?? ""}, ${expected.dateISO}.`
				: `Nav atrasts viennozīmīgi atbilstošs ieraksts: ${JSON.stringify({ work: expected.work, date: expected.dateISO, amount: expected.amount, unit: expected.unit, workers: expected.workers, hours: expected.hours, position: expected.forma2PositionId })}. Saņemts: ${JSON.stringify(rows)}.`,
		);
	}
	const criticalFailures = results.filter(
		(result) => result.status === "fail",
	).length;
	return {
		caseId: evalCase.id,
		status: criticalFailures ? ("fail" as const) : ("pass" as const),
		criticalFailures,
		warnings: 0,
		quality,
		results,
	};
}
