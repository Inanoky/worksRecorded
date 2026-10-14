import type { VisualDrawing } from "./model";
import {
	VisualClientCache,
	type VisualDrawingIndex,
	type VisualPlanningIndex,
} from "./visual-client-cache";

const mockGetDocument = jest.fn();
const mockDestroy = jest.fn();
jest.mock("pdfjs-dist", () => ({
	GlobalWorkerOptions: { workerSrc: "" },
	getDocument: (...args: unknown[]) => mockGetDocument(...args),
}));
jest.mock("./pdf-worker-url", () => ({ pdfWorkerUrl: "/worker.mjs" }));

const originalFetch = global.fetch;
const drawing = { id: "drawing", name: "plan.pdf" } as VisualDrawing;
const drawingIndex = {
	locations: ["1. stāvs"],
	drawings: [],
} as VisualDrawingIndex;
const planningIndex = {
	today: "2026-10-13",
	location: "1. stāvs",
	workOptions: [],
	unitOptions: [],
	contacts: [],
	plans: [],
} as VisualPlanningIndex;

beforeEach(() => {
	jest.clearAllMocks();
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: async () => drawing,
		arrayBuffer: async () => new ArrayBuffer(4),
	});
	mockGetDocument.mockImplementation(() => ({
		promise: Promise.resolve({ numPages: 1 }),
		destroy: mockDestroy,
	}));
});
afterEach(() => {
	global.fetch = originalFetch;
});

it("deduplicates drawing loads and scopes cached data to one project", async () => {
	const cache = new VisualClientCache("site");
	const [first, second] = await Promise.all([
		cache.loadDrawing("drawing"),
		cache.loadDrawing("drawing"),
	]);
	expect(first).toBe(second);
	expect(cache.peekDrawing("drawing")).toBe(first);
	await cache.loadDrawing("drawing");
	expect(global.fetch).toHaveBeenCalledTimes(1);
	const other = new VisualClientCache("other-site");
	expect(other.peekDrawing("drawing")).toBeUndefined();
	await other.loadDrawing("drawing");
	expect(global.fetch).toHaveBeenLastCalledWith(
		"/api/sites/other-site/visual/drawing",
		expect.anything(),
	);
	cache.clear();
	other.clear();
});

it("does not overwrite a saved edit with an older pending response", async () => {
	let finish!: (response: Response) => void;
	jest.mocked(global.fetch).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const cache = new VisualClientCache("site");
	const request = cache.loadDrawing("drawing");
	const rejected = expect(request).rejects.toMatchObject({
		name: "AbortError",
	});
	await Promise.resolve();
	const updated = { ...drawing, name: "updated.pdf" };
	cache.rememberDrawing(updated);
	finish({ ok: true, json: async () => drawing } as Response);
	await rejected;
	expect(cache.peekDrawing("drawing")).toBe(updated);
	cache.clear();
});

it("retries failed drawing requests and invalidates deleted or replaced drawings", async () => {
	const cache = new VisualClientCache("site");
	jest.mocked(global.fetch).mockRejectedValueOnce(new Error("Network"));
	await expect(cache.loadDrawing("drawing")).rejects.toThrow("Network");
	await cache.loadDrawing("drawing");
	cache.removeDrawing("drawing");
	expect(cache.peekDrawing("drawing")).toBeUndefined();
	await cache.loadDrawing("drawing");
	expect(global.fetch).toHaveBeenCalledTimes(3);
	cache.updateDrawings((value) => ({ ...value, name: "pruned.pdf" }));
	expect(cache.peekDrawing("drawing")?.name).toBe("pruned.pdf");
	cache.clear();
	expect(cache.peekDrawing("drawing")).toBeUndefined();
});

it("invalidates drawing metadata without discarding cached planning or the PDF", async () => {
	const cache = new VisualClientCache("site");
	await cache.prefetch("drawing", async () => planningIndex);
	const url = `${cache.endpoint("drawing")}?pdf=1`;
	const viewer = cache.openPdf(url);
	const pdf = await viewer.promise;
	viewer.release();
	cache.invalidateDrawing("drawing");
	expect(cache.peekDrawing("drawing")).toBeUndefined();
	expect(cache.peekPlanning("drawing")).toBe(planningIndex);
	expect(mockDestroy).not.toHaveBeenCalled();
	await cache.loadDrawing("drawing");
	const nextViewer = cache.openPdf(url);
	expect(await nextViewer.promise).toBe(pdf);
	expect(global.fetch).toHaveBeenCalledTimes(3);
	expect(mockGetDocument).toHaveBeenCalledTimes(1);
	nextViewer.release();
	cache.clear();
});

it("aborts an invalidated drawing request without letting it replace a fresh response", async () => {
	let finish!: (response: Response) => void;
	jest.mocked(global.fetch).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const cache = new VisualClientCache("site");
	const pending = cache.loadDrawing("drawing");
	const rejected = expect(pending).rejects.toMatchObject({
		name: "AbortError",
	});
	await Promise.resolve();
	cache.invalidateDrawing("drawing");
	const updated = { ...drawing, name: "fresh.pdf" };
	jest
		.mocked(global.fetch)
		.mockResolvedValueOnce({ ok: true, json: async () => updated } as Response);
	expect(await cache.loadDrawing("drawing")).toBe(updated);
	finish({ ok: true, json: async () => drawing } as Response);
	await rejected;
	expect(cache.peekDrawing("drawing")).toBe(updated);
	cache.clear();
});

