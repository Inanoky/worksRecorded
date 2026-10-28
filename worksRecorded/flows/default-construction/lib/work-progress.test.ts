import type { Forma2ActualSource, Forma2Position } from "./forma2-analytics";
import type { Forma2ClientCosts } from "./forma2-client-costs";
import { workProgress } from "./work-progress";

const parent: Forma2Position = {
	id: "pa",
	code: "PA1.6",
	name: "PA1.6",
	categoryCode: "",
	categoryName: "",
	kind: "work",
	parentId: null,
	sourceRow: 1,
	unit: "",
	plannedQuantity: null,
	laborNormHoursPerUnit: null,
	hourlyRate: null,
	plannedWorkCost: 0,
	plannedMaterialCost: 0,
	plannedMechanismCost: 0,
	plannedTotalCost: 0,
};
const record: Forma2ActualSource = {
	id: "record",
	type: "work",
	label: "Sand",
	secondaryLabel: "",
	date: "2026-10-26",
	quantitySource: "drawing",
	quantity: 25,
	unit: "m2",
	selectedPositionId: "sand",
	hours: null,
	actualCost: null,
};
const data: Forma2ClientCosts = {
	positions: [
		parent,
		{ ...parent, id: "sand", parentId: "pa", unit: "m2", plannedQuantity: 100 },
		{ ...parent, id: "film", parentId: "pa", unit: "m2", plannedQuantity: 100 },
	],
	sources: [record],
	allocations: [],
};
const groups = [
	{ id: "sand", label: "Smilts", color: "#16a34a" },
	{ id: "film", label: "Plēve", color: "#2563eb" },
];
const mapping = { sand: "sand", film: "film" };

it("shows measured m², completion, recent pace and an end date per work", () => {
	const result = workProgress(data, groups, mapping, "2026-10-26");
	expect(result.summaries[0]).toMatchObject({
		actual: 25,
		planned: 100,
		progress: 0.25,
		remaining: 75,
		daysRemaining: 84,
		finishDate: "2027-01-18",
	});
	expect(
		result.points.find((point) => point.date === "2027-01-18")?.values.sand,
	).toMatchObject({ actual: null, forecast: 100, forecastPercent: 100 });
	expect(result.summaries[1].finishDate).toBeNull();
});

it("does not count invoices, unmeasured reports, incompatible units or future records as completed work", () => {
	const result = workProgress(
		{
			...data,
			sources: [
				record,
				{ ...record, id: "invoice", type: "material", quantity: 500 },
				{ ...record, id: "reported", quantitySource: undefined, quantity: 100 },
				{ ...record, id: "future", date: "2026-11-01", quantity: 100 },
				{ ...record, id: "hours", unit: "h", quantity: 20 },
			],
		},
		groups,
		mapping,
		"2026-10-26",
	);
	expect(result.summaries[0].actual).toBe(25);
	expect(result.measuredRecords).toBe(1);
});

it("keeps overrun m² while capping each contract position independently", () => {
	const result = workProgress(
		{
			...data,
			positions: [
				...data.positions,
				{
					...parent,
					id: "sand2",
					parentId: "pa",
					unit: "m2",
					plannedQuantity: 100,
				},
			],
			sources: [{ ...record, quantity: 120 }],
		},
		groups,
		{ ...mapping, sand2: "sand" },
		"2026-10-26",
	);
	expect(result.summaries[0]).toMatchObject({
		actual: 120,
		completed: 100,
		planned: 200,
		remaining: 100,
		progress: 0.5,
	});
	expect(result.summaries[0].finishDate).not.toBeNull();
});

it("combines PA sections by work name while allowing section filtering", () => {
	const combined = {
		...data,
		positions: [
			...data.positions,
			{ ...parent, id: "pa2" },
			{
				...parent,
				id: "sand2",
				parentId: "pa2",
				unit: "m2",
				plannedQuantity: 200,
			},
		],
		sources: [
			record,
			{ ...record, id: "two", selectedPositionId: "sand2", quantity: 50 },
		],
	};
	expect(
		workProgress(combined, groups, { ...mapping, sand2: "sand" }, "2026-10-26")
			.summaries[0],
	).toMatchObject({ actual: 75, planned: 300, progress: 0.25 });
	expect(
		workProgress(
			combined,
			groups,
			{ ...mapping, sand2: "sand" },
			"2026-10-26",
			"pa2",
		).summaries[0],
	).toMatchObject({ actual: 50, planned: 200 });
});

it("keeps old measured work visible but does not invent a recent pace", () => {
	const result = workProgress(
		{ ...data, sources: [{ ...record, date: "2026-09-01" }] },
		groups,
		mapping,
		"2026-10-26",
	);
	expect(result.summaries[0]).toMatchObject({
		actual: 25,
		recentPerDay: 0,
		finishDate: null,
	});
	expect(result.points.at(-1)?.values.sand.actual).toBe(25);
});
