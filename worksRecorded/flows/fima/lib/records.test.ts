import {
	buildPayload,
	canWrite,
	emptyProposal,
	materialPatch,
	parseMasts,
	proposalSchema,
	readiness,
	spanLength,
	verifyReference,
} from "./records";

const ready = () => ({
	...emptyProposal("2026-09-04"),
	description: "Pilns pārbaudīts apraksts. ".repeat(20),
	quantity: 2,
	measurement: "110",
	workers: 8,
	start: "19:00",
	end: "05:00",
	responsibleId: "307319",
	responsibleType: "logbooks_responsible_person",
	buildingIds: ["4419462"],
	reviewed: true,
});
test("preserves the full description and overnight source shift without injecting notes", () => {
	const p = { ...ready(), notes: "Do not put this in BIS" };
	const result = buildPayload(p, null);
	expect(result.data.attributes.description).toBe(p.description);
	expect(result.data.attributes.event_time_from).toBe("19:00");
	expect(result.data.attributes.event_time_to).toBe("05:00");
	expect(JSON.stringify(result)).not.toContain(p.notes);
});
test("does not invent workers, quantities or missing times", () => {
	expect(readiness(emptyProposal("2026-09-04")).length).toBeGreaterThan(5);
	expect(() => buildPayload(emptyProposal(), null)).toThrow();
});
test("retains zero material quantities independently from work quantity", () => {
	const payload = buildPayload(
		{
			...ready(),
			materials: [
				{
					id: "10",
					name: "Material",
					unit: "gab.",
					quantity: 0,
					plannedQuantity: 5,
				},
			],
		},
		null,
	);
	expect(payload.data.relationships.detail.data.attributes.quantity).toBe(2);
	expect(
		payload.data.relationships.logbook_used_construction_materials.data[0]
			.attributes.quantity,
	).toBe(0);
});
test("protects external and submitted records", () => {
	for (const status of ["approved", "approving", "opened_for_update"])
		expect(canWrite({ bisId: "1", managed: true, bisStatus: status })).toBe(
			false,
		);
	expect(canWrite({ bisId: "1", managed: false, bisStatus: "draft" })).toBe(
		false,
	);
	expect(canWrite({ bisId: "1", managed: true, bisStatus: "draft" })).toBe(
		true,
	);
});
test("normalizes leading zeros but never changes mast prefixes or suffixes", () => {
	expect(parseMasts("21-09,21-7b,21-7a,22-18//21-18")).toEqual([
		"21-9",
		"21-7B",
		"21-7A",
		"22-18",
		"21-18",
	]);
});
test("calculates a continuous route exactly once", () => {
	const spans = [
		{ from: "a", to: "b", metres: 51, drawing: "KT-2 rev9" },
		{ from: "b", to: "c", metres: 42.27, drawing: "KT-2 rev9" },
	];
	expect(spanLength(spans)).toBe(93.27);
	expect(() =>
		spanLength([
			...spans,
			{ from: "c", to: "b", metres: 42.27, drawing: "KT-2" },
		]),
	).toThrow();
	expect(() => spanLength([spans[1], spans[0]])).toThrow();
});
test("rejects invalid calendar dates and invalid counts", () => {
	expect(() =>
		proposalSchema.parse({ ...ready(), date: "2026-02-30" }),
	).toThrow();
	expect(() => proposalSchema.parse({ ...ready(), workers: -1 })).toThrow();
});
test("verifies actual remote fields including drawings and building", () => {
	const p = ready();
	const ref = {
		description: p.description,
		event_date: { from: p.date },
		event_time: { from: p.start, to: p.end },
		detail: { quantity: { count: "2.0", measurement: "110" }, employees: 8 },
		responsible_person: { id: 307319 },
		case_buildings: [{ id: 4419462 }],
		project_documents: [],
	};
	expect(verifyReference(p, ref)).toBe(true);
	expect(
		verifyReference(p, { ...ref, description: p.description.slice(0, 200) }),
	).toBe(false);
});

test("material edits reuse BIS usage IDs and explicitly remove omitted joins", () => {
	const materials = [
		{ id: "7", name: "Tube", unit: "gab.", quantity: 0, plannedQuantity: 2 },
		{ id: "8", name: "Wheel", unit: "gab.", quantity: 2, plannedQuantity: 2 },
	];
	const patch = materialPatch(materials, [
		{ id: "usage-7", attributes: { construction_material_id: 7, quantity: 2 } },
		{ id: "usage-9", attributes: { construction_material_id: 9, quantity: 1 } },
	]);
	expect(patch).toEqual([
		{
			type: "construction_materials_join",
			id: "usage-7",
			attributes: { construction_material_id: "7", quantity: 0 },
		},
		{
			type: "construction_materials_join",
			attributes: { construction_material_id: "8", quantity: 2 },
		},
		{
			type: "construction_materials_join",
			id: "usage-9",
			attributes: { _destroy: true },
		},
	]);
});
