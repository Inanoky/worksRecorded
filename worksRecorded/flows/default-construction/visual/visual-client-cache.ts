import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import type { getVisualDrawings, getVisualPlanning } from "./actions";
import type { VisualDrawing } from "./model";

export const VISUAL_CACHE_FRESH_MS = 60_000;
export const VISUAL_PLANNING_CACHE_INVALIDATED =
	"works-recorded:visual-planning-cache-invalidated";

export function invalidateVisualPlanningClientCache(siteId: string) {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent(VISUAL_PLANNING_CACHE_INVALIDATED, {
			detail: { siteId },
		}),
	);
}

export type VisualDrawingIndex = Awaited<ReturnType<typeof getVisualDrawings>>;
export type VisualPlanningIndex = Awaited<ReturnType<typeof getVisualPlanning>>;

type CacheEntry<T> = {
	updatedAt: number;
	value: T;
};
type ResourceRequest<T> = {
	generation: number;
	promise: Promise<T>;
};
type DrawingRequest = ResourceRequest<VisualDrawing> & {
	controller: AbortController;
};
type PdfEntry = {
	controller: AbortController;
	promise: Promise<PDFDocumentProxy>;
	task?: PDFDocumentLoadingTask;
	references: number;
};
type LoadOptions = { force?: boolean };

export class VisualClientCache {
	private index: CacheEntry<VisualDrawingIndex> | null = null;
	private indexGeneration = 0;
	private indexRequest: ResourceRequest<VisualDrawingIndex> | null = null;
	private drawings = new Map<string, CacheEntry<VisualDrawing>>();
	private drawingGenerations = new Map<string, number>();
	private drawingRequests = new Map<string, DrawingRequest>();
	private planning = new Map<string, CacheEntry<VisualPlanningIndex>>();
	private planningGenerations = new Map<string, number>();
	private planningRequests = new Map<
		string,
		ResourceRequest<VisualPlanningIndex>
	>();
	private pdfs = new Map<string, PdfEntry>();

	constructor(
		private readonly siteId: string,
		private readonly now: () => number = Date.now,
	) {}

	endpoint(id: string) {
		return `/api/sites/${encodeURIComponent(this.siteId)}/visual/${encodeURIComponent(id)}`;
	}

	peekIndex() {
		return this.index?.value;
	}

	rememberIndex(value: VisualDrawingIndex) {
		this.indexGeneration += 1;
		this.indexRequest = null;
		this.index = { value, updatedAt: this.now() };
	}

	async loadIndex(
		loader: () => Promise<VisualDrawingIndex>,
		options: LoadOptions = {},
	) {
		if (!options.force && this.index && this.isFresh(this.index))
			return this.index.value;
		if (this.indexRequest) return this.indexRequest.promise;
		const generation = this.indexGeneration;
		const request: ResourceRequest<VisualDrawingIndex> = {
			generation,
			promise: Promise.resolve()
				.then(loader)
				.then((value) => {
					if (
						this.indexRequest !== request ||
						this.indexGeneration !== generation
					) {
						if (this.index?.updatedAt) return this.index.value;
						throw new DOMException("Index request superseded", "AbortError");
					}
					this.index = { value, updatedAt: this.now() };
					return value;
				})
				.finally(() => {
					if (this.indexRequest === request) this.indexRequest = null;
				}),
		};
		this.indexRequest = request;
		return request.promise;
	}

	invalidateIndex() {
		this.indexGeneration += 1;
		this.indexRequest = null;
		if (this.index) this.index.updatedAt = 0;
	}

	peekDrawing(id: string) {
		return this.drawings.get(id)?.value;
	}

	rememberDrawing(drawing: VisualDrawing) {
		this.bumpDrawingGeneration(drawing.id);
		this.drawingRequests.get(drawing.id)?.controller.abort();
		this.drawingRequests.delete(drawing.id);
		this.storeDrawing(drawing);
	}

