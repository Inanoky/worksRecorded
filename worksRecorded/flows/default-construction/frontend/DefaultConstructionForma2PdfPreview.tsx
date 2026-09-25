"use client";

import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function DefaultConstructionForma2PdfPreview({
	url,
	title,
	isLatvian,
}: {
	url: string;
	title: string;
	isLatvian: boolean;
}) {
	const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
	const [page, setPage] = useState(1);
	const [zoom, setZoom] = useState(1);
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	const canvas = useRef<HTMLCanvasElement>(null);
	const viewport = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let active = true;
		let task:
			| ReturnType<typeof import("pdfjs-dist")["getDocument"]>
			| undefined;
		const abort = new AbortController();
		setPdf(null);
		setPage(1);
		setZoom(1);
		setReady(false);
		setFailed(false);
		void (async () => {
			try {
				const [response, pdfjs, worker] = await Promise.all([
					fetch(url, { signal: abort.signal }),
					import("pdfjs-dist"),
					import("../visual/pdf-worker-url"),
				]);
				if (!response.ok) throw new Error("PDF unavailable");
				const data = new Uint8Array(await response.arrayBuffer());
				if (!active) return;
				pdfjs.GlobalWorkerOptions.workerSrc = worker.pdfWorkerUrl;
				task = pdfjs.getDocument({ data });
				const document = await task.promise;
				if (active) setPdf(document);
			} catch {
				if (active) setFailed(true);
			}
		})();
		return () => {
			active = false;
			abort.abort();
			void task?.destroy();
		};
	}, [url]);
	useEffect(() => {
		if (!pdf) return;
		let active = true;
		let rendering: { promise: Promise<void>; cancel: () => void } | undefined;
		setReady(false);
		setFailed(false);
		if (viewport.current) viewport.current.scrollTop = 0;
		void (async () => {
			try {
				const pdfPage = await pdf.getPage(page);
				if (!active || !canvas.current) return;
				const base = pdfPage.getViewport({ scale: 1 });
				const pageViewport = pdfPage.getViewport({ scale: 2400 / base.width });
				const element = canvas.current;
				const context = element.getContext("2d");
				if (!context) throw new Error("Canvas unavailable");
				element.width = pageViewport.width;
				element.height = pageViewport.height;
				rendering = pdfPage.render({
					canvas: element,
					canvasContext: context,
					viewport: pageViewport,
				});
				await rendering.promise;
				if (active) setReady(true);
			} catch {
				if (active) setFailed(true);
			}
		})();
		return () => {
			active = false;
			rendering?.cancel();
		};
	}, [pdf, page]);
	return (
		<section
			className="absolute inset-0 flex min-h-0 flex-col"
			aria-label={`${isLatvian ? "Rēķina priekšskatījums" : "Invoice preview"}: ${title}`}
		>
			<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label={isLatvian ? "Iepriekšējā lapa" : "Previous page"}
						disabled={!pdf || page <= 1}
						onClick={() => setPage((value) => value - 1)}
					>
						<ChevronLeft className="size-4" />
					</Button>
					<span
						className="min-w-12 text-center text-xs tabular-nums"
						aria-live="polite"
					>
						{page} / {pdf?.numPages ?? "—"}
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label={isLatvian ? "Nākamā lapa" : "Next page"}
						disabled={!pdf || page >= pdf.numPages}
						onClick={() => setPage((value) => value + 1)}
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label={isLatvian ? "Samazināt" : "Zoom out"}
						disabled={zoom <= 1}
						onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
					>
						<Minus className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 text-xs tabular-nums"
						title={isLatvian ? "Ietilpināt platumā" : "Fit to width"}
						onClick={() => {
							setZoom(1);
							if (viewport.current) viewport.current.scrollLeft = 0;
						}}
					>
						{Math.round(zoom * 100)}%
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label={isLatvian ? "Palielināt" : "Zoom in"}
						disabled={zoom >= 3}
						onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
					>
						<Plus className="size-4" />
					</Button>
				</div>
			</div>
			<div
				ref={viewport}
				className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/40 p-3"
			>
				{failed ? (
					<p role="alert" className="p-3 text-sm text-muted-foreground">
						{isLatvian
							? "PDF neizdevās ielādēt. Atveriet oriģinālu jaunā cilnē."
							: "Could not load PDF. Open the original in a new tab."}
					</p>
				) : !ready ? (
					<output className="absolute inset-0 flex items-center justify-center">
						<Loader2 className="size-5 animate-spin" />
						<span className="sr-only">
							{isLatvian ? "Ielādē rēķinu" : "Loading invoice"}
						</span>
					</output>
				) : null}
				<div className="mx-auto" style={{ width: `${zoom * 100}%` }}>
					<canvas
						ref={canvas}
						role="img"
						aria-label={title}
						className={`block h-auto w-full bg-white shadow-sm ${ready && !failed ? "" : "invisible"}`}
					/>
				</div>
			</div>
		</section>
	);
}
