"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	type DrawingCamera,
	fitDrawing,
	interpolateCamera,
	type ViewportPoint,
	wheelZoomFactor,
	zoomDrawingAt,
} from "./viewport";

export function useDrawingViewport(
	aspect: number,
	pageKey: string,
	enabled: boolean,
) {
	const viewport = useRef<HTMLElement>(null);
	const surface = useRef<HTMLDivElement>(null);
	const scaleLabel = useRef<HTMLOutputElement>(null);
	const frame = useRef<number | null>(null);
	const camera = useRef<DrawingCamera>({ x: 0, y: 0, scale: 1 });
	const target = useRef(camera.current);
	const fit = useRef(camera.current);
	const suppressClick = useRef(false);
	const [size, setSize] = useState({ width: 1, height: 1 });
	const [zoom, setZoom] = useState(1);
	const [panning, setPanning] = useState(false);
	const stop = useCallback(() => {
		if (frame.current !== null) cancelAnimationFrame(frame.current);
		frame.current = null;
	}, []);
	const paint = useCallback((value: DrawingCamera) => {
		camera.current = value;
		if (surface.current) {
			surface.current.style.transform = `translate3d(${value.x}px, ${value.y}px, 0) scale(${value.scale})`;
			surface.current.style.setProperty(
				"--drawing-inverse-scale",
				String(1 / value.scale),
			);
		}
		if (scaleLabel.current)
			scaleLabel.current.textContent = `${Math.round(value.scale * 100)}%`;
	}, []);
	const animate = useCallback(
		(next: DrawingCamera) => {
			stop();
			target.current = next;
			setZoom(next.scale);
			if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
				paint(next);
				return;
			}
			const from = camera.current;
			const start = performance.now();
			const tick = (now: number) => {
				const progress = Math.min(1, (now - start) / 180);
				paint(interpolateCamera(from, next, 1 - (1 - progress) ** 3));
				if (progress < 1) frame.current = requestAnimationFrame(tick);
				else frame.current = null;
			};
			frame.current = requestAnimationFrame(tick);
		},
		[paint, stop],
	);
	const zoomAt = useCallback(
		(factor: number, anchor?: ViewportPoint) => {
			const element = viewport.current;
			if (!element) return;
			animate(
				zoomDrawingAt(
					camera.current,
					anchor ?? { x: element.clientWidth / 2, y: element.clientHeight / 2 },
					target.current.scale * factor,
				),
			);
		},
		[animate],
	);
	const reset = useCallback(() => animate(fit.current), [animate]);
	const panBy = useCallback(
		(x: number, y: number) =>
			animate({
				...camera.current,
				x: camera.current.x + x,
				y: camera.current.y + y,
			}),
		[animate],
	);
	const freeze = useCallback(() => {
		stop();
		target.current = camera.current;
		setZoom(camera.current.scale);
	}, [stop]);
	useEffect(() => {
		const element = viewport.current;
		if (!element || !pageKey) return;
		let measured = false;
		let previous = { width: 0, height: 0, pageWidth: 1, pageHeight: 1 };
		const measure = () => {
			const width = element.clientWidth,
				height = element.clientHeight;
			if (!width || !height) return;
			const fitted = fitDrawing(width, height, aspect);
			stop();
			fit.current = fitted.camera;
			const next = measured
				? {
						scale: camera.current.scale,
						x:
							width / 2 -
							((previous.width / 2 - camera.current.x) / previous.pageWidth) *
								fitted.width,
						y:
							height / 2 -
							((previous.height / 2 - camera.current.y) / previous.pageHeight) *
								fitted.height,
					}
				: fitted.camera;
			setSize({ width: fitted.width, height: fitted.height });
			paint(next);
			target.current = next;
			setZoom(next.scale);
			previous = {
				width,
				height,
				pageWidth: fitted.width,
				pageHeight: fitted.height,
			};
			measured = true;
		};
		measure();
		const observer =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(measure)
				: null;
		observer?.observe(element);
		window.addEventListener("resize", measure);
		return () => {
			observer?.disconnect();
			window.removeEventListener("resize", measure);
			stop();
		};
	}, [aspect, pageKey, paint, stop]);
	useEffect(() => {
		const element = viewport.current;
		if (!element || !enabled) return;
		let drag: {
			id: number;
			x: number;
			y: number;
			start: DrawingCamera;
			moved: boolean;
		} | null = null;
		const wheel = (event: WheelEvent) => {
			event.preventDefault();
			if (!event.deltaY || drag) return;
			const rect = element.getBoundingClientRect();
			zoomAt(wheelZoomFactor(event.deltaY, event.deltaMode), {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			});
		};
		const down = (event: PointerEvent) => {
			if (
				event.button !== 0 ||
				!(event.target instanceof Element) ||
				event.target.closest("[data-drawing-control]")
			)
				return;
			freeze();
			suppressClick.current = false;
			drag = {
				id: event.pointerId,
				x: event.clientX,
				y: event.clientY,
				start: camera.current,
				moved: false,
			};
		};
		const move = (event: PointerEvent) => {
			if (!drag || drag.id !== event.pointerId) return;
			const dx = event.clientX - drag.x,
				dy = event.clientY - drag.y;
			if (!drag.moved && Math.hypot(dx, dy) < 4) return;
			if (!drag.moved) {
				element.setPointerCapture(event.pointerId);
				drag.moved = true;
				setPanning(true);
			}
			suppressClick.current = true;
			paint({ ...drag.start, x: drag.start.x + dx, y: drag.start.y + dy });
			target.current = camera.current;
		};
		const up = (event: PointerEvent) => {
			if (!drag || drag.id !== event.pointerId) return;
			drag = null;
			setPanning(false);
			if (element.hasPointerCapture?.(event.pointerId))
				element.releasePointerCapture(event.pointerId);
		};
		element.addEventListener("wheel", wheel, { passive: false });
		element.addEventListener("pointerdown", down);
		element.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);
		return () => {
			element.removeEventListener("wheel", wheel);
			element.removeEventListener("pointerdown", down);
			element.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
		};
	}, [enabled, freeze, paint, zoomAt]);
	return {
		viewport,
		surface,
		scaleLabel,
		size,
		zoom,
		zoomAt,
		reset,
		panBy,
		freeze,
		panning,
		suppressClick,
	};
}
