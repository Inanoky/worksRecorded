import {
	buildForma2AnalyticsView,
	calculateForma2MoneyTotals,
	type Forma2Position,
} from "./forma2-analytics";
import {
	type Forma2ClientCosts,
	getForma2ClientCostDetails,
} from "./forma2-client-costs";

const parent: Forma2Position = {
	id: "pa",
	code: "PA1.1",
	name: "PA1.1",
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
const snapshot: Forma2ClientCosts = {
	positions: [
		parent,
		{ ...parent, id: "child", parentId: "pa", unit: "m2" },
		{ ...parent, id: "extra", name: "Additional work" },
	],
	sources: [
		{
			id: "labour",
			type: "work",
			selectedPositionId: "child",
			label: "Begin matched",
			secondaryLabel: "",
			date: null,
			unit: "m2",
			quantity: 12,
			hours: 5,
			costSource: "begin-report",
			actualCost: 100,
		},
		{
			id: "begin:report:row",
			type: "work",
			selectedPositionId: "extra",
			label: "Begin unmatched",
			secondaryLabel: "",
			date: null,
			unit: "h",
			quantity: null,
			hours: 2,
			costSource: "begin-report",
			actualCost: 25,
		},
		{
			id: "invoice",
			type: "material",
			label: "Invoice",
			secondaryLabel: "",
			date: null,
			unit: "",
			quantity: 1,
			hours: null,
			actualCost: 10.01,
		},
		{
			id: "rental",
			type: "material",
			label: "Rental",
			secondaryLabel: "",
			date: null,
			unit: "",
			quantity: 1,
			hours: null,
			actualCost: 8,
		},
	],
	allocations: [
		{
			sourceType: "material",
			sourceId: "invoice",
			positionId: "child",
			method: "manual",
			assignedAt: "",
			confidence: null,
			split: {
				mode: "cost",
				parts: [
					{ positionId: "child", value: 6.67 },
					{ positionId: "extra", value: 3.34 },
				],
			},
		},
		{
			sourceType: "material",
			sourceId: "rental",
			positionId: "child",
			method: "manual",
			assignedAt: "",
			confidence: null,
			costKind: "mechanism",
		},
	],
};

it("opens parent labour details from the same snapshot as the totals", () => {
	const details = getForma2ClientCostDetails(snapshot, {
		positionId: "pa",
		costType: "work",
	});
	expect(details.calculatedTotal).toBe(100);
	expect(details.records[0]).toMatchObject({
		hours: 5,
		costSource: "begin-report",
		assignedPosition: { id: "child" },
	});
	const view = buildForma2AnalyticsView({
		...snapshot,
		includeSuggestions: false,
	});
	expect(calculateForma2MoneyTotals(view.resultRows).actualWorkCost).toBe(125);
	expect(
		getForma2ClientCostDetails(snapshot, {
			positionId: "extra",
			costType: "work",
		}).records[0],
	).toMatchObject({ readOnly: true, actualCost: 25 });
});

it("preserves invoice split cents and excludes mechanisms from material cost", () => {
	expect(
		getForma2ClientCostDetails(snapshot, {
			positionId: "pa",
			costType: "material",
		}).calculatedTotal,
	).toBe(6.67);
	expect(
		getForma2ClientCostDetails(snapshot, {
			positionId: "extra",
			costType: "material",
		}).calculatedTotal,
	).toBe(3.34);
	expect(
		getForma2ClientCostDetails(snapshot, {
			positionId: "pa",
			costType: "total",
		}).calculatedTotal,
	).toBe(114.67);
});

it("recalculates after cached assignments change without mutating the snapshot", () => {
	const next = {
		...snapshot,
		sources: snapshot.sources.map((row) =>
			row.id === "labour" ? { ...row, selectedPositionId: "extra" } : row,
		),
	};
	expect(
		getForma2ClientCostDetails(next, { positionId: "pa", costType: "work" })
			.calculatedTotal,
	).toBe(0);
	expect(
		getForma2ClientCostDetails(snapshot, { positionId: "pa", costType: "work" })
			.calculatedTotal,
	).toBe(100);
});
