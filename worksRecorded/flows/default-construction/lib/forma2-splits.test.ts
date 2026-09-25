import {
	buildForma2AnalyticsView,
	calculateForma2MoneyTotals,
	type Forma2ActualSource,
	type Forma2Position,
} from "./forma2-analytics";
import { calculateForma2Split, type Forma2Split } from "./forma2-splits";

const source: Forma2ActualSource = {
	id: "invoice",
	type: "material",
	label: "Concrete",
	secondaryLabel: "",
	date: null,
	unit: "m3",
	quantity: 1.5,
	hours: null,
	actualCost: 145.5,
};
const parts = [
	{ positionId: "a", value: 0.5 },
	{ positionId: "b", value: 1 },
];
const position = (
	id: string,
	parentId: string | null = null,
): Forma2Position => ({
	id,
	parentId,
	kind: parentId ? "material" : "work",
	name: id,
	code: id,
	categoryCode: "",
	categoryName: "",
	sourceRow: 1,
	unit: "m3",
	plannedQuantity: 10,
	laborNormHoursPerUnit: null,
	hourlyRate: null,
	plannedWorkCost: 0,
	plannedMaterialCost: 200,
	plannedMechanismCost: 0,
	plannedTotalCost: 200,
});

it("splits 1.5 m3 into 0.5 and 1 m3 without duplicating the invoice", () => {
	const split = { mode: "quantity" as const, parts };
	expect(calculateForma2Split(split, source)).toMatchObject({
		parts: [
			{ positionId: "a", quantity: 0.5, actualCost: 48.5 },
			{ positionId: "b", quantity: 1, actualCost: 97 },
		],
		remainingCost: 0,
	});
	const view = buildForma2AnalyticsView({
		positions: [position("a"), position("b")],
		sources: [source],
		allocations: [
			{
				sourceType: "material",
				sourceId: source.id,
				positionId: "a",
				method: "manual",
				confidence: null,
				assignedAt: "2026-09-25",
				split,
			},
		],
	});
	expect(view.resultRows.map((row) => row.actualMaterialCost)).toEqual([
		48.5, 97,
	]);
	expect(view.resultRows.map((row) => row.actualQuantity)).toEqual([
		null,
		null,
	]);
	expect(view.summary).toMatchObject({
		factualRecords: 1,
		assignedCost: 145.5,
		unassignedCost: 0,
	});
	expect(calculateForma2MoneyTotals(view.resultRows).actualTotalCost).toBe(
		145.5,
	);
});

it.each([
	{ mode: "quantity", parts: [{ positionId: "a", value: 0.5 }] },
	{ mode: "percent", parts: [{ positionId: "a", value: 100 / 3 }] },
	{ mode: "cost", parts: [{ positionId: "a", value: 48.5 }] },
] as Forma2Split[])("tracks partial allocation by $mode", (split) => {
	const view = buildForma2AnalyticsView({
		positions: [position("a")],
		sources: [source],
		allocations: [
			{
				sourceType: "material",
				sourceId: source.id,
				positionId: "a",
				method: "manual",
				confidence: null,
				assignedAt: "2026-09-25",
				split,
			},
		],
	});
	expect(view.summary).toMatchObject({
		assignedCost: 48.5,
		unassignedCost: 97,
		unassignedRecords: 1,
	});
	expect(view.mappingRows[0].unallocatedCost).toBe(97);
});

it("preserves cents for a fully allocated shared charge", () => {
	const result = calculateForma2Split(
		{
			mode: "percent",
			parts: [
				{ positionId: "a", value: 33.33 },
				{ positionId: "b", value: 33.33 },
				{ positionId: "c", value: 33.34 },
			],
		},
		{ quantity: null, actualCost: 79.98 },
	);
	expect(
		result.parts.reduce(
			(sum, part) => sum + Math.round(part.actualCost * 100),
			0,
		),
	).toBe(7998);
	expect(result.remainingCost).toBe(0);
});

it.each([NaN, Infinity, -1, 0, 2])(
	"rejects invalid or excessive quantity %p",
	(value) => {
		expect(() =>
			calculateForma2Split(
				{ mode: "quantity", parts: [{ positionId: "a", value }] },
				source,
			),
		).toThrow();
	},
);

it("rejects duplicate positions and sub-cent euro allocations", () => {
	expect(() =>
		calculateForma2Split(
			{
				mode: "quantity",
				parts: [
					{ positionId: "a", value: 0.5 },
					{ positionId: "a", value: 0.5 },
				],
			},
			source,
		),
	).toThrow();
	expect(() =>
		calculateForma2Split(
			{ mode: "cost", parts: [{ positionId: "a", value: 0.001 }] },
			source,
		),
	).toThrow();
});

it("counts an invoice once in a parent while including both child shares", () => {
	const view = buildForma2AnalyticsView({
		positions: [
			position("parent"),
			position("a", "parent"),
			position("b", "parent"),
		],
		sources: [source],
		allocations: [
			{
				sourceType: "material",
				sourceId: source.id,
				positionId: "a",
				method: "manual",
				confidence: null,
				assignedAt: "2026-09-25",
				split: { mode: "quantity", parts },
			},
		],
	});
	expect(view.resultRows[0]).toMatchObject({
		actualMaterialCost: 145.5,
		assignedRecords: 1,
	});
	expect(calculateForma2MoneyTotals(view.resultRows).actualTotalCost).toBe(
		145.5,
	);
});
