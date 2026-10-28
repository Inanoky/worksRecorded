import type { Forma2ActualSource, Forma2Position } from "./forma2-analytics";
import type { Forma2ClientCosts } from "./forma2-client-costs";
import { spendingForecast, spendingForecastPoints } from "./spending-forecast";

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
const measured: Forma2ActualSource = {
	id: "record",
	type: "work",
	label: "Work",
	secondaryLabel: "",
	date: "2026-10-26",
	unit: "m2",
	quantity: 25,
	quantitySource: "drawing",
	selectedPositionId: "sand",
	actualCost: 100,
	hours: 10,
};
const data: Forma2ClientCosts = {
	positions: [
		parent,
		{
			...parent,
			id: "sand",
			name: "Sand",
			parentId: "pa",
			unit: "m2",
			plannedQuantity: 100,
			plannedTotalCost: 1000,
			plannedWorkCost: 1000,
		},
		{ ...parent, id: "extra", name: "Roof extra" },
	],
	sources: [
		measured,
		{
			...measured,
			id: "extra",
			selectedPositionId: "extra",
			quantity: null,
			actualCost: 50,
		},
	],
	allocations: [],
};

it("weights measured progress by contract value and includes one-off costs only once", () => {
	const result = spendingForecast(data, "2026-10-26");
	expect(result.progress).toBe(0.25);
	expect(result.contractValue).toBe(1000);
	expect(result.actual).toBe(150);
	expect(result.remainingCost).toBe(300);
	expect(result.finalCost).toBe(450);
	expect(result.daysRemaining).toBe(84);
	expect(result.finishDate).toBe("2027-01-18");
});

it("does not infer progress from reported quantities or future records", () => {
	const result = spendingForecast(
		{
			...data,
			sources: [
				{ ...measured, quantitySource: undefined, reportedQuantity: 99 },
				{ ...measured, id: "future", date: "2026-11-01", quantity: 100 },
			],
		},
		"2026-10-26",
	);
	expect(result.actual).toBe(100);
	expect(result.progress).toBe(0);
	expect(result.finalCost).toBeNull();
	expect(result.finishDate).toBeNull();
});

it("caps overrun quantities and keeps missing costs visible", () => {
	const result = spendingForecast(
		{
			...data,
			sources: [
				{ ...measured, quantity: 120 },
				{ ...measured, id: "unknown", quantity: null, actualCost: null },
			],
		},
		"2026-10-26",
	);
	expect(result.progress).toBe(1);
	expect(result.finalCost).toBe(100);
	expect(result.unknownCostRecords).toBe(1);
});

it("does not invent a completion date when no measured progress occurred recently", () => {
	const result = spendingForecast(
		{ ...data, sources: [{ ...measured, date: "2026-09-01" }] },
		"2026-10-26",
	);
	expect(result.finalCost).toBe(400);
	expect(result.recentEarned).toBe(0);
	expect(result.finishDate).toBeNull();
});

it("ends the actual line at recorded spending and the forecast line at its final cost", () => {
	const result = spendingForecastPoints(data, "2026-10-26");
	expect(result.points[0]).toMatchObject({
		date: "2026-10-26",
		actual: 150,
		forecast: 150,
	});
	expect(result.points.at(-1)).toMatchObject({
		date: "2027-01-18",
		actual: null,
		forecast: 450,
	});
	expect(
		spendingForecast({ ...data, positions: [parent] }, "2026-10-26").finalCost,
	).toBeNull();
});
