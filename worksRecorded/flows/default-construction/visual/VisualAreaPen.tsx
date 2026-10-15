"use client";

import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { type PenPoint, simplifyPenOutline } from "./pen-geometry";
import { visualPlanAreaSchema } from "./planning-model";

export type AreaPenMode = "polygon" | "freehand";

export function VisualAreaPen({
	mode,
	surface,
	viewport,
	color,
	onComplete,
	onCancel,
}: {
	mode: AreaPenMode;
	surface: RefObject<HTMLDivElement | null>;
	viewport: RefObject<HTMLElement | null>;
	color: string;
	onComplete: (points: PenPoint[]) => void;
	onCancel: () => void;
}) {
	const [points, setPoints] = useState<PenPoint[]>([]);
	const latest = useRef(points);
	const [cursor, setCursor] = useState<PenPoint | null>(null);
	const [error, setError] = useState<string | null>(null);
	const drawing = useRef<number | null>(null);
	const root = useRef<HTMLDivElement>(null);
	const callbacks = useRef({ onComplete, onCancel });
	callbacks.current = { onComplete, onCancel };
	const update = useCallback((next: PenPoint[]) => {
		latest.current = next;
		setPoints(next);
		setError(null);
	}, []);
	function pointAt(clientX: number, clientY: number) {
		const rect = surface.current?.getBoundingClientRect();
		if (!rect?.width || !rect.height) return null;
		return {
			x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
			y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
		};
	}
	const complete = useRef(() => {});
	complete.current = () => {
		const rect = surface.current?.getBoundingClientRect();
		const polygon =
			mode === "freehand" && rect
				? simplifyPenOutline(latest.current, rect.width, rect.height)
				: latest.current;
		if (
			!visualPlanAreaSchema.safeParse({ id: "pen", page: 1, polygon }).success
		) {
			setError(
				"Kontūrai vajag 3–40 stūrus, nekrustojošas malas un pietiekamu laukumu. Labojiet vai zīmējiet vēlreiz.",
			);
			return;
		}
		callbacks.current.onComplete(polygon);
	};
	const keyboard = useCallback(
		(event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			if (
				event.target instanceof HTMLElement &&
				event.target.closest("input,textarea,select,[contenteditable=true]")
			)
				return;
			if (event.key === "Escape") {
				event.preventDefault();
				callbacks.current.onCancel();
			}
			if (event.key === "Enter") {
				if (
					event.target instanceof HTMLElement &&
					event.target.closest("button")
				)
					return;
				event.preventDefault();
				complete.current();
			}
			if (event.key === "Backspace" || event.key === "Delete") {
				event.preventDefault();
				update(latest.current.slice(0, -1));
			}
		},
		[update],
	);
	useEffect(() => {
		root.current?.focus({ preventScroll: true });
		window.addEventListener("keydown", keyboard);
		return () => window.removeEventListener("keydown", keyboard);
	}, [keyboard]);
	const preview = cursor && mode === "polygon" ? [...points, cursor] : points;
	return (
		<>
			<div
				ref={root}
				role="application"
				aria-label={
					mode === "polygon"
						? "Zonas daudzstūra pildspalva"
						: "Zonas brīvrokas pildspalva"
				}
				tabIndex={-1}
				onKeyDown={(event) => keyboard(event.nativeEvent)}
				className="absolute inset-0 z-30 cursor-crosshair touch-none outline-none"
				onClick={(event) => {
					if (
						mode !== "polygon" ||
						event.button !== 0 ||
						event.shiftKey ||
						event.detail > 1 ||
						(event.target instanceof Element &&
							event.target.closest("[data-drawing-control]"))
					)
						return;
					const next = pointAt(event.clientX, event.clientY);
					if (next && latest.current.length < 40)
						update([...latest.current, next]);
				}}
				onDoubleClick={(event) => {
					if (!event.shiftKey && mode === "polygon") {
						event.preventDefault();
						complete.current();
					}
				}}
				onPointerDown={(event) => {
					if (mode !== "freehand" || event.button !== 0 || event.shiftKey)
						return;
					const next = pointAt(event.clientX, event.clientY);
					if (!next) return;
					event.preventDefault();
					event.currentTarget.setPointerCapture(event.pointerId);
					drawing.current = event.pointerId;
					update([next]);
				}}
				onPointerMove={(event) => {
					const next = pointAt(event.clientX, event.clientY);
					if (!next) return;
					if (mode === "polygon") {
						setCursor(next);
						return;
					}
					if (
						drawing.current !== event.pointerId ||
						latest.current.length >= 2048
					)
						return;
					const rect = surface.current?.getBoundingClientRect();
					const last = latest.current.at(-1);
					if (
						last &&
						rect &&
						Math.hypot(
							(next.x - last.x) * rect.width,
							(next.y - last.y) * rect.height,
						) >= 2
					)
						update([...latest.current, next]);
				}}
				onPointerUp={(event) => {
					if (drawing.current !== event.pointerId) return;
					drawing.current = null;
					const last = pointAt(event.clientX, event.clientY);
					if (last) update([...latest.current, last]);
					if (event.currentTarget.hasPointerCapture?.(event.pointerId))
						event.currentTarget.releasePointerCapture(event.pointerId);
					complete.current();
				}}
				onPointerCancel={() => {
					drawing.current = null;
					update([]);
				}}
				onLostPointerCapture={() => {
					drawing.current = null;
				}}
			>
				<svg
					className="pointer-events-none absolute inset-0 h-full w-full"
					viewBox="0 0 1 1"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<polygon
						points={preview.map((point) => `${point.x},${point.y}`).join(" ")}
						fill={color}
						fillOpacity={0.2}
						stroke={color}
						strokeWidth={2}
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
				{mode === "polygon" && points[0] ? (
					<Button
						type="button"
						data-drawing-control
						size="icon"
						variant="outline"
						aria-label="Aizvērt zonu"
						disabled={points.length < 3}
						className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal-700"
						style={{
							left: `${points[0].x * 100}%`,
							top: `${points[0].y * 100}%`,
							transform: "scale(var(--drawing-inverse-scale, 1))",
						}}
						onClick={(event) => {
							event.stopPropagation();
							complete.current();
						}}
					/>
				) : null}
			</div>
			{viewport.current
				? createPortal(
						<>
							<div
								data-drawing-control
								className="absolute bottom-14 left-1/2 z-40 flex max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border bg-background p-2 shadow-md"
							>
								<Button
									type="button"
									size="sm"
									disabled={points.length < 3}
									onClick={() => complete.current()}
								>
									Pabeigt kontūru
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={!points.length}
									onClick={() => update(latest.current.slice(0, -1))}
								>
									Atcelt punktu
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={onCancel}
								>
									Atcelt zīmēšanu
								</Button>
							</div>
							{error ? (
								<p
									role="alert"
									className="absolute inset-x-3 top-16 z-40 rounded-md border bg-background p-3 text-sm text-destructive"
								>
									{error}
								</p>
							) : null}
						</>,
						viewport.current,
					)
				: null}
		</>
	);
}
