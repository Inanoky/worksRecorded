import {
	PDF_DETAIL_MAX_PIXELS,
	PDF_DETAIL_MAX_SIDE,
	pdfDetailRegion,
} from "./pdf-detail";

it("renders the visible crop at zoomed device-pixel resolution, not the whole enlarged page", () => {
	const region = pdfDetailRegion(
		1200,
		800,
		1000,
		700,
		{ x: -1800, y: -900, scale: 5 },
		2,
	);
	expect(region).not.toBeNull();
	if (!region) return;
	expect(region.left).toBe(344);
	expect(region.top).toBe(164);
	expect(region.width).toBe(232);
	expect(region.height).toBe(172);
	expect(region.density).toBe(10);
	expect(region.pixelWidth * region.pixelHeight).toBeLessThanOrEqual(
		PDF_DETAIL_MAX_PIXELS,
	);
});
it("supports retina detail at 100% and caps pixels and dimensions for huge screens", () => {
	const normal = pdfDetailRegion(
		1200,
		800,
		1300,
		900,
		{ x: 50, y: 50, scale: 1 },
		2,
	);
	expect(normal?.density).toBe(2);
	const huge = pdfDetailRegion(
		12000,
		12000,
		10000,
		10000,
		{ x: 0, y: 0, scale: 5 },
		4,
	);
	if (!huge) throw new Error("Missing crop");
	expect(huge.pixelWidth * huge.pixelHeight).toBeLessThanOrEqual(
		PDF_DETAIL_MAX_PIXELS,
	);
	expect(Math.max(huge.pixelWidth, huge.pixelHeight)).toBeLessThanOrEqual(
		PDF_DETAIL_MAX_SIDE,
	);
});
it("clips crops to page bounds and skips hidden, off-screen or unmeasured views", () => {
	const region = pdfDetailRegion(
		1200,
		800,
		1000,
		700,
		{ x: 30, y: 40, scale: 2 },
		1,
	);
	expect(region?.left).toBe(0);
	expect(region?.top).toBe(0);
	expect(
		pdfDetailRegion(1200, 800, 0, 0, { x: 0, y: 0, scale: 1 }, 1),
	).toBeNull();
	expect(
		pdfDetailRegion(1200, 800, 1000, 700, { x: 2000, y: 2000, scale: 2 }, 1),
	).toBeNull();
});
