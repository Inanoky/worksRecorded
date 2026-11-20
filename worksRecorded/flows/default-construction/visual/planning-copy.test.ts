import { copyVisualPlanGeometry, visualWorkGeometry } from "./planning-copy";
import type { VisualPlan, VisualPlanInput } from "./planning-model";

const source = {
	id: "11111111-1111-4111-8111-111111111111",
	version: 3,
	geometry: {
		version: 1 as const,
		sharedZoneId: "11111111-1111-4111-8111-111111111111",
		section: "PT-10-1",
		notes: "Original instructions",
		areas: [1, 2].map((page) => ({
			id: `original-${page}`,
			page,
			polygon: [
				{ x: 0.1, y: 0.1 },
				{ x: 0.5, y: 0.1 },
				{ x: 0.5, y: 0.5 },
			],
		})),
	},
} satisfies Pick<VisualPlan, "id" | "version" | "geometry">;

it("copies an exact outline with independent vertices and source provenance", () => {
	const geometry = copyVisualPlanGeometry(source, "original-2", "copy");
	expect(geometry.areas).toHaveLength(1);
	expect(geometry.areas[0]).toEqual({
		...source.geometry.areas[1],
		id: "copy:1",
	});
	expect(geometry.copiedFrom).toEqual({
		planId: source.id,
		version: 3,
		areaIds: ["original-2"],
	});
	expect(geometry.quantitySource).toBe("area");
	expect(geometry.sharedZoneId).toBeUndefined();
	expect(geometry.notes).toBeUndefined();
	geometry.areas[0].polygon[0].x = 0.8;
	expect(source.geometry.areas[1].polygon[0].x).toBe(0.1);
});

it("copies all pages and generates stable independent geometry for batch retries", () => {
	const input = {
		clientId: source.id,
		geometryMode: "independent",
		geometry: { ...source.geometry, sharedZoneId: undefined },
		additionalWorks: [
			{
				clientId: "22222222-2222-4222-8222-222222222222",
				work: "XPS",
				unit: "m2",
			},
		],
	} as VisualPlanInput;
	const copy = visualWorkGeometry(
		input,
		input.additionalWorks?.[0].clientId ?? "",
	);
	expect(copy.areas.map(({ page }) => page)).toEqual([1, 2]);
	expect(copy.areas[0].id).not.toBe(source.geometry.areas[0].id);
	expect(copy.areas[0].polygon).toEqual(source.geometry.areas[0].polygon);
	expect(copy.copiedFrom?.planId).toBe(source.id);
	expect(
		visualWorkGeometry(input, input.additionalWorks?.[0].clientId ?? ""),
	).toEqual(copy);
	expect(visualWorkGeometry(input, source.id)).toBe(input.geometry);
	expect(
		visualWorkGeometry(
			{
				...input,
				additionalWorks: undefined,
				id: source.id,
				clientId: undefined,
			},
			source.id,
		),
	).toBe(input.geometry);
});

it("rejects a polygon that no longer exists instead of copying the whole zone", () => {
	expect(() => copyVisualPlanGeometry(source, "missing")).toThrow(
		/nav atrasts/,
	);
});
