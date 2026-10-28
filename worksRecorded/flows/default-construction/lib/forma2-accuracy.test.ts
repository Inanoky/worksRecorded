import {
	buildForma2AnalyticsView,
	calculateForma2MoneyTotals,
	type Forma2ActualSource,
	type Forma2Position,
} from "./forma2-analytics";
import { forma2UnmatchedBeginSources } from "./forma2-begin-sources";
import { readDefaultConstructionRecordedHours } from "./site-diary-productivity-settings";

const position: Forma2Position = {
	id: "parent",
	code: "PA1.1",
	categoryCode: "",
	categoryName: "",
	name: "Section",
	kind: "work",
	parentId: null,
	sourceRow: 1,
	unit: "",
	plannedQuantity: null,
	laborNormHoursPerUnit: null,
	hourlyRate: null,
	plannedWorkCost: 10,
	plannedMaterialCost: 20,
	plannedMechanismCost: 5,
	plannedTotalCost: 35,
};
const child = {
	...position,
	id: "child",
	parentId: "parent",
	unit: "m2",
	plannedWorkCost: 100,
	plannedMaterialCost: 200,
	plannedMechanismCost: 50,
	plannedTotalCost: 350,
};
const source: Forma2ActualSource = {
	id: "record",
	type: "work",
	selectedPositionId: "child",
	label: "Work",
	secondaryLabel: "",
	date: null,
	unit: "m2",
	quantity: 131.43,
	reportedQuantity: 128,
	quantitySource: "drawing",
	hours: 5,
	actualCost: 70,
};

it("shows section contract subtotals while counting contract and actual costs once", () => {
	const view = buildForma2AnalyticsView({
		positions: [position, child],
		sources: [source],
		allocations: [],
	});
	expect(view.resultRows[0]).toMatchObject({
		plannedWorkCost: 110,
		plannedMaterialCost: 220,
		plannedMechanismCost: 55,
		plannedTotalCost: 385,
		actualTotalCost: 70,
		variance: 315,
	});
	expect(view.resultRows[1].actualQuantity).toBe(131.43);
	expect(calculateForma2MoneyTotals(view.resultRows)).toMatchObject({
		plannedTotalCost: 385,
		actualTotalCost: 70,
		variance: 315,
	});
	expect(view.summary.plannedCost).toBe(385);
});
it("conserves split invoice cents across material and mechanism totals", () => {
	const view = buildForma2AnalyticsView({
		positions: [position, child],
		sources: [
			{
				...source,
				id: "invoice",
				type: "material",
				selectedPositionId: null,
				quantitySource: undefined,
				quantity: 3,
				actualCost: 10.01,
			},
		],
		allocations: [
			{
				sourceType: "material",
				sourceId: "invoice",
				positionId: "parent",
				method: "manual",
				confidence: null,
				assignedAt: "now",
				costKind: "mechanism",
				split: {
					mode: "cost",
					parts: [
						{ positionId: "parent", value: 3.34 },
						{ positionId: "child", value: 6.67 },
					],
				},
			},
		],
	});
	expect(calculateForma2MoneyTotals(view.resultRows)).toMatchObject({
		actualMaterialCost: 0,
		actualMechanismCost: 10.01,
		actualTotalCost: 10.01,
	});
	expect(view.summary.unassignedCost).toBe(0);
});
it("uses exact saved Begin minutes with source matching and preserves zero", () => {
	const config = {
		otherSettings: {
			beginSalaryAllocation: {
				costSource: "begin-report",
				sourceReportId: "r",
				planSha256: "p",
			},
		},
	};
	const record = {
		TimeInvolved: 99,
		evalMetadata: {
			beginSalaryAllocation: {
				kind: "begin-salary-allocation:v1",
				currency: "EUR",
				sourceReportId: "r",
				planSha256: "p",
				totalMinutes: 125,
			},
		},
	};
	expect(readDefaultConstructionRecordedHours(config, record)).toBe(125 / 60);
	record.evalMetadata.beginSalaryAllocation.totalMinutes = 0;
	expect(readDefaultConstructionRecordedHours(config, record)).toBe(0);
	record.evalMetadata.beginSalaryAllocation.sourceReportId = "different";
	expect(readDefaultConstructionRecordedHours(config, record)).toBeNull();
});
it("includes only explicitly selected unmatched Begin costs and hours without fabricated m²", () => {
	const config = {
		otherSettings: {
			beginSalaryAllocation: {
				costSource: "begin-report",
				sourceReportId: "r",
				unmatchedPositionId: "other",
				includedUnmatchedSourceIds: ["one"],
				unallocated: [
					{
						sourceId: "one",
						worker: "Worker",
						date: "16.10.2026",
						sourceCell: "N84",
						sourceMinutes: 273,
						costCents: 11000,
					},
					{ sourceId: "conflict", costCents: 10000 },
				],
			},
		},
	};
	expect(forma2UnmatchedBeginSources(config)).toMatchObject([
		{
			id: "begin:r:one",
			actualCost: 110,
			hours: 4.55,
			quantity: null,
			selectedPositionId: "other",
		},
	]);
});
