import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import type { VisualDrawing } from "./model";

type DrawingRequest = {
	controller: AbortController;
	promise: Promise<VisualDrawing>;
};
type PdfEntry = {
	controller: AbortController;
	promise: Promise<PDFDocumentProxy>;
	task?: PDFDocumentLoadingTask;
	references: number;
};

export class VisualClientCache {
	private drawings = new Map<string, VisualDrawing>();
	private requests = new Map<string, DrawingRequest>();
	private pdfs = new Map<string, PdfEntry>();

	constructor(private readonly siteId: string) {}

	endpoint(id: string) {
		return `/api/sites/${encodeURIComponent(this.siteId)}/visual/${encodeURIComponent(id)}`;
	}

	peekDrawing(id: string) {
		return this.drawings.get(id);
	}

	rememberDrawing(drawing: VisualDrawing) {
		this.requests.get(drawing.id)?.controller.abort();
		this.requests.delete(drawing.id);
		this.drawings.delete(drawing.id);
		this.drawings.set(drawing.id, drawing);
		if (this.drawings.size > 20) {
			const oldest = this.drawings.keys().next().value;
			if (oldest) this.drawings.delete(oldest);
		}
	}

	async loadDrawing(id: string): Promise<VisualDrawing> {
		const cached = this.peekDrawing(id);
		if (cached) {
			this.drawings.delete(id);
			this.drawings.set(id, cached);
			return cached;
		}
		const pending = this.requests.get(id);
		if (pending) return pending.promise;
		const controller = new AbortController();
		const request: DrawingRequest = {
			controller,
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
					if (this.requests.get(id) === request) {
						this.requests.delete(id);
						this.rememberDrawing(drawing);
					}
					return drawing;
				})
				.finally(() => {
					if (this.requests.get(id) === request) this.requests.delete(id);
				}),
		};
		this.requests.set(id, request);
		return request.promise;
	}

	updateDrawings(update: (drawing: VisualDrawing) => VisualDrawing) {
		for (const [id, drawing] of this.drawings) {
			this.drawings.set(id, update(drawing));
		}
		for (const request of this.requests.values()) request.controller.abort();
		this.requests.clear();
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

	async prefetch(id: string) {
		const pdf = this.pdfEntry(`${this.endpoint(id)}?pdf=1`);
		this.trimPdfs();
		await Promise.all([this.loadDrawing(id), pdf.promise]);
	}

	removeDrawing(id: string) {
		this.drawings.delete(id);
		this.requests.get(id)?.controller.abort();
		this.requests.delete(id);
		const url = `${this.endpoint(id)}?pdf=1`;
		const entry = this.pdfs.get(url);
		if (entry) this.destroyPdf(url, entry);
	}

	clear() {
		this.drawings.clear();
		for (const request of this.requests.values()) request.controller.abort();
		this.requests.clear();
		for (const [url, entry] of this.pdfs) this.destroyPdf(url, entry);
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
