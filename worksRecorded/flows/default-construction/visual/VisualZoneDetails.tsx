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
			className={`absolute bottom-14 right-3 top-16 z-40 flex w-[min(360px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[calc(100%+1rem)] opacity-0"}`}
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
			<div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
				<h3 className="text-sm font-semibold">{open ? "Izvēlētā zona" : ""}</h3>
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
			<div
				ref={content}
				className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 text-sm"
			>
				{source && mark ? (
					<>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: visualLayers[mark.layer].color }}
								aria-hidden="true"
							/>
							{visualLayers[mark.layer].label} · lapa {mark.page}
						</div>
						<p className="font-medium">{source.work}</p>
						{progressPending ? (
							<p className="text-xs text-amber-800">
								Redzama iepriekš saglabātā zona. Šī avota atjaunošana vēl nav
								pabeigta.
							</p>
						) : null}
						<p>
							{source.location} ·{" "}
							{visualDiaryDay(source.date) !== null
								? formatVisualDay(visualDiaryDay(source.date) as number)
								: "—"}
						</p>
						<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
							{source.description}
						</p>
						<DiaryRecordPhotos photos={[source.photoUrl]} language="lv" />
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
					</>
				) : null}
			</div>
		</aside>
	);
}
