"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DiaryRecordPhotos } from "../frontend/DiaryRecordPhotos";
import {
	type VisualDrawing,
	type VisualEvidence,
	type VisualMark,
	visualLayers,
} from "./model";
import { formatVisualDay, visualDiaryDay } from "./timeline";
import { VisualWorkEditor } from "./VisualWorkEditor";
import type { VisualZoneMeasurement } from "./zone-measurement";

const areaFormat = new Intl.NumberFormat("lv-LV", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function VisualZoneDetails({
	siteId,
	drawingId,
	source,
	photos,
	originalMessage,
	mark,
	measurement,
	progressPending,
	editorLocked,
	closeLocked,
	controlsLocked,
	onClose,
	onEditingChange,
	onSaved,
	onResolveReview,
	layerStyles = visualLayers,
	layerOverride,
	onLayerChange,
}: {
	siteId: string;
	drawingId: string;
	source?: VisualEvidence;
	photos?: string[];
	originalMessage?: string;
	mark?: VisualMark;
	measurement?: VisualZoneMeasurement;
	progressPending: boolean;
	editorLocked: boolean;
	closeLocked: boolean;
	controlsLocked: boolean;
	onClose: () => void;
	onEditingChange: (editing: boolean) => void;
	onSaved: (drawing: VisualDrawing & { assignmentWarning?: string }) => void;
	onResolveReview: (reanalyze: boolean) => Promise<void>;
	layerStyles?: Record<string, { label: string; color: string }>;
	layerOverride?: string;
	onLayerChange?: (layerId: string | null) => void;
}) {
	const open = !!source && !!mark;
	const sourcePhotos = photos ?? (source?.photoUrl ? [source.photoUrl] : []);
	const content = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (mark?.id && content.current) content.current.scrollTop = 0;
	}, [mark?.id]);
	return (
		<aside
			aria-label="Izvēlētās zonas informācija"
			aria-hidden={!open}
			inert={!open}
			data-state={open ? "open" : "closed"}
			className={`absolute bottom-14 right-3 top-16 z-40 flex w-[min(440px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[calc(100%+1rem)] opacity-0"}`}
			onKeyDown={(event) => {
				if (
					event.key === "Escape" &&
					!closeLocked &&
					!event.defaultPrevented &&
					!(
						event.target instanceof Element &&
						event.target.closest('[role="dialog"]')
					)
				) {
					event.stopPropagation();
					onClose();
				}
			}}
		>
			<div className="flex shrink-0 items-start justify-between gap-3 border-b px-3 py-2">
				<div className="min-w-0 space-y-1">
					<h3 className="text-xs text-muted-foreground">
						{open ? "Izvēlētā zona" : ""}
					</h3>
					{source && mark ? (
						<>
							<p className="font-medium text-sm [overflow-wrap:anywhere]">
								{source.work}
							</p>
							<p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
								<span
									className="h-2.5 w-2.5 shrink-0 rounded-full"
									style={{
										backgroundColor: (
											layerStyles[mark.layer] ?? visualLayers.other
										).color,
									}}
									aria-hidden="true"
								/>
								{source.location} ·{" "}
								{visualDiaryDay(source.date) !== null
									? formatVisualDay(visualDiaryDay(source.date) as number)
									: "—"}{" "}
								· lapa {mark.page}
							</p>
						</>
					) : null}
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8 shrink-0"
					aria-label="Aizvērt zonas informāciju"
					disabled={closeLocked}
					onClick={onClose}
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</Button>
			</div>
			{source && mark ? (
				<>
					<section
						className="shrink-0 border-b px-3 py-2"
						aria-label="Zonas mērījumi"
					>
						<dl className="grid grid-cols-2 gap-3">
							<div>
								<dt className="text-xs text-muted-foreground">Zonas laukums</dt>
								<dd className="text-sm font-medium tabular-nums">
									{measurement?.zoneArea != null
										? `${areaFormat.format(measurement.zoneArea)} m²`
										: "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground">
									Poligona laukums
								</dt>
								<dd className="text-sm font-medium tabular-nums">
									{measurement?.polygonArea != null
										? `${areaFormat.format(measurement.polygonArea)} m²`
										: "—"}
								</dd>
							</div>
						</dl>
						{measurement ? (
							<p className="mt-1 text-xs text-muted-foreground">
								{measurement.scale
									? `Mērogs 1:${measurement.scale} · lapa ${measurement.page}`
									: "Rasējuma mērogs nav noteikts."}
							</p>
						) : null}
					</section>
					<div
						className={`flex flex-col gap-2 ${source.manual ? "shrink-0 p-3" : "min-h-0 flex-1 p-2"}`}
						data-testid="zone-source-image"
					>
						{sourcePhotos.length ? (
							<>
								<p className="shrink-0 text-xs text-muted-foreground">
									Oriģinālais marķējums
								</p>
								<div className="min-h-0 flex-1 overflow-y-auto">
									<DiaryRecordPhotos
										key={`${source.recordId}:${sourcePhotos.join("|")}`}
										photos={sourcePhotos}
										language="lv"
										variant="featured"
									/>
								</div>
							</>
						) : (
							<p className="flex h-full items-center justify-center text-sm text-muted-foreground">
								{source.manual
									? "Zona norādīta manuāli un piesaistīta būvdarbu žurnāla ierakstam."
									: "Oriģinālais marķējums nav pieejams."}
							</p>
						)}
					</div>
					<div
						ref={content}
						className={`${source.manual ? "min-h-0 flex-1" : "max-h-[35%] shrink-0"} space-y-3 overflow-y-auto overscroll-contain border-t px-3 py-2 text-sm`}
					>
						<details key={source.recordId} open={!!originalMessage?.trim()}>
							<summary className="cursor-pointer text-xs font-medium text-muted-foreground">
								Darba apraksts
							</summary>
							{originalMessage?.trim() ? (
								<p className="mt-2 text-xs text-muted-foreground">
									Oriģinālais WhatsApp ziņojums
								</p>
							) : null}
							<p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">
								{originalMessage?.trim()
									? originalMessage
									: source.manual
										? source.description || "Komentārs nav norādīts."
										: "Oriģinālais WhatsApp ziņojums nav saglabāts."}
							</p>
							{source.amount != null ? (
								<p className="mt-2 text-xs text-muted-foreground">
									Žurnāla daudzums: {source.amount} {source.unit}
								</p>
							) : null}
						</details>
						{progressPending ? (
							<p className="text-xs text-amber-800">
								Redzama iepriekš saglabātā zona. Šī avota atjaunošana vēl nav
								pabeigta.
							</p>
						) : null}
						<VisualWorkEditor
							key={`${source.recordId}:${source.work}`}
							siteId={siteId}
							drawingId={drawingId}
							source={source}
							disabled={editorLocked}
							onEditingChange={onEditingChange}
							onSaved={onSaved}
						/>
						{onLayerChange ? (
							<label className="block space-y-1 text-xs">
								Slānis šai zonai
								<select
									aria-label="Slānis šai zonai"
									className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
									value={layerOverride ?? "automatic"}
									disabled={controlsLocked}
									onChange={(event) =>
										onLayerChange(
											event.target.value === "automatic"
												? null
												: event.target.value,
										)
									}
								>
									<option value="automatic">
										Pēc darba piesaistes
										{!layerOverride
											? ` · ${layerStyles[mark.layer]?.label ?? ""}`
											: ""}
									</option>
									{Object.entries(layerStyles).map(([id, appearance]) => (
										<option key={id} value={id}>
											{appearance.label}
										</option>
									))}
								</select>
							</label>
						) : null}
						{source.reviewRequired ? (
							<div className="space-y-2 border-t pt-3">
								<p className="text-xs">
									Avots ir mainīts. Pārbaudiet attēlu un manuāli pielāgoto zonu.
								</p>
								<Button
									size="sm"
									variant="outline"
									disabled={controlsLocked}
									onClick={() => void onResolveReview(false)}
								>
									Paturēt zonu
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={controlsLocked}
									onClick={() => void onResolveReview(true)}
								>
									Analizēt vēlreiz
								</Button>
							</div>
						) : null}
					</div>
				</>
			) : null}
		</aside>
	);
}