	async loadDrawing(
		id: string,
		options: LoadOptions = {},
	): Promise<VisualDrawing> {
		const cached = this.drawings.get(id);
		if (!options.force && cached && this.isFresh(cached)) {
			this.touchDrawing(id, cached);
			return cached.value;
		}
		const pending = this.drawingRequests.get(id);
		if (pending) return pending.promise;
		const controller = new AbortController();
		const generation = this.drawingGeneration(id);
		const request: DrawingRequest = {
			controller,
			generation,
			promise: Promise.resolve()
				.then(async () => {
					const response = await fetch(this.endpoint(id), {
						cache: "no-store",
						signal: controller.signal,
					});
					const drawing = (await response.json()) as VisualDrawing;
					if (!response.ok) throw new Error("Drawing unavailable");
					if (controller.signal.aborted)
						throw new DOMException("Drawing request cancelled", "AbortError");
					if (
						this.drawingRequests.get(id) === request &&
						this.drawingGeneration(id) === generation
					)
						this.storeDrawing(drawing);
					return this.peekDrawing(id) ?? drawing;
				})
				.finally(() => {
					if (this.drawingRequests.get(id) === request)
						this.drawingRequests.delete(id);
				}),
		};
		this.drawingRequests.set(id, request);
		return request.promise;
	}

	refreshDrawing(id: string) {
		return this.loadDrawing(id, { force: true });
	}

	peekPlanning(id: string) {
		return this.planning.get(id)?.value;
	}

	rememberPlanning(id: string, value: VisualPlanningIndex) {
		this.bumpPlanningGeneration(id);
		this.planningRequests.delete(id);
		this.planning.set(id, { value, updatedAt: this.now() });
	}

	async loadPlanning(
		id: string,
		loader: () => Promise<VisualPlanningIndex>,
		options: LoadOptions = {},
	) {
		const cached = this.planning.get(id);
		if (!options.force && cached && this.isFresh(cached)) return cached.value;
		const pending = this.planningRequests.get(id);
		if (pending) return pending.promise;
		const generation = this.planningGeneration(id);
		const request: ResourceRequest<VisualPlanningIndex> = {
			generation,
			promise: Promise.resolve()
				.then(loader)
				.then((value) => {
					if (
						this.planningRequests.get(id) !== request ||
						this.planningGeneration(id) !== generation
					) {
						const current = this.planning.get(id);
						if (current?.updatedAt) return current.value;
						throw new DOMException("Planning request superseded", "AbortError");
					}
					this.planning.set(id, { value, updatedAt: this.now() });
					return value;
				})
				.finally(() => {
					if (this.planningRequests.get(id) === request)
						this.planningRequests.delete(id);
				}),
		};
		this.planningRequests.set(id, request);
		return request.promise;
	}

	refreshPlanning(id: string, loader: () => Promise<VisualPlanningIndex>) {
		return this.loadPlanning(id, loader, { force: true });
	}

	invalidatePlanning(id?: string) {
		if (id) {
			this.bumpPlanningGeneration(id);
			this.planningRequests.delete(id);
			const cached = this.planning.get(id);
			if (cached) cached.updatedAt = 0;
			return;
		}
		for (const drawingId of new Set([
			...this.planning.keys(),
			...this.planningRequests.keys(),
		]))
			this.invalidatePlanning(drawingId);
	}

	updateDrawings(update: (drawing: VisualDrawing) => VisualDrawing) {
		for (const [id, cached] of this.drawings)
			this.drawings.set(id, {
				value: update(cached.value),
				updatedAt: this.now(),
			});
		for (const request of this.drawingRequests.values())
			request.controller.abort();
		this.drawingRequests.clear();
	}

	openPdf(url: string) {
		const entry = this.pdfEntry(url);
		entry.references += 1;
		this.trimPdfs();
		let released = false;
		return {
			promise: entry.promise,
			release: () => {
				if (released) return;
				released = true;
				entry.references -= 1;
				this.trimPdfs();
			},
		};
	}

