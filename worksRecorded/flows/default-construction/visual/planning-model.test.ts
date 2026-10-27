import {
	compareVisualPlanProgress,
	findVisualPlanConflict,
	type VisualPlan,
	visualPlanAreasSchema,
	visualPlanInputSchema,
	visualPlanIntervalsOverlap,
} from "./planning-model";

it("retains detailed wall boundaries and room-sized areas without reducing them to coarse outlines", () => {
	const polygon = Array.from({ length: 96 }, (_, index) => {
		const angle = (index / 96) * Math.PI * 2;
		return { x: 0.5 + Math.cos(angle) * 0.3, y: 0.5 + Math.sin(angle) * 0.3 };
	});
	const geometry = {
		version: 1,
		areas: Array.from({ length: 64 }, (_, index) => ({
			id: `room-${index}`,
			page: 1,
			polygon,
		})),
	};
	expect(visualPlanAreasSchema.parse(geometry).areas[0].polygon).toEqual(
		polygon,
	);
	expect(visualPlanAreasSchema.parse(geometry).areas).toHaveLength(64);
	expect(
		visualPlanAreasSchema.safeParse({
			...geometry,
			areas: Array.from({ length: 257 }, (_, index) => ({
				...geometry.areas[0],
				id: `room-${index}`,
			})),
		}).success,
	).toBe(false);
});

function plan(overrides: Partial<VisualPlan> = {}): VisualPlan {
	return {
		id: "11111111-1111-4111-8111-111111111111",
		version: 1,
		drawingId: "22222222-2222-4222-8222-222222222222",
		work: "XPS",
		location: "1. stāvs",
		unit: "m²",
		quantity: 100,
		startDate: "2026-10-12",
		endDate: "2026-10-18",
		contactId: null,
		geometry: {
			version: 1,
			areas: [
				{
					id: "area-1",
					page: 1,
					polygon: [
						{ x: 0.1, y: 0.1 },
						{ x: 0.5, y: 0.1 },
						{ x: 0.5, y: 0.5 },
					],
				},
			],
		},
		geometryReviewRequired: false,
		archivedAt: null,
		...overrides,
	};
}

it("validates a multi-area plan and rejects reversed dates or invalid polygons", () => {
	const valid = plan();
	expect(
		visualPlanInputSchema.parse({
			siteId: "33333333-3333-4333-8333-333333333333",
			drawingId: valid.drawingId,
			work: valid.work,
			location: valid.location,
			unit: valid.unit,
			quantity: valid.quantity,
			startDate: valid.startDate,
			endDate: valid.endDate,
			geometry: valid.geometry,
		}),
	).toMatchObject({ quantity: 100 });
	expect(
		visualPlanInputSchema.safeParse({
			siteId: "33333333-3333-4333-8333-333333333333",
			drawingId: valid.drawingId,
			work: valid.work,
			location: valid.location,
			unit: valid.unit,
			quantity: valid.quantity,
			startDate: "2026-10-19",
			endDate: "2026-10-18",
			geometry: valid.geometry,
		}).success,
	).toBe(false);
	expect(
		visualPlanInputSchema.safeParse({
			siteId: "33333333-3333-4333-8333-333333333333",
			drawingId: valid.drawingId,
			work: valid.work,
			location: valid.location,
			unit: valid.unit,
			quantity: valid.quantity,
			startDate: valid.startDate,
			endDate: valid.endDate,
			geometry: {
				version: 1,
				areas: [
					{
						id: "crossed",
						page: 1,
						polygon: [
							{ x: 0, y: 0 },
							{ x: 1, y: 1 },
							{ x: 0, y: 1 },
							{ x: 1, y: 0 },
						],
					},
				],
			},
		}).success,
	).toBe(false);
});

it("treats a shared boundary date as an overlap and ignores archived conflicts", () => {
	const existing = plan();
	const candidate = plan({
		id: "44444444-4444-4444-8444-444444444444",
		startDate: existing.endDate,
		endDate: "2026-10-20",
	});
	expect(visualPlanIntervalsOverlap(existing, candidate)).toBe(true);
	expect(findVisualPlanConflict(candidate, [existing])?.id).toBe(existing.id);
	expect(
		findVisualPlanConflict(candidate, [
			plan({ archivedAt: "2026-10-11T12:00:00.000Z" }),
		]),
	).toBeUndefined();
});

it("normalizes work, floor, and unit when finding conflicts", () => {
	const existing = plan();
	const candidate = plan({
		id: "44444444-4444-4444-8444-444444444444",
		work: " xps ",
		location: "1.  STĀVS",
		unit: "M²",
	});
	expect(findVisualPlanConflict(candidate, [existing])?.id).toBe(existing.id);
});

it("counts matching actual quantities from the start date through today", () => {
	const result = compareVisualPlanProgress(
		plan(),
		[
			{
				id: "early",
				date: "2026-10-11",
				work: "XPS",
				location: "1. stāvs",
				unit: "m²",
				quantity: 50,
			},
			{
				id: "included",
				date: "2026-10-13",
				work: "xps",
				location: "1. stāvs",
				unit: "M²",
				quantity: 60,
			},
			{
				id: "future",
				date: "2026-10-17",
				work: "XPS",
				location: "1. stāvs",
				unit: "m²",
				quantity: 50,
			},
		],
		"2026-10-15",
	);
	expect(result).toMatchObject({
		actualIds: ["included"],
		actualQuantity: 60,
		progressPercent: 60,
		variance: -40,
		status: "active",
	});
});

it("continues live progress after the deadline and flags incomplete quantities", () => {
	expect(
		compareVisualPlanProgress(
			plan(),
			[
				{
					id: "late",
					date: "2026-10-20",
					work: "XPS",
					location: "1. stāvs",
					unit: "m²",
					quantity: 120,
				},
			],
			"2026-10-20",
		).status,
	).toBe("completed");
	expect(
		compareVisualPlanProgress(
			plan(),
			[
				{
					id: "unknown",
					date: "2026-10-14",
					work: "XPS",
					location: "1. stāvs",
					unit: "m²",
					quantity: null,
				},
			],
			"2026-10-20",
		),
	).toMatchObject({
		actualQuantity: null,
		progressPercent: null,
		dataIncomplete: true,
		status: "overdue",
	});
});
