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

export function VisualZoneDetails({
	siteId,
	drawingId,
	source,
	mark,
	progressPending,
	editorLocked,
	closeLocked,
	controlsLocked,
	onClose,
	onEditingChange,
	onSaved,
	onResolveReview,
}: {
	siteId: string;
	drawingId: string;
	source?: VisualEvidence;
	mark?: VisualMark;
	progressPending: boolean;
	editorLocked: boolean;
	closeLocked: boolean;
	controlsLocked: boolean;
	onClose: () => void;
	onEditingChange: (editing: boolean) => void;
	onSaved: (drawing: VisualDrawing & { assignmentWarning?: string }) => void;
	onResolveReview: (reanalyze: boolean) => Promise<void>;
}) {
	const open = !!source && !!mark;
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
									style={{ backgroundColor: visualLayers[mark.layer].color }}
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
					<div className="min-h-0 flex-1 p-2" data-testid="zone-source-image">
						{source.photoUrl ? (
							<DiaryRecordPhotos
								key={source.photoUrl}
								photos={[source.photoUrl]}
								language="lv"
								variant="featured"
							/>
						) : (
							<p className="flex h-full items-center justify-center text-sm text-muted-foreground">
								Avota attēls nav pieejams.
							</p>
						)}
					</div>
					<div
						ref={content}
						className="max-h-[35%] shrink-0 space-y-3 overflow-y-auto overscroll-contain border-t px-3 py-2 text-sm"
					>
						<details>
							<summary className="cursor-pointer text-xs font-medium text-muted-foreground">
								Darba apraksts
							</summary>
							<p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">
								{source.description}
							</p>
							{source.amount != null ? (
								<p className="mt-2 text-xs text-muted-foreground">
									Daudzums: {source.amount} {source.unit}
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
