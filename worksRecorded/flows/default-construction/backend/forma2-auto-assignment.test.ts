import {
	automaticallyAssignForma2Sources,
	getForma2AssignmentCandidates,
	isCompatibleForma2Assignment,
} from "@/flows/default-construction/backend/forma2-auto-assignment";
import type {
	Forma2ActualSource,
	Forma2Position,
} from "@/flows/default-construction/lib/forma2-analytics";

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
