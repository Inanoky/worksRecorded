"use client";

import { Pencil } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	type FimaActType,
	fimaActTypes,
	formatFimaActType,
	formatFimaActTypeCell,
} from "@/lib/fima/act-types";
import {
	type FimaCollaboration,
	formatFimaEventText,
} from "@/lib/fima/diary-collaboration";
import {
	getFimaDiaryCollaboration,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";

type Props = {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onChange: (id: string, state: FimaCollaboration) => void;
};

export function FimaActTypeCell({ siteId, recordId, state, onChange }: Props) {
	const [open, setOpen] = useState(false);
	const [snapshot, setSnapshot] = useState<FimaCollaboration | null>(null);
	const [selection, setSelection] = useState<FimaActType | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const pending = useRef<string | null>(null);
	const working = useRef(false);
	const selectId = useId();
	const label = formatFimaActType(state.actType);
	const latest = state.history.findLast((event) => event.kind === "act_type");
	const history = snapshot?.history.filter(
		(event) => event.kind === "act_type",
	);
	const changed = snapshot && selection !== (snapshot.actType ?? null);

	async function load() {
		if (working.current) return;
		working.current = true;
		setBusy(true);
		setSnapshot(null);
		setError("");
		try {
			const latest = await getFimaDiaryCollaboration({ siteId, recordId });
			setSnapshot(latest);
			setSelection(latest.actType ?? null);
			pending.current = null;
			onChange(recordId, latest);
		} catch {
			setError("Neizdevās ielādēt akta veidu un vēsturi.");
		} finally {
			working.current = false;
			setBusy(false);
		}
	}

	async function save() {
		if (working.current || !changed) return;
		working.current = true;
		setBusy(true);
		setError("");
		pending.current ??= crypto.randomUUID();
		try {
			const saved = await saveFimaDiaryCollaboration({
				siteId,
				recordId,
				requestId: pending.current,
				kind: "act_type",
				actType: selection,
				expectedVersion: snapshot.version,
			});
			onChange(recordId, saved);
			setOpen(false);
		} catch {
			setError(
				"Neizdevās saglabāt akta veidu. Ja ieraksts ir mainīts, atjaunojiet datus.",
			);
		} finally {
			working.current = false;
			setBusy(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (working.current) return;
				setOpen(next);
				if (next) void load();
			}}
		>
			<DialogTrigger asChild>
				<button
					type="button"
					className="flex min-h-8 w-full min-w-0 items-start gap-1 rounded px-1 py-1 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
					aria-label={`Akta veids: ${label}`}
					title={label}
					onClick={(event) => event.stopPropagation()}
				>
					<Pencil
						className="mt-0.5 size-3 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
					<span className="min-w-0">
						<span
							className={`line-clamp-3 [overflow-wrap:anywhere] ${state.actType ? "" : "text-muted-foreground"}`}
						>
							{formatFimaActTypeCell(state.actType)}
						</span>
						{latest ? (
							<span className="mt-0.5 block text-xs text-muted-foreground">
								<span className="block truncate" title={latest.actorName}>
									{latest.actorName}
								</span>
								<time dateTime={latest.at} className="block tabular-nums">
									{new Date(latest.at).toLocaleDateString("lv-LV", {
										timeZone: "Europe/Riga",
									})}
								</time>
							</span>
						) : null}
					</span>
				</button>
			</DialogTrigger>
			<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Akta veids</DialogTitle>
					<DialogDescription>
						Izvēlieties ieraksta darbam atbilstošo akta veidu.
					</DialogDescription>
				</DialogHeader>
				<form
					className="min-w-0 space-y-3"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void save();
					}}
				>
					<label className="block text-sm font-medium" htmlFor={selectId}>
						Akta kategorija
					</label>
					<select
						id={selectId}
						className="block min-h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						value={selection ?? ""}
						disabled={busy || !snapshot}
						onChange={(event) => {
							setSelection((event.target.value || null) as FimaActType | null);
							pending.current = null;
							setError("");
						}}
					>
						<option value="">Nav izvēlēts</option>
						{Object.entries(fimaActTypes).map(([key, name]) => (
							<option key={key} value={key}>
								{name}
							</option>
						))}
					</select>
					{selection ? (
						<p className="break-words text-xs text-muted-foreground">
							{formatFimaActType(selection)}
						</p>
					) : null}
					{busy ? (
						<output className="block text-sm text-muted-foreground">
							{snapshot ? "Saglabā..." : "Ielādē..."}
						</output>
					) : null}
					{error ? (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					) : null}
					<div className="flex flex-wrap justify-end gap-2">
						{error ? (
							<Button
								type="button"
								variant="outline"
								disabled={busy}
								onClick={() => void load()}
							>
								Atjaunot datus
							</Button>
						) : null}
						<Button type="submit" disabled={busy || !changed}>
							Saglabāt
						</Button>
					</div>
				</form>
				<section
					className="min-w-0 space-y-2 border-t pt-3"
					aria-label="Akta veida vēsture"
				>
					<h3 className="text-sm font-medium">Akta veida vēsture</h3>
					{history?.length ? (
						<ol className="space-y-2">
							{[...history].reverse().map((event) => (
								<li key={event.id} className="rounded-md border p-2">
									<p className="break-words text-xs text-muted-foreground">
										{event.actorName} ·{" "}
										<time dateTime={event.at}>
											{new Date(event.at).toLocaleString("lv-LV", {
												timeZone: "Europe/Riga",
											})}
										</time>
									</p>
									<p className="break-words text-sm">
										{formatFimaEventText(event)}
									</p>
								</li>
							))}
						</ol>
					) : !busy && snapshot ? (
						<p className="text-sm text-muted-foreground">
							Akta veida izmaiņu vēl nav.
						</p>
					) : null}
				</section>
			</DialogContent>
		</Dialog>
	);
}
