"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	getFimaAcceptanceActUrl,
	getFimaActStatusLabel,
} from "@/lib/fima/acceptance-acts";
import type { FimaActRow, FimaActSetting } from "@/lib/fima/act-register";
import { getFimaBisRecordUrl } from "@/lib/fima/bis-record-links";
import { formatFimaDiaryNumber } from "@/lib/fima/diary-number";
import {
	getFimaActReferenceDetail,
	saveFimaActSettings,
} from "@/server/actions/fima-acts";

export type FimaActDetailTab =
	| "works"
	| "examples"
	| "attachments"
	| "comments";
export function FimaActWorkList({ row }: { row: FimaActRow }) {
	const works = new Map<
		string,
		{ native: number | null | undefined; planned: number | null | undefined }
	>();
	for (const work of row.works) {
		const value = works.get(work.id) ?? {
			native: undefined,
			planned: undefined,
		};
		value.native =
			value.native === undefined
				? work.quantity
				: value.native !== null && work.quantity !== null
					? value.native + work.quantity
					: null;
		works.set(work.id, value);
	}
	for (const work of row.plannedWorks) {
		const value = works.get(work.id) ?? {
			native: undefined,
			planned: undefined,
		};
		value.planned = work.quantity;
		works.set(work.id, value);
	}
	return (
		<div className="space-y-3">
			<p className="text-xs text-muted-foreground">
				{new Set(row.works.map((work) => work.id)).size} faktiski iekļauti BIS ·{" "}
				{new Set(row.plannedWorks.map((work) => work.id)).size} plānoti
			</p>
			{[...works].map(([id, amount]) => {
				const records = row.records.filter((record) =>
					record.fimaBisRecords.some((link) => link.id === id),
				);
				const matches = records.length
					? records
					: row.records.filter((record) => record.BISId === id);
				const number = matches
					.map(
						(record) =>
							record.fimaBisRecords.find((link) => link.id === id)?.number,
					)
					.find(Boolean);
				const units = [
					...new Set(matches.map((record) => record.Units).filter(Boolean)),
				];
				return (
					<div key={id} className="rounded-md border bg-background p-3">
						<div className="flex flex-wrap justify-between gap-3">
							<a
								className="text-sm font-medium text-primary underline underline-offset-2"
								href={getFimaBisRecordUrl(id) ?? undefined}
								target="_blank"
								rel="noopener noreferrer"
							>
								BIS {number ?? id}
							</a>
							<div className="text-right text-xs tabular-nums">
								{amount.native !== undefined ? (
									<p>
										Aktā: {amount.native ?? "Nav pārbaudīts"}{" "}
										{units.length === 1 ? units[0] : ""}
									</p>
								) : (
									<p className="text-muted-foreground">
										Vēl nav iekļauts BIS aktā
									</p>
								)}
								{amount.planned !== undefined ? (
									<p className="text-muted-foreground">
										Plānots: {amount.planned ?? "—"}{" "}
										{units.length === 1 ? units[0] : ""}
									</p>
								) : null}
							</div>
						</div>
						{matches.length ? (
							matches.map((record) => (
								<div key={record.id} className="mt-2 space-y-1">
									<a
										className="text-xs text-primary underline underline-offset-2"
										href={`/dashboard/sites/${row.siteId}/dashboard?q=${encodeURIComponent(formatFimaDiaryNumber(record.fimaNumber))}`}
									>
										{formatFimaDiaryNumber(record.fimaNumber)}
									</a>
									<p className="whitespace-pre-wrap text-sm">
										{record.Works_Custom_1 || record.Works || "—"}
									</p>
									<p className="text-xs text-muted-foreground">
										{record.Location} ·{" "}
										{record.bisStatus
											? getFimaActStatusLabel(record.bisStatus)
											: "WorksRecorded"}
									</p>
								</div>
							))
						) : (
							<p className="mt-2 text-xs text-muted-foreground">
								WorksRecorded ikdienas ieraksts nav piesaistīts.
							</p>
						)}
					</div>
				);
			})}
			{!works.size ? (
				<p className="text-sm text-muted-foreground">
					Ikdienas darbu saites vēl nav saglabātas.
				</p>
			) : null}
		</div>
	);
}
function ActComparison({ siteId, row }: { siteId: string; row: FimaActRow }) {
	const [selected, setSelected] = useState(0);
	const [source, setSource] = useState<FimaActRow | null>(null);
	const [error, setError] = useState("");
	const [retry, setRetry] = useState(0);
	const reference = row.examples[Math.min(selected, row.examples.length - 1)];
	const request = useMemo(
		() => (reference ? { siteId, reference, retry } : null),
		[siteId, reference, retry],
	);
	useEffect(() => {
		setSource(null);
		setError("");
		if (!request) return;
		let active = true;
		void getFimaActReferenceDetail(request)
			.then((value) => {
				if (active) setSource(value);
			})
			.catch((cause) => {
				if (active)
					setError(
						cause instanceof Error
							? cause.message
							: "Neizdevās ielādēt paraugu.",
					);
			});
		return () => {
			active = false;
		};
	}, [request]);
	return (
		<div className="space-y-4">
			{row.examples.length > 1 ? (
				<label className="block text-xs text-muted-foreground">
					Parauga akts
					<select
						className="mt-1 block w-full rounded-md border bg-background p-2 text-sm text-foreground"
						value={Math.min(selected, row.examples.length - 1)}
						onChange={(event) => setSelected(Number(event.target.value))}
					>
						{row.examples.map((value, index) => (
							<option
								key={`${value.siteId}:${value.collection}/${value.id}`}
								value={index}
							>
								{"number" in value ? (value.number ?? value.id) : value.id} ·{" "}
								{"siteName" in value ? value.siteName : "Nav pieejams"}
							</option>
						))}
					</select>
				</label>
			) : null}
			<div className="grid gap-5 lg:grid-cols-2">
				<section className="space-y-3">
					<h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Pašreizējais akts
					</h4>
					<p className="font-medium">{row.number ?? row.localNumber}</p>
					<FimaActWorkList row={row} />
				</section>
				<section className="space-y-3">
					<h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Parauga akts
					</h4>
					{!reference ? (
						<p className="text-sm text-muted-foreground">
							Paraugs nav piesaistīts.
						</p>
					) : (
						<>
							<a
								className="block text-sm text-primary underline"
								href={
									getFimaAcceptanceActUrl(reference.collection, reference.id) ??
									undefined
								}
								target="_blank"
								rel="noopener noreferrer"
							>
								{"number" in reference
									? (reference.number ?? `BIS ${reference.id}`)
									: `BIS ${reference.id}`}
							</a>
							{"siteName" in reference ? (
								<p className="text-xs text-muted-foreground">
									{reference.siteName} ·{" "}
									{getFimaActStatusLabel(reference.status)}
								</p>
							) : null}
							{source ? (
								<FimaActWorkList row={source} />
							) : error ? (
								<div
									role="alert"
									className="space-y-2 text-sm text-destructive"
								>
									<p>{error}</p>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setRetry((value) => value + 1)}
									>
										Mēģināt vēlreiz
									</Button>
								</div>
							) : (
								<output className="text-sm text-muted-foreground">
									Ielādē parauga darbus...
								</output>
							)}
						</>
					)}
				</section>
			</div>
		</div>
	);
}
export function FimaActDetail({
	siteId,
	row,
	tab,
	onTabChange,
	onClose,
	onSaved,
}: {
	siteId: string;
	row: FimaActRow;
	tab: FimaActDetailTab;
	onTabChange: (tab: FimaActDetailTab) => void;
	onClose: () => void;
	onSaved: (setting: FimaActSetting) => void;
}) {
	const [draft, setDraft] = useState("");
	const [saving, setSaving] = useState(false);
	const requestId = useRef<string | null>(null);
	const save = async () => {
		if (!draft.trim() || saving) return;
		requestId.current ??= crypto.randomUUID();
		setSaving(true);
		try {
			const setting = await saveFimaActSettings({
				siteId,
				collection: row.collection,
				id: row.id,
				expectedRevision: row.setting.revision,
				requestId: requestId.current,
				kind: "comment",
				text: draft,
			});
			onSaved(setting);
			setDraft("");
			requestId.current = null;
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Neizdevās saglabāt komentāru.",
			);
		} finally {
			setSaving(false);
		}
	};
	const comments = row.setting.history.filter(
		(event) => event.kind === "comment",
	);
	return (
		<section
			aria-label={`Akta ${row.localNumber} detaļas`}
			className="space-y-4 border-l-2 border-primary bg-muted/20 p-4 sm:p-6"
		>
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs text-muted-foreground">{row.localNumber}</p>
					<h3 className="text-base font-semibold">
						{row.number ?? row.title ?? "BIS akta sagatave"}
					</h3>
				</div>
				<Button variant="ghost" size="sm" onClick={onClose}>
					Aizvērt
				</Button>
			</div>
			<fieldset
				className="flex flex-wrap gap-2 border-b pb-3"
				aria-label="Akta informācija"
			>
				{(
					[
						["works", "Ikdienas darbi"],
						["examples", "Akts ↔ paraugs"],
						["attachments", "Pielikumi"],
						["comments", "Komentāri / vēsture"],
					] as const
				).map(([value, label]) => (
					<Button
						key={value}
						variant={tab === value ? "secondary" : "ghost"}
						size="sm"
						aria-pressed={tab === value}
						onClick={() => onTabChange(value)}
					>
						{label}
					</Button>
				))}
			</fieldset>
			{tab === "works" ? <FimaActWorkList row={row} /> : null}
			{tab === "examples" ? <ActComparison siteId={siteId} row={row} /> : null}
			{tab === "attachments" ? (
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Pielikumu saturs un aktuālā esamība jāpārbauda faktiskajā BIS
						dokumentā.
					</p>
					{row.projectPageIds.length ? (
						<div>
							<p className="mb-2 text-xs font-medium">
								Saglabātās projekta rasējumu atsauces
							</p>
							<div className="flex flex-wrap gap-2">
								{row.projectPageIds.map((id) => (
									<span
										key={id}
										className="rounded border bg-background px-2 py-1 text-xs"
									>
										BIS rasējums {id}
									</span>
								))}
							</div>
						</div>
					) : null}
					{row.attachmentIds.length ? (
						<p className="text-xs text-muted-foreground">
							Saglabātie pielikumu ID: {row.attachmentIds.join(", ")}
						</p>
					) : null}
					<a
						className="inline-flex text-sm text-primary underline"
						href={getFimaAcceptanceActUrl(row.collection, row.id) ?? undefined}
						target="_blank"
						rel="noopener noreferrer"
					>
						Atvērt akta pielikumus BIS
					</a>
				</div>
			) : null}
			{tab === "comments" ? (
				<div className="space-y-5">
					<div className="space-y-2">
						<label
							className="block text-sm font-medium"
							htmlFor={`act-comment-${row.id}`}
						>
							Jauns komentārs
						</label>
						<Textarea
							id={`act-comment-${row.id}`}
							value={draft}
							disabled={saving}
							onChange={(event) => {
								setDraft(event.target.value);
								requestId.current = null;
							}}
							rows={3}
							maxLength={4000}
						/>
						<Button
							size="sm"
							disabled={saving || !draft.trim()}
							onClick={() => void save()}
						>
							Pievienot komentāru
						</Button>
					</div>
					{comments.map((event) => (
						<div key={event.id} className="rounded border bg-background p-3">
							<p className="whitespace-pre-wrap text-sm">{event.text}</p>
							<p className="mt-2 text-xs text-muted-foreground">
								{event.actorName} ·{" "}
								{new Date(event.at).toLocaleString("lv-LV", {
									timeZone: "Europe/Riga",
								})}
							</p>
						</div>
					))}
					<details>
						<summary className="cursor-pointer text-sm font-medium">
							Paraugu izmaiņu vēsture
						</summary>
						<ol className="mt-3 space-y-3">
							{row.setting.history
								.filter((event) => event.kind === "examples")
								.slice()
								.reverse()
								.map((event) => (
									<li key={event.id} className="text-sm">
										<p>{event.text}</p>
										<p className="text-xs text-muted-foreground">
											{event.actorName} ·{" "}
											{new Date(event.at).toLocaleString("lv-LV", {
												timeZone: "Europe/Riga",
											})}
										</p>
									</li>
								))}
						</ol>
					</details>
				</div>
			) : null}
		</section>
	);
}
