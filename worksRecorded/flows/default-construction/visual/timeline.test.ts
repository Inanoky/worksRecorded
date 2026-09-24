import type { VisualEvidence, VisualMark } from "./model";
import {
	buildVisualTimeline,
	cumulativeVisualMarks,
	formatVisualDay,
	sortVisualMarksChronologically,
	visualDiaryDay,
} from "./timeline";

const evidence = (id: string, date: string | null) =>
	({ id, date }) as VisualEvidence;
const mark = (id: string) => ({ id, evidenceId: id }) as VisualMark;

it("sorts source zones oldest first with times and undated zones last without mutating input", () => {
	const marks = [mark("missing"), mark("late"), mark("early"), mark("older")];
	expect(
		sortVisualMarksChronologically(marks, [
			evidence("missing", null),
			evidence("late", "2026-09-23T12:00:00Z"),
			evidence("early", "2026-09-23T08:00:00Z"),
			evidence("older", "2026-09-20"),
		]).map((item) => item.id),
	).toEqual(["older", "early", "late", "missing"]);
	expect(marks[0].id).toBe("missing");
});

it("uses the Latvian diary date consistently across UTC midnight and DST", () => {
	expect(visualDiaryDay("2026-09-21T21:30:00Z")).toBe(
		visualDiaryDay("2026-09-22"),
	);
	expect(visualDiaryDay("2026-12-01T22:30:00Z")).toBe(
		visualDiaryDay("2026-12-02"),
	);
	expect(formatVisualDay(visualDiaryDay("2026-09-22") as number)).toBe(
		"22.09.2026",
	);
});

it("handles missing and invalid dates without inventing a diary date", () => {
	expect(visualDiaryDay(null)).toBeNull();
	expect(visualDiaryDay("not-a-date")).toBeNull();
	expect(buildVisualTimeline([evidence("missing", null)])).toMatchObject({
		firstDay: null,
		lastDay: null,
	});
});

it("derives the full range from unsorted source dates including days without new work", () => {
	const timeline = buildVisualTimeline([
		evidence("latest", "2026-09-23"),
		evidence("first", "2026-09-20"),
		evidence("duplicate", "2026-09-20"),
		evidence("missing", null),
	]);
	expect((timeline.lastDay as number) - (timeline.firstDay as number)).toBe(3);
	expect(
		cumulativeVisualMarks(
			[mark("latest"), mark("first"), mark("duplicate"), mark("missing")],
			timeline.dayByEvidence,
			visualDiaryDay("2026-09-21"),
			false,
		).map((item) => item.id),
	).toEqual(["first", "duplicate"]);
});

it("includes the selected day and accumulates earlier zones without adding future ones", () => {
	const timeline = buildVisualTimeline([
		evidence("first", "2026-09-20"),
		evidence("second", "2026-09-21"),
		evidence("future", "2026-09-23"),
	]);
	expect(
		cumulativeVisualMarks(
			[mark("first"), mark("second"), mark("future")],
			timeline.dayByEvidence,
			visualDiaryDay("2026-09-21"),
			false,
		).map((item) => item.id),
	).toEqual(["first", "second"]);
});

it("includes undated zones only when explicitly requested", () => {
	const timeline = buildVisualTimeline([
		evidence("dated", "2026-09-20"),
		evidence("undated", null),
	]);
	const marks = [mark("dated"), mark("undated")];
	expect(
		cumulativeVisualMarks(
			marks,
			timeline.dayByEvidence,
			timeline.lastDay,
			false,
		),
	).toHaveLength(1);
	expect(
		cumulativeVisualMarks(
			marks,
			timeline.dayByEvidence,
			timeline.lastDay,
			true,
		),
	).toHaveLength(2);
});
