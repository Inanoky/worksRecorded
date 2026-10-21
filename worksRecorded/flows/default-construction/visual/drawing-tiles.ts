import type { PreparedPreview } from "./prepared-preview-model";
import type { DrawingCamera } from "./viewport";

export type DrawingTiles = NonNullable<
	PreparedPreview["pages"][number]["tiles"]
>;

export function visibleDrawingTiles(
	tiles: DrawingTiles,
	pageWidth: number,
	pageHeight: number,
	view: { camera: DrawingCamera; width: number; height: number } | null,
	pixelRatio = 1,
) {
	if (!view || pageWidth <= 1 || pageHeight <= 1 || view.camera.scale <= 0)
		return [];
	const needed =
		pageWidth * view.camera.scale * Math.min(2, Math.max(1, pixelRatio));
	const level = tiles.levels.findIndex((item) => item.width >= needed);
	const index = level < 0 ? tiles.levels.length - 1 : level;
	const image = tiles.levels[index];
	const columns = Math.ceil(image.width / tiles.size);
	const rows = Math.ceil(image.height / tiles.size);
	const left = -view.camera.x / view.camera.scale / pageWidth;
	const top = -view.camera.y / view.camera.scale / pageHeight;
	const right = left + view.width / view.camera.scale / pageWidth;
	const bottom = top + view.height / view.camera.scale / pageHeight;
	if (right <= 0 || bottom <= 0 || left >= 1 || top >= 1) return [];
	const result = [];
	for (
		let y = Math.max(0, Math.floor((top * image.height) / tiles.size) - 1);
		y <=
		Math.min(rows - 1, Math.floor((bottom * image.height) / tiles.size) + 1);
		y++
	) {
		for (
			let x = Math.max(0, Math.floor((left * image.width) / tiles.size) - 1);
			x <=
			Math.min(columns - 1, Math.floor((right * image.width) / tiles.size) + 1);
			x++
		) {
			const ordinal = y * columns + x;
			if (!image.urls[ordinal]) continue;
			result.push({
				key: `${index}:${ordinal}`,
				level: index,
				ordinal,
				url: image.urls[ordinal],
				left: (x * tiles.size) / image.width,
				top: (y * tiles.size) / image.height,
				width: Math.min(tiles.size, image.width - x * tiles.size) / image.width,
				height:
					Math.min(tiles.size, image.height - y * tiles.size) / image.height,
			});
		}
	}
	return result;
}
