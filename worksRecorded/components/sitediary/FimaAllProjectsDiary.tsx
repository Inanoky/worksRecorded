"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import type { FimaInlineField } from "@/lib/fima/inline-fields";
import { shouldOpenFimaRecordPanel } from "@/lib/fima/record-panel";
import { cn } from "@/lib/utils/utils";
import { FimaDiaryCell } from "./FimaDiaryCell";
import { FimaInlineCell } from "./FimaInlineCell";
import { FimaMaterialRefresh } from "./FimaMaterialRefresh";
import { FimaRecordPanel } from "./FimaRecordPanel";

type RecordRow = {
	id: string;
	siteId: string | null;
	Date: Date | string | null;
	Works: string | null;
	Works_Custom_1?: string | null;
	Works_Custom_2?: string | null;
	Location: string | null;
	Amounts: number | null;
	Units: string | null;
	BISId?: string | null;
	bisCaseId?: string | null;
	bisCaseNumber?: string | null;
	hasFimaBisReferences?: boolean;
	fimaCollaboration?: FimaCollaboration;
	Site: { name: string } | null;
};

const columns = [
	["Projekts", 10],
	["Datums", 7],
	["Darba apraksts", 14],
	["BIS apraksts", 15],
	["Balsti", 8],
	["Maiņa", 7],
	["Apjoms", 5],
	["Materiāli", 34],
	["BIS lietas Nr.", 8],
	["BIS ieraksts", 6],
	["Komentāri", 8],
	["Rīcība", 18],
] as const;
const totalWidth = columns.reduce((sum, [, width]) => sum + width, 0);

