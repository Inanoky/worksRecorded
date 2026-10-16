"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { addVisualSection } from "./actions";

export function VisualSectionSelect({
	siteId,
	value,
	options,
	disabled,
	onChange,
	onOptionsChange,
}: {
	siteId: string;
	value: string | null;
	options: string[];
	disabled: boolean;
	onChange: (value: string | null) => void;
	onOptionsChange: (options: string[]) => void;
}) {
	const id = useId();
	const [open, setOpen] = useState(false);
	const [label, setLabel] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const displayed =
		value && !options.includes(value) ? [...options, value] : options;
	async function add() {
		if (saving || !label.trim()) return;
		setSaving(true);
		setError(null);
		try {
			onOptionsChange(await addVisualSection(siteId, label));
			setLabel("");
		} catch {
			setError(
				"Neizdevās saglabāt sekciju. Atjaunojiet skatu vai mēģiniet vēlreiz.",
			);
		} finally {
			setSaving(false);
		}
	}
	return (
		<>
			<div className="space-y-2">
				<Label htmlFor={id}>Sekcija</Label>
				<Select
					value={value ? `section:${value}` : "none"}
					disabled={disabled}
					onValueChange={(next) => {
						if (next === "manage") {
							setOpen(true);
							return;
						}
						onChange(next === "none" ? null : next.slice(8));
					}}
				>
					<SelectTrigger id={id} className="w-full min-w-0">
						<SelectValue placeholder="Nav izvēlēta" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">Nav izvēlēta</SelectItem>
						{displayed.map((item) => (
							<SelectItem key={item} value={`section:${item}`}>
								{item}
							</SelectItem>
						))}
						<SelectItem value="manage">Pārvaldīt opcijas</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!saving) setOpen(next);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Pārvaldīt sekcijas</DialogTitle>
						<DialogDescription>
							Sekcijas ir pieejamas visās šī projekta lokācijās.
						</DialogDescription>
					</DialogHeader>
					<div className="max-h-60 space-y-1 overflow-y-auto">
						{options.map((item) => (
							<p
								className="break-words rounded-md border px-3 py-2 text-sm"
								key={item}
							>
								{item}
							</p>
						))}
						{!options.length ? (
							<p className="text-sm text-muted-foreground">
								Vēl nav pievienotu sekciju.
							</p>
						) : null}
					</div>
					<Label htmlFor={`${id}-new`}>Jauna sekcija</Label>
					<Input
						id={`${id}-new`}
						value={label}
						maxLength={120}
						disabled={saving}
						onChange={(event) => setLabel(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								void add();
							}
						}}
					/>
					{error ? (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					) : null}
					<Button
						type="button"
						disabled={saving || !label.trim()}
						onClick={() => void add()}
					>
						{saving ? "Saglabā…" : "Pievienot sekciju"}
					</Button>
				</DialogContent>
			</Dialog>
		</>
	);
}
