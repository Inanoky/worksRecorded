import { type DrawingTiles, visibleDrawingTiles } from "./drawing-tiles";
import { preparedPreviewSchema } from "./prepared-preview-model";

const tiles: DrawingTiles = {
	version: 1,
	size: 1024,
	levels: [1024, 2048, 4096].map((width) => ({
		width,
		height: width / 2,
		urls: Array.from(
			{ length: Math.ceil(width / 1024) * Math.ceil(width / 2 / 1024) },
			(_, i) => `tile-${width}-${i}`,
		),
	})),
};
it("keeps full detail at deep zoom and supports tile ordinals above 99", () => {
	const highResolution: DrawingTiles = {
		version: 1,
		format: "png",
		size: 1024,
		levels: [2048, 4096, 8192, 16384].map((width) => ({
			width,
			height: Math.ceil((width * 11589) / 16384),
			urls: Array.from(
				{
					length:
						Math.ceil(width / 1024) * Math.ceil((width * 11589) / 16384 / 1024),
				},
				(_, i) => `https://a.ufs.sh/${width}-${i}.png`,
			),
		})),
	};
	expect(
		preparedPreviewSchema.safeParse({
			version: 1,
			source: "hires",
			pages: [
				{
					page: 1,
					width: 3370.39,
					height: 2383.94,
					scales: [100],
					url: "https://a.ufs.sh/overview.webp",
					tiles: highResolution,
				},
			],
		}).success,
	).toBe(true);
	const visible = visibleDrawingTiles(
		highResolution,
		3370.39,
		2383.94,
		{
			camera: { x: -10000, y: -8000, scale: 4 },
			width: 1000,
			height: 800,
		},
		2,
	);
	expect(visible.length).toBeGreaterThan(0);
	expect(visible.length).toBeLessThanOrEqual(25);
	expect(visible.every((tile) => tile.level === 3)).toBe(true);
	expect(visible.some((tile) => tile.ordinal > 99)).toBe(true);
});
it("selects resolution for zoom and device density, and reuses normalized full-page coordinates", () => {
	const overview = visibleDrawingTiles(tiles, 1000, 500, {
		camera: { x: 0, y: 0, scale: 1 },
		width: 1000,
		height: 500,
	});
	expect(overview.map((tile) => tile.level)).toEqual([0]);
	const zoom = visibleDrawingTiles(tiles, 1000, 500, {
		camera: { x: -1200, y: -500, scale: 4 },
		width: 900,
		height: 500,
	});
	expect(zoom.length).toBeLessThanOrEqual(8);
	for (const tile of zoom) {
		expect(tile.level).toBe(2);
		expect(tile.left + tile.width).toBeLessThanOrEqual(1);
		expect(tile.top + tile.height).toBeLessThanOrEqual(1);
	}
	expect(
		visibleDrawingTiles(
			tiles,
			1000,
			500,
			{ camera: { x: 0, y: 0, scale: 1 }, width: 1000, height: 500 },
			2,
		)[0].level,
	).toBe(1);
});
it("culls tiles outside the viewport and clips edge tiles without stretching the page", () => {
	expect(
		visibleDrawingTiles(tiles, 1000, 500, {
			camera: { x: 5000, y: 5000, scale: 2 },
			width: 800,
			height: 600,
		}),
	).toEqual([]);
	const partial: DrawingTiles = {
		version: 1,
		size: 1024,
		levels: [{ width: 1500, height: 1200, urls: ["a", "b", "c", "d"] }],
	};
	const visible = visibleDrawingTiles(partial, 1000, 800, {
		camera: { x: 0, y: 0, scale: 1 },
		width: 1000,
		height: 800,
	});
	expect(visible.at(-1)).toMatchObject({
		left: 1024 / 1500,
		top: 1024 / 1200,
		width: 476 / 1500,
		height: 176 / 1200,
	});
});
