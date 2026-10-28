import type { VisualMark } from "./model";
import { visualZoneGroups, zoneOutlinePaths } from "./zone-outline";

const rectangle = (
	left: number,
	top: number,
	right: number,
	bottom: number,
) => [
	{ x: left, y: top },
	{ x: right, y: top },
	{ x: right, y: bottom },
	{ x: left, y: bottom },
];

const mark: VisualMark = {
	id: "piece-1",
	evidenceId: "photo-1",
	layer: "sand",
	page: 1,
	polygon: rectangle(0, 0, 0.5, 1),
	confidence: 1,
	anchors: [],
	explanation: "Darba zona",
};

function ringAreas(path: string) {
	return path
		.split(" Z")
		.filter(Boolean)
		.map((ring) => {
			const points = Array.from(
				ring.matchAll(/[ML]([^, ]+),([^ ]+)/g),
				(match) => [Number(match[1]), Number(match[2])],
			);
			return (
				points.reduce((area, point, index) => {
					const next = points[(index + 1) % points.length];
					return area + point[0] * next[1] - next[0] * point[1];
				}, 0) / 2
			);
		});
}

it("removes shared diagonal edges without changing the area or saved pieces", () => {
	const pieces = [
		[
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
		],
		[
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0, y: 1 },
		],
	];
	const before = JSON.stringify(pieces);
	const paths = zoneOutlinePaths(pieces);
	expect(paths).toEqual(["M0,0 L1,0 L1,1 L0,1 L0,0 Z"]);
	expect(ringAreas(paths[0])).toEqual([1]);
	expect(JSON.stringify(pieces)).toBe(before);
});

it("preserves bathroom cut-outs and genuine disconnected areas", () => {
	const [path] = zoneOutlinePaths([
		rectangle(0, 0, 1, 0.25),
		rectangle(0, 0.75, 1, 1),
		rectangle(0, 0.25, 0.25, 0.75),
		rectangle(0.75, 0.25, 1, 0.75),
		rectangle(2, 0, 3, 1),
	]);
	expect(ringAreas(path).sort((a, b) => a - b)).toEqual([-0.25, 1, 1]);
});

it("unions overlapping pieces once without dark overlapping fills", () => {
	const paths = zoneOutlinePaths([
		rectangle(0, 0, 0.75, 1),
		rectangle(0.25, 0, 1, 1),
	]);
	expect(paths).toHaveLength(1);
	expect(ringAreas(paths[0])).toEqual([1]);
});

it("groups photographs of the same record while keeping records, floors and work layers separate", () => {
	const groups = visualZoneGroups(
		[
			mark,
			{
				...mark,
				id: "piece-2",
				evidenceId: "photo-2",
				polygon: rectangle(0.5, 0, 1, 1),
			},
			{ ...mark, id: "other-record", evidenceId: "photo-3" },
			{ ...mark, id: "other-floor", page: 2 },
			{ ...mark, id: "other-layer", layer: "xps" },
		],
		[
			{ id: "photo-1", recordId: "record-1" },
			{ id: "photo-2", recordId: "record-1" },
			{ id: "photo-3", recordId: "record-2" },
		],
	);
	expect(groups).toHaveLength(4);
	expect(groups[0].marks.map((piece) => piece.id)).toEqual([
		"piece-1",
		"piece-2",
	]);
	expect(ringAreas(groups[0].paths[0])).toEqual([1]);
});

it("groups source pieces before record metadata is available and handles empty drawings", () => {
	expect(visualZoneGroups([mark, { ...mark, id: "piece-2" }], [])).toHaveLength(
		1,
	);
	expect(visualZoneGroups([], [])).toEqual([]);
	expect(zoneOutlinePaths([])).toEqual([]);
});
