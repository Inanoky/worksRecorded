import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import type { getVisualDrawings, getVisualPlanning } from "./actions";
import {
	type DrawingPageMeasurement,
	readDrawingPageMeasurement,
} from "./drawing-scale";
import type { VisualDrawing } from "./model";
import { PlanningSaveQueue, planningItem } from "./planning-save-queue";

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
	private pdfBytes = new Map<string, Uint8Array>();
	private preparedDrawings = new Set<string>();
	private previewPixels = new Map<string, number>();
	private measurements = new Map<string, Promise<DrawingPageMeasurement>>();
	private planningSaves?: PlanningSaveQueue;
	private previewGeneration = 0;
	private previewRequests = new Map<
		string,
		{
			promise: Promise<{ canvas: HTMLCanvasElement; aspect: number }>;
			cancel: () => void;
		}
	>();
	private previews = new Map<
		string,
		{ canvas: HTMLCanvasElement; aspect: number; url: string }
	>();

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
		const value = this.planning.get(id)?.value;
		return value ? this.projectPlanning(id, value) : undefined;
	}

	getPlanningSaveQueue(
		transport: ConstructorParameters<typeof PlanningSaveQueue>[0],
	) {
		this.planningSaves ??= new PlanningSaveQueue(
			transport,
			(id, plan) => this.mergePlanningPlan(id, plan),
			this.siteId,
		);
		return this.planningSaves;
	}

	mergePlanningPlan(id: string, plan: Parameters<typeof planningItem>[0]) {
		const current = this.planning.get(id)?.value;
		if (!current) return;
		const previous = current.plans.find((item) => item.id === plan.id);
		const item = {
			...planningItem(plan, previous, current.today),
			whatsAppSends: previous?.whatsAppSends ?? [],
		};
		this.rememberPlanning(id, {
			...current,
			plans: previous
				? current.plans.map((entry) => (entry.id === plan.id ? item : entry))
				: [...current.plans, item],
		});
	}

	private projectPlanning(id: string, value: VisualPlanningIndex) {
		const pending = this.planningSaves
			?.getSnapshot()
			.filter((item) => item.input.drawingId === id);
		if (!pending?.length) return value;
		const plans = [...value.plans];
		for (const item of pending) {
			const index = plans.findIndex((plan) => plan.id === item.id);
			const projected = {
				...planningItem(item.plan, plans[index], value.today),
				whatsAppSends: plans[index]?.whatsAppSends ?? [],
			};
			if (index >= 0) plans[index] = projected;
			else plans.push(projected);
		}
		return { ...value, plans };
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
		if (!options.force && cached && this.isFresh(cached))
			return this.projectPlanning(id, cached.value);
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
						if (current?.updatedAt)
							return this.projectPlanning(id, current.value);
						throw new DOMException("Planning request superseded", "AbortError");
					}
					this.planning.set(id, { value, updatedAt: this.now() });
					return this.projectPlanning(id, value);
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

	peekPreview(url: string, page: number) {
		const key = `${url}:${page}`;
		const preview = this.previews.get(key);
		if (preview) {
			this.previews.delete(key);
			this.previews.set(key, preview);
		}
		return preview;
	}

	loadPageMeasurement(url: string, page: number, pdf: PDFDocumentProxy) {
		const key = `${url}:${page}`;
		const existing = this.measurements.get(key);
		if (existing) return existing;
		const request = readDrawingPageMeasurement(pdf, page).catch(
			(error: unknown) => {
				if (this.measurements.get(key) === request)
					this.measurements.delete(key);
				throw error;
			},
		);
		this.measurements.set(key, request);
		return request;
	}

	rememberPreview(
		url: string,
		page: number,
		source: HTMLCanvasElement,
		aspect: number,
	) {
		const canvas = document.createElement("canvas");
		canvas.width = source.width;
		canvas.height = source.height;
		const context = canvas.getContext("2d");
		if (!context) return;
		context.drawImage(source, 0, 0);
		const key = `${url}:${page}`;
		const old = this.previews.get(key);
		if (old) {
			old.canvas.width = 0;
			old.canvas.height = 0;
		}
		this.previews.delete(key);
		this.previews.set(key, { canvas, aspect, url });
		let pixels = [...this.previews.values()].reduce(
			(sum, entry) => sum + entry.canvas.width * entry.canvas.height,
			0,
		);
		for (const [previewKey, preview] of this.previews) {
			if (pixels <= 16_000_000) break;
			if (this.pdfs.get(preview.url)?.references) continue;
			pixels -= preview.canvas.width * preview.canvas.height;
			preview.canvas.width = 0;
			preview.canvas.height = 0;
			this.previews.delete(previewKey);
		}
	}

	renderPreview(
		url: string,
		page: number,
		pdf: PDFDocumentProxy,
		maxPixels = this.previewPixels.get(url) ?? 4_000_000,
	) {
		const cached = this.peekPreview(url, page);
		if (cached) return Promise.resolve(cached);
		const key = `${url}:${page}`;
		const pending = this.previewRequests.get(key);
		if (pending) return pending.promise;
		const generation = this.previewGeneration;
		let render:
			| ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
			| undefined;
		let cancelled = false;
		const request = {
			cancel: () => {
				cancelled = true;
				render?.cancel();
			},
			promise: Promise.resolve()
				.then(async () => {
					const pdfPage = await pdf.getPage(page);
					if (cancelled)
						throw new DOMException("Preview cancelled", "AbortError");
					const base = pdfPage.getViewport({ scale: 1 });
					const width = Math.min(
						maxPixels <= 1_000_000 ? 1200 : 1800,
						Math.sqrt((maxPixels * base.width) / base.height),
						(4096 * base.width) / base.height,
					);
					const viewport = pdfPage.getViewport({ scale: width / base.width });
					const canvas = document.createElement("canvas");
					canvas.width = viewport.width;
					canvas.height = viewport.height;
					const context = canvas.getContext("2d");
					if (!context) throw new Error("Canvas unavailable");
					render = pdfPage.render({ canvas, canvasContext: context, viewport });
					await render.promise;
					if (cancelled || generation !== this.previewGeneration)
						throw new DOMException("Preview superseded", "AbortError");
					this.rememberPreview(url, page, canvas, base.width / base.height);
					return (
						this.peekPreview(url, page) ?? {
							canvas,
							aspect: base.width / base.height,
						}
					);
				})
				.finally(() => {
					if (this.previewRequests.get(key) === request)
						this.previewRequests.delete(key);
				}),
		};
		this.previewRequests.set(key, request);
		return request.promise;
	}

	async prepareProject(
		drawings: Array<{ id: string }>,
		loadPlanning: (id: string) => Promise<VisualPlanningIndex>,
		onProgress: (
			step: string,
			status: "pending" | "done" | "error",
			counts: { completed: number; total: number },
		) => void,
		cancelled: () => boolean = () => false,
	) {
		const ids = [...new Set(drawings.map((drawing) => drawing.id))];
		this.preparedDrawings = new Set(ids);
		const steps = ["visual-drawing", "visual-planning", "visual-preview"];
		const completed = new Map(steps.map((step) => [step, 0]));
		const failed = new Set<string>();
		const track = async (step: string, work: () => Promise<unknown>) => {
			try {
				await work();
			} catch {
				failed.add(step);
			} finally {
				const count = (completed.get(step) ?? 0) + 1;
				completed.set(step, count);
				if (!cancelled())
					onProgress(
						step,
						count === ids.length
							? failed.has(step)
								? "error"
								: "done"
							: "pending",
						{ completed: count, total: ids.length },
					);
			}
		};
		for (const step of steps)
			onProgress(step, ids.length ? "pending" : "done", {
				completed: 0,
				total: ids.length,
			});
		let next = 0;
		let rendering = 0;
		const waiting: Array<() => void> = [];
		const render = async (work: () => Promise<unknown>) => {
			if (rendering >= 2)
				await new Promise<void>((resolve) => waiting.push(resolve));
			else rendering++;
			try {
				await work();
			} finally {
				const resume = waiting.shift();
				if (resume) resume();
				else rendering--;
			}
		};
		const worker = async () => {
			while (next < ids.length && !cancelled()) {
				const id = ids[next++];
				await Promise.all([
					track("visual-drawing", () => this.loadDrawing(id)),
					track("visual-planning", () =>
						this.loadPlanning(id, () => loadPlanning(id)),
					),
					track("visual-preview", async () => {
						const url = `${this.endpoint(id)}?pdf=1`;
						const lease = this.openPdf(url);
						try {
							const pdf = await lease.promise;
							const pixels = Math.min(
								1_000_000,
								Math.floor(12_000_000 / (ids.length * pdf.numPages)),
							);
							this.previewPixels.set(url, pixels);
							for (let page = 1; page <= pdf.numPages; page++) {
								if (cancelled()) return;
								await render(() =>
									Promise.all([
										this.renderPreview(url, page, pdf, pixels),
										this.loadPageMeasurement(url, page, pdf),
									]),
								);
							}
						} finally {
							lease.release();
						}
					}),
				]);
			}
		};
		await Promise.all(Array.from({ length: ids.length }, worker));
	}

	async prefetch(
		id: string,
		loadPlanning?: () => Promise<VisualPlanningIndex>,
		onProgress?: (step: string, status: "done" | "error") => void,
	) {
		const url = `${this.endpoint(id)}?pdf=1`;
		const preview = this.peekPreview(url, 1);
		const pdf = preview ? null : this.openPdf(url);
		const track = async <T>(step: string, promise: Promise<T>) => {
			try {
				const value = await promise;
				onProgress?.(step, "done");
				return value;
			} catch (error) {
				onProgress?.(step, "error");
				throw error;
			}
		};
		try {
			await Promise.all([
				track("visual-drawing", this.loadDrawing(id)),
				track(
					"visual-preview",
					pdf
						? pdf.promise.then((document) =>
								this.renderPreview(url, 1, document, 1_000_000),
							)
						: Promise.resolve(preview),
				),
				...(loadPlanning
					? [track("visual-planning", this.loadPlanning(id, loadPlanning))]
					: []),
			]);
		} finally {
			pdf?.release();
		}
	}

	removeDrawing(id: string) {
		this.previewGeneration += 1;
		for (const request of this.previewRequests.values()) request.cancel();
		this.previewRequests.clear();
		this.invalidateDrawing(id);
		this.bumpPlanningGeneration(id);
		this.planning.delete(id);
		this.planningRequests.delete(id);
		const url = `${this.endpoint(id)}?pdf=1`;
		this.pdfBytes.delete(url);
		this.previewPixels.delete(url);
		this.preparedDrawings.delete(id);
		for (const key of this.measurements.keys())
			if (key.startsWith(`${url}:`)) this.measurements.delete(key);
		for (const [key, preview] of this.previews) {
			if (!key.startsWith(`${url}:`)) continue;
			preview.canvas.width = 0;
			preview.canvas.height = 0;
			this.previews.delete(key);
		}
		const entry = this.pdfs.get(url);
		if (entry) this.destroyPdf(url, entry);
	}

	invalidateDrawing(id: string) {
		this.bumpDrawingGeneration(id);
		this.drawings.delete(id);
		this.drawingRequests.get(id)?.controller.abort();
		this.drawingRequests.delete(id);
	}

	clear() {
		this.previewGeneration += 1;
		for (const request of this.previewRequests.values()) request.cancel();
		this.previewRequests.clear();
		for (const preview of this.previews.values()) {
			preview.canvas.width = 0;
			preview.canvas.height = 0;
		}
		this.previews.clear();
		this.pdfBytes.clear();
		this.previewPixels.clear();
		this.measurements.clear();
		this.preparedDrawings.clear();
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
		for (const id of this.drawings.keys()) {
			if (this.drawings.size <= Math.max(20, this.preparedDrawings.size)) break;
			if (!this.preparedDrawings.has(id)) this.drawings.delete(id);
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
					const [bytes, pdfjs, worker] = await Promise.all([
						this.pdfBytes.get(url) ??
							fetch(url, { signal: controller.signal }).then(
								async (response) => {
									if (!response.ok) throw new Error("PDF unavailable");
									const bytes = new Uint8Array(await response.arrayBuffer());
									if (!controller.signal.aborted) this.pdfBytes.set(url, bytes);
									return bytes;
								},
							),
						import("pdfjs-dist"),
						import("./pdf-worker-url"),
					]);
					if (controller.signal.aborted)
						throw new DOMException("PDF request cancelled", "AbortError");
					pdfjs.GlobalWorkerOptions.workerSrc = worker.pdfWorkerUrl;
					entry.task = pdfjs.getDocument({ data: bytes.slice() });
					return entry.task.promise;
				})
				.catch((error: unknown) => {
					if (this.pdfs.get(url) === entry) {
						this.pdfBytes.delete(url);
						this.destroyPdf(url, entry);
					}
					throw error;
				}),
		};
		this.pdfs.set(url, entry);
		return entry;
	}

	private trimPdfs() {
		for (const [url, entry] of this.pdfs) {
			if (this.pdfs.size <= Math.max(3, this.preparedDrawings.size)) break;
			if (
				[...this.preparedDrawings].some(
					(id) => `${this.endpoint(id)}?pdf=1` === url,
				)
			)
				continue;
			if (entry.references === 0) this.destroyPdf(url, entry);
		}
	}

	private destroyPdf(url: string, entry: PdfEntry) {
		this.pdfs.delete(url);
		entry.controller.abort();
		if (entry.task) void Promise.resolve(entry.task.destroy()).catch(() => {});
	}
}
