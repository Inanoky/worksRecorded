import {
	fitDrawing,
	interpolateCamera,
	wheelZoomFactor,
	zoomDrawingAt,
} from "./viewport";

it.each([
	{ x: 0, y: 0 },
	{ x: 870, y: 540 },
	{ x: 410, y: 180 },
])(
	"keeps the drawing point beneath the cursor fixed through every animation frame at %o",
	(anchor) => {
		const from = { x: -130, y: 45, scale: 1.4 };
		const point = {
			x: (anchor.x - from.x) / from.scale,
			y: (anchor.y - from.y) / from.scale,
		};
		const to = zoomDrawingAt(from, anchor, 3.1);
		for (const progress of [0, 0.1, 0.3, 0.7, 1]) {
			const frame = interpolateCamera(from, to, progress);
			expect(frame.x + point.x * frame.scale).toBeCloseTo(anchor.x, 8);
			expect(frame.y + point.y * frame.scale).toBeCloseTo(anchor.y, 8);
		}
	},
);

it("stops zooming out at 100% while keeping the cursor anchored", () => {
	const camera = { x: 100, y: 200, scale: 2 };
	expect(zoomDrawingAt(camera, { x: 0, y: 0 }, 0.5)).toEqual({
		x: 50,
		y: 100,
		scale: 1,
	});
	expect(zoomDrawingAt(camera, { x: 0, y: 0 }, 100).scale).toBe(5);
	expect(zoomDrawingAt(camera, { x: 0, y: 0 }, 0).scale).toBe(1);
});

it("does not move the drawing when zooming out repeatedly at 100%", () => {
	const camera = { x: 24, y: 62, scale: 1 };
	let next = camera;
	for (let index = 0; index < 20; index++) {
		next = zoomDrawingAt(next, { x: 700, y: 240 }, next.scale * 0.8);
		expect(next).toEqual(camera);
	}
});

it("uses wheel magnitude for smooth trackpads and normalizes wheel delta modes", () => {
	expect(wheelZoomFactor(-1, 0)).toBeLessThan(wheelZoomFactor(-100, 0));
	expect(wheelZoomFactor(-3, 1)).toBeCloseTo(wheelZoomFactor(-48, 0));
	expect(wheelZoomFactor(100, 0) * wheelZoomFactor(-100, 0)).toBeCloseTo(1);
});

it("fits both portrait and landscape drawings inside the canvas with a margin", () => {
	for (const aspect of [0.5, 2]) {
		const fit = fitDrawing(1000, 600, aspect);
		expect(fit.width).toBeLessThanOrEqual(952);
		expect(fit.height).toBeLessThanOrEqual(552);
		expect(fit.width / fit.height).toBeCloseTo(aspect);
		expect(fit.camera.x + fit.width / 2).toBe(500);
		expect(fit.camera.y + fit.height / 2).toBe(300);
	}
});
