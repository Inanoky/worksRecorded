import {
	buildForma2AnalyticsView,
	calculateForma2MoneyTotals,
	extractForma2PositionsFromRows,
	type Forma2ActualSource,
	type Forma2Position,
	normalizeForma2MaterialRuleName,
	suggestForma2Position,
} from "./forma2-analytics";

const rows = [
	["Pasūtītājs", null, "SIA"],
	[
		"Nr.p.k.",
		"Būvdarbu nosaukums",
		null,
		"Mērvienība",
		"Daudzums",
		"Laika norma (c/h)",
		"Stundas likme (EUR/h)",
		"Vienības izmaksas",
		null,
		null,
		null,
		null,
		"Kopā uz visu apjomu",
	],
	[null, null, null, null, null, null, null, "Darba alga", "būvizstrādājumi"],
	["1", "Demontāžas darbi"],
	[
		"1.1",
		"Santehnikas iekārtu demontāža",
		null,
		"kpl.",
		"55",
		"8,13",
		"15",
		"121,95",
		"0",
		"16,10",
		"138,05",
		"447,15",
		"€ 6,707.25",
		"0",
		"885,50",
		"€ 7,592.75",
	],
	[
		null,
		null,
		"konteineru noma",
		"gb",
		"54",
		"0",
		"0",
		"0",
		"0",
		"376,21",
		"376,21",
		"0",
		"0",
		"0",
		"20315,34",
		"20315,34",
	],
];

