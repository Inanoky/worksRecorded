import type { Forma2Position } from "./forma2-analytics";
import { getDefaultConstructionForma2WorkSyncManifest } from "./forma2-work-options-manifest";
import {
	buildDefaultConstructionForma2LegacyWorkEntries,
	buildDefaultConstructionForma2WorkOptionName,
	reconcileForma2WorkManifestAfterOptionsSave,
	removeDefaultConstructionForma2WorkOptions,
	syncDefaultConstructionForma2WorkOptions,
} from "./forma2-work-options-sync";
import {
	DEFAULT_CONSTRUCTION_SYSTEM_WORKS,
	getDefaultConstructionProductivitySettings,
} from "./site-diary-productivity-settings";

function position(
	overrides: Partial<Forma2Position> & Pick<Forma2Position, "id" | "name">,
): Forma2Position {
	return {
		code: "1.1",
		categoryCode: "1",
		categoryName: "Demontāžas darbi",
		kind: "work",
		parentId: null,
		sourceRow: 10,
		unit: "m2",
		plannedQuantity: 10,
		laborNormHoursPerUnit: 0.5,
		hourlyRate: 20,
		plannedWorkCost: 100,
		plannedMaterialCost: 0,
		plannedMechanismCost: 0,
		plannedTotalCost: 100,
		...overrides,
		id: overrides.id,
		name: overrides.name,
	};
}

function config() {
	return {
		Works: {
			Type: "dropdown",
			DropDownOptions: { Manual: "Manual work" },
		},
		Units: {
			Type: "dropdown",
			DropDownOptions: { m: "m" },
		},
		otherSettings: {
			defaultConstructionProductivity: {
				version: 4,
				works: [
					{
						work: "Manual work",
						unit: "m",
						laborNormHoursPerUnit: 1,
						hourlyCost: 15,
						costCalculationMode: "hourly",
					},
				],
			},
		},
	};
}

describe("Forma 2 Darbi option synchronization", () => {
	it("adds only work positions with estimate productivity values", () => {
		const work = position({ id: "work-1", name: "Sienu demontāža" });
		const material = position({
			id: "material-1",
			name: "Ķieģeļi",
			kind: "material",
		});
		const result = syncDefaultConstructionForma2WorkOptions({
			config: config(),
			documentId: "document-1",
			positions: [work, material],
		});
		const importedName = "1.1 Demontāžas darbi - Sienu demontāža";

		expect(Object.values(result.config.Works.DropDownOptions)).toEqual(
			expect.arrayContaining([
				importedName,
				"Manual work",
				...DEFAULT_CONSTRUCTION_SYSTEM_WORKS,
			]),
		);
		expect(Object.values(result.config.Units.DropDownOptions)).toEqual([
			"m",
			"m2",
		]);
		expect(result).toMatchObject({
			importedWorks: 1,
			addedWorks: 1,
			linkedManualWorks: 0,
		});
		expect(
			getDefaultConstructionProductivitySettings(result.config).works,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					work: importedName,
					unit: "m2",
					laborNormHoursPerUnit: 0.5,
					hourlyCost: 20,
					costCalculationMode: "output",
					source: expect.objectContaining({
						positionId: "work-1",
						ownedByForma2: true,
					}),
				}),
			]),
		);
	});

	it("links an exact manual option without taking ownership", () => {
		const existing = position({
			id: "work-1",
			code: "",
			categoryName: "",
			name: "Manual work",
		});
		const synced = syncDefaultConstructionForma2WorkOptions({
			config: config(),
			documentId: "document-1",
			positions: [existing],
		});
		const manifest = getDefaultConstructionForma2WorkSyncManifest(
			synced.config,
		);

		expect(synced.linkedManualWorks).toBe(1);
		expect(manifest?.entries[0]).toMatchObject({
			work: "Manual work",
			ownedByForma2: false,
		});
		const removed = removeDefaultConstructionForma2WorkOptions(synced.config);
		expect(Object.values(removed.config.Works.DropDownOptions)).toEqual(
			expect.arrayContaining([
				"Manual work",
				...DEFAULT_CONSTRUCTION_SYSTEM_WORKS,
			]),
		);
		expect(removed.removedWorks).toBe(0);
	});

	it("reconciles replacement positions and removes only old owned options", () => {
		const first = syncDefaultConstructionForma2WorkOptions({
			config: config(),
			documentId: "document-1",
			positions: [position({ id: "old", name: "Vecais darbs" })],
		});
		const replacement = syncDefaultConstructionForma2WorkOptions({
			config: first.config,
			documentId: "document-2",
			positions: [position({ id: "new", code: "2.1", name: "Jaunais darbs" })],
		});
		const works = Object.values(replacement.config.Works.DropDownOptions);

		expect(works).toContain("Manual work");
		expect(works).toContain("2.1 Demontāžas darbi - Jaunais darbs");
		expect(works.some((work) => String(work).includes("Vecais"))).toBe(false);
		expect(replacement).toMatchObject({ addedWorks: 1, removedWorks: 1 });
	});

	it("prevents active Forma 2-owned names from being removed manually", () => {
		const synced = syncDefaultConstructionForma2WorkOptions({
			config: config(),
			documentId: "document-1",
			positions: [position({ id: "work-1", name: "Sienu demontāža" })],
		});

		expect(() =>
			reconcileForma2WorkManifestAfterOptionsSave(synced.config, [
				{
					work: "Manual work",
					unit: "m",
					laborNormHoursPerUnit: 1,
				},
			]),
		).toThrow("cannot be renamed or deleted");
	});

	it("builds only unique legacy labels for imports without a manifest", () => {
		const unique = position({ id: "work-1", name: "Unique work" });
		const duplicateA = position({ id: "duplicate-1", name: "Duplicate" });
		const duplicateB = position({ id: "duplicate-2", name: "Duplicate" });

		expect(
			buildDefaultConstructionForma2LegacyWorkEntries([
				unique,
				duplicateA,
				duplicateB,
			]),
		).toEqual([
			{
				positionId: unique.id,
				work: buildDefaultConstructionForma2WorkOptionName(unique),
			},
		]);
	});

	it("builds a stable prefixed category label", () => {
		expect(
			buildDefaultConstructionForma2WorkOptionName(
				position({ id: "work-1", name: "Sienu demontāža" }),
			),
		).toBe("1.1 Demontāžas darbi - Sienu demontāža");
	});
});
