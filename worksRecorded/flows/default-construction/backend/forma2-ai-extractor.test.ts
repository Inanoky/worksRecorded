import {
	normalizeForma2AiExtraction,
	reconcileForma2Extractions,
	selectForma2AiWorksheets,
} from "./forma2-ai-extractor";

describe("Forma 2 AI extraction", () => {
	it("normalizes structured positions and links nested rows to their parent", () => {
		const sheets = normalizeForma2AiExtraction({
			sheets: [
				{
					sheetName: "Forma 2",
					positions: [
						{
							sourceRow: 12,
							code: "1.1",
							categoryCode: "1",
							categoryName: "Demontāžas darbi",
							name: "Santehnikas iekārtu demontāža",
							kind: "work",
							parentCode: "/null",
							unit: "kpl.",
							plannedQuantity: 55,
							laborNormHoursPerUnit: 8.12,
							hourlyRate: 15,
							plannedWorkCost: 6699,
							plannedMaterialCost: 0,
							plannedMechanismCost: 0,
							plannedTotalCost: 6699,
						},
						{
							sourceRow: 13,
							code: "",
							categoryCode: "1",
							categoryName: "Demontāžas darbi",
							name: "Konteinera noma",
							kind: "mechanism",
							parentCode: "1.1",
							unit: "gab.",
							plannedQuantity: 2,
							laborNormHoursPerUnit: null,
							hourlyRate: null,
							plannedWorkCost: 0,
							plannedMaterialCost: 0,
							plannedMechanismCost: 300,
							plannedTotalCost: 0,
						},
					],
				},
			],
		});

		expect(sheets).toHaveLength(1);
		expect(sheets[0].positions[0]).toMatchObject({
			code: "1.1",
			laborNormHoursPerUnit: 8.12,
			hourlyRate: 15,
			parentId: null,
		});
		expect(sheets[0].positions[1]).toMatchObject({
			kind: "mechanism",
			parentId: sheets[0].positions[0].id,
			plannedTotalCost: 300,
		});
	});

	it("prefers a complete known-template extraction over the AI result", () => {
		const position = {
			id: "work:1",
			code: "1.1",
			categoryCode: "1",
			categoryName: "Darbi",
			name: "Darbs",
			kind: "work" as const,
			parentId: null,
			sourceRow: 10,
			unit: "m2",
			plannedQuantity: 1,
			laborNormHoursPerUnit: null,
			hourlyRate: null,
			plannedWorkCost: 10,
			plannedMaterialCost: 0,
			plannedMechanismCost: 0,
			plannedTotalCost: 10,
		};
		const result = reconcileForma2Extractions({
			sheetNames: ["1-1", "1-2"],
			aiSheets: [
				{ sheetName: "1-1", positions: [position], warnings: [] },
				{ sheetName: "1-2", positions: [position], warnings: [] },
			],
			deterministicSheets: [
				{
					sheetName: "1-1",
					positions: [position, { ...position, id: "work:2", code: "1.2" }],
					warnings: [],
				},
			],
		});

		expect(
			result.map((sheet) => [sheet.sheetName, sheet.positions.length]),
		).toEqual([
			["1-1", 2],
			["1-2", 1],
		]);
	});

	it("sends likely detail worksheets to AI and skips unrelated workbook tabs", () => {
		const worksheets = [
			{
				sheetName: "Titullapa",
				rows: Array.from({ length: 10 }, () => []),
				worksheetText: 'R1: A="Projekts"\nR8: A="Paraksts"',
				deterministicPositionCount: 0,
			},
			{
				sheetName: "Forma 2",
				rows: Array.from({ length: 40 }, () => []),
				worksheetText:
					'R5: A="Pozīcija" | B="Nosaukums" | C="Mērv." | D="Daudzums" | E="Darba alga" | F="Materiāli" | G="Kopā"\nR6: A="1.1" | B="Demontāža"',
				deterministicPositionCount: 0,
			},
			{
				sheetName: "Forma 3 kopsavilkums",
				rows: Array.from({ length: 20 }, () => []),
				worksheetText: 'R4: A="Kopā" | B="Summa"',
				deterministicPositionCount: 0,
			},
		];

		expect(
			selectForma2AiWorksheets(worksheets).map((sheet) => sheet.sheetName),
		).toEqual(["Forma 2"]);
	});

	it("always includes a worksheet recognized by the deterministic extractor", () => {
		const worksheets = [
			{
				sheetName: "Unusual tab name",
				rows: Array.from({ length: 20 }, () => []),
				worksheetText: 'R1: A="Custom construction table"',
				deterministicPositionCount: 12,
			},
			{
				sheetName: "Notes",
				rows: Array.from({ length: 20 }, () => []),
				worksheetText: 'R1: A="Notes"',
				deterministicPositionCount: 0,
			},
		];

		expect(
			selectForma2AiWorksheets(worksheets).map((sheet) => sheet.sheetName),
		).toEqual(["Unusual tab name"]);
	});
});
