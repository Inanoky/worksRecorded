"use client";

import { Loader2 } from "lucide-react";
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
				includedRecords: "Iekļautie ieraksti",
				unpricedRecords: "Bez aprēķināmām izmaksām",
				workRule:
					"Darbu izmaksas = Būvdarbu žurnālā norādītās stundas × darba stundas likme no “Pārvaldīt opcijas”.",
				materialRule:
					"Materiālu izmaksas = Noliktavā saglabātā rēķina pozīcijas kopējā summa. Daudzums un mērvienība ir informatīvi; mērvienību konvertēšana netiek veikta.",
				date: "Datums",
				record: "Ieraksts",
				assignedTo: "Piesaistīts pozīcijai",
				calculation: "Aprēķins",
				assignment: "Piesaiste",
				cost: "Izmaksas",
				work: "Darbs",
				material: "Materiāls",
				manual: "Manuāla",
				automatic: "Automātiska",
				rule: "Noteikums",
				invoiceTotal: "Rēķina pozīcijas summa",
				missingRate: "Trūkst stundu vai stundas likmes",
				unpriced: "Nav aprēķināms",
				noRecords: "Šajā summā nav iekļautu ierakstu.",
				loadError: "Neizdevās ielādēt izmaksu detalizāciju.",
			}
		: {
				title: "Factual cost details",
				description:
					"Records included in the factual cost of the selected Forma 2 position.",
				calculatedTotal: "Calculated total",
				includedRecords: "Included records",
				unpricedRecords: "Without calculable cost",
				workRule:
					"Work cost = hours recorded in the Site Diary × the hourly rate configured in Manage options.",
				materialRule:
					"Material cost = the invoice-line total stored in Warehouse. Quantity and unit are shown for traceability; units are not converted.",
				date: "Date",
				record: "Record",
				assignedTo: "Assigned position",
				calculation: "Calculation",
				assignment: "Assignment",
				cost: "Cost",
				work: "Work",
				material: "Material",
				manual: "Manual",
				automatic: "Automatic",
				rule: "Rule",
				invoiceTotal: "Invoice-line total",
				missingRate: "Hours or hourly rate unavailable",
				unpriced: "Not calculable",
				noRecords: "No records are included in this amount.",
				loadError: "Could not load the cost details.",
			};
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [details, setDetails] = useState<CostDetails | null>(null);

	const showDetails = async () => {
		setOpen(true);
		if (details || loading) return;
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

	return (
		<>
			<Button
				type="button"
				variant="link"
				onClick={showDetails}
				className="h-auto min-w-0 p-0 text-inherit underline decoration-dotted underline-offset-4 hover:text-primary"
			>
				{formatCurrency(amount, locale)}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex h-[90dvh] max-h-[900px] flex-col overflow-hidden p-0 sm:max-w-5xl">
					<DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
						<DialogTitle>{copy.title}</DialogTitle>
						<DialogDescription>
							{details
								? `${details.position.code ? `${details.position.code} ` : ""}${details.position.name}`
								: copy.description}
						</DialogDescription>
					</DialogHeader>

					{loading ? (
						<div className="flex min-h-0 flex-1 items-center justify-center">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : details ? (
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 [scrollbar-gutter:stable]">
							<div className="grid gap-3 py-5 sm:grid-cols-3">
								<div className="rounded-lg border p-3">
									<div className="text-xs text-muted-foreground">
										{copy.calculatedTotal}
									</div>
									<div className="mt-1 text-xl font-semibold tabular-nums">
										{formatCurrency(details.calculatedTotal, locale)}
									</div>
								</div>
								<div className="rounded-lg border p-3">
									<div className="text-xs text-muted-foreground">
										{copy.includedRecords}
									</div>
									<div className="mt-1 text-xl font-semibold tabular-nums">
										{details.assignedRecords}
									</div>
								</div>
								<div className="rounded-lg border p-3">
									<div className="text-xs text-muted-foreground">
										{copy.unpricedRecords}
									</div>
									<div className="mt-1 text-xl font-semibold tabular-nums">
										{details.unpricedRecords}
									</div>
								</div>
							</div>

							<div className="mb-4 space-y-1 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
								{costType !== "material" ? <p>{copy.workRule}</p> : null}
								{costType !== "work" ? <p>{copy.materialRule}</p> : null}
							</div>

							<div className="overflow-x-auto rounded-lg border">
								<Table className="min-w-[920px] text-xs">
									<TableHeader>
										<TableRow>
											<TableHead>{copy.date}</TableHead>
											<TableHead>{copy.record}</TableHead>
											<TableHead>{copy.assignedTo}</TableHead>
											<TableHead>{copy.calculation}</TableHead>
											<TableHead>{copy.assignment}</TableHead>
											<TableHead className="text-right">{copy.cost}</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{details.records.map((record) => (
											<TableRow key={`${record.type}:${record.id}`}>
												<TableCell className="whitespace-nowrap align-top">
													{formatDate(record.date, locale)}
												</TableCell>
												<TableCell className="max-w-64 whitespace-normal align-top">
													<div className="font-medium">{record.label}</div>
													<div className="mt-1 text-muted-foreground">
														{record.secondaryLabel || "—"}
													</div>
													<Badge variant="outline" className="mt-2">
														{record.type === "work" ? copy.work : copy.material}
													</Badge>
												</TableCell>
												<TableCell className="max-w-56 whitespace-normal align-top">
													{record.assignedPosition.code
														? `${record.assignedPosition.code} `
														: ""}
													{record.assignedPosition.name}
												</TableCell>
												<TableCell className="whitespace-normal align-top">
													{record.type === "work" ? (
														record.hours != null &&
														record.hourlyRate != null ? (
															<>
																{formatNumber(record.hours, locale)} h ×{" "}
																{formatCurrency(record.hourlyRate, locale)}/h
															</>
														) : (
															copy.missingRate
														)
													) : (
														<>
															{record.quantity != null
																? `${formatNumber(record.quantity, locale)} ${record.unit}`
																: "—"}
															<div className="text-muted-foreground">
																{copy.invoiceTotal}
															</div>
														</>
													)}
												</TableCell>
												<TableCell className="align-top">
													<Badge variant="secondary">
														{record.assignmentMethod === "manual"
															? copy.manual
															: record.assignmentMethod === "rule"
																? copy.rule
																: copy.automatic}
													</Badge>
													{record.assignmentConfidence != null ? (
														<div className="mt-1 text-muted-foreground">
															{Math.round(record.assignmentConfidence * 100)}%
														</div>
													) : null}
												</TableCell>
												<TableCell className="whitespace-nowrap text-right align-top font-medium tabular-nums">
													{record.actualCost == null
														? copy.unpriced
														: formatCurrency(record.actualCost, locale)}
												</TableCell>
											</TableRow>
										))}
										{details.records.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={6}
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
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
