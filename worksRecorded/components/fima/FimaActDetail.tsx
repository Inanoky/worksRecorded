"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	getFimaAcceptanceActUrl,
	getFimaActStatusLabel,
} from "@/lib/fima/acceptance-acts";
import type {
	FimaActRow,
	FimaActSource,
	FimaActWorkScope,
} from "@/lib/fima/act-register";
import { getFimaBisRecordUrl } from "@/lib/fima/bis-record-links";
import { formatFimaDiaryNumber } from "@/lib/fima/diary-number";

export type FimaActDetailTab =
	| "works"
	| "examples"
	| "attachments"
	| "comments";
export function FimaActWorkList({ row }: { row: FimaActWorkScope }) {
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
function ActComparison({
	row,
	references,
}: {
	row: FimaActRow;
	references: FimaActSource[];
}) {
	const [selected, setSelected] = useState(0);
	const reference = row.examples[Math.min(selected, row.examples.length - 1)];
	const source = references.find(
		(value) =>
			value.siteId === reference?.siteId &&
			value.caseId === reference.caseId &&
			value.collection === reference.collection &&
			value.id === reference.id,
	);
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
							) : (
								<p className="text-sm text-muted-foreground">
									Parauga darbi nav pieejami sagatavotajos projekta datos.
									Atjaunojiet aktu datus.
								</p>
							)}
						</>
					)}
				</section>
			</div>
		</div>
	);
}
export function FimaActDetail({
	row,
	tab,
	onTabChange,
	onClose,
	references = [],
}: {
	row: FimaActRow;
	tab: FimaActDetailTab;
	onTabChange: (tab: FimaActDetailTab) => void;
	onClose: () => void;
	references?: FimaActSource[];
}) {
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
			{tab === "examples" ? (
				<ActComparison row={row} references={references} />
			) : null}
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
		</section>
	);
}
