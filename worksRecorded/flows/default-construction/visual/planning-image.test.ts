import type { PDFDocumentProxy } from "pdfjs-dist";
import { planningImageRegion, renderPlanningImages } from "./planning-image";
import type { VisualPlan, VisualPlanArea } from "./planning-model";

const area: VisualPlanArea = {
	id: "area",
	page: 1,
	polygon: [
		{ x: 0.8, y: 0.8 },
		{ x: 1, y: 0.8 },
		{ x: 1, y: 1 },
	],
};
const plan = {
	work: "XPS",
	location: "1. stāvs",
	geometry: { version: 1, areas: [area] },
} as VisualPlan;

afterEach(() => jest.restoreAllMocks());

it("keeps edge zones and surrounding context inside the exported page", () => {
	const crop = planningImageRegion([area]);
	expect(crop.x).toBeLessThan(0.8);
	expect(crop.y).toBeLessThan(0.8);
	expect(crop.x + crop.width).toBeCloseTo(1);
	expect(crop.y + crop.height).toBeCloseTo(1);
	expect(crop.width).toBeCloseTo(0.868);
	expect(crop.height).toBeCloseTo(0.868);
});

it("zooms out 3.5 times around small polygons to include nearby drawing axes", () => {
	const smallArea = {
		...area,
		polygon: [
			{ x: 0.5, y: 0.5 },
			{ x: 0.52, y: 0.5 },
			{ x: 0.52, y: 0.53 },
		],
	};
	const crop = planningImageRegion([smallArea]);
	expect(crop.width / (0.02 * 1.24)).toBeCloseTo(3.5);
	expect(crop.height / (0.03 * 1.24)).toBeCloseTo(3.5);
	expect(crop.x + crop.width / 2).toBeCloseTo(0.51);
	expect(crop.y + crop.height / 2).toBeCloseTo(0.515);
	for (const axis of [
		{ x: 0.47, y: 0.46 },
		{ x: 0.55, y: 0.57 },
	]) {
		expect(axis.x).toBeGreaterThan(crop.x);
		expect(axis.y).toBeGreaterThan(crop.y);
		expect(axis.x).toBeLessThan(crop.x + crop.width);
		expect(axis.y).toBeLessThan(crop.y + crop.height);
	}
});

it("keeps every selected task zone inside the crop", () => {
	const crop = planningImageRegion([
		area,
		{
			...area,
			id: "other-zone",
			polygon: [
				{ x: 0.1, y: 0.2 },
				{ x: 0.2, y: 0.2 },
				{ x: 0.2, y: 0.3 },
			],
		},
	]);
	expect(crop.x).toBeLessThanOrEqual(0.1);
	expect(crop.y).toBeLessThanOrEqual(0.2);
	expect(crop.x + crop.width).toBeCloseTo(1);
	expect(crop.y + crop.height).toBeCloseTo(1);
	expect(crop).toEqual({ x: 0, y: 0, width: 1, height: 1 });
});

function setupCanvas() {
	const context = {
		save: jest.fn(),
		restore: jest.fn(),
		beginPath: jest.fn(),
		rect: jest.fn(),
		clip: jest.fn(),
		moveTo: jest.fn(),
		lineTo: jest.fn(),
		closePath: jest.fn(),
		fill: jest.fn(),
		stroke: jest.fn(),
		setLineDash: jest.fn(),
		fillRect: jest.fn(),
		fillText: jest.fn(),
		measureText: jest.fn((text: string) => ({ width: text.length * 8 })),
	} as unknown as CanvasRenderingContext2D;
	const contexts = jest
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockReturnValue(context);
	jest
		.spyOn(HTMLCanvasElement.prototype, "toBlob")
		.mockImplementation((callback) =>
			callback(new Blob(["png"], { type: "image/png" })),
		);
	return { context, contexts };
}

it("exports every task page once, including all its zones, without fetching another PDF", async () => {
	const { context, contexts } = setupCanvas();
	const getPage = jest.fn().mockResolvedValue({
		getViewport: ({ scale }: { scale: number }) => ({
			width: 1000 * scale,
			height: 700 * scale,
		}),
		render: () => ({ promise: Promise.resolve(), cancel: jest.fn() }),
	});
	const images = await renderPlanningImages(
		{ getPage } as unknown as PDFDocumentProxy,
		{
			...plan,
			geometry: {
				version: 1,
				areas: [
					{ ...area, id: "second", page: 2 },
					area,
					{ ...area, id: "third" },
				],
			},
		},
		"#a16207",
		new AbortController().signal,
	);
	expect(getPage.mock.calls).toEqual([[1], [2]]);
	expect(images.map((image) => image.page)).toEqual([1, 2]);
	expect(images.every((image) => image.blob.type === "image/png")).toBe(true);
	expect(context.fill).toHaveBeenCalledTimes(3);
	for (const canvas of contexts.mock.contexts as HTMLCanvasElement[]) {
		expect(canvas.width).toBe(0);
		expect(canvas.height).toBe(0);
	}
});

it("cancels an in-flight export when its dialog closes and releases the canvas", async () => {
	const { contexts } = setupCanvas();
	const abort = new AbortController();
	let rejectRender: (reason: Error) => void = () => {};
	const cancel = jest.fn(() => rejectRender(new Error("cancelled")));
	const render = jest.fn(() => ({
		promise: new Promise<void>((_, reject) => {
			rejectRender = reject;
		}),
		cancel,
	}));
	const pdf = {
		getPage: async () => ({
			getViewport: ({ scale }: { scale: number }) => ({
				width: 1000 * scale,
				height: 700 * scale,
			}),
			render,
		}),
	} as unknown as PDFDocumentProxy;
	const exporting = renderPlanningImages(pdf, plan, "#a16207", abort.signal);
	await Promise.resolve();
	expect(render).toHaveBeenCalledTimes(1);
	abort.abort();
	await expect(exporting).rejects.toThrow("cancelled");
	expect(cancel).toHaveBeenCalledTimes(1);
	expect((contexts.mock.contexts[0] as HTMLCanvasElement).width).toBe(0);
});
