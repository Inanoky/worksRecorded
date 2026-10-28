"use client";

import { type RefObject, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	insertVisualPlanVertex,
	moveVisualPlanVertex,
	removeVisualPlanVertex,
} from "./planning-geometry";
import type { VisualPlanArea } from "./planning-model";

export function VisualPolygonEditor({
	area,
	surface,
	disabled = false,
	planned = false,
	labelPrefix,
	onChange,
}: {
	area: VisualPlanArea;
	surface: RefObject<HTMLDivElement | null>;
	disabled?: boolean;
	planned?: boolean;
	labelPrefix?: string;
	onChange: (area: VisualPlanArea) => void;
}) {
	const [cornerIds, setCornerIds] = useState(() =>
		area.polygon.map((_, index) => `corner-${index}`),
	);
	const nextCornerId = useRef(area.polygon.length);
	const drag = useRef<{ cornerId: string; pointerId: number } | null>(null);
	return (
		<>
			{area.polygon.map((point, index) => (
				<Button
					key={cornerIds[index]}
					type="button"
					size="icon"
					variant="outline"
					data-drawing-control
					disabled={disabled}
					aria-label={
						labelPrefix
							? `${labelPrefix} stūris ${index + 1}`
							: planned
								? `Plānotās zonas stūris ${index + 1}`
								: `Stūris ${index + 1}`
					}
					className="absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-move touch-none rounded-sm border-2 border-teal-700 bg-teal-50"
					style={{
						transform: "scale(var(--drawing-inverse-scale, 1))",
						left: `${point.x * 100}%`,
						top: `${point.y * 100}%`,
					}}
					onPointerDown={(event) => {
						if (disabled || event.button !== 0) return;
						event.stopPropagation();
						event.preventDefault();
						event.currentTarget.focus();
						event.currentTarget.setPointerCapture(event.pointerId);
						drag.current = {
							cornerId: cornerIds[index],
							pointerId: event.pointerId,
						};
					}}
					onPointerMove={(event) => {
						if (
							disabled ||
							drag.current?.cornerId !== cornerIds[index] ||
							drag.current?.pointerId !== event.pointerId ||
							!surface.current
						)
							return;
						const rect = surface.current.getBoundingClientRect();
						if (!rect.width || !rect.height) return;
						onChange(
							moveVisualPlanVertex(area, index, {
								x: (event.clientX - rect.left) / rect.width,
								y: (event.clientY - rect.top) / rect.height,
							}),
						);
					}}
					onPointerUp={() => {
						drag.current = null;
					}}
					onPointerCancel={() => {
						drag.current = null;
					}}
					onLostPointerCapture={() => {
						drag.current = null;
					}}
					onKeyDown={(event) => {
						if (disabled) return;
						const directions: Record<string, [number, number]> = {
							ArrowLeft: [-1, 0],
							ArrowRight: [1, 0],
							ArrowUp: [0, -1],
							ArrowDown: [0, 1],
						};
						const direction = directions[event.key];
						if (direction) {
							event.preventDefault();
							const step = event.shiftKey ? 0.01 : 0.002;
							onChange(
								moveVisualPlanVertex(area, index, {
									x: point.x + direction[0] * step,
									y: point.y + direction[1] * step,
								}),
							);
						}
						if (event.key === "Delete" || event.key === "Backspace") {
							event.preventDefault();
							if (area.polygon.length <= 3) return;
							setCornerIds((ids) => ids.filter((_, i) => i !== index));
							onChange(removeVisualPlanVertex(area, index));
						}
					}}
				/>
			))}
			{area.polygon.length < 40
				? area.polygon.map((point, index) => {
						const next = area.polygon[(index + 1) % area.polygon.length];
						return (
							<Button
								key={`edge-${cornerIds[index]}`}
								type="button"
								size="icon"
								variant="outline"
								data-drawing-control
								disabled={disabled}
								aria-label={
									labelPrefix
										? `${labelPrefix}: pievienot stūri pie malas ${index + 1}`
										: planned
											? `Pievienot plānotās zonas stūri pie malas ${index + 1}`
											: `Pievienot stūri pie malas ${index + 1}`
								}
								className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-teal-700 bg-teal-50 text-xs text-teal-900"
								style={{
									transform: "scale(var(--drawing-inverse-scale, 1))",
									left: `${(point.x + next.x) * 50}%`,
									top: `${(point.y + next.y) * 50}%`,
								}}
								onClick={() => {
									if (disabled) return;
									const id = `corner-${nextCornerId.current++}`;
									setCornerIds((ids) => [
										...ids.slice(0, index + 1),
										id,
										...ids.slice(index + 1),
									]);
									onChange(insertVisualPlanVertex(area, index));
								}}
							>
								+
							</Button>
						);
					})
				: null}
		</>
	);
}