it("preloads metadata and PDF concurrently and reuses the parsed PDF after releasing a viewer", async () => {
	const cache = new VisualClientCache("site");
	await cache.prefetch("drawing");
	expect(global.fetch).toHaveBeenCalledTimes(2);
	const url = `${cache.endpoint("drawing")}?pdf=1`;
	const first = cache.openPdf(url);
	const document = await first.promise;
	first.release();
	expect(mockDestroy).not.toHaveBeenCalled();
	const second = cache.openPdf(url);
	expect(await second.promise).toBe(document);
	second.release();
	expect(mockGetDocument).toHaveBeenCalledTimes(1);
	expect(global.fetch).toHaveBeenCalledTimes(2);
	cache.removeDrawing("drawing");
	expect(mockDestroy).toHaveBeenCalledTimes(1);
	expect(cache.peekDrawing("drawing")).toBeUndefined();
	cache.clear();
});

it("bounds PDF memory without evicting the visible PDF and releases everything on exit", async () => {
	const cache = new VisualClientCache("site");
	const visible = cache.openPdf("/visible.pdf");
	await visible.promise;
	for (const url of ["/one.pdf", "/two.pdf", "/three.pdf"]) {
		const viewer = cache.openPdf(url);
		await viewer.promise;
		viewer.release();
	}
	expect(mockDestroy).toHaveBeenCalledTimes(1);
	const visibleAgain = cache.openPdf("/visible.pdf");
	await visibleAgain.promise;
	visibleAgain.release();
	expect(global.fetch).toHaveBeenCalledTimes(4);
	visible.release();
	cache.clear();
	expect(mockDestroy).toHaveBeenCalledTimes(4);
});

it("removes a failed PDF so the next opening can retry", async () => {
	const cache = new VisualClientCache("site");
	jest.mocked(global.fetch).mockResolvedValueOnce({ ok: false } as Response);
	const first = cache.openPdf("/drawing.pdf");
	await expect(first.promise).rejects.toThrow("PDF unavailable");
	first.release();
	const retry = cache.openPdf("/drawing.pdf");
	await retry.promise;
	retry.release();
	expect(global.fetch).toHaveBeenCalledTimes(2);
	cache.clear();
});

it("deduplicates planning and project index requests and refreshes them after the TTL", async () => {
	let now = 1_000;
	const cache = new VisualClientCache("site", () => now);
	const loadPlanning = jest.fn().mockResolvedValue(planningIndex);
	const loadIndex = jest.fn().mockResolvedValue(drawingIndex);
	const [first, second] = await Promise.all([
		cache.loadPlanning("drawing", loadPlanning),
		cache.loadPlanning("drawing", loadPlanning),
	]);
	expect(first).toBe(second);
	expect(loadPlanning).toHaveBeenCalledTimes(1);
	await Promise.all([cache.loadIndex(loadIndex), cache.loadIndex(loadIndex)]);
	expect(loadIndex).toHaveBeenCalledTimes(1);
	now += 59_999;
	await cache.loadPlanning("drawing", loadPlanning);
	await cache.loadIndex(loadIndex);
	expect(loadPlanning).toHaveBeenCalledTimes(1);
	expect(loadIndex).toHaveBeenCalledTimes(1);
	now += 1;
	await cache.loadPlanning("drawing", loadPlanning);
	await cache.loadIndex(loadIndex);
	expect(loadPlanning).toHaveBeenCalledTimes(2);
	expect(loadIndex).toHaveBeenCalledTimes(2);
	cache.clear();
});

it("keeps a mutation result when an older planning request finishes later", async () => {
	let finish!: (value: VisualPlanningIndex) => void;
	const cache = new VisualClientCache("site");
	const pending = cache.loadPlanning(
		"drawing",
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	await Promise.resolve();
	const updated = { ...planningIndex, today: "2026-10-14" };
	cache.rememberPlanning("drawing", updated);
	finish(planningIndex);
	expect(await pending).toBe(updated);
	expect(cache.peekPlanning("drawing")).toBe(updated);
	cache.clear();
});

it("invalidates planning after mutations and retries a failed planning request", async () => {
	const cache = new VisualClientCache("site");
	const load = jest
		.fn<Promise<VisualPlanningIndex>, []>()
		.mockRejectedValueOnce(new Error("Network"))
		.mockResolvedValue(planningIndex);
	await expect(cache.loadPlanning("drawing", load)).rejects.toThrow("Network");
	await cache.loadPlanning("drawing", load);
	cache.invalidatePlanning("drawing");
	await cache.loadPlanning("drawing", load);
	expect(load).toHaveBeenCalledTimes(3);
	cache.removeDrawing("drawing");
	expect(cache.peekPlanning("drawing")).toBeUndefined();
	cache.clear();
});
