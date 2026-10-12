"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { translateVisualPlanArea } from "./planning-geometry";
import type { VisualPlanArea } from "./planning-model";

export function VisualPlanAreaTarget({
	area,
	label,
	disabled,
	selected,
	surface,
	onSelect,
	onMove,
}: {
	area: VisualPlanArea;
	label: string;
	disabled: boolean;
	selected: boolean;
	surface: HTMLDivElement | null;
	onSelect: () => void;
	onMove: (area: VisualPlanArea) => void;
}) {
	const drag = useRef<{
		pointerId: number;
		x: number;
		y: number;
		area: VisualPlanArea;
	} | null>(null);
	const xs = area.polygon.map((point) => point.x);
	const ys = area.polygon.map((point) => point.y);
	const left = Math.min(...xs);
	const top = Math.min(...ys);
	const width = Math.max(...xs) - left;
	const height = Math.max(...ys) - top;
	if (width <= 0 || height <= 0) return null;
	return (
		<Button
			type="button"
			variant="ghost"
			data-drawing-control
			disabled={disabled}
			aria-pressed={selected}
			aria-label={label}
			className={`absolute rounded-none bg-transparent p-0 hover:bg-teal-500/10 focus-visible:bg-teal-500/15 ${selected ? "cursor-move" : "cursor-pointer"}`}
			style={{
				left: `${left * 100}%`,
				top: `${top * 100}%`,
				width: `${width * 100}%`,
				height: `${height * 100}%`,
				clipPath: `polygon(${area.polygon.map((point) => `${((point.x - left) / width) * 100}% ${((point.y - top) / height) * 100}%`).join(",")})`,
			}}
			onClick={onSelect}
			onPointerDown={(event) => {
				if (event.button !== 0 || !surface) return;
				event.stopPropagation();
				event.preventDefault();
				onSelect();
				event.currentTarget.focus();
				event.currentTarget.setPointerCapture(event.pointerId);
				drag.current = {
					pointerId: event.pointerId,
					x: event.clientX,
					y: event.clientY,
					area,
				};
			}}
			onPointerMove={(event) => {
				if (
					!drag.current ||
					drag.current.pointerId !== event.pointerId ||
					!surface
				)
					return;
				const rect = surface.getBoundingClientRect();
				if (!rect.width || !rect.height) return;
				onMove(
					translateVisualPlanArea(
						drag.current.area,
						(event.clientX - drag.current.x) / rect.width,
						(event.clientY - drag.current.y) / rect.height,
					),
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
				const directions: Record<string, [number, number]> = {
					ArrowLeft: [-1, 0],
					ArrowRight: [1, 0],
					ArrowUp: [0, -1],
					ArrowDown: [0, 1],
				};
				const direction = directions[event.key];
				if (!direction) return;
				event.preventDefault();
				const step = event.shiftKey ? 0.01 : 0.002;
				onMove(
					translateVisualPlanArea(
						area,
						direction[0] * step,
						direction[1] * step,
					),
				);
			}}
		/>
	);
}
