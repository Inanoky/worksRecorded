import polygonClipping, {
	type MultiPolygon,
	type Pair,
} from "polygon-clipping";
import type { VisualEvidence, VisualMark } from "./model";

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
	return Array.from(grouped, ([key, pieces]) => ({
		key,
		marks: pieces,
		paths:
			pieces.length > 1
				? zoneOutlinePaths(pieces.map((mark) => mark.polygon))
				: [],
	}));
}
