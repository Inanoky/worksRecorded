"use client";

import { Button } from "@/components/ui/button";
import { type VisualMark, visualLayers } from "./model";

export function VisualZoneTarget({
	mark,
	disabled,
	selected = false,
	onSelect,
	onHighlight,
}: {
	mark: VisualMark;
	disabled: boolean;
	selected?: boolean;
	onSelect: () => void;
	onHighlight: (active: boolean) => void;
}) {
	const xs = mark.polygon.map((point) => point.x);
	const ys = mark.polygon.map((point) => point.y);
	const left = Math.min(...xs),
		top = Math.min(...ys);
	const width = Math.max(...xs) - left,
		height = Math.max(...ys) - top;
	if (width <= 0 || height <= 0) return null;
	return (
		<Button
			type="button"
			variant="ghost"
			disabled={disabled}
			aria-pressed={selected}
			aria-label={`${visualLayers[mark.layer].label}: ${mark.explanation}`}
			className="absolute cursor-pointer rounded-none bg-transparent p-0 hover:bg-transparent focus-visible:bg-primary/20"
			style={{
				left: `${left * 100}%`,
				top: `${top * 100}%`,
				width: `${width * 100}%`,
				height: `${height * 100}%`,
				clipPath: `polygon(${mark.polygon.map((point) => `${((point.x - left) / width) * 100}% ${((point.y - top) / height) * 100}%`).join(",")})`,
			}}
			onClick={onSelect}
			onPointerEnter={() => {
				if (!disabled) onHighlight(true);
			}}
			onPointerLeave={() => onHighlight(false)}
			onFocus={() => {
				if (!disabled) onHighlight(true);
			}}
			onBlur={() => onHighlight(false)}
		/>
	);
}
