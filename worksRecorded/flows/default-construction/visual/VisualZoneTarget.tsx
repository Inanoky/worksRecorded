"use client";

import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { type VisualEvidence, type VisualMark, visualLayers } from "./model";
import { formatVisualDay, visualDiaryDay } from "./timeline";

export function VisualZoneTarget({
	mark,
	source,
	disabled,
	onSelect,
	onHighlight,
}: {
	mark: VisualMark;
	source?: VisualEvidence;
	disabled: boolean;
	onSelect: () => void;
	onHighlight: (active: boolean) => void;
}) {
	const xs = mark.polygon.map((point) => point.x);
	const ys = mark.polygon.map((point) => point.y);
	const left = Math.min(...xs),
		top = Math.min(...ys);
	const width = Math.max(...xs) - left,
		height = Math.max(...ys) - top;
	const day = visualDiaryDay(source?.date ?? null);
	if (width <= 0 || height <= 0) return null;
	return (
		<HoverCard openDelay={100} closeDelay={100}>
			<HoverCardTrigger asChild>
				<Button
					variant="ghost"
					disabled={disabled}
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
			</HoverCardTrigger>
			<HoverCardContent
				side="top"
				className="max-h-80 w-80 max-w-[calc(100vw-2rem)] space-y-2 overflow-auto text-sm"
			>
				<p className="font-semibold">
					{source?.work || visualLayers[mark.layer].label}
				</p>
				<p className="text-xs text-muted-foreground">
					{day === null ? "Bez datuma" : formatVisualDay(day)} ·{" "}
					{source?.location || "—"}
				</p>
				<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
					{source?.description || "Apraksts nav norādīts."}
				</p>
				{source?.amount != null ? (
					<p>
						Daudzums: {source.amount} {source.unit}
					</p>
				) : null}
				<p className="text-xs text-muted-foreground">
					{mark.editedAt ? "Lietotāja pielāgota zona" : "AI aptuvenā zona"} ·
					lapa {mark.page}
				</p>
			</HoverCardContent>
		</HoverCard>
	);
}
