"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type DrawingTiles, visibleDrawingTiles } from "./drawing-tiles";
import type { DrawingCamera } from "./viewport";
import type { VisualClientCache } from "./visual-client-cache";

type VisibleTile = ReturnType<typeof visibleDrawingTiles>[number];

function Tile({
	tile,
	cache,
	url,
	page,
	onLoad,
}: {
	tile: VisibleTile;
	cache: VisualClientCache;
	url: string;
	page: number;
	onLoad: () => void;
}) {
	const [src, setSrc] = useState("");
	useEffect(() => {
		let active = true;
		let objectUrl = "";
		void cache
			.loadDrawingTile(url, page, tile.level, tile.ordinal)
			.then((blob) => {
				if (!active) return;
				objectUrl = URL.createObjectURL(blob);
				setSrc(objectUrl);
			})
			.catch(() => {});
		return () => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [cache, url, page, tile.level, tile.ordinal]);
	return src ? (
		<img
			data-drawing-tile={tile.key}
			src={src}
			alt=""
			draggable={false}
			onLoad={onLoad}
			style={{
				position: "absolute",
				left: `${tile.left * 100}%`,
				top: `${tile.top * 100}%`,
				width: `${tile.width * 100}%`,
				height: `${tile.height * 100}%`,
				maxWidth: "none",
			}}
		/>
	) : null;
}

export function VisualDrawingTiles({
	tiles,
	cache,
	url,
	page,
	pageWidth,
	pageHeight,
	view,
}: {
	tiles: DrawingTiles;
	cache: VisualClientCache;
	url: string;
	page: number;
	pageWidth: number;
	pageHeight: number;
	view: { camera: DrawingCamera; width: number; height: number } | null;
}) {
	const layer = useRef<HTMLDivElement>(null);
	const [retained, setRetained] = useState<VisibleTile[]>([]);
	const pixelRatio =
		typeof window === "undefined" ? 1 : window.devicePixelRatio;
	const visible = useMemo(
		() => visibleDrawingTiles(tiles, pageWidth, pageHeight, view, pixelRatio),
		[tiles, pageWidth, pageHeight, view, pixelRatio],
	);
	const retainWhenReady = useCallback(() => {
		const required = visible.filter((tile) => tile.inViewport);
		if (!layer.current || !required.length) return;
		const ready = new Set(
			Array.from(
				layer.current.querySelectorAll<HTMLImageElement>(
					"img[data-drawing-tile]",
				),
			)
				.filter((image) => image.complete && image.naturalWidth > 0)
				.map((image) => image.dataset.drawingTile),
		);
		if (required.every((tile) => ready.has(tile.key))) setRetained(visible);
	}, [visible]);
	useEffect(() => {
		retainWhenReady();
	}, [retainWhenReady]);
	const visibleKeys = new Set(visible.map((tile) => tile.key));
	const displayed = [
		...retained.filter((tile) => !visibleKeys.has(tile.key)),
		...visible,
	];
	return (
		<div
			ref={layer}
			data-drawing-tiles
			className="pointer-events-none absolute inset-0"
		>
			{displayed.map((tile) => (
				<Tile
					key={`${url}:${page}:${tile.key}`}
					tile={tile}
					cache={cache}
					url={url}
					page={page}
					onLoad={retainWhenReady}
				/>
			))}
		</div>
	);
}
