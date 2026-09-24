import type { VisualEvidence, VisualMark } from "./model";

const dayMs = 86_400_000;
const diaryDateFormat = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Europe/Riga",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

export function visualDiaryDay(value: string | null) {
	if (!value) return null;
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return null;
	const parts = diaryDateFormat.formatToParts(date);
	const part = (type: string) =>
		parts.find((item) => item.type === type)?.value;
	return (
		Date.parse(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`) /
		dayMs
	);
}

export function formatVisualDay(day: number) {
	return new Intl.DateTimeFormat("lv-LV", {
		timeZone: "UTC",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date(day * dayMs));
}

export function buildVisualTimeline(evidence: VisualEvidence[]) {
	const dayByEvidence = new Map(
		evidence.map((item) => [item.id, visualDiaryDay(item.date)]),
	);
	const days = [...dayByEvidence.values()].filter(
		(day): day is number => day !== null,
	);
	return {
		dayByEvidence,
		firstDay: days.length ? Math.min(...days) : null,
		lastDay: days.length ? Math.max(...days) : null,
	};
}

export function cumulativeVisualMarks(
	marks: VisualMark[],
	dayByEvidence: Map<string, number | null>,
	throughDay: number | null,
	includeUndated: boolean,
) {
	return marks.filter((mark) => {
		const day = dayByEvidence.get(mark.evidenceId);
		return day == null
			? includeUndated
			: throughDay === null || day <= throughDay;
	});
}

export function sortVisualMarksChronologically(
	marks: VisualMark[],
	evidence: VisualEvidence[],
) {
	const times = new Map(
		evidence.map((item) => [item.id, item.date ? Date.parse(item.date) : NaN]),
	);
	const time = (id: string) => {
		const value = times.get(id);
		return value !== undefined && Number.isFinite(value) ? value : Infinity;
	};
	return [...marks].sort(
		(a, b) =>
			time(a.evidenceId) - time(b.evidenceId) || a.id.localeCompare(b.id),
	);
}
