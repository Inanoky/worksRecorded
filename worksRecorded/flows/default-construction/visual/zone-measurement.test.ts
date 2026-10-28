import { mergeZoneGeometry } from "./zone-geometry";
import { measuredZoneGeometry } from "./zone-measurement";

const rectangle = (x: number, y: number, r: number, b: number) => [
	{ x, y },
	{ x: r, y },
	{ x: r, y: b },
	{ x, y: b },
];
const measurement = { width: 720, height: 720, scales: [100] };

it("measures a whole zone and the selected connected polygon with cut-outs excluded", () => {
	const geometry = mergeZoneGeometry([
		rectangle(0.1, 0.1, 0.8, 0.3),
		rectangle(0.1, 0.6, 0.8, 0.8),
		rectangle(0.1, 0.3, 0.3, 0.6),
		rectangle(0.6, 0.3, 0.8, 0.6),
		rectangle(0.85, 0.1, 0.95, 0.2),
	]);
	const component = geometry.findIndex((p) => p.length === 2);
	const result = measuredZoneGeometry(geometry, component, measurement);
	expect(result.zoneArea).toBeCloseTo(264.5156, 8);
	expect(result.polygonArea).toBeCloseTo(258.064, 8);
	expect(result.scale).toBe(100);
	const other = measuredZoneGeometry(geometry, 1 - component, measurement);
	expect(other.zoneArea).toBeCloseTo(result.zoneArea as number, 8);
	expect(other.polygonArea).toBeCloseTo(6.4516, 8);
});

it("counts overlaps once in the zone total and applies a manual scale override to both areas", () => {
	const geometry = [
		...mergeZoneGeometry([rectangle(0.1, 0.1, 0.4, 0.4)]),
		...mergeZoneGeometry([rectangle(0.3, 0.1, 0.6, 0.4)]),
	];
	const result = measuredZoneGeometry(geometry, 0, measurement);
	expect(result.zoneArea).toBeCloseTo(96.774, 8);
	expect(result.polygonArea).toBeCloseTo(58.0644, 8);
	const smaller = measuredZoneGeometry(geometry, 0, measurement, 50);
	expect(smaller.zoneArea).toBeCloseTo((result.zoneArea as number) / 4, 8);
	expect(smaller.polygonArea).toBeCloseTo(
		(result.polygonArea as number) / 4,
		8,
	);
});

it.each([
	undefined,
	{ ...measurement, scales: [] },
	{ ...measurement, scales: [50, 100] },
])("keeps area unknown when the drawing has no unambiguous scale", (info) => {
	expect(
		measuredZoneGeometry(
			mergeZoneGeometry([rectangle(0.1, 0.1, 0.4, 0.4)]),
			0,
			info,
		),
	).toEqual({ scale: null, zoneArea: null, polygonArea: null });
});
