"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef } from "react";
import { pdfDetailRegion } from "./pdf-detail";
import type { DrawingCamera } from "./viewport";

export function VisualPdfDetail({
	document,
	page,
	pageWidth,
	pageHeight,
	overviewWidth = 0,
	view,
	enabled,
}: {
	document: PDFDocumentProxy;
	page: number;
	pageWidth: number;
	pageHeight: number;
	overviewWidth?: number;
	view: { camera: DrawingCamera; width: number; height: number } | null;
	enabled: boolean;
}) {
	const host = useRef<HTMLDivElement>(null);
	const displayed = useRef<HTMLCanvasElement | null>(null);
	useEffect(() => {
		let active = true;
		let task:
			| ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
			| undefined;
		let buffer: HTMLCanvasElement | null = null;
		if (!enabled || !view) return;
		const next = pdfDetailRegion(
			pageWidth,
			pageHeight,
			view.width,
			view.height,
			view.camera,
			window.devicePixelRatio,
		);
		if (!next || next.density <= overviewWidth / pageWidth) return;
		void (async () => {
			try {
				const pdfPage = await document.getPage(page);
				if (!active) return;
				const base = pdfPage.getViewport({ scale: 1 });
				const viewport = pdfPage.getViewport({
					scale: (pageWidth * next.density) / base.width,
				});
				buffer = window.document.createElement("canvas");
				buffer.width = next.pixelWidth;
				buffer.height = next.pixelHeight;
				const context = buffer.getContext("2d");
				if (!context) return;
				task = pdfPage.render({
					canvas: buffer,
					canvasContext: context,
					viewport,
					transform: [
						1,
						0,
						0,
						1,
						-next.left * next.density,
						-next.top * next.density,
					],
				});
				await task.promise;
				const element = host.current;
				if (!active || !element) return;
				buffer.setAttribute(
					"aria-label",
					"Rasējuma augstas izšķirtspējas detaļas",
				);
				buffer.dataset.pdfDetail = "";
				Object.assign(buffer.style, {
					position: "absolute",
					pointerEvents: "none",
					left: `${(next.left / pageWidth) * 100}%`,
					top: `${(next.top / pageHeight) * 100}%`,
					width: `${(next.width / pageWidth) * 100}%`,
					height: `${(next.height / pageHeight) * 100}%`,
				});
				const previous = displayed.current;
				element.replaceChildren(buffer);
				displayed.current = buffer;
				buffer = null;
				if (previous) {
					previous.width = 0;
					previous.height = 0;
				}
			} catch {
			} finally {
				if (buffer) {
					buffer.width = 0;
					buffer.height = 0;
				}
			}
		})();
		return () => {
			active = false;
			task?.cancel();
		};
	}, [document, page, pageWidth, pageHeight, overviewWidth, view, enabled]);
	useEffect(() => {
		return () => {
			if (displayed.current) {
				displayed.current.width = 0;
				displayed.current.height = 0;
				displayed.current = null;
			}
		};
	}, []);
	return (
		<div
			ref={host}
			data-pdf-detail-layer
			className="pointer-events-none absolute inset-0"
		/>
	);
}