export function FimaAllProjectsDiary({ records }: { records: RecordRow[] }) {
	const [fieldUpdates, setFieldUpdates] = useState<
		Record<string, Partial<RecordRow>>
	>({});
	const onFieldSaved = useCallback(
		(id: string, field: FimaInlineField, value: string | number | null) =>
			setFieldUpdates((current) => ({
				...current,
				[id]: { ...current[id], [field]: value },
			})),
		[],
	);
	const [updates, setUpdates] = useState<Record<string, FimaCollaboration>>({});
	const [selected, setSelected] = useState<string | null>(null);
	const trigger = useRef<HTMLElement | null>(null);
	const onChange = useCallback((id: string, state: FimaCollaboration) => {
		setUpdates((previous) => {
			const current = previous[id];
			if (current && current.version > state.version) return previous;
			const snapshot = current?.bisMaterials;
			return {
				...previous,
				[id]: {
					...state,
					bisMaterials:
						snapshot &&
						(!state.bisMaterials ||
							snapshot.fetchedAt > state.bisMaterials.fetchedAt)
							? snapshot
							: state.bisMaterials,
				},
			};
		});
	}, []);
	const rows = records.map((row) => ({
		...row,
		...fieldUpdates[row.id],
		fimaCollaboration:
			updates[row.id] &&
			updates[row.id].version >= (row.fimaCollaboration?.version ?? 0)
				? updates[row.id]
				: row.fimaCollaboration,
	}));
	const activeRow = rows.find((row) => row.id === selected) ?? null;
	const openRecord = (row: RecordRow, target?: HTMLElement) => {
		if (!row.siteId) return;
		trigger.current =
			target ??
			(document.activeElement instanceof HTMLElement
				? document.activeElement
				: null);
		setSelected(row.id);
	};
	const cell = (field: string, row: RecordRow) =>
		row.siteId ? (
			<FimaDiaryCell
				field={field}
				siteId={row.siteId}
				row={row}
				caseId={row.bisCaseId}
				caseNumber={row.bisCaseNumber}
				onChange={onChange}
				onOpenRecord={() => openRecord(row)}
			/>
		) : null;
	const inline = (field: FimaInlineField, row: RecordRow) =>
		row.siteId ? (
			<FimaInlineCell
				siteId={row.siteId}
				recordId={row.id}
				field={field}
				value={row[field]}
				onSaved={onFieldSaved}
			/>
		) : null;

	return (
		<div
			className={cn(
				"min-w-0 transition-[padding]",
				activeRow && "xl:pr-[30rem]",
			)}
		>
			<FimaMaterialRefresh records={rows} onChange={onChange} />
			<div className="hidden rounded-lg border xl:block">
				<Table className="w-full table-fixed text-xs [&_th]:whitespace-normal [&_th]:px-2 [&_th]:py-3 [&_td]:whitespace-normal [&_td]:break-words [&_td]:px-2 [&_td]:py-3 [&_td]:align-top [&_td]:leading-relaxed [&_button]:max-w-full">
					<colgroup>
						{columns.map(([title, width]) => (
							<col
								key={title}
								style={{ width: `${(width / totalWidth) * 100}%` }}
							/>
						))}
					</colgroup>
					<TableHeader className="bg-muted/40">
						<TableRow>
							{columns.map(([title]) => (
								<TableHead key={title}>{title}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length ? (
							rows.map((row, index) => (
								<TableRow
									key={row.id}
									tabIndex={0}
									onClick={(event) => {
										if (
											shouldOpenFimaRecordPanel(
												event.target,
												event.currentTarget,
											)
										)
											openRecord(row, event.currentTarget);
									}}
									onKeyDown={(event) => {
										if (
											event.target === event.currentTarget &&
											(event.key === "Enter" || event.key === " ")
										) {
											event.preventDefault();
											openRecord(row, event.currentTarget);
										}
									}}
									className={cn(
										"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
										index % 2 === 1 && "bg-muted/20",
										selected === row.id && "bg-red-50/60 dark:bg-red-950/30",
									)}
								>
									<TableCell>
										<Link
											className="text-primary underline"
											href={`/dashboard/sites/${row.siteId}/dashboard`}
										>
											{row.Site?.name ?? "—"}
										</Link>
									</TableCell>
									<TableCell className="tabular-nums">
										{inline("Date", row)}
									</TableCell>
									<TableCell className="font-medium">
										{inline("Works", row)}
									</TableCell>
									<TableCell>{inline("Works_Custom_1", row)}</TableCell>
									<TableCell>{inline("Location", row)}</TableCell>
									<TableCell>{inline("Works_Custom_2", row)}</TableCell>
									<TableCell>
										{inline("Amounts", row)}
										{inline("Units", row)}
									</TableCell>
									<TableCell>{cell("FimaMaterials", row)}</TableCell>
									<TableCell>{cell("FimaBisCase", row)}</TableCell>
									<TableCell>
										{row.BISId && /^\d+$/.test(row.BISId) ? (
											<a
												className="text-primary underline"
												href={`https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/${row.BISId}/edit?entry_ids%5B%5D=${row.BISId}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												{row.BISId}
											</a>
										) : null}
									</TableCell>
									<TableCell>{cell("FimaComments", row)}</TableCell>
									<TableCell>{cell("FimaReviewStatus", row)}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="text-center text-muted-foreground"
								>
									Atbilstoši ieraksti nav atrasti.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="space-y-3 xl:hidden">
				{rows.map((row) => (
					<article
						key={row.id}
						className="rounded-lg border p-4"
						onClick={(event) => {
							if (shouldOpenFimaRecordPanel(event.target, event.currentTarget))
								openRecord(row, event.currentTarget);
						}}
						onKeyDown={(event) => {
							if (
								event.target === event.currentTarget &&
								(event.key === "Enter" || event.key === " ")
							) {
								event.preventDefault();
								openRecord(row, event.currentTarget);
							}
						}}
					>
						<div className="flex flex-wrap justify-between gap-2">
							<Link
								className="text-sm text-primary underline"
								href={`/dashboard/sites/${row.siteId}/dashboard`}
							>
								{row.Site?.name}
							</Link>
							<span className="text-xs text-muted-foreground">
								{inline("Date", row)}
							</span>
						</div>
						<h3 className="mt-2 font-medium">{inline("Works", row)}</h3>
						<p className="mt-1 text-sm">{inline("Works_Custom_1", row)}</p>
						<dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
							<div>
								<dt className="text-muted-foreground">Balsti</dt>
								<dd>{inline("Location", row)}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Maiņa</dt>
								<dd>{inline("Works_Custom_2", row)}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Apjoms</dt>
								<dd>
									{inline("Amounts", row)} {inline("Units", row)}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">BIS ieraksts</dt>
								<dd>
									{row.BISId && /^\d+$/.test(row.BISId) ? (
										<a
											className="text-primary underline"
											href={`https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/${row.BISId}/edit?entry_ids%5B%5D=${row.BISId}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											{row.BISId}
										</a>
									) : null}
								</dd>
							</div>
							{[
								["FimaBisCase", "BIS lietas Nr."],
								["FimaMaterials", "Materiāli"],
								["FimaComments", "Komentāri"],
								["FimaReviewStatus", "Rīcība"],
							].map(([field, label]) => (
								<div key={field} className="min-w-0">
									<dt className="text-muted-foreground">{label}</dt>
									<dd>{cell(field, row)}</dd>
								</div>
							))}
						</dl>
					</article>
				))}
				{!rows.length ? <p>Atbilstoši ieraksti nav atrasti.</p> : null}
			</div>
			<FimaRecordPanel
				siteId={activeRow?.siteId ?? ""}
				row={activeRow}
				caseId={activeRow?.bisCaseId}
				caseNumber={activeRow?.bisCaseNumber}
				onClose={() => setSelected(null)}
				onRestoreFocus={() => trigger.current?.focus({ preventScroll: true })}
				onChange={onChange}
			/>
		</div>
	);
}
