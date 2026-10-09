"use client";

import { useEffect, useId, useState } from "react";
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
	const [error, setError] = useState<string | null>(null);
	const dirty = work !== source.work;
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
	async function save() {
		if (!dirty || saving || disabled) return;
		setSaving(true);
		setError(null);
		try {
			const drawing = await saveVisualWorkType(siteId, drawingId, {
				evidenceId: source.id,
				expectedWork: source.work,
				work,
			});
			onSaved(drawing);
			notifyDiaryRecordUpdated(siteId);
		} catch (issue) {
			setError(
				issue instanceof Error
					? issue.message
					: "Neizdevās saglabāt darba tipu.",
			);
		} finally {
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
				onChange={(event) => setWork(event.target.value)}
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
				Mainīs darba tipu žurnāla ierakstam un visām tā zonām.
			</p>
			{dirty || saving ? (
				<div className="flex gap-2">
					<Button
						size="sm"
						disabled={disabled || saving}
						onClick={() => void save()}
					>
						{saving ? "Saglabā…" : "Saglabāt"}
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={saving}
						onClick={() => setWork(source.work)}
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
