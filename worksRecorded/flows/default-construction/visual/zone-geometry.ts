import polygonClipping, {
	type MultiPolygon,
	type Pair,
	type Polygon,
} from "polygon-clipping";
import { isSimplePolygon, polygonArea } from "./model";

type Point = { x: number; y: number };

export function mergeZoneGeometry(polygons: Point[][]): MultiPolygon {
	const shapes: MultiPolygon = polygons.map((ring) => [
		ring.map(({ x, y }): Pair => [x, y]),
	]);
	return shapes.length ? polygonClipping.union(shapes) : [];
}

export function zoneGeometryPath(geometry: MultiPolygon) {
	return geometry
		.flatMap((polygon) =>
			polygon.map(
				(ring) =>
					`${ring.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")} Z`,
			),
		)
		.join(" ");
}

export function zoneRingPoints(ring: Pair[]): Point[] {
	const points = ring.map(([x, y]) => ({ x, y }));
	if (
		points.length > 1 &&
		points[0].x === points.at(-1)?.x &&
		points[0].y === points.at(-1)?.y
	)
		points.pop();
	return points;
}

export function zoneGeometryArea(geometry: MultiPolygon) {
	return geometry.reduce(
		(total, polygon) =>
			total +
			polygon.reduce(
				(area, ring, i) =>
					area + (i ? -1 : 1) * polygonArea(zoneRingPoints(ring)),
				0,
			),
		0,
	);
}

export function validZoneGeometry(geometry: MultiPolygon) {
	if (!geometry.length) return false;
	try {
		for (const polygon of geometry) {
			for (const ring of polygon) {
				const points = zoneRingPoints(ring);
				if (
					points.length < 3 ||
					points.some((p) => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) ||
					!isSimplePolygon(points) ||
					polygonArea(points) <= 1e-14
				)
					return false;
			}
			if (
				Math.abs(
					zoneGeometryArea([polygon]) -
						zoneGeometryArea(polygonClipping.union([polygon])),
				) > 1e-10
			)
				return false;
		}
		return zoneGeometryArea(geometry) > 1e-5;
	} catch {
		return false;
	}
}

export function zoneComponentForPolygon(
	geometry: MultiPolygon,
	polygon: Point[],
) {
	const subject: Polygon = [polygon.map(({ x, y }): Pair => [x, y])];
	let selected = 0;
	let largest = -1;
	geometry.forEach((component, index) => {
		const area = zoneGeometryArea(
			polygonClipping.intersection([component], subject),
		);
		if (area > largest) {
			largest = area;
			selected = index;
		}
	});
	return selected;
}

export function replaceZoneRing(
	geometry: MultiPolygon,
	component: number,
	ring: number,
	points: Point[],
): MultiPolygon {
	return geometry.map((polygon, p) =>
		p === component
			? polygon.map((old, r) =>
					r === ring ? points.map(({ x, y }): Pair => [x, y]) : old,
				)
			: polygon,
	);
}

export function translateZoneComponent(
	geometry: MultiPolygon,
	component: number,
	outer: Point[],
): MultiPolygon {
	const dx = outer[0].x - geometry[component][0][0][0];
	const dy = outer[0].y - geometry[component][0][0][1];
	return geometry.map((polygon, p) =>
		p === component
			? polygon.map((ring) => ring.map(([x, y]): Pair => [x + dx, y + dy]))
			: polygon,
	);
}

export function splitZoneGeometry(
	geometry: MultiPolygon,
	preferred?: MultiPolygon,
): Point[][] {
	const pending = [...polygonClipping.union(geometry)];
	const pieces: Point[][] = [];
	let steps = 0;
	while (pending.length) {
		if (++steps > 1024 || pieces.length + pending.length > 256)
			throw new Error(
				"Zona ir pārāk sarežģīta. Sadaliet to atsevišķās darba zonās.",
			);
		const polygon = pending.pop() as Polygon;
		const outer = zoneRingPoints(polygon[0]);
		if (polygon.length === 1 && outer.length <= 2048) {
			if (polygonArea(outer) > 1e-14) pieces.push(outer);
			continue;
		}
		const cutPoints = zoneRingPoints(polygon[polygon.length > 1 ? 1 : 0]);
		const xs = cutPoints.map((p) => p.x),
			ys = cutPoints.map((p) => p.y);
		const minX = Math.min(...xs),
			maxX = Math.max(...xs),
			minY = Math.min(...ys),
			maxY = Math.max(...ys);
		const vertical = maxX - minX >= maxY - minY;
		const cut = vertical ? (minX + maxX) / 2 : (minY + maxY) / 2;
		const halves: Polygon[] = vertical
			? [
					[
						[
							[0, 0],
							[cut, 0],
							[cut, 1],
							[0, 1],
						],
					],
					[
						[
							[cut, 0],
							[1, 0],
							[1, 1],
							[cut, 1],
						],
					],
				]
			: [
					[
						[
							[0, 0],
							[1, 0],
							[1, cut],
							[0, cut],
						],
					],
					[
						[
							[0, cut],
							[1, cut],
							[1, 1],
							[0, 1],
						],
					],
				];
		for (const half of halves)
			pending.push(...polygonClipping.intersection([polygon], half));
	}
	if (preferred) {
		const areas = new Map(
			pieces.map((piece) => [
				piece,
				zoneGeometryArea(
					polygonClipping.intersection(preferred, [
						piece.map(({ x, y }): Pair => [x, y]),
					]),
				),
			]),
		);
		pieces.sort((a, b) => (areas.get(b) ?? 0) - (areas.get(a) ?? 0));
	}
	return pieces;
}
