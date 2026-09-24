"use client";

import {
	ChevronLeft,
	ChevronRight,
	Download,
	ExternalLink,
	Loader2,
	Maximize2,
	RefreshCw,
	RotateCw,
	TextCursorInput,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import * as React from "react";
import { createPortal } from "react-dom";

type Props = {
	documentPath: string;
	filename: string;
	language?: string | null;
};

type PdfDocument = Pick<PDFDocumentProxy, "destroy" | "getPage" | "numPages">;

function getCopy(language?: string | null) {
	if (language === "lv") {
		return {
			viewer: "PDF dokumenta skatītājs",
			loading: "Ielādē PDF dokumentu…",
			failed: "PDF dokumentu neizdevās ielādēt.",
			retry: "Mēģināt vēlreiz",
			previousPage: "Iepriekšējā lapa",
			nextPage: "Nākamā lapa",
			zoomOut: "Samazināt",
			zoomIn: "Palielināt",
			fitWidth: "Ietilpināt platumā",
			rotate: "Pagriezt",
			download: "Lejupielādēt",
			open: "Atvērt jaunā cilnē",
			page: "Lapa",
			pan: "Velciet, lai pārvietotu dokumentu",
			selectText: "Kopēt PDF tekstu",
			selectTextHint: "Iezīmējiet un kopējiet tekstu tieši dokumentā",
			copyModeActive: "Kopēšanas režīms ieslēgts",
			copyModeHelp:
				"Iezīmējiet tekstu dokumentā. Izslēdziet režīmu, lai atkal pārvietotu lapu.",
			disableCopyMode: "Izslēgt kopēšanas režīmu",
			noSelectableText:
				"Šajā PDF lapā nav atlasāma teksta. Izmantojiet teksta versiju.",
		};
	}

	if (language === "ru") {
		return {
			viewer: "Просмотр PDF-документа",
			loading: "Загрузка PDF-документа…",
			failed: "Не удалось загрузить PDF-документ.",
			retry: "Повторить",
			previousPage: "Предыдущая страница",
			nextPage: "Следующая страница",
			zoomOut: "Уменьшить",
			zoomIn: "Увеличить",
			fitWidth: "По ширине",
			rotate: "Повернуть",
			download: "Скачать",
			open: "Открыть в новой вкладке",
			page: "Страница",
			pan: "Перетащите, чтобы переместить документ",
			selectText: "Выделять текст PDF",
			selectTextHint: "Выделяйте и копируйте текст прямо в документе",
			copyModeActive: "Режим копирования включен",
			copyModeHelp:
				"Выделяйте текст в документе. Отключите режим, чтобы снова перемещать страницу.",
			disableCopyMode: "Отключить режим копирования",
			noSelectableText:
				"На этой странице PDF нет выделяемого текста. Используйте текстовую версию.",
		};
	}

	return {
		viewer: "PDF document viewer",
		loading: "Loading PDF document…",
		failed: "Could not load the PDF document.",
		retry: "Try again",
		previousPage: "Previous page",
		nextPage: "Next page",
		zoomOut: "Zoom out",
		zoomIn: "Zoom in",
		fitWidth: "Fit to width",
		rotate: "Rotate",
		download: "Download",
		open: "Open in new tab",
		page: "Page",
		pan: "Drag to move the document",
		selectText: "Select PDF text",
		selectTextHint: "Select and copy text directly in the document",
		copyModeActive: "Copy mode is on",
		copyModeHelp:
			"Select text in the document. Turn off copy mode to move the page again.",
		disableCopyMode: "Turn off copy mode",
		noSelectableText:
			"This PDF page has no selectable text. Use the text version instead.",
	};
}

const toolbarButtonClass =
	"inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 transition hover:bg-tgem-primary/10 hover:text-tgem-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300";

export function TgemPdfViewer({ documentPath, filename, language }: Props) {
	const copy = getCopy(language);
	const copyModeStatusId = React.useId();
	const canvasRef = React.useRef<HTMLCanvasElement>(null);
	const pageSurfaceRef = React.useRef<HTMLDivElement>(null);
	const textLayerRef = React.useRef<HTMLDivElement>(null);
	const viewportRef = React.useRef<HTMLDivElement>(null);
	const copyModeButtonRef = React.useRef<HTMLButtonElement>(null);
	const copyModeStatusRef = React.useRef<HTMLOutputElement>(null);
	const dragOriginRef = React.useRef<{
		pointerId: number;
		x: number;
		y: number;
		scrollLeft: number;
		scrollTop: number;
	} | null>(null);
	const [pdfDocument, setPdfDocument] = React.useState<PdfDocument | null>(
		null,
	);
	const [loadState, setLoadState] = React.useState<
		"loading" | "ready" | "error"
	>("loading");
	const [pageNumber, setPageNumber] = React.useState(1);
	const [pageRendering, setPageRendering] = React.useState(false);
	const [scaleMode, setScaleMode] = React.useState<"fit" | "custom">("custom");
	const [customScale, setCustomScale] = React.useState(0.77);
	const [renderedScale, setRenderedScale] = React.useState(0.77);
	const [rotation, setRotation] = React.useState(0);
	const [viewportWidth, setViewportWidth] = React.useState(0);
	const [reloadKey, setReloadKey] = React.useState(0);
	const [isDragging, setIsDragging] = React.useState(false);
	const [interactionMode, setInteractionMode] = React.useState<
		"pan" | "select"
	>("pan");
	const [hasSelectableText, setHasSelectableText] = React.useState<
		boolean | null
	>(null);
	const [copyModeStatusPosition, setCopyModeStatusPosition] = React.useState({
		left: 0,
		top: 0,
		visible: false,
	});

	const positionCopyModeStatus = React.useCallback(() => {
		const button = copyModeButtonRef.current;
		const status = copyModeStatusRef.current;
		if (!button || !status) return;

		const buttonRect = button.getBoundingClientRect();
		const statusRect = status.getBoundingClientRect();
		const viewportGutter = 8;
		const left = Math.min(
			Math.max(
				buttonRect.left + buttonRect.width / 2 - statusRect.width / 2,
				viewportGutter,
			),
			window.innerWidth - statusRect.width - viewportGutter,
		);
		const top = Math.max(
			viewportGutter,
			buttonRect.top - statusRect.height - 10,
		);

		setCopyModeStatusPosition({ left, top, visible: true });
	}, []);

	React.useLayoutEffect(() => {
		if (loadState !== "ready" || interactionMode !== "select") {
			setCopyModeStatusPosition((current) =>
				current.visible ? { ...current, visible: false } : current,
			);
			return;
		}

		const frameId = window.requestAnimationFrame(positionCopyModeStatus);
		window.addEventListener("resize", positionCopyModeStatus);
		window.addEventListener("scroll", positionCopyModeStatus, true);

		return () => {
			window.cancelAnimationFrame(frameId);
			window.removeEventListener("resize", positionCopyModeStatus);
			window.removeEventListener("scroll", positionCopyModeStatus, true);
		};
	}, [interactionMode, loadState, positionCopyModeStatus]);

	React.useEffect(() => {
		const element = viewportRef.current;
		if (!element) return;

		const updateWidth = () => setViewportWidth(element.clientWidth);
		updateWidth();
		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", updateWidth);
			return () => window.removeEventListener("resize", updateWidth);
		}
		const observer = new ResizeObserver(updateWidth);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	React.useEffect(() => {
		let active = true;
		let loadingTask: {
			promise: Promise<unknown>;
			destroy: () => Promise<void>;
		} | null = null;
		let loadedDocument: PdfDocument | null = null;
		const abortController = new AbortController();

		setLoadState("loading");
		setPdfDocument(null);
		setPageNumber(1);

		void (async () => {
			try {
				const response = await fetch(documentPath, {
					cache: reloadKey > 0 ? "reload" : "default",
					credentials: "same-origin",
					signal: abortController.signal,
				});
				if (!response.ok) throw new Error("PDF request failed");

				const [pdfjs, { pdfWorkerUrl }] = await Promise.all([
					import("pdfjs-dist"),
					import("./pdf-worker-url"),
				]);
				pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
				loadingTask = pdfjs.getDocument({
					data: new Uint8Array(await response.arrayBuffer()),
				});
				loadedDocument = (await loadingTask.promise) as PdfDocument;
				if (!active) {
					await loadedDocument.destroy();
					return;
				}

				setPdfDocument(loadedDocument);
				setLoadState("ready");
			} catch (error) {
				if (
					active &&
					!(error instanceof DOMException && error.name === "AbortError")
				) {
					setLoadState("error");
				}
			}
		})();

		return () => {
			active = false;
			abortController.abort();
			if (loadedDocument) {
				void loadedDocument.destroy();
			} else if (loadingTask) {
				void loadingTask.destroy();
			}
		};
	}, [documentPath, reloadKey]);

	React.useEffect(() => {
		if (!pdfDocument || !canvasRef.current || viewportWidth === 0) return;

		let active = true;
		let renderTask: { promise: Promise<void>; cancel: () => void } | null =
			null;
		let textLayerTask: {
			cancel: () => void;
			render: () => Promise<unknown>;
		} | null = null;
		setPageRendering(true);
		setHasSelectableText(null);

		void (async () => {
			try {
				const page = await pdfDocument.getPage(pageNumber);
				if (
					!active ||
					!canvasRef.current ||
					!pageSurfaceRef.current ||
					!textLayerRef.current
				)
					return;

				const baseViewport = page.getViewport({ scale: 1, rotation });
				const scale =
					scaleMode === "fit"
						? Math.min(
								Math.max((viewportWidth - 32) / baseViewport.width, 0.35),
								2.5,
							)
						: customScale;
				const viewport = page.getViewport({ scale, rotation });
				const canvas = canvasRef.current;
				const context = canvas.getContext("2d");
				if (!context) throw new Error("Canvas is unavailable");

				const outputScale = Math.min(window.devicePixelRatio || 1, 2);
				canvas.width = Math.floor(viewport.width * outputScale);
				canvas.height = Math.floor(viewport.height * outputScale);
				canvas.style.width = `${Math.floor(viewport.width)}px`;
				canvas.style.height = `${Math.floor(viewport.height)}px`;
				pageSurfaceRef.current.style.width = `${Math.floor(viewport.width)}px`;
				pageSurfaceRef.current.style.height = `${Math.floor(viewport.height)}px`;
				pageSurfaceRef.current.style.setProperty(
					"--total-scale-factor",
					String(scale),
				);
				setRenderedScale(scale);

				renderTask = page.render({
					canvas,
					canvasContext: context,
					viewport,
					transform:
						outputScale === 1
							? undefined
							: [outputScale, 0, 0, outputScale, 0, 0],
				});
				await renderTask.promise;

				try {
					const textContent = await page.getTextContent();
					if (!active || !textLayerRef.current) return;
					textLayerRef.current.replaceChildren();
					const { TextLayer } = await import("pdfjs-dist");
					if (!active || !textLayerRef.current) return;
					textLayerTask = new TextLayer({
						textContentSource: textContent,
						container: textLayerRef.current,
						viewport,
					});
					await textLayerTask.render();
					if (active) {
						const selectable = textContent.items.length > 0;
						setHasSelectableText(selectable);
						if (!selectable) setInteractionMode("pan");
					}
				} catch {
					if (active) {
						setHasSelectableText(false);
						setInteractionMode("pan");
					}
				}
			} catch (error) {
				if (
					active &&
					!(
						error instanceof Error &&
						error.name === "RenderingCancelledException"
					)
				) {
					setLoadState("error");
				}
			} finally {
				if (active) setPageRendering(false);
			}
		})();

		return () => {
			active = false;
			renderTask?.cancel();
			textLayerTask?.cancel();
		};
	}, [
		customScale,
		pageNumber,
		pdfDocument,
		rotation,
		scaleMode,
		viewportWidth,
	]);

	function changeZoom(delta: number) {
		setCustomScale(Math.min(Math.max(renderedScale + delta, 0.5), 2.5));
		setScaleMode("custom");
	}

	function startDragging(event: React.PointerEvent<HTMLDivElement>) {
		if (interactionMode === "select") return;
		const viewport = event.currentTarget;
		const canPan =
			viewport.scrollWidth > viewport.clientWidth ||
			viewport.scrollHeight > viewport.clientHeight;
		if (event.button !== 0 || loadState !== "ready" || !canPan) return;

		dragOriginRef.current = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			scrollLeft: viewport.scrollLeft,
			scrollTop: viewport.scrollTop,
		};
		viewport.setPointerCapture(event.pointerId);
		setIsDragging(true);
	}

	function moveWhileDragging(event: React.PointerEvent<HTMLDivElement>) {
		const origin = dragOriginRef.current;
		if (!origin || origin.pointerId !== event.pointerId) return;

		event.preventDefault();
		event.currentTarget.scrollLeft =
			origin.scrollLeft - (event.clientX - origin.x);
		event.currentTarget.scrollTop =
			origin.scrollTop - (event.clientY - origin.y);
	}

	function stopDragging(event: React.PointerEvent<HTMLDivElement>) {
		const origin = dragOriginRef.current;
		if (!origin || origin.pointerId !== event.pointerId) return;

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		dragOriginRef.current = null;
		setIsDragging(false);
	}

	return (
		<section
			aria-label={copy.viewer}
			className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-300 bg-slate-800 shadow-inner dark:border-slate-700 dark:bg-slate-950"
		>
			<div className="flex min-h-11 items-center gap-1 overflow-x-auto border-b border-slate-300 bg-slate-100 px-2 dark:border-slate-700 dark:bg-slate-900">
				<button
					type="button"
					aria-label={copy.previousPage}
					title={copy.previousPage}
					disabled={loadState !== "ready" || pageNumber <= 1}
					onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
					className={toolbarButtonClass}
				>
					<ChevronLeft className="h-4 w-4" />
				</button>
				<div className="min-w-16 text-center text-xs tabular-nums text-slate-700 dark:text-slate-200">
					<span className="sr-only">{copy.page} </span>
					{pageNumber} / {pdfDocument?.numPages ?? "—"}
				</div>
				<button
					type="button"
					aria-label={copy.nextPage}
					title={copy.nextPage}
					disabled={
						loadState !== "ready" || pageNumber >= (pdfDocument?.numPages ?? 1)
					}
					onClick={() =>
						setPageNumber((current) =>
							Math.min(pdfDocument?.numPages ?? current, current + 1),
						)
					}
					className={toolbarButtonClass}
				>
					<ChevronRight className="h-4 w-4" />
				</button>
				<div className="mx-1 h-5 w-px shrink-0 bg-slate-300 dark:bg-slate-700" />
				<button
					type="button"
					aria-label={copy.zoomOut}
					title={copy.zoomOut}
					disabled={loadState !== "ready" || renderedScale <= 0.5}
					onClick={() => changeZoom(-0.25)}
					className={toolbarButtonClass}
				>
					<ZoomOut className="h-4 w-4" />
				</button>
				<div className="min-w-12 text-center text-xs tabular-nums text-slate-700 dark:text-slate-200">
					{Math.round(renderedScale * 100)}%
				</div>
				<button
					type="button"
					aria-label={copy.zoomIn}
					title={copy.zoomIn}
					disabled={loadState !== "ready" || renderedScale >= 2.5}
					onClick={() => changeZoom(0.25)}
					className={toolbarButtonClass}
				>
					<ZoomIn className="h-4 w-4" />
				</button>
				<button
					type="button"
					aria-label={copy.fitWidth}
					title={copy.fitWidth}
					disabled={loadState !== "ready"}
					onClick={() => setScaleMode("fit")}
					className={`${toolbarButtonClass} ${scaleMode === "fit" ? "bg-tgem-primary/10 text-tgem-primary" : ""}`}
				>
					<Maximize2 className="h-4 w-4" />
				</button>
				<button
					type="button"
					aria-label={copy.rotate}
					title={copy.rotate}
					disabled={loadState !== "ready"}
					onClick={() => setRotation((current) => (current + 90) % 360)}
					className={toolbarButtonClass}
				>
					<RotateCw className="h-4 w-4" />
				</button>
				<div className="mx-1 h-5 w-px shrink-0 bg-slate-300 dark:bg-slate-700" />
				<div data-testid="tgem-pdf-copy-mode-control" className="shrink-0">
					<button
						ref={copyModeButtonRef}
						type="button"
						aria-describedby={
							interactionMode === "select" ? copyModeStatusId : undefined
						}
						aria-label={
							interactionMode === "select"
								? copy.disableCopyMode
								: copy.selectText
						}
						title={
							hasSelectableText === false
								? copy.noSelectableText
								: copy.selectTextHint
						}
						aria-pressed={interactionMode === "select"}
						disabled={loadState !== "ready" || hasSelectableText === false}
						onClick={() =>
							setInteractionMode((current) =>
								current === "pan" ? "select" : "pan",
							)
						}
						className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50 disabled:cursor-not-allowed disabled:opacity-35 ${interactionMode === "select" ? "bg-tgem-primary/10 text-tgem-primary" : "text-slate-600 hover:bg-tgem-primary/10 hover:text-tgem-primary dark:text-slate-300"}`}
					>
						<TextCursorInput className="h-4 w-4" />
						<span>
							{interactionMode === "select"
								? copy.copyModeActive
								: copy.selectText}
						</span>
					</button>
				</div>
				<div className="ml-auto flex items-center gap-1 pl-2">
					<a
						href={documentPath}
						download={filename}
						aria-label={copy.download}
						title={copy.download}
						className={toolbarButtonClass}
					>
						<Download className="h-4 w-4" />
					</a>
					<a
						href={documentPath}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={copy.open}
						title={copy.open}
						className={toolbarButtonClass}
					>
						<ExternalLink className="h-4 w-4" />
					</a>
				</div>
			</div>
			{loadState === "ready" &&
			interactionMode === "select" &&
			typeof document !== "undefined"
				? createPortal(
						<output
							ref={copyModeStatusRef}
							id={copyModeStatusId}
							aria-live="polite"
							data-testid="tgem-pdf-copy-mode-status"
							style={{
								left: copyModeStatusPosition.left,
								top: copyModeStatusPosition.top,
							}}
							className={`fixed z-[100] w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-[#7CA5E8] bg-white px-3 py-2.5 text-slate-950 shadow-lg transition-opacity dark:border-tgem-primary dark:bg-slate-950 dark:text-blue-100 ${copyModeStatusPosition.visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
						>
							<div className="flex items-center gap-2 text-xs font-semibold">
								<span className="h-2 w-2 rounded-full bg-tgem-primary ring-4 ring-[#DCE9FC] dark:ring-tgem-primary/20" />
								{copy.copyModeActive}
							</div>
							<div className="mt-1 text-[11px] leading-4 text-slate-600 dark:text-slate-300">
								{copy.copyModeHelp}
							</div>
							<span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-[#7CA5E8] bg-white dark:border-tgem-primary dark:bg-slate-950" />
						</output>,
						document.body,
					)
				: null}

			<div
				ref={viewportRef}
				data-testid="tgem-pdf-viewport"
				title={interactionMode === "select" ? copy.selectTextHint : copy.pan}
				onPointerDown={startDragging}
				onPointerMove={moveWhileDragging}
				onPointerUp={stopDragging}
				onPointerCancel={stopDragging}
				onLostPointerCapture={() => {
					dragOriginRef.current = null;
					setIsDragging(false);
				}}
				className={`relative min-h-0 flex-1 overflow-auto p-4 ${interactionMode === "select" ? "touch-auto cursor-text select-text" : `touch-none select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}`}
			>
				<div className="flex min-h-full min-w-max items-start justify-center">
					<div
						ref={pageSurfaceRef}
						className={`relative shrink-0 bg-white shadow-[0_12px_34px_rgba(0,0,0,0.38)] ${loadState === "ready" ? "block" : "hidden"}`}
					>
						<canvas ref={canvasRef} aria-label={filename} className="block" />
						<div
							ref={textLayerRef}
							data-testid="tgem-pdf-text-layer"
							aria-hidden={interactionMode !== "select"}
							className={`tgem-pdf-text-layer ${interactionMode === "select" ? "pointer-events-auto select-text" : "pointer-events-none select-none"}`}
						/>
					</div>
				</div>
				{loadState === "ready" && hasSelectableText === false ? (
					<div className="pointer-events-none absolute bottom-3 left-1/2 z-20 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md border border-amber-200 bg-amber-50/95 px-3 py-2 text-center text-xs text-amber-900 shadow-sm">
						{copy.noSelectableText}
					</div>
				) : null}
				{loadState === "loading" || pageRendering ? (
					<div className="absolute inset-0 flex items-center justify-center bg-slate-800/75 text-sm text-slate-100 backdrop-blur-[1px] dark:bg-slate-950/75">
						<div className="flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							{copy.loading}
						</div>
					</div>
				) : null}
				{loadState === "error" ? (
					<div className="absolute inset-0 flex items-center justify-center bg-slate-800 px-6 text-center text-sm text-slate-100 dark:bg-slate-950">
						<div>
							<p>{copy.failed}</p>
							<button
								type="button"
								onClick={() => setReloadKey((current) => current + 1)}
								className="mt-3 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-[#F1F6FF] hover:text-tgem-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50"
							>
								<RefreshCw className="h-3.5 w-3.5" />
								{copy.retry}
							</button>
						</div>
					</div>
				) : null}
			</div>
			<style>{`
				.tgem-pdf-text-layer {
					color-scheme: only light;
					position: absolute;
					inset: 0;
					overflow: clip;
					line-height: 1;
					text-align: initial;
					text-size-adjust: none;
					transform-origin: 0 0;
					forced-color-adjust: none;
					--text-scale-factor: calc(
						var(--total-scale-factor) * var(--min-font-size)
					);
					--min-font-size-inv: calc(1 / var(--min-font-size));
				}

				.tgem-pdf-text-layer span[role="presentation"],
				.tgem-pdf-text-layer br[role="presentation"] {
					position: absolute;
					color: transparent;
					white-space: pre;
					cursor: text;
					transform-origin: 0% 0%;
				}

				.tgem-pdf-text-layer span[role="presentation"] {
					z-index: 1;
					--font-height: 0;
					--scale-x: 1;
					--rotate: 0deg;
					font-size: calc(var(--text-scale-factor) * var(--font-height));
					transform: rotate(var(--rotate)) scaleX(var(--scale-x))
						scale(var(--min-font-size-inv));
				}

				.tgem-pdf-text-layer .markedContent {
					display: contents;
				}

				.tgem-pdf-text-layer[data-main-rotation="90"] {
					transform: rotate(90deg) translateY(-100%);
				}

				.tgem-pdf-text-layer[data-main-rotation="180"] {
					transform: rotate(180deg) translate(-100%, -100%);
				}

				.tgem-pdf-text-layer[data-main-rotation="270"] {
					transform: rotate(270deg) translateX(-100%);
				}

				.tgem-pdf-text-layer ::selection {
					background: rgb(37 99 235 / 28%);
				}

				.tgem-pdf-text-layer br::selection {
					background: transparent;
				}

				.hiddenCanvasElement {
					position: absolute;
					top: 0;
					left: 0;
					display: none;
					width: 0;
					height: 0;
				}
			`}</style>
		</section>
	);
}