describe("Forma 2 analytics", () => {
	it("normalizes equivalent material descriptions into a reusable rule key", () => {
		expect(normalizeForma2MaterialRuleName("Sakret BH 25kg — C35")).toBe(
			normalizeForma2MaterialRuleName("  SAKRET-BH 25 kg / C 35 "),
		);
	});

	it("extracts work and nested cost positions from industry-style rows", () => {
		const result = extractForma2PositionsFromRows(rows, "1-1");

		expect(result.warnings).toEqual([]);
		expect(result.positions).toHaveLength(2);
		expect(result.positions[0]).toMatchObject({
			code: "1.1",
			categoryCode: "1",
			categoryName: "Demontāžas darbi",
			kind: "work",
			unit: "kpl.",
			plannedQuantity: 55,
			laborNormHoursPerUnit: 8.13,
			hourlyRate: 15,
			plannedWorkCost: 6707.25,
			plannedMechanismCost: 885.5,
			plannedTotalCost: 7592.75,
		});
		expect(result.positions[1]).toMatchObject({
			name: "konteineru noma",
			kind: "mechanism",
			parentId: result.positions[0].id,
			plannedMechanismCost: 20315.34,
		});
	});

	it("suggests work positions by their prefix", () => {
		const positions = extractForma2PositionsFromRows(rows, "1-1").positions;
		const source: Forma2ActualSource = {
			id: "record-1",
			type: "work",
			label: "1.1 Demontāžas darbi - Santehnikas iekārtu demontāža",
			secondaryLabel: "",
			date: null,
			unit: "kpl.",
			quantity: 1,
			hours: 8.13,
			actualCost: 121.95,
		};

		expect(suggestForma2Position(source, positions)).toEqual({
			positionId: positions[0].id,
			confidence: 1,
			reason: "code",
		});
	});

	it("reconciles assigned and unassigned factual spending", () => {
		const positions = extractForma2PositionsFromRows(rows, "1-1").positions;
		const sources: Forma2ActualSource[] = [
			{
				id: "work-1",
				type: "work",
				label: "1.1 Santehnikas iekārtu demontāža",
				secondaryLabel: "",
				date: null,
				unit: "kpl.",
				quantity: 1,
				hours: 8.13,
				actualCost: 121.95,
			},
			{
				id: "material-1",
				type: "material",
				label: "Caurules",
				secondaryLabel: "Rēķins A-1",
				date: null,
				unit: "m",
				quantity: 10,
				hours: null,
				actualCost: 50,
			},
		];

		const view = buildForma2AnalyticsView({
			positions,
			sources,
			allocations: [
				{
					sourceType: "work",
					sourceId: "work-1",
					positionId: positions[0].id,
					method: "automatic",
					confidence: 1,
					assignedAt: "2026-07-29T00:00:00.000Z",
				},
			],
		});

		expect(view.summary).toMatchObject({
			factualRecords: 2,
			assignedRecords: 1,
			unassignedRecords: 1,
			factualCost: 171.95,
			assignedCost: 121.95,
			unassignedCost: 50,
		});
		expect(view.resultRows[0]).toMatchObject({
			actualWorkCost: 121.95,
			actualTotalCost: 121.95,
			assignedRecords: 1,
		});
	});

	it("summarizes journal work directly from its selected Forma 2 position", () => {
		const positions = extractForma2PositionsFromRows(rows, "1-1").positions;
		const sources: Forma2ActualSource[] = [
			{
				id: "journal-80",
				type: "work",
				selectedPositionId: positions[0].id,
				label: positions[0].name,
				secondaryLabel: "4. stÄvs",
				date: "2026-07-24T00:00:00.000Z",
				unit: "m2",
				quantity: 80,
				hours: null,
				actualCost: 1008,
			},
			{
				id: "journal-250",
				type: "work",
				selectedPositionId: positions[0].id,
				label: positions[0].name,
				secondaryLabel: "3. stÄvs",
				date: "2026-07-24T00:00:00.000Z",
				unit: "m2",
				quantity: 250,
				hours: null,
				actualCost: 3150,
			},
			{
				id: "journal-1297",
				type: "work",
				selectedPositionId: positions[0].id,
				label: positions[0].name,
				secondaryLabel: "",
				date: "2026-07-25T00:00:00.000Z",
				unit: "m2",
				quantity: 1297,
				hours: null,
				actualCost: 16342.2,
			},
		];

		const view = buildForma2AnalyticsView({
			positions,
			sources,
			allocations: [],
		});

		expect(view.summary).toMatchObject({
			factualRecords: 3,
			assignedRecords: 3,
			unassignedRecords: 0,
			assignedCost: 20500.2,
		});
		expect(view.resultRows[0]).toMatchObject({
			actualWorkCost: 20500.2,
			actualTotalCost: 20500.2,
			assignedRecords: 3,
		});
	});

	it("prefers a journal selection over an old allocation", () => {
		const positions = extractForma2PositionsFromRows(rows, "1-1").positions;
		const otherPosition: Forma2Position = {
			...positions[0],
			id: "work:other",
			code: "1.2",
			name: "Other work",
		};
		const source: Forma2ActualSource = {
			id: "journal-current-selection",
			type: "work",
			selectedPositionId: positions[0].id,
			label: positions[0].name,
			secondaryLabel: "",
			date: null,
			unit: "m2",
			quantity: 10,
			hours: null,
			actualCost: 126,
		};
		const view = buildForma2AnalyticsView({
			positions: [positions[0], otherPosition],
			sources: [source],
			allocations: [
				{
					sourceType: "work",
					sourceId: source.id,
					positionId: otherPosition.id,
					method: "manual",
					confidence: null,
					assignedAt: "2026-07-01T00:00:00.000Z",
				},
			],
		});

		expect(view.mappingRows[0].assignedPositionId).toBe(positions[0].id);
		expect(view.resultRows[0].actualWorkCost).toBe(126);
		expect(view.resultRows[1].actualWorkCost).toBe(0);
	});

	it("counts material spending assigned directly to a parent work position", () => {
		const positions = extractForma2PositionsFromRows(rows, "1-1").positions;
		const material: Forma2ActualSource = {
			id: "material-parent-1",
			type: "material",
			label: "Caurules un savienojumi",
			secondaryLabel: "Rēķins A-2",
			date: null,
			unit: "gab.",
			quantity: 12,
			hours: null,
			actualCost: 315,
		};
		const view = buildForma2AnalyticsView({
			positions,
			sources: [material],
			allocations: [
				{
					sourceType: "material",
					sourceId: material.id,
					positionId: positions[0].id,
					method: "manual",
					confidence: null,
					assignedAt: "2026-07-29T00:00:00.000Z",
				},
			],
		});

		expect(view.summary).toMatchObject({
			assignedRecords: 1,
			assignedCost: 315,
		});
		expect(view.resultRows[0]).toMatchObject({
			actualMaterialCost: 315,
			actualTotalCost: 315,
		});
	});

	it("sums every contract row without double-counting factual rollups", () => {
		const positions = extractForma2PositionsFromRows(rows, "1-1").positions;
		const materialChild = {
			...positions[1],
			kind: "material" as const,
			plannedMaterialCost: 20315.34,
			plannedMechanismCost: 0,
		};
		const material: Forma2ActualSource = {
			id: "material-child-1",
			type: "material",
			label: materialChild.name,
			secondaryLabel: "",
			date: null,
			unit: materialChild.unit,
			quantity: 1,
			hours: null,
			actualCost: 50,
		};
		const view = buildForma2AnalyticsView({
			positions: [positions[0], materialChild],
			sources: [material],
			allocations: [
				{
					sourceType: "material",
					sourceId: material.id,
					positionId: materialChild.id,
					method: "manual",
					confidence: null,
					assignedAt: "2026-07-29T00:00:00.000Z",
				},
			],
		});
		const parent = view.resultRows[0];

		expect(view.summary.plannedCost).toBe(
			parent.plannedTotalCost + materialChild.plannedTotalCost,
		);
		expect(calculateForma2MoneyTotals(view.resultRows)).toEqual({
			plannedWorkCost: parent.plannedWorkCost,
			plannedMaterialCost:
				parent.plannedMaterialCost + materialChild.plannedMaterialCost,
			plannedMechanismCost: parent.plannedMechanismCost,
			plannedTotalCost:
				parent.plannedTotalCost + materialChild.plannedTotalCost,
			actualWorkCost: parent.actualWorkCost,
			actualMaterialCost: parent.actualMaterialCost,
			actualMechanismCost: 0,
			actualTotalCost: parent.actualTotalCost,
			variance:
				parent.plannedTotalCost +
				materialChild.plannedTotalCost -
				parent.actualTotalCost,
		});
	});
});
