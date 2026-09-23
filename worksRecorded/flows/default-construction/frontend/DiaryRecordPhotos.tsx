"use client";

import Image from "next/image";
import { useState } from "react";
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
import { normalizeDiaryPhotoUrls } from "../lib/diary-photos";

function Photo({
	url,
	label,
	large = false,
	fallbackSrc,
	sizes,
	onReady,
}: {
	url: string;
	label: string;
	large?: boolean;
	fallbackSrc?: string;
	sizes?: string;
	onReady?: (src: string) => void;
}) {
	const [failed, setFailed] = useState(false);
	const [loaded, setLoaded] = useState(false);
	if (failed && !fallbackSrc)
		return (
			<span className="flex h-full items-center justify-center p-2 text-xs text-muted-foreground">
				{label}
			</span>
		);
	return (
		<>
			{fallbackSrc && !loaded ? (
				<Image
					src={fallbackSrc}
					alt={failed ? label : ""}
					aria-hidden={!failed}
					fill
					unoptimized
					loading="eager"
					className="object-contain"
				/>
			) : null}
			{!failed ? (
				<Image
					src={url}
					alt={label}
					fill
					sizes={sizes ?? (large ? "90vw" : "120px")}
					loading={large ? "eager" : "lazy"}
					unoptimized
					className={large ? "object-contain" : "object-cover"}
					style={{ opacity: fallbackSrc && !loaded ? 0 : 1 }}
					onLoad={(event) => {
						setLoaded(true);
						onReady?.(
							event.currentTarget.currentSrc || event.currentTarget.src,
						);
					}}
					onError={() => {
						setLoaded(false);
						setFailed(true);
					}}
				/>
			) : null}
		</>
	);
}

export function DiaryRecordPhotos({
	photos,
	language = "lv",
}: {
	photos: unknown;
	language?: string;
}) {
	const urls = normalizeDiaryPhotoUrls(photos);
	const [expanded, setExpanded] = useState(false);
	const [selected, setSelected] = useState<string | null>(null);
	const [hovered, setHovered] = useState<string | null>(null);
	const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
	const lv = language.startsWith("lv");
	const label = lv ? "Ziņojuma foto" : "Report photo";
	if (!urls.length) return <span className="text-muted-foreground">—</span>;
	return (
		<div className="min-w-0 space-y-1">
			<div className="flex flex-wrap gap-1.5">
				{(expanded ? urls : urls.slice(0, 1)).map((url, index) => (
					<HoverCard
						key={url}
						openDelay={0}
						closeDelay={100}
						open={hovered === url && selected === null}
						onOpenChange={(open) =>
							setHovered((current) =>
								open ? url : current === url ? null : current,
							)
						}
					>
						<HoverCardTrigger asChild>
							<button
								type="button"
								aria-label={`${label} ${index + 1}`}
								className="relative aspect-[4/3] w-[120px] max-w-full overflow-hidden rounded-md border bg-muted focus-visible:outline-2 focus-visible:outline-primary"
								onClick={() => setSelected(url)}
							>
								<Photo
									url={url}
									label={`${label} ${index + 1}`}
									onReady={(src) =>
										setThumbnails((current) =>
											current[url] === src
												? current
												: { ...current, [url]: src },
										)
									}
								/>
							</button>
						</HoverCardTrigger>
						<HoverCardContent
							side="left"
							align="center"
							sideOffset={12}
							collisionPadding={16}
							className="w-[min(520px,calc(100vw-32px))] p-2 data-[state=open]:animate-none data-[state=closed]:animate-none"
							aria-label={label}
						>
							<div className="relative h-[min(390px,60vh)]">
								<Photo
									url={url}
									label={label}
									large
									sizes="(max-width: 552px) calc(100vw - 32px), 520px"
									fallbackSrc={thumbnails[url]}
								/>
							</div>
						</HoverCardContent>
					</HoverCard>
				))}
			</div>
			{urls.length > 1 ? (
				<button
					type="button"
					aria-expanded={expanded}
					className="text-xs text-primary underline-offset-2 hover:underline"
					onClick={() => setExpanded(!expanded)}
				>
					{expanded
						? lv
							? "Rādīt mazāk"
							: "Show less"
						: `+${urls.length - 1} ${lv ? "foto" : "photos"}`}
				</button>
			) : null}
			<Dialog
				open={selected !== null}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
			>
				<DialogContent className="max-w-[95vw] sm:max-w-5xl">
					<DialogTitle>{label}</DialogTitle>
					<DialogDescription>
						{lv
							? "Foto pievienots šim darba ziņojumam; tas var attiekties uz vairākiem ziņojuma darbiem."
							: "Photo attached to this report; it may relate to several reported tasks."}
					</DialogDescription>
					{selected ? (
						<div className="relative h-[70vh] min-w-0">
							<Photo key={selected} url={selected} label={label} large />
						</div>
					) : null}
					{urls.length > 1 && selected ? (
						<div className="flex items-center justify-between text-sm">
							<button
								type="button"
								disabled={urls.indexOf(selected) === 0}
								className="disabled:opacity-40"
								onClick={() => setSelected(urls[urls.indexOf(selected) - 1])}
							>
								{lv ? "Iepriekšējais" : "Previous"}
							</button>
							<span>
								{urls.indexOf(selected) + 1} / {urls.length}
							</span>
							<button
								type="button"
								disabled={urls.indexOf(selected) === urls.length - 1}
								className="disabled:opacity-40"
								onClick={() => setSelected(urls[urls.indexOf(selected) + 1])}
							>
								{lv ? "Nākamais" : "Next"}
							</button>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</div>
	);
}
