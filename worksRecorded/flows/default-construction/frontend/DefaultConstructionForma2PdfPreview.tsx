"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InvoicePreviewViewport } from "./InvoicePreviewViewport";

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
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	const canvas = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		let active = true;
		let task:
			| ReturnType<typeof import("pdfjs-dist")["getDocument"]>
			| undefined;
		const abort = new AbortController();
		setPdf(null);
		setPage(1);
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
			<InvoicePreviewViewport
				key={`${url}:${page}`}
				isLatvian={isLatvian}
				ready={ready && !failed}
				pageControls={
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
				}
				overlay={
					failed ? (
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
					) : null
				}
			>
				<canvas
					ref={canvas}
					role="img"
					aria-label={title}
					className={`block h-auto w-full bg-white shadow-sm ${ready && !failed ? "" : "invisible"}`}
				/>
			</InvoicePreviewViewport>
		</section>
	);
}
