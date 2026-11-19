import {
	automaticallyAssignForma2Sources,
	getForma2AssignmentCandidates,
	isCompatibleForma2Assignment,
} from "@/flows/default-construction/backend/forma2-auto-assignment";
import type {
	Forma2ActualSource,
	Forma2Position,
} from "@/flows/default-construction/lib/forma2-analytics";
import { suggestForma2Position } from "@/flows/default-construction/lib/forma2-analytics";

const workPosition: Forma2Position = {
	id: "work-1",
	code: "1.1",
	categoryCode: "1",
	categoryName: "Demontāžas darbi",
	name: "1.1 Demontāžas darbi - Santehnikas iekārtu demontāža",
	kind: "work",
	parentId: null,
	sourceRow: 10,
	unit: "kpl",
	plannedQuantity: 1,
	laborNormHoursPerUnit: 8.12,
	hourlyRate: 15,
	plannedWorkCost: 121.8,
	plannedMaterialCost: 0,
	plannedMechanismCost: 0,
	plannedTotalCost: 121.8,
};

const materialPosition: Forma2Position = {
	...workPosition,
	id: "material-1",
	code: "",
	name: "Maisītāja komplekts",
	kind: "material",
	parentId: workPosition.id,
	sourceRow: 11,
	unit: "gab.",
};

const materialSource: Forma2ActualSource = {
	id: "invoice-row-1",
	type: "material",
	label: "Vannas maisītājs ar dušas komplektu",
	secondaryLabel: "Piegādātājs · INV-15",
	date: null,
	unit: "kpl",
	quantity: 2,
	hours: null,
	actualCost: 240,
};

describe("Forma 2 automatic assignment", () => {
	it("quarantines an explicit code that contradicts the described work before either assignment path", async () => {
		const pipe = {
			...workPosition,
			id: "sewer-pipe",
			code: "2.4",
			categoryName: "Sadzīves kanalizācija",
			name: "PP kanalizācijas caurule D200",
			unit: "m",
		};
		const well = {
			...workPosition,
			id: "water-well",
			code: "1.4",
			categoryName: "Ūdensvads",
			name: "Dzelzsbetona skataka DN1000",
			unit: "kompl",
		};
		const source = {
			...materialSource,
			type: "work" as const,
			label: "2.4 Ūdensvada dzelzsbetona skataka DN1000",
			unit: "kompl",
		};
		const parse = jest.fn();
		expect(suggestForma2Position(source, [pipe, well])).toBeNull();
		expect(
			await automaticallyAssignForma2Sources({
				sources: [source],
				positions: [pipe, well],
				existingAllocations: [],
				openai: { responses: { parse } } as never,
			}),
		).toEqual([]);
		expect(parse).not.toHaveBeenCalled();
	});

	it("keeps a small work catalog available even when the spoken label has no shared words", () => {
		const positions = Array.from({ length: 60 }, (_, index) => ({
			...workPosition,
			id: `work-${index}`,
			code: `1.${index}`,
			name: `Darbs ${index}`,
			categoryName: "Būvdarbi",
			sourceRow: index,
		}));
		const candidates = getForma2AssignmentCandidates(
			{ ...materialSource, type: "work", label: "Sagatavots būvlaukums" },
			positions,
		);
		expect(candidates).toHaveLength(60);
		expect(candidates.some((candidate) => candidate.id === "work-59")).toBe(
			true,
		);
	});
	it("passes only the matching brain guidance to each source type", async () => {
		const parse = jest.fn().mockResolvedValue({
			output_parsed: {
				assignments: [
					{
						sourceIndex: 0,
						positionId: null,
						confidence: 0,
						reason: "unclear",
					},
					{
						sourceIndex: 1,
						positionId: null,
						confidence: 0,
						reason: "unclear",
					},
				],
			},
		});
		await automaticallyAssignForma2Sources({
			sources: [
				{ ...materialSource, label: "Unknown material" },
				{
					...materialSource,
					id: "work-source",
					type: "work",
					label: "Unknown task",
				},
			],
			positions: [workPosition, materialPosition],
			existingAllocations: [],
			openai: { responses: { parse } } as never,
			feedback: { material: "WAREHOUSE ONLY", work: "DIARY ONLY" },
		});
		const payload = JSON.parse(parse.mock.calls[0][0].input);
		const input = payload.sources;
		expect(
			new Set(
				payload.candidates.map(
					(candidate: { positionId: string }) => candidate.positionId,
				),
			).size,
		).toBe(payload.candidates.length);
		expect(
			input.find((item: { type: string }) => item.type === "material")
				.projectGuidance,
		).toBe("WAREHOUSE ONLY");
		expect(
			input.find((item: { type: string }) => item.type === "work")
				.projectGuidance,
		).toBe("DIARY ONLY");
	});
	it("never asks AI to overwrite a manual partial split", async () => {
		const result = await automaticallyAssignForma2Sources({
			sources: [materialSource],
			positions: [workPosition, materialPosition],
			existingAllocations: [
				{
					sourceType: "material",
					sourceId: materialSource.id,
					positionId: workPosition.id,
					method: "manual",
					confidence: null,
					assignedAt: "2026-09-25",
					split: {
						mode: "quantity",
						parts: [{ positionId: workPosition.id, value: 0.5 }],
					},
				},
			],
		});
		expect(result).toEqual([]);
	});
	it("allows materials to use a material row or a top-level work fallback", () => {
		expect(isCompatibleForma2Assignment(materialSource, materialPosition)).toBe(
			true,
		);
		expect(isCompatibleForma2Assignment(materialSource, workPosition)).toBe(
			true,
		);
		expect(
			isCompatibleForma2Assignment(materialSource, {
				...workPosition,
				id: "nested-work",
				parentId: workPosition.id,
			}),
		).toBe(false);
	});

	it("prefers material candidates even when invoice and Forma 2 units differ", () => {
		const candidates = getForma2AssignmentCandidates(materialSource, [
			workPosition,
			materialPosition,
		]);
		expect(candidates[0]?.id).toBe(materialPosition.id);
	});

	it("keeps existing assignments and deterministically assigns exact work codes", async () => {
		const source: Forma2ActualSource = {
			...materialSource,
			id: "diary-1",
			type: "work",
			label: workPosition.name,
			unit: "kpl",
		};
		const allocations = await automaticallyAssignForma2Sources({
			sources: [source],
			positions: [workPosition],
			existingAllocations: [],
		});
		expect(allocations).toHaveLength(1);
		expect(allocations[0]).toMatchObject({
			sourceType: "work",
			sourceId: source.id,
			positionId: workPosition.id,
			method: "automatic",
		});
	});
});

it("keeps restored estimate-only positions out of automatic candidates and suggestions", () => {
	const position = { ...workPosition, manualAssignmentOnly: true };
	const source = {
		...materialSource,
		type: "work" as const,
		label: position.name,
	};
	expect(getForma2AssignmentCandidates(source, [position])).toEqual([]);
	expect(suggestForma2Position(source, [position])).toBeNull();
	expect(isCompatibleForma2Assignment(source, position)).toBe(true);
});
