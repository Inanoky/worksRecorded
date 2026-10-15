"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
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
	const canvas = useRef<HTMLCanvasElement>(null);
	const [region, setRegion] =
		useState<ReturnType<typeof pdfDetailRegion>>(null);
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
				const output = canvas.current;
				if (!active || !output) return;
				const target = output.getContext("2d");
				if (!target) return;
				output.width = buffer.width;
				output.height = buffer.height;
				target.drawImage(buffer, 0, 0);
				setRegion(next);
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
		const element = canvas.current;
		return () => {
			if (element) {
				element.width = 0;
				element.height = 0;
			}
		};
	}, []);
	return (
		<canvas
			ref={canvas}
			aria-label="Rasējuma augstas izšķirtspējas detaļas"
			data-pdf-detail
			className="pointer-events-none absolute"
			style={{
				display: region ? "block" : "none",
				left: region?.left,
				top: region?.top,
				width: region?.width,
				height: region?.height,
			}}
		/>
	);
}
