"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ZoomablePhoto } from "../frontend/DiaryRecordPhotos";
import { type VisualEvidence, type VisualMark, visualLayers } from "./model";
import { formatVisualDay, visualDiaryDay } from "./timeline";

function SourcePhotoPreview({
	url,
	work,
	onOpen,
}: {
	url: string;
	work: string;
	onOpen: () => void;
}) {
	const [status, setStatus] = useState<"loading" | "loaded" | "error">(
		"loading",
	);
	return (
		<button
			type="button"
			aria-label={`Atvērt zonas avota attēlu: ${work}`}
			disabled={status === "error"}
			onClick={onOpen}
			className="relative flex h-52 w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-md border bg-muted/30 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default"
		>
			{status !== "loaded" ? (
				<output
					aria-label="Avota attēla statuss"
					className="absolute px-3 text-center text-xs text-muted-foreground"
				>
					{status === "error"
						? "Avota attēls nav pieejams."
						: "Ielādē avota attēlu…"}
				</output>
			) : null}
			{status !== "error" ? (
				<img
					src={url}
					alt={`Zonas avota attēls: ${work}`}
					className={`h-full w-full object-contain ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
					decoding="async"
					onLoad={() => setStatus("loaded")}
					onError={() => setStatus("error")}
				/>
			) : null}
		</button>
	);
}

export function VisualZoneTarget({
	mark,
	source,
	disabled,
	selected = false,
	onSelect,
	onHighlight,
}: {
	mark: VisualMark;
	source?: VisualEvidence;
	disabled: boolean;
	selected?: boolean;
	onSelect: () => void;
	onHighlight: (active: boolean) => void;
}) {
	const [hovered, setHovered] = useState(false);
	const [imageOpen, setImageOpen] = useState(false);
	const trigger = useRef<HTMLButtonElement>(null);
	const xs = mark.polygon.map((point) => point.x);
	const ys = mark.polygon.map((point) => point.y);
	const left = Math.min(...xs),
		top = Math.min(...ys);
	const width = Math.max(...xs) - left,
		height = Math.max(...ys) - top;
	const day = visualDiaryDay(source?.date ?? null);
	if (width <= 0 || height <= 0) return null;
	return (
		<>
			<HoverCard
				openDelay={100}
				closeDelay={100}
				open={hovered && !imageOpen}
				onOpenChange={setHovered}
			>
				<HoverCardTrigger asChild>
					<Button
						ref={trigger}
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
				</HoverCardTrigger>
				<HoverCardContent
					side="top"
					className="max-h-[min(36rem,calc(100dvh-2rem))] w-96 max-w-[calc(100vw-2rem)] space-y-2 overflow-auto text-sm"
				>
					<p className="font-semibold">
						{source?.work || visualLayers[mark.layer].label}
					</p>
					<p className="text-xs text-muted-foreground">
						{day === null ? "Bez datuma" : formatVisualDay(day)} ·{" "}
						{source?.location || "—"}
					</p>
					{source?.photoUrl ? (
						<SourcePhotoPreview
							key={source.photoUrl}
							url={source.photoUrl}
							work={source.work || visualLayers[mark.layer].label}
							onOpen={() => {
								setHovered(false);
								setImageOpen(true);
							}}
						/>
					) : null}
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
			{source?.photoUrl ? (
				<Dialog open={imageOpen} onOpenChange={setImageOpen}>
					<DialogContent
						className="max-h-[90dvh] max-w-[95vw] overflow-y-auto sm:max-w-5xl"
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							trigger.current?.focus();
						}}
					>
						<DialogTitle>Zonas avota attēls</DialogTitle>
						<DialogDescription>
							{source.work || visualLayers[mark.layer].label}
						</DialogDescription>
						<ZoomablePhoto
							key={source.photoUrl}
							url={source.photoUrl}
							label={`Zonas avota attēls: ${source.work || visualLayers[mark.layer].label}`}
							lv
						/>
					</DialogContent>
				</Dialog>
			) : null}
		</>
	);
}
