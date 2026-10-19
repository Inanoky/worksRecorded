"use client";

import { Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	type FimaInlineField,
	fimaFieldLabels,
	fimaInlineValue,
} from "@/lib/fima/inline-fields";
import { updateFimaDiaryField } from "@/server/actions/fima-diary-inline";

type Props = {
	siteId: string;
	recordId: string;
	field: FimaInlineField;
	value: unknown;
	onSaved: (
		id: string,
		field: FimaInlineField,
		value: string | number | null,
	) => void;
};
export function FimaInlineCell({
	siteId,
	recordId,
	field,
	value,
	onSaved,
}: Props) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const [saving, setSaving] = useState(false);
	const cancelled = useRef(false);
	const inFlight = useRef(false);
	const expected = useRef("");
	const multiline =
		field === "Works" || field === "Works_Custom_1" || field === "Location";
	const label = fimaFieldLabels[field];
	const display =
		field === "Date" && value
			? new Date(String(value)).toLocaleDateString("lv-LV", {
					timeZone: "Europe/Riga",
				})
			: fimaInlineValue(value);
	const save = async () => {
		if (cancelled.current || inFlight.current) return;
		const original =
			field === "Date" ? expected.current.slice(0, 10) : expected.current;
		if (draft === original) {
			setEditing(false);
			return;
		}
		inFlight.current = true;
		setSaving(true);
		try {
			const result = await updateFimaDiaryField({
				siteId,
				recordId,
				field,
				value: draft,
				expectedValue: expected.current,
			});
			onSaved(recordId, result.field, result.value);
			setEditing(false);
		} catch (cause) {
			toast.error(
				cause instanceof Error ? cause.message : "Neizdevās saglabāt izmaiņas.",
			);
		} finally {
			inFlight.current = false;
			setSaving(false);
		}
	};
	const inputProps = {
		"aria-label": `Rediģēt: ${label}`,
		value: draft,
		disabled: saving,
		className:
			"w-full min-w-0 rounded border border-primary/40 bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/20",
		onChange: (
			event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		) => setDraft(event.target.value),
		onBlur: () => void save(),
		onKeyDown: (
			event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
		) => {
			event.stopPropagation();
			if (event.key === "Escape") {
				cancelled.current = true;
				setEditing(false);
			} else if (
				event.key === "Enter" &&
				(!multiline || event.ctrlKey || event.metaKey)
			) {
				event.preventDefault();
				void save();
			}
		},
		ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => {
			if (element && document.activeElement !== element && !saving)
				element.focus();
		},
	};
	return (
		<div data-fima-interactive aria-busy={saving}>
			{editing ? (
				multiline ? (
					<textarea {...inputProps} rows={3} />
				) : (
					<input
						{...inputProps}
						type={field === "Date" ? "date" : "text"}
						inputMode={field === "Amounts" ? "decimal" : undefined}
					/>
				)
			) : (
				<div className="w-full min-w-0 px-1 py-1">
					<span className="block min-w-0 cursor-text select-text whitespace-pre-wrap break-words">
						{display || "—"}
					</span>
					<button
						type="button"
						aria-label={`Rediģēt: ${label}`}
						title={`Rediģēt: ${label}`}
						className="mt-1 inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
						onClick={() => {
							cancelled.current = false;
							expected.current = fimaInlineValue(value);
							setDraft(
								field === "Date"
									? expected.current.slice(0, 10)
									: expected.current,
							);
							setEditing(true);
						}}
					>
						<Pencil aria-hidden="true" className="size-3" />
					</button>
				</div>
			)}
		</div>
	);
}
