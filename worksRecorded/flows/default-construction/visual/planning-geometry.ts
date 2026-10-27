import { VISUAL_MAX_POLYGON_POINTS } from "./model";
import type { VisualPlanArea } from "./planning-model";

export type VisualPlanPoint = VisualPlanArea["polygon"][number];

export function clampVisualPlanPoint(point: VisualPlanPoint): VisualPlanPoint {
	return {
		x: Math.max(0, Math.min(1, point.x)),
		y: Math.max(0, Math.min(1, point.y)),
	};
}

export function moveVisualPlanVertex(
	area: VisualPlanArea,
	index: number,
	point: VisualPlanPoint,
): VisualPlanArea {
	return {
		...area,
		polygon: area.polygon.map((current, currentIndex) =>
			currentIndex === index ? clampVisualPlanPoint(point) : current,
		),
	};
}

export function insertVisualPlanVertex(
	area: VisualPlanArea,
	afterIndex: number,
): VisualPlanArea {
	if (area.polygon.length >= VISUAL_MAX_POLYGON_POINTS) return area;
	const current = area.polygon[afterIndex];
	const next = area.polygon[(afterIndex + 1) % area.polygon.length];
	const polygon = [...area.polygon];
	polygon.splice(afterIndex + 1, 0, {
		x: (current.x + next.x) / 2,
		y: (current.y + next.y) / 2,
	});
	return { ...area, polygon };
}

export function removeVisualPlanVertex(
	area: VisualPlanArea,
	index: number,
): VisualPlanArea {
	if (area.polygon.length <= 3) return area;
	return {
		...area,
		polygon: area.polygon.filter((_, currentIndex) => currentIndex !== index),
	};
}

export function translateVisualPlanArea(
	area: VisualPlanArea,
	deltaX: number,
	deltaY: number,
): VisualPlanArea {
	const xs = area.polygon.map((point) => point.x);
	const ys = area.polygon.map((point) => point.y);
	const constrainedX = Math.max(
		-Math.min(...xs),
		Math.min(1 - Math.max(...xs), deltaX),
	);
	const constrainedY = Math.max(
		-Math.min(...ys),
		Math.min(1 - Math.max(...ys), deltaY),
	);
	return {
		...area,
		polygon: area.polygon.map((point) => ({
			x: point.x + constrainedX,
			y: point.y + constrainedY,
		})),
	};
}

export function replaceVisualPlanArea(
	areas: VisualPlanArea[],
	updated: VisualPlanArea,
) {
	return areas.map((area) => (area.id === updated.id ? updated : area));
}

export function nextVisualPlanAreaId(
	areas: Pick<VisualPlanArea, "id">[],
	prefix = "plan-area",
) {
	const ids = new Set(areas.map((area) => area.id));
	let number = areas.length + 1;
	while (ids.has(`${prefix}-${number}`)) number += 1;
	return `${prefix}-${number}`;
}
