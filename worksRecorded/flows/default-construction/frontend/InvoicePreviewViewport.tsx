"use client";

import { Minus, Plus } from "lucide-react";
import {
	type PointerEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";

export function InvoicePreviewViewport({
	children,
	overlay,
	pageControls,
	isLatvian,
	ready,
	fit = "width",
}: {
	children: ReactNode;
	overlay?: ReactNode;
	pageControls?: ReactNode;
	isLatvian: boolean;
	ready: boolean;
	fit?: "width" | "contain";
}) {
	const viewport = useRef<HTMLElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const zoomRef = useRef(1);
	const appliedZoom = useRef(1);
	const pendingScroll = useRef<{ left: number; top: number } | null>(null);
	const drag = useRef<{
		id: number;
		x: number;
		y: number;
		left: number;
		top: number;
	} | null>(null);
	const [zoom, setZoom] = useState(1);
	const [dragging, setDragging] = useState(false);
	const changeZoom = useCallback(
		(value: number, clientX?: number, clientY?: number) => {
			const element = viewport.current;
			const document = content.current;
			if (!element || !document) return;
			const next = Math.min(3, Math.max(1, value));
			const previous = appliedZoom.current;
			if (next === zoomRef.current) return;
			const bounds = element.getBoundingClientRect();
			const documentBounds = document.getBoundingClientRect();
			const x = clientX ?? bounds.left + element.clientWidth / 2;
			const y = clientY ?? bounds.top + element.clientHeight / 2;
			pendingScroll.current = {
				left:
					element.scrollLeft +
					(x - documentBounds.left) * (next / previous - 1),
				top:
					element.scrollTop + (y - documentBounds.top) * (next / previous - 1),
			};
			zoomRef.current = next;
			setZoom(next);
		},
		[],
	);
	useLayoutEffect(() => {
		appliedZoom.current = zoom;
		const element = viewport.current;
		const pending = pendingScroll.current;
		if (!element || !pending) return;
		element.scrollLeft = pending.left;
		element.scrollTop = pending.top;
		pendingScroll.current = null;
	}, [zoom]);
	useEffect(() => {
		const element = viewport.current;
		if (!element || !ready) return;
		const wheel = (event: WheelEvent) => {
			event.preventDefault();
			const unit =
				event.deltaMode === 1
					? 16
					: event.deltaMode === 2
						? element.clientHeight
						: 1;
			const delta = Math.max(-200, Math.min(200, event.deltaY * unit));
			changeZoom(
				zoomRef.current * Math.exp(-delta * 0.002),
				event.clientX,
				event.clientY,
			);
		};
		element.addEventListener("wheel", wheel, { passive: false });
		return () => element.removeEventListener("wheel", wheel);
	}, [ready, changeZoom]);
	const finishDrag = (event: PointerEvent<HTMLElement>) => {
		if (drag.current?.id !== event.pointerId) return;
		drag.current = null;
		setDragging(false);
		if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};
	const reset = () => {
		zoomRef.current = 1;
		pendingScroll.current = { left: 0, top: 0 };
		setZoom(1);
		if (viewport.current) {
			viewport.current.scrollLeft = 0;
			viewport.current.scrollTop = 0;
		}
	};
	return (
		<>
			<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
				{pageControls ?? (
					<span className="text-xs text-muted-foreground">
						{isLatvian
							? "Velciet, lai pārvietotu · Ritenītis tuvina"
							: "Drag to pan · Scroll to zoom"}
					</span>
				)}
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label={isLatvian ? "Samazināt" : "Zoom out"}
						disabled={!ready || zoom <= 1}
						onClick={() => changeZoom(zoomRef.current - 0.25)}
					>
						<Minus className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 text-xs tabular-nums"
						title={
							fit === "width"
								? isLatvian
									? "Ietilpināt platumā"
									: "Fit to width"
								: isLatvian
									? "Atiestatīt skatu"
									: "Reset view"
						}
						onClick={reset}
					>
						{Math.round(zoom * 100)}%
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label={isLatvian ? "Palielināt" : "Zoom in"}
						disabled={!ready || zoom >= 3}
						onClick={() => changeZoom(zoomRef.current + 0.25)}
					>
						<Plus className="size-4" />
					</Button>
				</div>
			</div>
			<section
				ref={viewport}
				aria-label={
					isLatvian
						? "Rēķina tālummaiņa un pārvietošana"
						: "Invoice zoom and pan"
				}
				className={`relative min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/40 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring ${ready ? (dragging ? "cursor-grabbing select-none" : "cursor-grab") : ""}`}
				onPointerDown={(event) => {
					if (
						!ready ||
						event.button !== 0 ||
						event.pointerType === "touch" ||
						drag.current
					)
						return;
					event.preventDefault();
					drag.current = {
						id: event.pointerId,
						x: event.clientX,
						y: event.clientY,
						left: event.currentTarget.scrollLeft,
						top: event.currentTarget.scrollTop,
					};
					event.currentTarget.setPointerCapture?.(event.pointerId);
					setDragging(true);
				}}
				onPointerMove={(event) => {
					const start = drag.current;
					if (!start || start.id !== event.pointerId) return;
					event.currentTarget.scrollLeft = start.left + start.x - event.clientX;
					event.currentTarget.scrollTop = start.top + start.y - event.clientY;
				}}
				onPointerUp={finishDrag}
				onPointerCancel={finishDrag}
				onLostPointerCapture={finishDrag}
			>
				{overlay}
				<div
					ref={content}
					className="relative"
					style={{
						width: `${zoom * 100}%`,
						...(fit === "contain" ? { height: `${zoom * 100}%` } : {}),
					}}
				>
					{children}
				</div>
			</section>
		</>
	);
}
