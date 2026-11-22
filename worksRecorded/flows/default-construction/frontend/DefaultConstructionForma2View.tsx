"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { Fragment, useId, useMemo, useState } from "react";
import { FimaBisState } from "@/components/sitediary/FimaBisState";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { getDefaultConstructionForma2Results } from "@/flows/default-construction/backend/forma2-analytics-actions";
import { DefaultConstructionForma2ActAssignments } from "@/flows/default-construction/frontend/DefaultConstructionForma2ActAssignments";
import { DefaultConstructionForma2ContractEditor } from "@/flows/default-construction/frontend/DefaultConstructionForma2ContractEditor";
import { DefaultConstructionForma2CostBreakdown } from "@/flows/default-construction/frontend/DefaultConstructionForma2CostBreakdown";
import { DefaultConstructionForma2Export } from "@/flows/default-construction/frontend/DefaultConstructionForma2Export";
import { DefaultConstructionForma2Import } from "@/flows/default-construction/frontend/DefaultConstructionForma2Import";
import { DefaultConstructionForma2QuantityBreakdown } from "@/flows/default-construction/frontend/DefaultConstructionForma2QuantityBreakdown";
import { DefaultConstructionForma2TableScroll } from "@/flows/default-construction/frontend/DefaultConstructionForma2TableScroll";
import {
	buildForma2AnalyticsView,
	calculateForma2MoneyTotals,
	type Forma2MappingRow,
	type Forma2MoneyTotals,
} from "@/flows/default-construction/lib/forma2-analytics";
import {
	getForma2AnalyticsCopy,
	getForma2AnalyticsLocale,
} from "@/flows/default-construction/lib/forma2-analytics-copy";
import { getFimaActStatusLabel } from "@/lib/fima/acceptance-acts";
import { getFimaBisRecordUrl } from "@/lib/fima/bis-record-links";
import { cn } from "@/lib/utils/utils";
import { formatForma2PositionLabel } from "../lib/forma2-position-label";
import {
	type Forma2DiaryDetails,
	getForma2QuantityDetails,
} from "../lib/forma2-results";
import { Forma2ClientCostsContext } from "./forma2-client-costs-context";

type Forma2Results = Awaited<
	ReturnType<typeof getDefaultConstructionForma2Results>
>;
type Forma2ResultRow = Forma2Results["resultRows"][number];
type Forma2AnalyticsCopy = ReturnType<typeof getForma2AnalyticsCopy>;
type PositionAct = NonNullable<Forma2Results["actCoverage"]>["acts"][number];
type ClientQuantities = {
	diary: Forma2DiaryDetails;
	mappingRows: Forma2MappingRow[];
};

function formatCurrency(value: number, locale: string) {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

function formatNumber(value: number | null, locale: string) {
	if (value == null) return "—";
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
		value,
	);
}

function actualCostClassName(actual: number, budget: number) {
	const actualCents = Math.round(actual * 100);
	if (actualCents === 0) return "text-gray-400 dark:text-gray-500";
	return actualCents > Math.round(budget * 100)
		? "text-red-600 dark:text-red-400"
		: "text-green-600 dark:text-green-400";
}

