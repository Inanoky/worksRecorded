import type { VisualDrawing } from "./model";
import { VisualClientCache } from "./visual-client-cache";

const mockGetDocument = jest.fn();
const mockDestroy = jest.fn();
jest.mock("pdfjs-dist", () => ({
	GlobalWorkerOptions: { workerSrc: "" },
	getDocument: (...args: unknown[]) => mockGetDocument(...args),
}));
jest.mock("./pdf-worker-url", () => ({ pdfWorkerUrl: "/worker.mjs" }));

const originalFetch = global.fetch;
const drawing = { id: "drawing", name: "plan.pdf" } as VisualDrawing;

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
