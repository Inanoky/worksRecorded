export type DrawingCamera = { x: number; y: number; scale: number };
export type ViewportPoint = { x: number; y: number };
export const MIN_DRAWING_ZOOM = 1;
export const MAX_DRAWING_ZOOM = 5;

export function zoomDrawingAt(
	camera: DrawingCamera,
	anchor: ViewportPoint,
	scale: number,
): DrawingCamera {
	const next = Math.max(MIN_DRAWING_ZOOM, Math.min(MAX_DRAWING_ZOOM, scale));
	const ratio = next / camera.scale;
	return {
		scale: next,
		x: anchor.x - (anchor.x - camera.x) * ratio,
		y: anchor.y - (anchor.y - camera.y) * ratio,
	};
}

export function wheelZoomFactor(delta: number, mode: number) {
	const pixels = delta * (mode === 1 ? 16 : mode === 2 ? 400 : 1);
	return Math.exp(-Math.max(-160, Math.min(160, pixels)) * 0.002);
}

export function interpolateCamera(
	from: DrawingCamera,
	to: DrawingCamera,
	progress: number,
): DrawingCamera {
	return {
		x: from.x + (to.x - from.x) * progress,
		y: from.y + (to.y - from.y) * progress,
		scale: from.scale + (to.scale - from.scale) * progress,
	};
}

export function fitDrawing(width: number, height: number, aspect: number) {
	const pageWidth = Math.max(1, Math.min(width - 48, (height - 48) * aspect));
	const pageHeight = pageWidth / aspect;
	return {
		width: pageWidth,
		height: pageHeight,
		camera: {
			x: (width - pageWidth) / 2,
			y: (height - pageHeight) / 2,
			scale: 1,
		},
	};
}
