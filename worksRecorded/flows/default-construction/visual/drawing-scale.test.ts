import type { PDFDocumentProxy } from "pdfjs-dist";
import {
	drawingScaleLabels,
	measuredPlanningArea,
	parseDrawingScale,
	polygonUnionArea,
	readDrawingPageMeasurement,
	resolvedDrawingScale,
} from "./drawing-scale";

const square = (left = 0, top = 0, width = 1, height = 1) => [
	{ x: left, y: top },
	{ x: left + width, y: top },
	{ x: left + width, y: top + height },
	{ x: left, y: top + height },
];

it("reads ratio labels with common spacing, decimal separators and duplicate labels", () => {
	expect(
		drawingScaleLabels("M 1:100 · Mērogs 1 : 100 · Detaļa 1:20 · 1∶2,5"),
	).toEqual([2.5, 20, 100]);
	expect(
		drawingScaleLabels("21.10.2026 · 11:30 · 6000 mm · 1:0 · 1:10001"),
	).toEqual([]);
	expect(
		resolvedDrawingScale({ width: 1, height: 1, scales: [20, 100] }),
	).toBeNull();
	expect(
		resolvedDrawingScale({ width: 1, height: 1, scales: [20, 100] }, 50),
	).toBe(50);
});

it.each([
	["1:100", 100],
	[" 50 ", 50],
	["1 : 2,5", 2.5],
	["0", null],
	["1:100000", null],
	["abc", null],
])("parses the editable scale %s", (value, expected) => {
	expect(parseDrawingScale(String(value))).toBe(expected);
});

it("reads PDF text fragments and physical page dimensions without dimension-line analysis", async () => {
	const page = {
		getViewport: () => ({ width: 720, height: 360 }),
		getTextContent: jest.fn(async () => ({
			items: [{ str: "M" }, { str: "1" }, { str: ":" }, { str: "100" }],
		})),
	};
	const pdf = {
		getPage: jest.fn(async () => page),
	} as unknown as PDFDocumentProxy;
	expect(await readDrawingPageMeasurement(pdf, 2)).toEqual({
		width: 720,
		height: 360,
		scales: [100],
	});
	expect(pdf.getPage).toHaveBeenCalledWith(2);
});

it("calculates physical m² and applies a changed scale to both dimensions", () => {
	const areas = [{ id: "zone", page: 1, polygon: square() }];
	const pages = { 1: { width: 720, height: 360, scales: [100] } };
	expect(measuredPlanningArea(areas, pages, {})).toBeCloseTo(322.58);
	expect(measuredPlanningArea(areas, pages, { 1: 50 })).toBeCloseTo(80.645);
	expect(
		measuredPlanningArea(
			areas,
			{ 1: { width: 360, height: 720, scales: [100] } },
			{},
		),
	).toBeCloseTo(322.58);
});

it("uses each page's own scale and refuses unknown or ambiguous scales", () => {
	const areas = [
		{ id: "a", page: 1, polygon: square() },
		{ id: "b", page: 2, polygon: square() },
	];
	const pages = {
		1: { width: 720, height: 360, scales: [100] },
		2: { width: 720, height: 360, scales: [50] },
	};
	expect(measuredPlanningArea(areas, pages, {})).toBeCloseTo(403.225);
	expect(
		measuredPlanningArea(
			areas,
			{ ...pages, 2: { ...pages[2], scales: [] } },
			{},
		),
	).toBeNull();
	expect(
		measuredPlanningArea(
			areas,
			{ ...pages, 2: { ...pages[2], scales: [20, 50] } },
			{},
		),
	).toBeNull();
});

it("counts overlapping, nested and disjoint polygons correctly", () => {
	expect(
		polygonUnionArea([square(0, 0, 0.6, 1), square(0.4, 0, 0.6, 1)]),
	).toBeCloseTo(1);
	expect(polygonUnionArea([square(), square(0.2, 0.2, 0.3, 0.3)])).toBeCloseTo(
		1,
	);
	expect(
		polygonUnionArea([square(0, 0, 0.2, 0.2), square(0.8, 0.8, 0.2, 0.2)]),
	).toBeCloseTo(0.08);
	expect(
		polygonUnionArea([
			[
				{ x: 0, y: 0 },
				{ x: 1, y: 0 },
				{ x: 0, y: 1 },
			],
			[
				{ x: 0, y: 0 },
				{ x: 1, y: 0 },
				{ x: 1, y: 1 },
			],
		]),
	).toBeCloseTo(0.75);
});

it("keeps the live value when the pointer rests on a corner or closes the outline", () => {
	const polygon = square();
	const pages = { 1: { width: 720, height: 360, scales: [100] } };
	expect(
		measuredPlanningArea(
			[
				{
					id: "pen",
					page: 1,
					polygon: [...polygon, polygon.at(-1) ?? polygon[0]],
				},
			],
			pages,
			{},
		),
	).toBeCloseTo(322.58);
	expect(
		measuredPlanningArea(
			[{ id: "pen", page: 1, polygon: [...polygon, polygon[0]] }],
			pages,
			{},
		),
	).toBeCloseTo(322.58);
});
