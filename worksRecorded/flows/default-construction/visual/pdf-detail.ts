import type { DrawingCamera } from "./viewport";

export const PDF_DETAIL_MAX_PIXELS = 4_000_000;
export const PDF_DETAIL_MAX_SIDE = 4096;

export function pdfDetailRegion(
	pageWidth: number,
	pageHeight: number,
	viewportWidth: number,
	viewportHeight: number,
	camera: DrawingCamera,
	pixelRatio: number,
) {
	if (
		[pageWidth, pageHeight, viewportWidth, viewportHeight].some(
			(value) => !Number.isFinite(value) || value <= 1,
		) ||
		!Number.isFinite(camera.scale) ||
		camera.scale <= 0
	)
		return null;
	if (!Number.isFinite(camera.x) || !Number.isFinite(camera.y)) return null;
	const margin = 80 / camera.scale;
	const left = Math.max(0, -camera.x / camera.scale - margin);
	const top = Math.max(0, -camera.y / camera.scale - margin);
	const right = Math.min(
		pageWidth,
		(viewportWidth - camera.x) / camera.scale + margin,
	);
	const bottom = Math.min(
		pageHeight,
		(viewportHeight - camera.y) / camera.scale + margin,
	);
	const width = right - left,
		height = bottom - top;
	if (width <= 0 || height <= 0) return null;
	const density = Math.min(
		camera.scale * Math.max(1, Math.min(2, pixelRatio || 1)),
		Math.sqrt(PDF_DETAIL_MAX_PIXELS / (width * height)),
		PDF_DETAIL_MAX_SIDE / width,
		PDF_DETAIL_MAX_SIDE / height,
	);
	return {
		left,
		top,
		width,
		height,
		density,
		pixelWidth: Math.max(1, Math.floor(width * density)),
		pixelHeight: Math.max(1, Math.floor(height * density)),
	};
}
