import polygonClipping, {
	type MultiPolygon,
	type Pair,
} from "polygon-clipping";
import type { VisualEvidence, VisualMark } from "./model";
import { mergeZoneGeometry, zoneGeometryPath } from "./zone-geometry";

type Point = { x: number; y: number };

export function zoneOutlinePaths(polygons: Point[][]): string[] {
	if (!polygons.length) return [];
	const geometry: MultiPolygon = polygons.map((polygon) => [
		polygon.map(({ x, y }): Pair => [x, y]),
	]);
	const path = (shape: MultiPolygon) =>
		shape
			.flatMap((polygon) =>
				polygon.map(
					(ring) =>
						`${ring.map(([x, y], index) => `${index ? "L" : "M"}${x},${y}`).join(" ")} Z`,
				),
			)
			.join(" ");
	try {
		return [path(polygonClipping.union(geometry))];
	} catch {
		return geometry.map((polygon) => path([polygon]));
	}
}

export function visualZoneGroups(
	marks: VisualMark[],
	evidence: Pick<VisualEvidence, "id" | "recordId">[],
) {
	const records = new Map(evidence.map((item) => [item.id, item.recordId]));
	const grouped = new Map<string, VisualMark[]>();
	for (const mark of marks) {
		const key = JSON.stringify([
			records.get(mark.evidenceId) ?? mark.evidenceId,
			mark.layer,
			mark.page,
		]);
		const group = grouped.get(key);
		if (group) group.push(mark);
		else grouped.set(key, [mark]);
	}
	return Array.from(grouped, ([key, pieces]) => {
		let geometry: MultiPolygon;
		try {
			geometry = mergeZoneGeometry(pieces.map((mark) => mark.polygon));
		} catch {
			return {
				key,
				marks: pieces,
				geometry: [],
				paths: pieces.map((mark) =>
					zoneGeometryPath([[mark.polygon.map(({ x, y }): Pair => [x, y])]]),
				),
			};
		}
		return {
			key,
			marks: pieces,
			geometry,
			paths: pieces.length > 1 ? [zoneGeometryPath(geometry)] : [],
		};
	});
}
