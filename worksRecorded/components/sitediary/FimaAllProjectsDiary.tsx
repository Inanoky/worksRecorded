"use client";

import { Ellipsis, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { FimaRecordActCoverage } from "@/lib/fima/acceptance-acts";
import {
	type FimaBisRecordLink,
	getFimaBisRecordUrl,
} from "@/lib/fima/bis-record-links";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { mergeFimaCollaboration } from "@/lib/fima/diary-list-summary";
import {
	fimaDiaryColumns,
	fimaDiaryColumnWeights,
	fimaDiaryTableClassName,
	groupFimaDiaryRows,
} from "@/lib/fima/diary-table";
import type { FimaExampleSources } from "@/lib/fima/example-sources";
import type { FimaInlineField } from "@/lib/fima/inline-fields";
import { isFimaInlineField } from "@/lib/fima/inline-fields";
import { cn } from "@/lib/utils/utils";
import { FimaBisState } from "./FimaBisState";
import { FimaDiaryCell } from "./FimaDiaryCell";
import { FimaInlineCell } from "./FimaInlineCell";
import { FimaMaterialRefresh } from "./FimaMaterialRefresh";
import { FimaOpenRecordButton } from "./FimaOpenRecordButton";
import { FimaRecordPanel } from "./FimaRecordPanel";
import { OriginalSourceContent } from "./OriginalSourceContent";

export type FimaAllProjectsRecordRow = {
	id: string;
	fimaNumber?: number | null;
	siteId: string | null;
	Date: Date | string | null;
	Works: string | null;
	Works_Custom_1?: string | null;
	Works_Custom_2?: string | null;
	Location: string | null;
	Amounts: number | null;
	Units: string | null;
	BISId?: string | null;
	bisStatus?: string | null;
	originalUserComment?: string | null;
	originalAudioUrl?: string | null;
	bisCaseId?: string | null;
	bisCaseNumber?: string | null;
	hasFimaBisReferences?: boolean;
	fimaCollaboration?: FimaCollaboration;
	fimaExampleSources?: FimaExampleSources;
	fimaBisRecords?: FimaBisRecordLink[];
	fimaActCoverage?: FimaRecordActCoverage;
	Site: { name: string } | null;
};
type RecordRow = FimaAllProjectsRecordRow;

const dataColumns = fimaDiaryColumns.filter(
	({ field }) => field !== "FimaReviewStatus" && field !== "FimaConfidence",
);
export function FimaAllProjectsDiary({
	records,
	onRecordsChanged,
}: {
	records: RecordRow[];
	onRecordsChanged?: () => void;
}) {
	const [fieldUpdates, setFieldUpdates] = useState<
		Record<string, Partial<RecordRow>>
	>({});
	useEffect(() => {
		setFieldUpdates((current) =>
			Object.fromEntries(
				Object.entries(current).filter(
					([id]) => !records.some((row) => row.id === id),
				),
			),
		);
	}, [records]);
	const onFieldSaved = useCallback(
		(id: string, field: FimaInlineField, value: string | number | null) => {
			onRecordsChanged?.();
			setFieldUpdates((current) => ({
				...current,
				[id]: { ...current[id], [field]: value },
			}));
		},
		[onRecordsChanged],
	);
	const [updates, setUpdates] = useState<Record<string, FimaCollaboration>>({});
	const [checkedIds, setCheckedIds] = useState(new Set<string>());
	const [selected, setSelected] = useState<RecordRow | null>(null);
	const trigger = useRef<HTMLElement | null>(null);
	const latestRecords = useRef(records);
	latestRecords.current = records;
	const latestUpdates = useRef(updates);
	latestUpdates.current = updates;
	const onChange = useCallback(
		(id: string, state: FimaCollaboration) => {
			const previous =
				latestUpdates.current[id] ??
				latestRecords.current.find((row) => row.id === id)?.fimaCollaboration;
			if (
				state.version > (previous?.version ?? 0) ||
				(state.bisMaterials?.fetchedAt ?? "") >
					(previous?.bisMaterials?.fetchedAt ?? "")
			)
				onRecordsChanged?.();
			setUpdates((previous) => {
				const current = previous[id];
				if (current && current.version > state.version) return previous;
				return {
					...previous,
					[id]: mergeFimaCollaboration(current, state),
				};
			});
		},
		[onRecordsChanged],
	);
	const rows = records.map((row) => ({
		...row,
		...fieldUpdates[row.id],
		fimaCollaboration: row.fimaCollaboration
			? mergeFimaCollaboration(updates[row.id], row.fimaCollaboration)
			: updates[row.id],
	}));
	const activeRow =
		rows.find((row) => row.id === selected?.id) ??
		(selected
			? {
					...selected,
					...fieldUpdates[selected.id],
					fimaCollaboration: updates[selected.id] ?? selected.fimaCollaboration,
				}
			: null);
	const openRecord = (row: RecordRow, target?: HTMLElement) => {
		if (!row.siteId) return;
		trigger.current =
			target ??
			(document.activeElement instanceof HTMLElement
				? document.activeElement
				: null);
		setSelected(row);
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

	const groups = groupFimaDiaryRows(rows);
	const bisEnabled = rows.some(
		(row) => row.bisCaseId || row.BISId || row.hasFimaBisReferences,
	);
	const columns = [
		{ field: "select", label: "" },
		{ field: "project", label: "Projekts" },
		...dataColumns,
		...(bisEnabled ? [{ field: "bis", label: "Statuss" }] : []),
		{ field: "action", label: "Darbība" },
		{ field: "source", label: "Avots" },
		{ field: "FimaReviewStatus", label: "Rīcība" },
		{ field: "FimaConfidence", label: "Confidence" },
	];
	const totalWidth = columns.reduce(
		(sum, column) => sum + fimaDiaryColumnWeights[column.field],
		0,
	);
	const toggleRows = (ids: string[], checked: boolean) =>
		setCheckedIds((previous) => {
			const next = new Set(previous);
			for (const id of ids) {
				if (checked) next.add(id);
				else next.delete(id);
			}
			return next;
		});
	const renderSource = (row: RecordRow) =>
		row.originalUserComment || row.originalAudioUrl ? (
			<Popover>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-label="Rādīt ieraksta avotu"
						className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-600 text-sm font-bold text-blue-600 hover:bg-blue-50"
					>
						?
					</button>
				</PopoverTrigger>
				<PopoverContent className="max-h-80 w-80 overflow-auto text-xs">
					<OriginalSourceContent
						originalUserComment={row.originalUserComment}
						originalAudioUrl={row.originalAudioUrl}
					/>
				</PopoverContent>
			</Popover>
		) : (
			"—"
		);
	const renderActions = (row: RecordRow) => (
		<div className="flex flex-col items-center gap-1">
			<FimaOpenRecordButton
				disabled={!row.siteId}
				onOpen={(target) => openRecord(row, target)}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						aria-label="Ieraksta darbības"
						size="icon"
						variant="ghost"
						className="h-8 w-8"
						disabled={!row.siteId}
					>
						<Ellipsis className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => openRecord(row)}>
						Atvērt ierakstu
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href={`/dashboard/sites/${row.siteId}/dashboard`}>
							Atvērt projekta žurnālu
						</Link>
					</DropdownMenuItem>
					{(
						row.fimaBisRecords ??
						(row.BISId ? [{ id: row.BISId, number: null }] : [])
					).map((link) => (
						<DropdownMenuItem
							asChild
							key={`${link.type ?? "performed_work"}:${link.id}`}
						>
							<a
								href={getFimaBisRecordUrl(link.id, link.type) ?? undefined}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink className="mr-2 h-3.5 w-3.5" />
								Atvērt BIS{link.number ? ` ${link.number}` : ""}
							</a>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
	const renderField = (field: string, row: RecordRow) =>
		isFimaInlineField(field) ? inline(field, row) : cell(field, row);
	return (
		<div className="min-w-0 select-text">
			<FimaMaterialRefresh
				records={rows}
				onChange={onChange}
				autoRefresh={false}
			/>
			{checkedIds.size ? (
				<div className="mb-3 flex items-center gap-3 text-sm">
					<span>Atlasīti: {checkedIds.size}</span>
					<Button
						size="sm"
						variant="outline"
						onClick={() => setCheckedIds(new Set())}
					>
						Notīrīt atlasi
					</Button>
				</div>
			) : null}
			<div className="rounded-md border bg-background">
				<div className="space-y-3 p-2 sm:p-3">
					{groups.map((group) => {
						const allChecked = group.rows.every((row) =>
							checkedIds.has(row.id),
						);
						const someChecked = group.rows.some((row) =>
							checkedIds.has(row.id),
						);
						return (
							<section
								key={group.key}
								aria-label={group.label}
								className="rounded-xl border bg-card p-3 sm:p-4"
							>
								<header className="mb-4 space-y-1">
									<h2 className="text-sm font-semibold">{group.label}</h2>
									<p className="text-xs text-muted-foreground">
										{group.rows.length}{" "}
										{group.rows.length === 1 ? "uzdevums" : "uzdevumi"}
									</p>
								</header>
								<div className="hidden min-w-0 xl:block">
									<Table className={fimaDiaryTableClassName}>
										<colgroup>
											{columns.map(({ field }) => (
												<col
													key={field}
													style={{
														width: `${(fimaDiaryColumnWeights[field] / totalWidth) * 100}%`,
													}}
												/>
											))}
										</colgroup>
										<TableHeader>
											<TableRow>
												{columns.map(({ field, label }) => (
													<TableHead
														key={field}
														className={cn(
															["select", "bis", "action", "source"].includes(
																field,
															)
																? "text-center"
																: "text-left",
														)}
													>
														{field === "select" ? (
															<Checkbox
																checked={
																	allChecked
																		? true
																		: someChecked
																			? "indeterminate"
																			: false
																}
																onCheckedChange={(value) =>
																	toggleRows(
																		group.rows.map((row) => row.id),
																		value === true,
																	)
																}
																aria-label={`Atlasīt visus ierakstus: ${group.label}`}
															/>
														) : (
															label
														)}
													</TableHead>
												))}
											</TableRow>
										</TableHeader>
										<TableBody>
											{group.rows.map((row) => (
												<TableRow
													key={row.id}
													data-fima-active={
														selected?.id === row.id ? "true" : undefined
													}
													className="data-[fima-active=true]:bg-red-50/60 dark:data-[fima-active=true]:bg-red-950/30"
												>
													<TableCell className="text-center">
														<Checkbox
															checked={checkedIds.has(row.id)}
															onCheckedChange={(value) =>
																toggleRows([row.id], value === true)
															}
															aria-label={`Atlasīt ierakstu ${row.id}`}
														/>
													</TableCell>
													<TableCell>
														{row.siteId ? (
															<Link
																className="text-primary underline underline-offset-2"
																href={`/dashboard/sites/${row.siteId}/dashboard`}
															>
																{row.Site?.name ?? "—"}
															</Link>
														) : (
															(row.Site?.name ?? "—")
														)}
													</TableCell>
													{dataColumns.map(({ field }) => (
														<TableCell
															key={field}
															className={cn(
																field === "Date" && "tabular-nums",
																field === "Works" && "font-medium",
															)}
														>
															{renderField(field, row)}
														</TableCell>
													))}
													{bisEnabled ? (
														<TableCell className="text-center">
															<FimaBisState status={row.bisStatus} />
														</TableCell>
													) : null}
													<TableCell className="text-center">
														{renderActions(row)}
													</TableCell>
													<TableCell className="text-center">
														{renderSource(row)}
													</TableCell>
													<TableCell>{cell("FimaReviewStatus", row)}</TableCell>
													<TableCell>{cell("FimaConfidence", row)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
								<div className="space-y-2 xl:hidden">
									{group.rows.map((row) => (
										<article key={row.id} className="rounded-lg border p-4">
											<div className="mb-3 flex items-center justify-between gap-2">
												<div className="flex min-w-0 items-center gap-2">
													<Checkbox
														checked={checkedIds.has(row.id)}
														onCheckedChange={(value) =>
															toggleRows([row.id], value === true)
														}
														aria-label={`Atlasīt ierakstu ${row.id}`}
													/>
													{row.siteId ? (
														<Link
															className="text-sm text-primary underline"
															href={`/dashboard/sites/${row.siteId}/dashboard`}
														>
															{row.Site?.name}
														</Link>
													) : (
														row.Site?.name
													)}
												</div>
												{renderActions(row)}
											</div>
											<dl className="grid grid-cols-2 gap-3 text-xs">
												{fimaDiaryColumns.map(({ field, label }) => (
													<div
														key={field}
														className={cn(
															"min-w-0",
															[
																"Works",
																"Works_Custom_1",
																"FimaMaterials",
																"FimaExamples",
																"FimaComments",
																"FimaReviewStatus",
															].includes(field) && "col-span-2",
														)}
													>
														<dt className="mb-1 text-muted-foreground">
															{label}
														</dt>
														<dd>{renderField(field, row)}</dd>
													</div>
												))}
											</dl>
											<div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
												{bisEnabled ? (
													<FimaBisState status={row.bisStatus} />
												) : (
													<span />
												)}
												{renderSource(row)}
											</div>
										</article>
									))}
								</div>
							</section>
						);
					})}
					{!groups.length ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							Atbilstoši ieraksti nav atrasti.
						</p>
					) : null}
				</div>
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
