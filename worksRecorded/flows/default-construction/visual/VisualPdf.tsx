"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type VisualMark, visualLayers } from "./model";

export function VisualPdf({
	url,
	marks,
	selected,
	onSelect,
}: {
	url: string;
	marks: VisualMark[];
	selected: string | null;
	onSelect: (id: string) => void;
}) {
	const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
	const [page, setPage] = useState(1);
	const [zoom, setZoom] = useState(1);
	const [error, setError] = useState(false);
	const [ready, setReady] = useState(false);
	const canvas = useRef<HTMLCanvasElement>(null);
	const selectedPage = marks.find((mark) => mark.id === selected)?.page;
	useEffect(() => {
		if (selectedPage) setPage(selectedPage);
	}, [selectedPage]);
	useEffect(() => {
		let active = true;
		let task:
			| ReturnType<typeof import("pdfjs-dist")["getDocument"]>
			| undefined;
		const abort = new AbortController();
		setDocument(null);
		setError(false);
		setReady(false);
		setPage(1);
		void (async () => {
			try {
				const [response, pdfjs, worker] = await Promise.all([
					fetch(url, { signal: abort.signal }),
					import("pdfjs-dist"),
					import("./pdf-worker-url"),
				]);
				if (!response.ok) throw new Error("PDF unavailable");
				const bytes = new Uint8Array(await response.arrayBuffer());
				if (!active) return;
				pdfjs.GlobalWorkerOptions.workerSrc = worker.pdfWorkerUrl;
				task = pdfjs.getDocument({ data: bytes });
				const pdf = await task.promise;
				if (active) setDocument(pdf);
			} catch {
				if (active) setError(true);
			}
		})();
		return () => {
			active = false;
			abort.abort();
			void task?.destroy();
		};
	}, [url]);
	useEffect(() => {
		if (!document) return;
		let active = true;
		let render: { promise: Promise<void>; cancel: () => void } | undefined;
		setReady(false);
		setError(false);
		void (async () => {
			try {
				const pdfPage = await document.getPage(page);
				if (!active || !canvas.current) return;
				const base = pdfPage.getViewport({ scale: 1 });
				const viewport = pdfPage.getViewport({ scale: 1800 / base.width });
				const element = canvas.current;
				const context = element.getContext("2d");
				if (!context) throw new Error("Canvas unavailable");
				element.width = viewport.width;
				element.height = viewport.height;
				render = pdfPage.render({
					canvas: element,
					canvasContext: context,
					viewport,
				});
				await render.promise;
				if (active) setReady(true);
			} catch {
				if (active) setError(true);
			}
		})();
		return () => {
			active = false;
			render?.cancel();
		};
	}, [document, page]);
	return (
		<div className="min-w-0 space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={page <= 1}
					onClick={() => setPage((value) => value - 1)}
				>
					Iepriekšējā lapa
				</Button>
				<span className="text-sm">
					Lapa {page} / {document?.numPages ?? "—"}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={!document || page >= document.numPages}
					onClick={() => setPage((value) => value + 1)}
				>
					Nākamā lapa
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={zoom <= 1}
					onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
				>
					Attālināt
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={zoom >= 3}
					onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
				>
					Tuvināt
				</Button>
				<Button variant="ghost" size="sm" onClick={() => setZoom(1)}>
					Ietilpināt
				</Button>
			</div>
			{error ? (
				<p role="alert" className="text-destructive">
					Neizdevās parādīt PDF. Pārbaudiet, vai fails nav bojāts, aizsargāts
					vai garāks par 10 lapām.
				</p>
			) : !ready ? (
				<output className="block text-sm text-muted-foreground">
					Ielādē rasējumu…
				</output>
			) : null}
			<div className="max-h-[75dvh] overflow-auto rounded-md border bg-muted p-2">
				<div
					className="relative bg-white"
					style={{
						width: `${zoom * 100}%`,
						visibility: ready ? "visible" : "hidden",
					}}
				>
					<canvas
						ref={canvas}
						className="block h-auto w-full"
						aria-label={`Rasējuma ${page}. lapa`}
					/>
					{ready ? (
						<svg
							className="pointer-events-none absolute inset-0 h-full w-full"
							viewBox="0 0 1 1"
							preserveAspectRatio="none"
							aria-label="AI ieteiktās darbu zonas"
							role="img"
						>
							<title>
								AI ieteiktās darbu zonas; atveriet avotu sarakstā, lai
								pārbaudītu.
							</title>
							{marks
								.filter((mark) => mark.page === page)
								.map((mark) => (
									<polygon
										key={mark.id}
										points={mark.polygon
											.map((point) => `${point.x},${point.y}`)
											.join(" ")}
										fill={visualLayers[mark.layer].color}
										fillOpacity={selected === mark.id ? 0.5 : 0.25}
										stroke={visualLayers[mark.layer].color}
										strokeWidth={selected === mark.id ? 0.004 : 0.002}
										className="cursor-pointer"
									>
										<title>
											{visualLayers[mark.layer].label}: {mark.explanation}
										</title>
									</polygon>
								))}
						</svg>
					) : null}
					{ready
						? marks
								.filter((mark) => mark.page === page)
								.map((mark) => (
									<Button
										key={`hit-${mark.id}`}
										variant="ghost"
										aria-label={`${visualLayers[mark.layer].label}: ${mark.explanation}`}
										title={mark.explanation}
										className="absolute inset-0 h-full w-full rounded-none bg-transparent p-0 hover:bg-transparent"
										style={{
											clipPath: `polygon(${mark.polygon.map((point) => `${point.x * 100}% ${point.y * 100}%`).join(",")})`,
										}}
										onClick={() => onSelect(mark.id)}
									/>
								))
						: null}
				</div>
			</div>
		</div>
	);
}
