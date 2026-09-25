"use client";

import { FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getDefaultConstructionForma2PositionCostDetails } from "@/flows/default-construction/backend/forma2-analytics-actions";
import { formatForma2PositionLabel } from "../lib/forma2-position-label";
import { DefaultConstructionForma2AssignmentSelect } from "./DefaultConstructionForma2AssignmentSelect";
import { DefaultConstructionForma2InvoicePreview } from "./DefaultConstructionForma2InvoicePreview";
import { DefaultConstructionForma2SplitEditor } from "./DefaultConstructionForma2SplitEditor";

type CostType = "work" | "material" | "total";
type CostDetails = Awaited<
	ReturnType<typeof getDefaultConstructionForma2PositionCostDetails>
>;

function formatCurrency(value: number, locale: string) {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

function formatNumber(value: number, locale: string) {
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
		value,
	);
}

function formatDate(value: string | null, locale: string) {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "—"
		: new Intl.DateTimeFormat(locale).format(date);
}

export function DefaultConstructionForma2CostBreakdown({
	siteId,
	positionId,
	costType,
	amount,
	organizationLanguage,
}: {
	siteId: string;
	positionId: string;
	costType: CostType;
	amount: number;
	organizationLanguage?: string | null;
}) {
	const router = useRouter();
	const isLatvian = String(organizationLanguage ?? "")
		.toLowerCase()
		.startsWith("lv");
	const locale = isLatvian ? "lv-LV" : "en-GB";
	const copy = isLatvian
		? {
				title: "Faktisko izmaksu detalizācija",
				description:
					"Ieraksti, kas veido izvēlētās Formas 2 pozīcijas faktiskās izmaksas.",
				calculatedTotal: "Aprēķinātā summa",
				openInvoice: "Atvērt rēķinu",
				invoice: "Rēķina Nr.",
				date: "Datums",
				record: "Ieraksts",
				assignedTo: "Piesaistīts pozīcijai",
				unit: "Mērv.",
				quantity: "Daudzums",
				cost: "Izmaksas",
				work: "Darbs",
				unpriced: "Nav aprēķināms",
				noRecords: "Šajā summā nav iekļautu ierakstu.",
				loadError: "Neizdevās ielādēt izmaksu detalizāciju.",
			}
		: {
				title: "Factual cost details",
				description:
					"Records included in the factual cost of the selected Forma 2 position.",
				calculatedTotal: "Calculated total",
				openInvoice: "Open invoice",
				invoice: "Invoice no.",
				date: "Date",
				record: "Record",
				assignedTo: "Assigned position",
				unit: "Unit",
				quantity: "Quantity",
				cost: "Cost",
				work: "Work",
				unpriced: "Not calculable",
				noRecords: "No records are included in this amount.",
				loadError: "Could not load the cost details.",
			};
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [details, setDetails] = useState<CostDetails | null>(null);
	const [invoice, setInvoice] = useState<{ url: string; title: string } | null>(
		null,
	);

	const showDetails = async () => {
		setOpen(true);
		if (loading) return;
		setLoading(true);
		try {
			setDetails(
				await getDefaultConstructionForma2PositionCostDetails({
					siteId,
					positionId,
					costType,
				}),
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : copy.loadError);
			setOpen(false);
		} finally {
			setLoading(false);
		}
	};
	const refreshAfterAssignment = async () => {
		await showDetails();
		router.refresh();
	};

	return (
		<>
			<Button
				type="button"
				variant="link"
				onClick={() => {
					setInvoice(null);
					void showDetails();
				}}
				className="h-auto min-w-0 p-0 text-inherit underline decoration-dotted underline-offset-4 hover:text-primary"
			>
				{formatCurrency(amount, locale)}
			</Button>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!saving) setOpen(next);
				}}
			>
				<DialogContent
					className={`flex max-h-[90dvh] w-[calc(100vw-3rem)] flex-col gap-0 overflow-hidden p-0 ${invoice ? "h-[88dvh] sm:max-w-[1600px]" : "sm:max-w-[1240px]"}`}
				>
					<DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
						<DialogTitle>{copy.title}</DialogTitle>
						<DialogDescription>
							{details
								? formatForma2PositionLabel(details.position)
								: copy.description}
						</DialogDescription>
					</DialogHeader>

					{loading ? (
						<div className="flex min-h-0 flex-1 items-center justify-center">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : details ? (
						<div
							className={`min-h-0 flex-1 overflow-y-auto ${invoice ? "grid xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:overflow-hidden" : ""}`}
						>
							<div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 pb-5">
								<div className="flex flex-wrap items-center justify-between gap-3 py-4">
									<div className="flex items-baseline gap-3">
										<span className="text-sm text-muted-foreground">
											{copy.calculatedTotal}
										</span>
										<span className="text-xl font-semibold tabular-nums">
											{formatCurrency(details.calculatedTotal, locale)}
										</span>
									</div>
								</div>
								<div className="overflow-x-auto rounded-lg border">
									<Table className="min-w-[820px] table-fixed text-xs">
										<colgroup>
											<col className="w-[88px]" />
											<col className="w-[144px]" />
											<col className="w-[20%]" />
											<col />
											<col className="w-[48px]" />
											<col className="w-[80px]" />
											<col className="w-[92px]" />
										</colgroup>
										<TableHeader>
											<TableRow>
												<TableHead>{copy.date}</TableHead>
												<TableHead>{copy.invoice}</TableHead>
												<TableHead>{copy.record}</TableHead>
												<TableHead>{copy.assignedTo}</TableHead>
												<TableHead>{copy.unit}</TableHead>
												<TableHead className="text-right">
													{copy.quantity}
												</TableHead>
												<TableHead className="text-right">
													{copy.cost}
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{details.records.map((record) => (
												<TableRow
													key={`${record.type}:${record.id}:${record.assignedPosition.id}`}
													className={
														invoice && record.invoiceUrl === invoice.url
															? "bg-primary/5"
															: undefined
													}
												>
													<TableCell className="whitespace-nowrap align-middle">
														{formatDate(record.date, locale)}
													</TableCell>
													<TableCell className="align-middle">
														{record.type === "material" && record.invoiceUrl ? (
															<Button
																type="button"
																variant="link"
																className="h-auto max-w-full min-w-0 justify-start gap-1.5 whitespace-nowrap p-0 text-left text-xs has-[>svg]:px-0"
																title={record.invoiceNumber || copy.openInvoice}
																aria-label={`${copy.openInvoice}: ${record.invoiceNumber || record.label}`}
																aria-pressed={
																	invoice?.url === record.invoiceUrl
																}
																onClick={() =>
																	setInvoice({
																		url: record.invoiceUrl as string,
																		title: record.invoiceNumber || record.label,
																	})
																}
															>
																<FileText className="size-4 shrink-0" />
																<span className="min-w-0 truncate">
																	{record.invoiceNumber || copy.openInvoice}
																</span>
															</Button>
														) : (
															<span
																className="block truncate"
																title={record.invoiceNumber || undefined}
															>
																{record.invoiceNumber || "—"}
															</span>
														)}
													</TableCell>
													<TableCell className="whitespace-normal align-middle">
														<div
															className="truncate font-medium"
															title={record.label}
														>
															{record.label}
														</div>
														{(
															record.type === "material"
																? record.supplierName
																: record.secondaryLabel
														) ? (
															<div className="mt-1 text-muted-foreground">
																{record.type === "material"
																	? record.supplierName
																	: record.secondaryLabel}
															</div>
														) : null}
														{record.type === "work" ? (
															<Badge variant="outline" className="mt-2">
																{copy.work}
															</Badge>
														) : null}
													</TableCell>
													<TableCell className="whitespace-normal align-middle">
														<div className="flex min-w-0 flex-nowrap items-center gap-2">
															{record.isSplit ? (
																<p
																	className="min-w-0 flex-1 truncate"
																	title={formatForma2PositionLabel(
																		record.assignedPosition,
																	)}
																>
																	{formatForma2PositionLabel(
																		record.assignedPosition,
																	)}
																</p>
															) : (
																<DefaultConstructionForma2AssignmentSelect
																	siteId={siteId}
																	sourceId={record.id}
																	sourceType={record.type}
																	value={record.assignedPosition.id}
																	options={details.positionOptions.filter(
																		(position) =>
																			record.type === "work"
																				? position.kind === "work"
																				: position.kind === "material" ||
																					(position.kind === "work" &&
																						!position.parentId),
																	)}
																	organizationLanguage={organizationLanguage}
																	overrideJournalPosition
																	singleLine
																	allowUnassigned={false}
																	disabled={saving}
																	onSavingChange={setSaving}
																	onAssigned={refreshAfterAssignment}
																/>
															)}
															{record.type === "material" ? (
																<div className="shrink-0">
																	<DefaultConstructionForma2SplitEditor
																		siteId={siteId}
																		sourceId={record.id}
																		isSplit={record.isSplit}
																		organizationLanguage={organizationLanguage}
																		disabled={saving}
																		onSaved={refreshAfterAssignment}
																	/>
																</div>
															) : null}
														</div>
													</TableCell>
													<TableCell className="whitespace-nowrap align-middle">
														{record.type === "work" &&
														record.costCalculationMode === "hourly"
															? "h"
															: record.unit || "—"}
													</TableCell>
													<TableCell className="whitespace-nowrap text-right align-middle tabular-nums">
														{(record.type === "work" &&
														record.costCalculationMode === "hourly"
															? record.hours
															: record.quantity) == null
															? "—"
															: formatNumber(
																	(record.type === "work" &&
																	record.costCalculationMode === "hourly"
																		? record.hours
																		: record.quantity) ?? 0,
																	locale,
																)}
													</TableCell>
													<TableCell className="whitespace-nowrap text-right align-middle font-medium tabular-nums">
														{record.actualCost == null
															? copy.unpriced
															: formatCurrency(record.actualCost, locale)}
													</TableCell>
												</TableRow>
											))}
											{details.records.length === 0 ? (
												<TableRow>
													<TableCell
														colSpan={7}
														className="py-12 text-center text-muted-foreground"
													>
														{copy.noRecords}
													</TableCell>
												</TableRow>
											) : null}
										</TableBody>
									</Table>
								</div>
							</div>
							{invoice ? (
								<DefaultConstructionForma2InvoicePreview
									key={invoice.url}
									url={invoice.url}
									title={invoice.title}
									isLatvian={isLatvian}
									onClose={() => setInvoice(null)}
								/>
							) : null}
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
