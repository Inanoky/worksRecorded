import type { SpendingEntry } from "./spending-timeline";
import {
	spendingBucket,
	spendingDate,
	spendingTimeline,
	spendingWorkTimeline,
} from "./spending-timeline";

const entry: SpendingEntry = {
	id: "one",
	sourceId: "one",
	sourceType: "work",
	date: "2026-10-01",
	label: "Labour",
	sectionId: "pa",
	section: "PA1.6",
	positionId: "screed",
	position: "Screed",
	kind: "work",
	cents: 10001,
	invoiceUrl: null,
	invoiceNumber: null,
};

it("keeps exact cents, fills quiet days and matches cumulative totals", () => {
	const rows = [
		entry,
		{
			...entry,
			id: "two",
			date: "2026-10-03",
			kind: "material" as const,
			cents: 20002,
		},
	];
	const daily = spendingTimeline(rows, {
		from: "2026-10-01",
		to: "2026-10-03",
		period: "day",
	});
	expect(daily.points.map((row) => row.total)).toEqual([100.01, 0, 200.02]);
	expect(daily.totals.total).toBe(300.03);
	const cumulative = spendingTimeline(rows, {
		from: "2026-10-01",
		to: "2026-10-03",
		period: "day",
		cumulative: true,
	});
	expect(cumulative.points.map((row) => row.total)).toEqual([
		100.01, 100.01, 300.03,
	]);
});

it("combines PA sections into the same cumulative work line and preserves credits", () => {
	const points = spendingWorkTimeline(
		[
			entry,
			{
				...entry,
				id: "two",
				date: "2026-10-03",
				sectionId: "pa2",
				positionId: "screed2",
				cents: 20002,
			},
			{ ...entry, id: "credit", date: "2026-10-03", cents: -100 },
		],
		{ screed: "estrich", screed2: "estrich" },
		[{ id: "estrich", label: "Estrich / betons", color: "#dc2626" }],
		{ from: "2026-10-01", to: "2026-10-03", period: "day" },
	);
	expect(points.map((point) => point.values.estrich)).toEqual([
		100.01, 100.01, 299.03,
	]);
});

it("filters by section and date without including costs before the chosen period", () => {
	const result = spendingTimeline(
		[
			entry,
			{ ...entry, id: "two", date: "2026-10-03" },
			{ ...entry, id: "other", date: "2026-10-03", sectionId: "other" },
		],
		{
			from: "2026-10-02",
			to: "2026-10-03",
			period: "week",
			cumulative: true,
			sectionId: "pa",
		},
	);
	expect(result.totals.total).toBe(100.01);
	expect(result.points).toHaveLength(1);
	expect(result.points[0].date).toBe("2026-09-28");
});

it("does not invent dates or treat missing amounts as zero-priced records", () => {
	const result = spendingTimeline(
		[
			entry,
			{ ...entry, id: "unknown", sourceId: "unknown", cents: null },
			{ ...entry, id: "undated", date: null, cents: 550 },
		],
		{ from: "2026-10-01", to: "2026-10-03", period: "day" },
	);
	expect(result.missingCostRecords).toBe(1);
	expect(result.undatedCost).toBe(5.5);
	expect(result.totals.total).toBe(100.01);
});

it("uses Riga calendar dates and Monday-based weeks", () => {
	expect(spendingDate("2026-09-30T22:30:00Z")).toBe("2026-10-01");
	expect(spendingDate("bad-date")).toBeNull();
	expect(spendingBucket("2026-10-04", "week")).toBe("2026-09-28");
	expect(spendingBucket("2026-10-31", "month")).toBe("2026-10-01");
});

it("keeps credits and rejects inverted ranges", () => {
	const result = spendingTimeline(
		[entry, { ...entry, id: "credit", kind: "material", cents: -100 }],
		{ from: "2026-10-01", to: "2026-10-01", period: "day" },
	);
	expect(result.totals.total).toBe(99.01);
	expect(() =>
		spendingTimeline([], {
			from: "2026-10-03",
			to: "2026-10-01",
			period: "day",
		}),
	).toThrow("invalid-date-range");
});
