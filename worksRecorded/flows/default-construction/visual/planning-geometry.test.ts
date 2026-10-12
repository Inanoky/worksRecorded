import {
	insertVisualPlanVertex,
	moveVisualPlanVertex,
	nextVisualPlanAreaId,
	removeVisualPlanVertex,
	replaceVisualPlanArea,
	translateVisualPlanArea,
} from "./planning-geometry";
import type { VisualPlanArea } from "./planning-model";

const area: VisualPlanArea = {
	id: "plan-area-1",
	page: 1,
	polygon: [
		{ x: 0.1, y: 0.1 },
		{ x: 0.4, y: 0.1 },
		{ x: 0.4, y: 0.4 },
	],
};

it("moves and clamps one vertex without mutating the original area", () => {
	const moved = moveVisualPlanVertex(area, 0, { x: -0.2, y: 1.2 });
	expect(moved.polygon[0]).toEqual({ x: 0, y: 1 });
	expect(area.polygon[0]).toEqual({ x: 0.1, y: 0.1 });
});

it("adds midpoint vertices and never removes the final three", () => {
	const inserted = insertVisualPlanVertex(area, 0);
	expect(inserted.polygon).toEqual([
		area.polygon[0],
		{ x: 0.25, y: 0.1 },
		...area.polygon.slice(1),
	]);
	expect(removeVisualPlanVertex(inserted, 1).polygon).toEqual(area.polygon);
	expect(removeVisualPlanVertex(area, 0)).toBe(area);
});

it("moves the whole area while preserving its shape inside page bounds", () => {
	const moved = translateVisualPlanArea(area, 0.8, -0.3);
	expect(moved.polygon[0]).toEqual({ x: 0.7, y: 0 });
	expect(moved.polygon[1]).toEqual({ x: 1, y: 0 });
	expect(moved.polygon[2].x).toBe(1);
	expect(moved.polygon[2].y).toBeCloseTo(0.3);
	expect(moved.polygon[1].x - moved.polygon[0].x).toBeCloseTo(
		area.polygon[1].x - area.polygon[0].x,
	);
	expect(moved.polygon[2].y - moved.polygon[1].y).toBeCloseTo(
		area.polygon[2].y - area.polygon[1].y,
	);
});

it("replaces only the matching area and creates collision-free local ids", () => {
	const sibling = { ...area, id: "plan-area-2" };
	const updated = { ...area, page: 2 };
	expect(replaceVisualPlanArea([area, sibling], updated)).toEqual([
		updated,
		sibling,
	]);
	expect(nextVisualPlanAreaId([area, sibling])).toBe("plan-area-3");
	expect(nextVisualPlanAreaId([{ id: "plan-area-3" }])).toBe("plan-area-2");
});
