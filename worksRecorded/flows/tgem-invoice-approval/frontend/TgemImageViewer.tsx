"use client";

import {
	Download,
	ExternalLink,
	Loader2,
	Maximize2,
	RefreshCw,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";

type Props = {
	documentPath: string;
	filename: string;
	language?: string | null;
};

function getCopy(language?: string | null) {
	if (language === "lv")
		return {
			viewer: "Rēķina attēla skatītājs",
			zoomIn: "Palielināt",
			zoomOut: "Samazināt",
			fit: "Ietilpināt attēlu",
			pan: "Velciet, lai pārvietotu attēlu",
			loading: "Ielādē attēlu…",
			failed: "Attēlu neizdevās ielādēt.",
			retry: "Mēģināt vēlreiz",
			download: "Lejupielādēt",
			open: "Atvērt jaunā cilnē",
		};
	if (language === "ru")
		return {
			viewer: "Просмотр изображения счета",
			zoomIn: "Увеличить",
			zoomOut: "Уменьшить",
			fit: "Вписать изображение",
			pan: "Перетащите, чтобы переместить изображение",
			loading: "Загрузка изображения…",
			failed: "Не удалось загрузить изображение.",
			retry: "Повторить",
			download: "Скачать",
			open: "Открыть в новой вкладке",
		};
	return {
		viewer: "Invoice image viewer",
		zoomIn: "Zoom in",
		zoomOut: "Zoom out",
		fit: "Fit image",
		pan: "Drag to move the image",
		loading: "Loading image…",
		failed: "Could not load the image.",
		retry: "Try again",
		download: "Download",
		open: "Open in new tab",
	};
}

const toolbarButtonClass =
	"inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white";

export function TgemImageViewer({ documentPath, filename, language }: Props) {
	const copy = getCopy(language);
	const viewportRef = React.useRef<HTMLDivElement>(null);
	const dragOriginRef = React.useRef<{
		pointerId: number;
		x: number;
		y: number;
		scrollLeft: number;
		scrollTop: number;
	} | null>(null);
	const [imageSize, setImageSize] = React.useState({
		width: 1200,
		height: 1600,
	});
	const [viewportSize, setViewportSize] = React.useState({
		width: 0,
		height: 0,
	});
	const [customScale, setCustomScale] = React.useState<number | null>(null);
	const [loadState, setLoadState] = React.useState<
		"loading" | "ready" | "error"
	>("loading");
	const [reloadKey, setReloadKey] = React.useState(0);
	const [isDragging, setIsDragging] = React.useState(false);

	React.useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const measure = () =>
			setViewportSize({
				width: viewport.clientWidth,
				height: viewport.clientHeight,
			});
		measure();
		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", measure);
			return () => window.removeEventListener("resize", measure);
		}
		const observer = new ResizeObserver(measure);
		observer.observe(viewport);
		return () => observer.disconnect();
	}, []);

	const fitScale =
		viewportSize.width > 32 && viewportSize.height > 32
			? Math.min(
					(viewportSize.width - 32) / imageSize.width,
					(viewportSize.height - 32) / imageSize.height,
					1,
				)
			: 1;
	const scale = customScale ?? fitScale;

	function startDragging(event: React.PointerEvent<HTMLDivElement>) {
		const viewport = event.currentTarget;
		if (
			event.button !== 0 ||
			event.isPrimary === false ||
			loadState !== "ready" ||
			dragOriginRef.current
		)
			return;
		if (
			viewport.scrollWidth <= viewport.clientWidth &&
			viewport.scrollHeight <= viewport.clientHeight
		)
			return;
		event.preventDefault();
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
		if (dragOriginRef.current?.pointerId !== event.pointerId) return;
		dragOriginRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId))
			event.currentTarget.releasePointerCapture(event.pointerId);
		setIsDragging(false);
	}

	function fitImage() {
		setCustomScale(null);
		const viewport = viewportRef.current;
		if (viewport) {
			viewport.scrollLeft = 0;
			viewport.scrollTop = 0;
		}
	}

	return (
		<section
			aria-label={copy.viewer}
			className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-300 bg-slate-800 shadow-inner dark:border-slate-700 dark:bg-slate-950"
		>
			<div className="flex min-h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-300 bg-slate-100 px-2 dark:border-slate-700 dark:bg-slate-900">
				<button
					type="button"
					aria-label={copy.zoomOut}
					title={copy.zoomOut}
					disabled={loadState !== "ready" || scale <= 0.1}
					onClick={() => setCustomScale(Math.max(0.1, scale / 1.25))}
					className={toolbarButtonClass}
				>
					<ZoomOut className="h-4 w-4" />
				</button>
				<span
					aria-live="polite"
					className="min-w-12 text-center text-xs tabular-nums text-slate-600 dark:text-slate-300"
				>
					{Math.round(scale * 100)}%
				</span>
				<button
					type="button"
					aria-label={copy.zoomIn}
					title={copy.zoomIn}
					disabled={loadState !== "ready" || scale >= 4}
					onClick={() => setCustomScale(Math.min(4, scale * 1.25))}
					className={toolbarButtonClass}
				>
					<ZoomIn className="h-4 w-4" />
				</button>
				<button
					type="button"
					aria-label={copy.fit}
					title={copy.fit}
					disabled={loadState !== "ready"}
					onClick={fitImage}
					className={`${toolbarButtonClass} ${customScale === null ? "bg-slate-200 dark:bg-slate-700" : ""}`}
				>
					<Maximize2 className="h-4 w-4" />
				</button>
				<span className="ml-2 hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
					{copy.pan}
				</span>
				<div className="ml-auto flex shrink-0 items-center gap-1">
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
			<div
				ref={viewportRef}
				data-testid="tgem-image-viewport"
				title={copy.pan}
				onPointerDown={startDragging}
				onPointerMove={moveWhileDragging}
				onPointerUp={stopDragging}
				onPointerCancel={stopDragging}
				onLostPointerCapture={stopDragging}
				className={`relative min-h-0 flex-1 touch-none select-none overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
			>
				{loadState === "error" ? (
					<div
						role="alert"
						className="flex h-full flex-col items-center justify-center gap-3 p-4 text-sm text-slate-300"
					>
						<span>{copy.failed}</span>
						<button
							type="button"
							onClick={() => {
								setLoadState("loading");
								setReloadKey((value) => value + 1);
							}}
							className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 hover:bg-slate-700"
						>
							<RefreshCw className="h-4 w-4" />
							{copy.retry}
						</button>
					</div>
				) : (
					<div className="flex min-h-full w-max min-w-full items-center justify-center p-4">
						<Image
							key={reloadKey}
							src={documentPath}
							alt={filename}
							width={imageSize.width}
							height={imageSize.height}
							unoptimized
							draggable={false}
							onLoad={(event) => {
								const image = event.currentTarget;
								if (image.naturalWidth && image.naturalHeight)
									setImageSize({
										width: image.naturalWidth,
										height: image.naturalHeight,
									});
								setLoadState("ready");
							}}
							onError={() => setLoadState("error")}
							style={{
								width: imageSize.width * scale,
								height: imageSize.height * scale,
							}}
							className="max-w-none shrink-0 object-contain shadow-[0_12px_34px_rgba(0,0,0,0.38)]"
						/>
					</div>
				)}
				{loadState === "loading" ? (
					<output className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-300">
						<Loader2 className="h-4 w-4 animate-spin" />
						{copy.loading}
					</output>
				) : null}
			</div>
		</section>
	);
}