function Forma2PositionActs({
	acts,
	latvian,
	locale,
	onEdit,
}: {
	acts: PositionAct[];
	latvian: boolean;
	locale: string;
	onEdit: () => void;
}) {
	const numberFormat = new Intl.NumberFormat(locale, {
		maximumFractionDigits: 6,
	});
	return (
		<div className="space-y-2 px-4 py-3 text-sm">
			<div className="flex items-center justify-between gap-3">
				<span className="font-semibold">
					{latvian ? "BIS akti" : "BIS acts"}
				</span>
				<Button size="sm" variant="outline" onClick={onEdit}>
					{latvian ? "Mainīt piesaisti" : "Edit assignments"}
				</Button>
			</div>
			{acts.length ? (
				<div className="overflow-x-auto rounded-lg border bg-background">
					<table
						className="w-full min-w-xl text-left"
						aria-label={latvian ? "BIS akti" : "BIS acts"}
					>
						<thead className="border-b bg-muted/50 text-xs text-muted-foreground">
							<tr className="[&_th]:px-3 [&_th]:py-2 [&_th]:font-medium">
								<th scope="col" className="whitespace-nowrap">
									{latvian ? "Akta numurs" : "Act number"}
								</th>
								<th scope="col">
									{latvian ? "Akta apraksts" : "Act description"}
								</th>
								<th scope="col">{latvian ? "Mērvienības" : "Units"}</th>
								<th scope="col">{latvian ? "Apjomi" : "Amounts"}</th>
								<th scope="col">{latvian ? "Statuss" : "Status"}</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{acts.map((act) => (
								<Forma2PositionAct
									key={act.key}
									act={act}
									latvian={latvian}
									numberFormat={numberFormat}
								/>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="py-2 text-muted-foreground">
					{latvian
						? "Šai pozīcijai nav piesaistītu aktu."
						: "No acts are assigned to this position."}
				</p>
			)}
		</div>
	);
}

function Forma2PositionAct({
	act,
	latvian,
	numberFormat,
}: {
	act: PositionAct;
	latvian: boolean;
	numberFormat: Intl.NumberFormat;
}) {
	const works = act.workQuantities ?? [];
	const totals = new Map<string, number | null>();
	for (const { quantity, unit } of works) {
		if (!unit) continue;
		const total = totals.get(unit) ?? null;
		totals.set(unit, quantity === null ? total : (total ?? 0) + quantity);
	}
	const quantities = totals.size ? [...totals] : [["—", null] as const];
	return (
		<tr className="[&_td]:px-3 [&_td]:py-2 [&_td]:align-top">
			<td className="w-px">
				<a
					href={act.url}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-primary hover:underline"
				>
					{act.label}
					<ExternalLink className="size-3 shrink-0" aria-hidden="true" />
				</a>
			</td>
			<td className="break-words">{act.title || "—"}</td>
			<td className="w-px whitespace-nowrap">
				{quantities.map(([unit]) => (
					<div key={unit}>{unit}</div>
				))}
			</td>
			<td className="w-px whitespace-nowrap tabular-nums">
				{quantities.map(([unit, quantity]) => (
					<div key={unit} className="font-medium">
						{quantity === null ? "—" : numberFormat.format(quantity)}
					</div>
				))}
				{works.length ? (
					<Forma2ActWorkQuantities
						works={works}
						latvian={latvian}
						numberFormat={numberFormat}
					/>
				) : null}
			</td>
			<td className="w-px whitespace-nowrap">
				<FimaBisState
					singleLine
					status={act.status}
					language={latvian ? "lv" : "en"}
					label={
						["approved", "approving", "draft"].includes(act.status)
							? undefined
							: latvian
								? getFimaActStatusLabel(act.status)
								: act.status.replaceAll("_", " ")
					}
				/>
			</td>
		</tr>
	);
}

function Forma2ActWorkQuantities({
	works,
	latvian,
	numberFormat,
}: {
	works: PositionAct["workQuantities"];
	latvian: boolean;
	numberFormat: Intl.NumberFormat;
}) {
	const formatAmount = (quantity: number | null, unit: string | null) =>
		quantity === null
			? "—"
			: `${numberFormat.format(quantity)} ${unit ?? (latvian ? "(mērv. nav norādīta)" : "(unit unavailable)")}`;
	return (
		<details className="text-xs">
			<summary className="w-fit cursor-pointer py-0.5 text-muted-foreground hover:text-foreground">
				{latvian ? "Darbu apjomi" : "Work quantities"}
			</summary>
			<ul className="my-1 ml-2 w-fit space-y-1 border-l pl-3 tabular-nums">
				{works.map(({ id, number, quantity, unit }, index) => {
					const label = number
						? `BIS Nr. ${number}`
						: `${latvian ? "Darbs" : "Work"} ${index + 1}`;
					const url = getFimaBisRecordUrl(id);
					return (
						<li key={id} className="flex justify-between gap-4">
							{url ? (
								<a
									href={url}
									target="_blank"
									rel="noreferrer"
									className="text-primary hover:underline"
								>
									{label}
								</a>
							) : (
								label
							)}
							<span>{formatAmount(quantity, unit)}</span>
						</li>
					);
				})}
			</ul>
		</details>
	);
}

function Forma2TotalsRow({
	totals,
	t,
	locale,
}: {
	totals: Forma2MoneyTotals;
	t: Forma2AnalyticsCopy;
	locale: string;
}) {
	return (
		<TableRow className="border-y-2 bg-muted/80 hover:bg-muted/80">
			<TableCell colSpan={4} className="pl-4 font-bold">
				{t.total}
			</TableCell>
			<TableCell className="border-l px-1 text-right font-bold tabular-nums">
				{formatCurrency(totals.plannedWorkCost, locale)}
			</TableCell>
			<TableCell className="px-1 text-right font-bold tabular-nums">
				{formatCurrency(totals.plannedMaterialCost, locale)}
			</TableCell>
			<TableCell className="px-1 text-right font-bold tabular-nums">
				{formatCurrency(totals.plannedMechanismCost, locale)}
			</TableCell>
			<TableCell className="px-1 text-right font-bold tabular-nums">
				{formatCurrency(totals.plannedTotalCost, locale)}
			</TableCell>
			<TableCell
				className={cn(
					"border-l px-1 text-right font-bold tabular-nums",
					actualCostClassName(totals.actualWorkCost, totals.plannedWorkCost),
				)}
			>
				{formatCurrency(totals.actualWorkCost, locale)}
			</TableCell>
			<TableCell
				className={cn(
					"px-1 text-right font-bold tabular-nums",
					actualCostClassName(
						totals.actualMaterialCost,
						totals.plannedMaterialCost,
					),
				)}
			>
				{formatCurrency(totals.actualMaterialCost, locale)}
			</TableCell>
			<TableCell
				className={cn(
					"px-1 text-right font-bold tabular-nums",
					actualCostClassName(
						totals.actualMechanismCost,
						totals.plannedMechanismCost,
					),
				)}
			>
				{formatCurrency(totals.actualMechanismCost, locale)}
			</TableCell>
			<TableCell
				className={cn(
					"px-1 text-right font-bold tabular-nums",
					actualCostClassName(totals.actualTotalCost, totals.plannedTotalCost),
				)}
			>
				{formatCurrency(totals.actualTotalCost, locale)}
			</TableCell>
			<TableCell
				className={cn(
					"border-l px-1 pr-4 text-right font-bold tabular-nums",
					totals.variance < 0 && "text-red-600",
				)}
			>
				{formatCurrency(totals.variance, locale)}
			</TableCell>
		</TableRow>
	);
}

function Forma2ResultsView({
	siteId,
	rows,
	t,
	locale,
	organizationLanguage,
	demo,
	actCoverage,
	onOpenActs,
	getClientQuantityDetails,
}: {
	siteId: string;
	rows: Forma2ResultRow[];
	t: Forma2AnalyticsCopy;
	locale: string;
	organizationLanguage?: string | null;
	demo: boolean;
	actCoverage: Forma2Results["actCoverage"];
	onOpenActs: (positionId: string) => void;
	getClientQuantityDetails?: (
		row: Forma2ResultRow,
	) => ReturnType<typeof getForma2QuantityDetails>;
}) {
	const detailId = useId();
	const latvian = locale.startsWith("lv");
	const [expandedPositions, setExpandedPositions] = useState<
		ReadonlySet<string>
	>(new Set());
	const actsByPosition = useMemo(() => {
		const grouped = new Map<string, PositionAct[]>();
		for (const act of actCoverage?.acts ?? []) {
			if (!act.positionId) continue;
			const acts = grouped.get(act.positionId) ?? [];
			acts.push(act);
			grouped.set(act.positionId, acts);
		}
		return grouped;
	}, [actCoverage]);
	const togglePosition = (id: string) =>
		setExpandedPositions((previous) => {
			const next = new Set(previous);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	if (!rows.length) {
		return (
			<div className="border-y px-6 py-12 text-center text-sm text-muted-foreground">
				{t.noDocument}
			</div>
		);
	}
	const totals = calculateForma2MoneyTotals(rows);

	return (
		<DefaultConstructionForma2TableScroll
			label={t.horizontalScroll}
			className="border-y"
		>
			<table className="w-full min-w-[1480px] table-fixed caption-bottom text-[10px] xl:text-[11px]">
				<colgroup>
					<col style={{ width: "calc(25% - 48px)" }} />
					<col style={{ width: 48 }} />
					<col className="w-[6%]" />
					<col className="w-[6%]" />
					<col className="w-[7%]" />
					<col className="w-[7%]" />
					<col className="w-[7%]" />
					<col className="w-[7%]" />
					<col className="w-[7%]" />
					<col className="w-[7%]" />
					<col className="w-[7%]" />
					<col className="w-[7%]" />
					<col className="w-[7%]" />
				</colgroup>
				<TableHeader>
					<TableRow>
						<TableHead
							rowSpan={2}
							className="h-auto whitespace-normal py-2 pl-4 leading-tight"
						>
							{t.codeAndName}
						</TableHead>
						<TableHead
							rowSpan={2}
							className="h-auto whitespace-normal px-1 py-2 leading-tight"
						>
							{t.unit}
						</TableHead>
						<TableHead
							rowSpan={2}
							className="h-auto whitespace-normal px-1 py-2 text-right leading-tight"
						>
							{t.contractQuantity}
						</TableHead>
						<TableHead
							rowSpan={2}
							className="h-auto whitespace-normal px-1 py-2 text-right leading-tight"
						>
							{t.actualQuantity}
						</TableHead>
						<TableHead
							colSpan={4}
							className="h-auto border-l py-2 text-center leading-tight"
						>
							{t.planned}
						</TableHead>
						<TableHead
							colSpan={4}
							className="h-auto border-l py-2 text-center leading-tight"
						>
							{t.factual}
						</TableHead>
						<TableHead
							rowSpan={2}
							className="h-auto whitespace-normal border-l px-1 py-2 pr-4 text-right leading-tight"
						>
							{t.remaining}
						</TableHead>
					</TableRow>
					<TableRow>
						<TableHead className="h-auto whitespace-normal border-l px-1 py-2 text-right leading-tight">
							{t.work}
						</TableHead>
						<TableHead className="h-auto whitespace-normal px-1 py-2 text-right leading-tight">
							{t.material}
						</TableHead>
						<TableHead className="h-auto whitespace-normal px-1 py-2 text-right leading-tight">
							{t.mechanism}
						</TableHead>
						<TableHead className="h-auto whitespace-normal px-1 py-2 text-right leading-tight">
							{t.plannedTotal}
						</TableHead>
						<TableHead className="h-auto whitespace-normal border-l px-1 py-2 text-right leading-tight">
							{t.work}
						</TableHead>
						<TableHead className="h-auto whitespace-normal px-1 py-2 text-right leading-tight">
							{t.material}
						</TableHead>
						<TableHead className="h-auto whitespace-normal px-1 py-2 text-right leading-tight">
							{t.mechanism}
						</TableHead>
						<TableHead className="h-auto whitespace-normal px-1 py-2 text-right leading-tight">
							{t.actualTotal}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<Forma2TotalsRow totals={totals} t={t} locale={locale} />
					{rows.map((row, index) => {
						const previous = rows[index - 1];
						const showCategory =
							!previous || previous.categoryCode !== row.categoryCode;
						const canExpand = Boolean(actCoverage && row.kind === "work");
						const expanded = canExpand && expandedPositions.has(row.id);
						const rowDetailId = `${detailId}-${index}`;
						const positionLabel =
							row.name.trim() === row.code.trim()
								? row.name
								: formatForma2PositionLabel(row);
						return (
							<Fragment key={row.id}>
								{showCategory && (row.categoryCode || row.categoryName) ? (
									<TableRow className="bg-muted/60">
										<TableCell
											colSpan={13}
											className="whitespace-normal pl-4 font-semibold"
										>
											{[row.categoryCode, row.categoryName]
												.filter(Boolean)
												.join(" ")}
										</TableCell>
									</TableRow>
								) : null}
								<TableRow
									className={cn(
										canExpand && "cursor-pointer",
										expanded && "bg-muted/40",
									)}
									onClick={
										canExpand
											? (event) => {
													if (
														event.target instanceof Element &&
														event.target.closest(
															"a,button,input,select,textarea,[role='button']",
														)
													)
														return;
													togglePosition(row.id);
												}
											: undefined
									}
								>
									<TableCell
										className={cn(
											"whitespace-normal break-words py-2 pl-4 leading-snug",
											row.parentId ? "text-muted-foreground" : "font-medium",
										)}
									>
										<div className="flex items-start justify-between gap-2">
											<div className={row.parentId ? "pl-3" : ""}>
												{row.parentId ? "↳ " : ""}
												{canExpand ? (
													<button
														type="button"
														className="inline-flex items-center gap-1.5 text-left hover:underline"
														aria-expanded={expanded}
														aria-controls={expanded ? rowDetailId : undefined}
														onClick={() => togglePosition(row.id)}
													>
														<ChevronDown
															className={cn(
																"size-3.5 shrink-0 transition-transform",
																!expanded && "-rotate-90",
															)}
															aria-hidden="true"
														/>
														{positionLabel}
													</button>
												) : (
													positionLabel
												)}
											</div>
											{!demo ? (
												<DefaultConstructionForma2ContractEditor
													siteId={siteId}
													row={row}
													organizationLanguage={organizationLanguage}
												/>
											) : null}
										</div>
									</TableCell>
									<TableCell className="whitespace-normal px-1">
										{row.unit || "—"}
									</TableCell>
									<TableCell className="px-1 text-right tabular-nums">
										{formatNumber(row.plannedQuantity, locale)}
									</TableCell>
									<TableCell className="px-1 text-right tabular-nums">
										<DefaultConstructionForma2QuantityBreakdown
											siteId={siteId}
											positionId={row.id}
											amount={row.actualQuantity}
											contractQuantity={row.plannedQuantity}
											organizationLanguage={organizationLanguage}
											getClientDetails={
												getClientQuantityDetails
													? () => getClientQuantityDetails(row)
													: undefined
											}
										/>
										{row.excludedQuantityRecords > 0 ? (
											<div className="mt-1 whitespace-normal text-[10px] leading-tight text-muted-foreground">
												{t.quantityExcluded.replace(
													"{count}",
													String(row.excludedQuantityRecords),
												)}
											</div>
										) : null}
									</TableCell>
									<TableCell className="border-l px-1 text-right tabular-nums">
										{formatCurrency(row.plannedWorkCost, locale)}
									</TableCell>
									<TableCell className="px-1 text-right tabular-nums">
										{formatCurrency(row.plannedMaterialCost, locale)}
									</TableCell>
									<TableCell className="px-1 text-right tabular-nums">
										{formatCurrency(row.plannedMechanismCost, locale)}
									</TableCell>
									<TableCell className="px-1 text-right font-medium tabular-nums">
										{formatCurrency(row.plannedTotalCost, locale)}
									</TableCell>
									<TableCell
										className={cn(
											"border-l px-1 text-right tabular-nums [&_button:hover]:text-inherit",
											actualCostClassName(
												row.actualWorkCost,
												row.plannedWorkCost,
											),
										)}
									>
										{demo ? (
											formatCurrency(row.actualWorkCost, locale)
										) : (
											<DefaultConstructionForma2CostBreakdown
												siteId={siteId}
												positionId={row.id}
												costType="work"
												localDetails={Boolean(getClientQuantityDetails)}
												amount={row.actualWorkCost}
												organizationLanguage={organizationLanguage}
											/>
										)}
									</TableCell>
									<TableCell
										className={cn(
											"px-1 text-right tabular-nums [&_button:hover]:text-inherit",
											actualCostClassName(
												row.actualMaterialCost,
												row.plannedMaterialCost,
											),
										)}
									>
										{demo ? (
											formatCurrency(row.actualMaterialCost, locale)
										) : (
											<DefaultConstructionForma2CostBreakdown
												siteId={siteId}
												positionId={row.id}
												costType="material"
												localDetails={Boolean(getClientQuantityDetails)}
												amount={row.actualMaterialCost}
												organizationLanguage={organizationLanguage}
											/>
										)}
									</TableCell>
									<TableCell
										className={cn(
											"px-1 text-right tabular-nums",
											actualCostClassName(
												row.actualMechanismCost,
												row.plannedMechanismCost,
											),
										)}
									>
										{formatCurrency(row.actualMechanismCost, locale)}
									</TableCell>
									<TableCell
										className={cn(
											"px-1 text-right font-medium tabular-nums [&_button:hover]:text-inherit",
											actualCostClassName(
												row.actualTotalCost,
												row.plannedTotalCost,
											),
										)}
									>
										{demo ? (
											formatCurrency(row.actualTotalCost, locale)
										) : (
											<DefaultConstructionForma2CostBreakdown
												siteId={siteId}
												positionId={row.id}
												costType="total"
												localDetails={Boolean(getClientQuantityDetails)}
												amount={row.actualTotalCost}
												organizationLanguage={organizationLanguage}
											/>
										)}
									</TableCell>
									<TableCell
										className={cn(
											"border-l px-1 pr-4 text-right font-medium tabular-nums",
											row.variance < 0 && "text-red-600",
										)}
									>
										{formatCurrency(row.variance, locale)}
									</TableCell>
								</TableRow>
								{expanded ? (
									<TableRow id={rowDetailId} className="bg-muted/40">
										<TableCell colSpan={13} className="whitespace-normal p-0">
											<Forma2PositionActs
												acts={actsByPosition.get(row.id) ?? []}
												latvian={latvian}
												locale={locale}
												onEdit={() => onOpenActs(row.id)}
											/>
										</TableCell>
									</TableRow>
								) : null}
							</Fragment>
						);
					})}
					<Forma2TotalsRow totals={totals} t={t} locale={locale} />
				</TableBody>
			</table>
		</DefaultConstructionForma2TableScroll>
	);
}

export function DefaultConstructionForma2View({
	siteId,
	data,
	organizationLanguage,
	clientQuantities,
	onActAssignmentsSaved,
}: {
	siteId: string;
	data: Forma2Results;
	organizationLanguage: string | null;
	clientQuantities?: ClientQuantities;
	onActAssignmentsSaved?: React.ComponentProps<
		typeof DefaultConstructionForma2ActAssignments
	>["onSaved"];
}) {
	const t = getForma2AnalyticsCopy(organizationLanguage);
	const locale = getForma2AnalyticsLocale(organizationLanguage);
	const latvian = locale.startsWith("lv");
	const [actPosition, setActPosition] = useState<string | null>(null);
	const rows = useMemo(
		() =>
			data.clientCosts && !data.isDemo && !clientQuantities
				? buildForma2AnalyticsView({
						...data.clientCosts,
						includeSuggestions: false,
					}).resultRows
				: data.resultRows,
		[data.clientCosts, data.isDemo, data.resultRows, clientQuantities],
	);
	const totals = calculateForma2MoneyTotals(rows);

	return (
		<Forma2ClientCostsContext.Provider value={data.clientCosts ?? null}>
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
					<p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
				</div>

				{data.isDemo ? (
					<p className="rounded-md border bg-muted/50 px-4 py-3 text-sm">
						{data.siteName} ·{" "}
						{latvian
							? "Demonstrācijas tāme. Pozīcijas, līguma apjomi un izmaksas ir piemēri. Izpilde un BIS akti ir no projekta."
							: "Demo estimate. Positions, contract quantities and costs are examples. Execution and BIS acts come from the project."}
					</p>
				) : null}
				<DefaultConstructionForma2Import
					siteId={siteId}
					organizationLanguage={organizationLanguage}
					document={data.isDemo ? null : data.document}
				/>

				<Card>
					<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<CardTitle>{t.results}</CardTitle>
							<p className="mt-2 text-sm font-medium tabular-nums">
								{locale.startsWith("lv")
									? "Darba izmaksas kopā"
									: "Total labour cost"}
								: {formatCurrency(totals.actualWorkCost, locale)}
							</p>
							<CardDescription>
								{t.resultsDescription}{" "}
								{data.quantitySource === "drawing"
									? locale.startsWith("lv")
										? "Faktiskie daudzumi aprēķināti no pašreizējām rasējuma zonām, ievērojot lapas mērogu."
										: "Factual quantities are measured from the current drawing zones at the page scale."
									: t.quantitySource}
							</CardDescription>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{data.actCoverage ? (
								<Button
									type="button"
									variant="outline"
									onClick={() => setActPosition("")}
								>
									{latvian ? "BIS aktu piesaiste" : "BIS act assignments"}
								</Button>
							) : null}
							{!data.isDemo ? (
								<DefaultConstructionForma2Export
									siteName={data.siteName}
									document={data.document}
									rows={rows}
									organizationLanguage={organizationLanguage}
								/>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="px-0">
						<Forma2ResultsView
							siteId={siteId}
							rows={rows}
							t={t}
							locale={locale}
							organizationLanguage={organizationLanguage}
							demo={Boolean(data.isDemo)}
							actCoverage={data.actCoverage}
							onOpenActs={setActPosition}
							getClientQuantityDetails={
								clientQuantities
									? (row) =>
											getForma2QuantityDetails(
												row,
												clientQuantities.mappingRows,
												clientQuantities.diary,
												data.quantitySource === "drawing",
											)
									: undefined
							}
						/>
					</CardContent>
				</Card>
				{data.actCoverage && actPosition !== null ? (
					<DefaultConstructionForma2ActAssignments
						coverage={data.actCoverage}
						positions={rows}
						siteId={siteId}
						filterPositionId={actPosition}
						latvian={latvian}
						onClose={() => setActPosition(null)}
						onSaved={onActAssignmentsSaved}
					/>
				) : null}
			</div>
		</Forma2ClientCostsContext.Provider>
	);
}
