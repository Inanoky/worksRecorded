import { polygonEditSchema } from "./polygon-edit";
import {
	addZonePolygon,
	editableZoneGeometry,
	mergeZoneGeometry,
	replaceZoneRing,
	splitZoneGeometry,
	translateZoneComponent,
	validZoneGeometry,
	zoneGeometryArea,
	zoneRingPoints,
} from "./zone-geometry";

const rectangle = (x: number, y: number, r: number, b: number) => [
	{ x, y },
	{ x: r, y },
	{ x: r, y: b },
	{ x, y: b },
];
const frame = [
	rectangle(0.1, 0.1, 0.8, 0.3),
	rectangle(0.1, 0.6, 0.8, 0.8),
	rectangle(0.1, 0.3, 0.3, 0.6),
	rectangle(0.6, 0.3, 0.8, 0.6),
];
it("removes numerical cut-out slivers and near-duplicate corners while preserving real room boundaries", () => {
	const geometry = mergeZoneGeometry(frame);
	geometry[0][0].splice(1, 0, [0.100000000001, 0.1]);
	geometry[0].push([
		[0.2, 0.2],
		[0.2000001, 0.2],
		[0.2000001, 0.2000001],
		[0.2, 0.2000001],
		[0.2, 0.2],
	]);
	const before = JSON.stringify(geometry);
	const cleaned = editableZoneGeometry(geometry);
	expect(cleaned[0]).toHaveLength(2);
	expect(zoneRingPoints(cleaned[0][0])).toHaveLength(4);
	expect(cleaned[0][1]).toEqual(geometry[0][1]);
	expect(zoneGeometryArea(cleaned)).toBeCloseTo(zoneGeometryArea(geometry), 12);
	expect(validZoneGeometry(cleaned)).toBe(true);
	expect(JSON.stringify(geometry)).toBe(before);
});
it("adds disconnected areas and merges overlapping additions without double counting or filling unrelated cut-outs", () => {
	const original = mergeZoneGeometry(frame);
	const separate = addZonePolygon(original, rectangle(0.85, 0.1, 0.95, 0.2));
	expect(separate).toHaveLength(2);
	expect(separate.find((polygon) => polygon.length === 2)).toBeDefined();
	expect(zoneGeometryArea(separate)).toBeCloseTo(
		zoneGeometryArea(original) + 0.01,
		12,
	);
	const overlap = addZonePolygon(separate, rectangle(0.7, 0.1, 0.9, 0.2));
	expect(overlap).toHaveLength(1);
	expect(overlap[0]).toHaveLength(2);
	expect(zoneGeometryArea(overlap)).toBeCloseTo(
		zoneGeometryArea(original) + 0.015,
		12,
	);
	expect(
		zoneGeometryArea(mergeZoneGeometry(splitZoneGeometry(overlap))),
	).toBeCloseTo(zoneGeometryArea(overlap), 12);
	expect(original).toEqual(mergeZoneGeometry(frame));
});
it("edits real outer and bathroom boundaries and round-trips them without changing area", () => {
	const geometry = mergeZoneGeometry(frame);
	expect(geometry).toHaveLength(1);
	expect(geometry[0]).toHaveLength(2);
	expect(geometry[0].map((ring) => zoneRingPoints(ring).length)).toEqual([
		4, 4,
	]);
	const ring = zoneRingPoints(geometry[0][1]);
	ring[0] = { ...ring[0], x: ring[0].x + 0.01 };
	const changed = replaceZoneRing(geometry, 0, 1, ring);
	expect(validZoneGeometry(changed)).toBe(true);
	expect(changed[0][0]).toEqual(geometry[0][0]);
	const pieces = splitZoneGeometry(changed);
	const restored = mergeZoneGeometry(pieces);
	expect(restored[0]).toHaveLength(2);
	expect(zoneGeometryArea(restored)).toBeCloseTo(zoneGeometryArea(changed), 12);
	expect(zoneGeometryArea(restored)).not.toBeCloseTo(
		zoneGeometryArea(geometry),
		6,
	);
	expect(
		polygonEditSchema.safeParse({
			markId: "first",
			mutationId: "11111111-1111-4111-8111-111111111111",
			expectedPolygon: frame[0],
			polygon: pieces[0],
			group: {
				expected: frame.map((polygon, index) => ({
					markId: index ? `part-${index}` : "first",
					polygon,
				})),
				polygons: pieces,
			},
		}).success,
	).toBe(true);
});
it("moves a connected area and all its cut-outs together while preserving separate islands", () => {
	const geometry = mergeZoneGeometry([
		...frame,
		rectangle(0.85, 0.1, 0.95, 0.2),
	]);
	const index = geometry.findIndex((polygon) => polygon.length === 2);
	const shifted = zoneRingPoints(geometry[index][0]).map((p) => ({
		x: p.x + 0.01,
		y: p.y + 0.02,
	}));
	const moved = translateZoneComponent(geometry, index, shifted);
	expect(zoneGeometryArea(moved)).toBeCloseTo(zoneGeometryArea(geometry), 12);
	expect(moved[1 - index]).toEqual(geometry[1 - index]);
	expect(moved[index][1][0][0]).toBeCloseTo(geometry[index][1][0][0] + 0.01);
});
it("rejects self-crossing boundaries and cut-outs moved outside the work area", () => {
	const geometry = mergeZoneGeometry(frame);
	const outside = replaceZoneRing(
		geometry,
		0,
		1,
		rectangle(0.7, 0.7, 0.9, 0.9),
	);
	expect(validZoneGeometry(outside)).toBe(false);
	expect(
		validZoneGeometry([
			[
				[
					[0.1, 0.1],
					[0.8, 0.8],
					[0.1, 0.8],
					[0.8, 0.1],
				],
			],
		]),
	).toBe(false);
});

it("discards numerical slivers below drawing precision without losing meaningful floor area", () => {
	const geometry = mergeZoneGeometry([
		rectangle(0.1, 0.1, 0.4, 0.4),
		[
			{ x: 0.6, y: 0.6 },
			{ x: 0.60000001, y: 0.6 },
			{ x: 0.60000001, y: 0.60000001 },
		],
	]);
	const pieces = splitZoneGeometry(geometry);
	expect(pieces).toHaveLength(1);
	expect(zoneGeometryArea(mergeZoneGeometry(pieces))).toBeCloseTo(
		zoneGeometryArea(geometry),
		12,
	);
});
