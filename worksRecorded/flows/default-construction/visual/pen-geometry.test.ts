import { simplifyPenOutline } from "./pen-geometry";
import { visualPlanAreaSchema } from "./planning-model";

it("simplifies a densely sampled closed sketch into an editable rectangle without changing its area", () => {
	const points = [];
	for (let i = 0; i < 100; i++) points.push({ x: 0.1 + i * 0.008, y: 0.1 });
	for (let i = 0; i < 100; i++) points.push({ x: 0.9, y: 0.1 + i * 0.008 });
	for (let i = 0; i < 100; i++) points.push({ x: 0.9 - i * 0.008, y: 0.9 });
	for (let i = 0; i <= 100; i++) points.push({ x: 0.1, y: 0.9 - i * 0.008 });
	const polygon = simplifyPenOutline(points, 1000, 600);
	expect(polygon).toHaveLength(4);
	expect(
		visualPlanAreaSchema.safeParse({ id: "area", page: 1, polygon }).success,
	).toBe(true);
});
it("reduces a curved stylus outline to at most 40 vertices within normalized bounds", () => {
	const points = Array.from({ length: 1500 }, (_, i) => ({
		x: 0.5 + 0.3 * Math.cos((i * 2 * Math.PI) / 1499),
		y: 0.5 + 0.3 * Math.sin((i * 2 * Math.PI) / 1499),
	}));
	const polygon = simplifyPenOutline(points, 5000, 3000);
	expect(polygon.length).toBeGreaterThanOrEqual(3);
	expect(polygon.length).toBeLessThanOrEqual(40);
	expect(
		visualPlanAreaSchema.safeParse({ id: "area", page: 1, polygon }).success,
	).toBe(true);
});
it("removes duplicate closing points without manufacturing an area from a line", () => {
	expect(
		simplifyPenOutline(
			[
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
			],
			1000,
			1000,
		),
	).toHaveLength(2);
});
