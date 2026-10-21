"use client";

import { useEffect, useState } from "react";
import { type DrawingTiles, visibleDrawingTiles } from "./drawing-tiles";
import type { DrawingCamera } from "./viewport";
import type { VisualClientCache } from "./visual-client-cache";

function Tile({
	tile,
	cache,
	url,
	page,
}: {
	tile: ReturnType<typeof visibleDrawingTiles>[number];
	cache: VisualClientCache;
	url: string;
	page: number;
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
	const visible = visibleDrawingTiles(
		tiles,
		pageWidth,
		pageHeight,
		view,
		typeof window === "undefined" ? 1 : window.devicePixelRatio,
	);
	return (
		<div data-drawing-tiles className="pointer-events-none absolute inset-0">
			{visible.map((tile) => (
				<Tile
					key={`${url}:${page}:${tile.key}`}
					tile={tile}
					cache={cache}
					url={url}
					page={page}
				/>
			))}
		</div>
	);
}
