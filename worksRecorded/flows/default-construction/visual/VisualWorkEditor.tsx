"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { notifyDiaryRecordUpdated } from "../lib/diary-record-updated-event";
import { getVisualWorkTypes, saveVisualWorkType } from "./actions";
import type { VisualDrawing, VisualEvidence } from "./model";

export function VisualWorkEditor({
	siteId,
	drawingId,
	source,
	disabled,
	onEditingChange,
	onSaved,
}: {
	siteId: string;
	drawingId: string;
	source: VisualEvidence;
	disabled: boolean;
	onEditingChange: (value: boolean) => void;
	onSaved: (drawing: VisualDrawing & { assignmentWarning?: string }) => void;
}) {
	const id = useId();
	const [options, setOptions] = useState<string[] | null>(null);
	const [work, setWork] = useState(source.work);
	const [saving, setSaving] = useState(false);
	const savingRef = useRef(false);
	const [savedWork, setSavedWork] = useState(source.work);
	const [error, setError] = useState<string | null>(null);
	const dirty = work !== savedWork;
	useEffect(() => {
		let current = true;
		void getVisualWorkTypes(siteId).then(
			(value) => {
				if (current) setOptions(value);
			},
			() => {
				if (current) setError("Neizdevās ielādēt darba tipus.");
			},
		);
		return () => {
			current = false;
		};
	}, [siteId]);
	useEffect(() => {
		onEditingChange(dirty || saving);
		return () => onEditingChange(false);
	}, [dirty, saving, onEditingChange]);
	async function save(nextWork: string) {
		if (nextWork === savedWork || savingRef.current || disabled) return;
		savingRef.current = true;
		setWork(nextWork);
		setSaving(true);
		setError(null);
		try {
			const drawing = await saveVisualWorkType(siteId, drawingId, {
				evidenceId: source.id,
				expectedWork: savedWork,
				work: nextWork,
			});
			setSavedWork(nextWork);
			onSaved(drawing);
			notifyDiaryRecordUpdated(siteId);
		} catch (issue) {
			setError(
				issue instanceof Error
					? issue.message
					: "Neizdevās saglabāt darba tipu.",
			);
		} finally {
			savingRef.current = false;
			setSaving(false);
		}
	}
	return (
		<div className="space-y-2 border-t pt-3">
			<label htmlFor={id} className="text-xs font-medium">
				Darba tips
			</label>
			<select
				id={id}
				value={work}
				disabled={disabled || saving || !options}
				onChange={(event) => void save(event.target.value)}
				className="h-9 w-full rounded-md border bg-background px-2 text-sm"
			>
				{[...new Set([source.work, ...(options ?? [])])]
					.filter(Boolean)
					.map((item) => (
						<option key={item} value={item}>
							{item}
						</option>
					))}
			</select>
			<p className="text-xs text-muted-foreground">
				{saving
					? "Saglabā…"
					: "Izvēle automātiski saglabājas ierakstam un visām tā zonām."}
			</p>
			{dirty && !saving && error ? (
				<div className="flex gap-2">
					<Button
						size="sm"
						disabled={disabled || saving}
						onClick={() => void save(work)}
					>
						Mēģināt vēlreiz
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={saving}
						onClick={() => {
							setWork(savedWork);
							setError(null);
						}}
					>
						Atcelt
					</Button>
				</div>
			) : null}
			{error ? (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}
