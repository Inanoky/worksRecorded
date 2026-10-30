"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
	FimaActChoice,
	FimaActReference,
	FimaActRow,
	FimaActSetting,
} from "@/lib/fima/act-register";
import { saveFimaActSettings } from "@/server/actions/fima-acts";

const key = (value: FimaActReference) =>
	`${value.siteId}:${value.collection}/${value.id}`;
export function FimaActExamplesDialog({
	siteId,
	row,
	choices,
	onClose,
	onSaved,
}: {
	siteId: string;
	row: FimaActRow;
	choices: FimaActChoice[];
	onClose: () => void;
	onSaved: (setting: FimaActSetting) => void;
}) {
	const [selected, setSelected] = useState(row.setting.examples);
	const [query, setQuery] = useState("");
	const [saving, setSaving] = useState(false);
	const requestId = useRef<string | null>(null);
	const eligible = choices.filter(
		(choice) =>
			["approved", "approving"].includes(choice.status) &&
			!(
				choice.siteId === siteId &&
				choice.collection === row.collection &&
				choice.id === row.id
			),
	);
	const visible = eligible.filter((choice) =>
		`${choice.number ?? choice.id} ${choice.siteName} ${choice.title ?? ""}`
			.toLowerCase()
			.includes(query.trim().toLowerCase()),
	);
	const toggle = (reference: FimaActReference) => {
		requestId.current = null;
		setSelected((value) =>
			value.some((item) => key(item) === key(reference))
				? value.filter((item) => key(item) !== key(reference))
				: [...value, reference],
		);
	};
	const save = async () => {
		setSaving(true);
		requestId.current ??= crypto.randomUUID();
		try {
			const setting = await saveFimaActSettings({
				siteId,
				collection: row.collection,
				id: row.id,
				expectedRevision: row.setting.revision,
				requestId: requestId.current,
				kind: "examples",
				examples: selected,
			});
			onSaved(setting);
			onClose();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Neizdevās saglabāt paraugus.",
			);
		} finally {
			setSaving(false);
		}
	};
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !saving) onClose();
			}}
		>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Akta paraugi</DialogTitle>
					<DialogDescription>
						{row.localNumber} · apstiprināti vai apstiprināšanā esoši akti no
						FIMA projektiem.
					</DialogDescription>
				</DialogHeader>
				{selected.length ? (
					<fieldset
						className="flex flex-wrap gap-2"
						aria-label="Izvēlētie paraugi"
					>
						{selected.map((reference) => {
							const choice = choices.find(
								(item) => key(item) === key(reference),
							);
							return (
								<Button
									key={key(reference)}
									type="button"
									variant="outline"
									size="sm"
									disabled={saving}
									onClick={() => toggle(reference)}
									aria-label={`Noņemt paraugu ${choice?.number ?? reference.id}`}
									className="h-auto whitespace-normal text-left"
								>
									{choice?.number ?? `BIS ${reference.id}`} ·{" "}
									{choice?.siteName ?? "Nav pieejams"} ×
								</Button>
							);
						})}
					</fieldset>
				) : null}
				<Input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Akta Nr., projekts, apraksts..."
					aria-label="Meklēt parauga aktu"
				/>
				<div className="max-h-[45dvh] space-y-2 overflow-y-auto rounded-md border p-2">
					{visible.map((choice) => (
						<label
							key={key(choice)}
							className="flex cursor-pointer items-start gap-3 rounded p-3 hover:bg-muted/40"
						>
							<input
								type="checkbox"
								className="mt-1"
								disabled={saving}
								checked={selected.some((item) => key(item) === key(choice))}
								onChange={() =>
									toggle({
										siteId: choice.siteId,
										caseId: choice.caseId,
										collection: choice.collection,
										id: choice.id,
									})
								}
							/>
							<span className="min-w-0">
								<span className="block text-sm font-medium">
									{choice.number ?? `BIS ${choice.id}`}
								</span>
								<span className="block text-xs text-muted-foreground">
									{choice.siteName} · {choice.date ?? "—"} ·{" "}
									{choice.status === "approved"
										? "Apstiprināts"
										: "Apstiprināšanā"}
								</span>
								{choice.title ? (
									<span className="line-clamp-2 text-sm">{choice.title}</span>
								) : null}
							</span>
						</label>
					))}
					{!visible.length ? (
						<p className="p-3 text-sm text-muted-foreground">
							Atbilstošu parauga aktu nav.
						</p>
					) : null}
				</div>
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="ghost"
						disabled={saving}
						onClick={onClose}
					>
						Atcelt
					</Button>
					<Button type="button" disabled={saving} onClick={() => void save()}>
						{saving ? "Saglabā..." : "Saglabāt paraugus"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