	async prefetch(
		id: string,
		loadPlanning?: () => Promise<VisualPlanningIndex>,
	) {
		const pdf = this.pdfEntry(`${this.endpoint(id)}?pdf=1`);
		this.trimPdfs();
		await Promise.all([
			this.loadDrawing(id),
			pdf.promise,
			...(loadPlanning ? [this.loadPlanning(id, loadPlanning)] : []),
		]);
	}

	removeDrawing(id: string) {
		this.bumpDrawingGeneration(id);
		this.drawings.delete(id);
		this.drawingRequests.get(id)?.controller.abort();
		this.drawingRequests.delete(id);
		this.bumpPlanningGeneration(id);
		this.planning.delete(id);
		this.planningRequests.delete(id);
		const url = `${this.endpoint(id)}?pdf=1`;
		const entry = this.pdfs.get(url);
		if (entry) this.destroyPdf(url, entry);
	}

	clear() {
		this.index = null;
		this.indexGeneration += 1;
		this.indexRequest = null;
		this.drawings.clear();
		for (const request of this.drawingRequests.values())
			request.controller.abort();
		this.drawingRequests.clear();
		this.planning.clear();
		this.planningRequests.clear();
		this.drawingGenerations.clear();
		this.planningGenerations.clear();
		for (const [url, entry] of this.pdfs) this.destroyPdf(url, entry);
	}

	private isFresh<T>(entry: CacheEntry<T> | null | undefined) {
		return !!entry && this.now() - entry.updatedAt < VISUAL_CACHE_FRESH_MS;
	}

	private drawingGeneration(id: string) {
		return this.drawingGenerations.get(id) ?? 0;
	}

	private bumpDrawingGeneration(id: string) {
		this.drawingGenerations.set(id, this.drawingGeneration(id) + 1);
	}

	private planningGeneration(id: string) {
		return this.planningGenerations.get(id) ?? 0;
	}

	private bumpPlanningGeneration(id: string) {
		this.planningGenerations.set(id, this.planningGeneration(id) + 1);
	}

	private storeDrawing(drawing: VisualDrawing) {
		this.drawings.delete(drawing.id);
		this.drawings.set(drawing.id, {
			value: drawing,
			updatedAt: this.now(),
		});
		if (this.drawings.size > 20) {
			const oldest = this.drawings.keys().next().value;
			if (oldest) this.drawings.delete(oldest);
		}
	}

	private touchDrawing(id: string, entry: CacheEntry<VisualDrawing>) {
		this.drawings.delete(id);
		this.drawings.set(id, entry);
	}

	private pdfEntry(url: string) {
		const existing = this.pdfs.get(url);
		if (existing) {
			this.pdfs.delete(url);
			this.pdfs.set(url, existing);
			return existing;
		}
		const controller = new AbortController();
		const entry: PdfEntry = {
			controller,
			references: 0,
			promise: Promise.resolve()
				.then(async () => {
					const [response, pdfjs, worker] = await Promise.all([
						fetch(url, { signal: controller.signal }),
						import("pdfjs-dist"),
						import("./pdf-worker-url"),
					]);
					if (!response.ok) throw new Error("PDF unavailable");
					const bytes = new Uint8Array(await response.arrayBuffer());
					if (controller.signal.aborted)
						throw new DOMException("PDF request cancelled", "AbortError");
					pdfjs.GlobalWorkerOptions.workerSrc = worker.pdfWorkerUrl;
					entry.task = pdfjs.getDocument({ data: bytes });
					return entry.task.promise;
				})
				.catch((error: unknown) => {
					if (this.pdfs.get(url) === entry) this.destroyPdf(url, entry);
					throw error;
				}),
		};
		this.pdfs.set(url, entry);
		return entry;
	}

	private trimPdfs() {
		for (const [url, entry] of this.pdfs) {
			if (this.pdfs.size <= 3) break;
			if (entry.references === 0) this.destroyPdf(url, entry);
		}
	}

	private destroyPdf(url: string, entry: PdfEntry) {
		this.pdfs.delete(url);
		entry.controller.abort();
		if (entry.task) void Promise.resolve(entry.task.destroy()).catch(() => {});
	}
}
