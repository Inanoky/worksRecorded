import {
	buildZodSchemaFromConfig,
	type ConfigMap,
	mapToDbFields,
} from "./AIschemas";

const configFor = (work: string) =>
	({
		Works: {
			Type: "dropdown",
			DropDownOptions: { pipe: work, notes: "Piezīmes" },
		},
		otherSettings: {
			Type: "fixed",
			defaultConstructionForma2WorkSync: {
				version: 1,
				documentId: "project-document",
				entries: [
					{ positionId: "position-water-63", work, ownedByForma2: true },
				],
			},
		},
	}) as unknown as ConfigMap;

it("resolves a project position ID to the current full work name after a catalog rename", () => {
	for (const work of [
		"1.1 Ūdensvada caurules montāža",
		"1.1 PE100 ūdensvada OD63 montāža",
	]) {
		const { schema, fieldMap, dropdownValueMaps } = buildZodSchemaFromConfig(
			configFor(work),
			{ useWorkPositionIds: true },
		);
		const output = schema.parse({ positionId: "position-water-63" });
		expect(mapToDbFields(output, fieldMap, dropdownValueMaps).Works).toBe(work);
		expect(
			schema.safeParse({ positionId: "foreign-project-position" }).success,
		).toBe(false);
		expect(schema.safeParse({ positionId: work }).success).toBe(false);
	}
});

it("provides stable category IDs for notes and preserves legacy schema behavior when disabled", () => {
	const config = configFor("Ūdensvada montāža");
	const enabled = buildZodSchemaFromConfig(config, {
		useWorkPositionIds: true,
	});
	const notes = enabled.workCatalog.find((entry) => entry.work === "Piezīmes");
	expect(notes?.positionId).toMatch(/^category:/);
	expect(
		mapToDbFields(
			{ positionId: notes?.positionId },
			enabled.fieldMap,
			enabled.dropdownValueMaps,
		).Works,
	).toBe("Piezīmes");
	expect(
		buildZodSchemaFromConfig(config).schema.safeParse({
			Works: "Ūdensvada montāža",
		}).success,
	).toBe(true);
});
