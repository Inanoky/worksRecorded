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
	expect(crop.width).toBeLessThan(0.26);
	expect(crop.height).toBeLessThan(0.26);
});

it("zooms small polygons to fill the image while retaining nearby drawing context", () => {
	const smallArea = {
		...area,
		polygon: [
			{ x: 0.5, y: 0.5 },
			{ x: 0.52, y: 0.5 },
			{ x: 0.52, y: 0.53 },
		],
	};
	const crop = planningImageRegion([smallArea]);
	expect(0.02 / crop.width).toBeGreaterThan(0.8);
	expect(0.03 / crop.height).toBeGreaterThan(0.8);
	expect(crop.x).toBeLessThan(0.5);
	expect(crop.y).toBeLessThan(0.5);
	expect(crop.x + crop.width).toBeGreaterThan(0.52);
	expect(crop.y + crop.height).toBeGreaterThan(0.53);
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
