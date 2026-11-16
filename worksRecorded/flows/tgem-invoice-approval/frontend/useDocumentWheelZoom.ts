"use client";

import * as React from "react";
import { wheelZoomFactor } from "@/flows/default-construction/visual/viewport";

export function useDocumentWheelZoom({
	viewportRef,
	surfaceRef,
	scale,
	minScale,
	maxScale,
	enabled,
	onZoom,
	delay = 0,
}: {
	viewportRef: React.RefObject<HTMLDivElement | null>;
	surfaceRef: React.RefObject<HTMLElement | null>;
	scale: number;
	minScale: number;
	maxScale: number;
	enabled: boolean;
	onZoom: (scale: number) => void;
	delay?: number;
}) {
	const targetRef = React.useRef(scale);
	const onZoomRef = React.useRef(onZoom);
	onZoomRef.current = onZoom;
	const anchorRef = React.useRef<{
		x: number;
		y: number;
		localX: number;
		localY: number;
		scale: number;
	} | null>(null);

	React.useLayoutEffect(() => {
		targetRef.current = scale;
		const anchor = anchorRef.current;
		const surface = surfaceRef.current;
		const viewport = viewportRef.current;
		if (!anchor || !surface || !viewport) return;
		const rect = surface.getBoundingClientRect();
		viewport.scrollLeft +=
			rect.left + (anchor.localX * scale) / anchor.scale - anchor.x;
		viewport.scrollTop +=
			rect.top + (anchor.localY * scale) / anchor.scale - anchor.y;
		anchorRef.current = null;
	}, [scale, surfaceRef, viewportRef]);

	React.useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport || !enabled) return;
		let timeout: ReturnType<typeof setTimeout> | undefined;
		const wheel = (event: WheelEvent) => {
			if (!event.deltaY || !surfaceRef.current) return;
			event.preventDefault();
			const rect = surfaceRef.current.getBoundingClientRect();
			anchorRef.current = {
				x: event.clientX,
				y: event.clientY,
				localX: event.clientX - rect.left,
				localY: event.clientY - rect.top,
				scale,
			};
			targetRef.current = Math.max(
				minScale,
				Math.min(
					maxScale,
					targetRef.current * wheelZoomFactor(event.deltaY, event.deltaMode),
				),
			);
			clearTimeout(timeout);
			if (delay)
				timeout = setTimeout(() => onZoomRef.current(targetRef.current), delay);
			else onZoomRef.current(targetRef.current);
		};
		viewport.addEventListener("wheel", wheel, { passive: false });
		return () => {
			clearTimeout(timeout);
			viewport.removeEventListener("wheel", wheel);
		};
	}, [delay, enabled, maxScale, minScale, scale, surfaceRef, viewportRef]);
}
