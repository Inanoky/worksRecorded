"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { getDefaultConstructionForma2PositionQuantityDetails } from "../backend/forma2-analytics-actions";
import { getForma2QuantityComparison } from "../lib/forma2-quantities";
import { DiaryRecordPhotos } from "./DiaryRecordPhotos";

type QuantityDetails = Awaited<
	ReturnType<typeof getDefaultConstructionForma2PositionQuantityDetails>
>;

export function DefaultConstructionForma2QuantityBreakdown({
	siteId,
	positionId,
	amount,
	contractQuantity,
	organizationLanguage,
}: {
	siteId: string;
	positionId: string;
	amount: number | null;
	contractQuantity: number | null;
	organizationLanguage?: string | null;
}) {
	const isLatvian = String(organizationLanguage ?? "")
		.toLowerCase()
		.startsWith("lv");
	const locale = isLatvian ? "lv-LV" : "en-GB";
	const copy = isLatvian
		? {
				title: "Faktiskā daudzuma detalizācija",
				description:
					"Izvēlētajai Formas 2 pozīcijai piesaistītie būvdarbu žurnāla ieraksti.",
				actual: "Faktiskais daudzums",
				contract: "Līguma daudzums",
				included: "Iekļautie ieraksti",
				excluded: "Neiekļautie ieraksti",
				rule: "Formas 2 faktiskais daudzums = piesaistīto būvdarbu žurnāla ierakstu Daudzums (plāns) summa līguma mērvienībā. Daudzums (fakts) ir parādīts uzziņai. Ieraksti bez plāna daudzuma vai ar nesaderīgu mērvienību netiek summēti. Ja žurnālā nav atsevišķa plāna/fakta, tiek izmantots Daudzums. Izmaksu aprēķins netiek mainīts.",
				photos: "Foto",
				date: "Datums",
				work: "Darbs / lokācija",
				planned: "Daudzums (plāns)",
				quantity: "Daudzums (fakts)",
				recordDescription: "Apraksts / komentāri",
				status: "Aprēķins",
				counted: "Iekļauts summā",
				missing: "Nav norādīts daudzums",
				mismatch: "Nesaderīga mērvienība",
				empty: "Nav piesaistītu darba ierakstu.",
				loading: "Ielādē detalizāciju…",
				error:
					"Neizdevās ielādēt daudzuma detalizāciju. Aizveriet un mēģiniet vēlreiz.",
				above: "Virs līguma daudzuma",
				below: "Zem līguma daudzuma",
			}
		: {
				title: "Factual quantity details",
				description:
					"Site diary records linked to the selected Forma 2 position.",
				actual: "Factual quantity",
				contract: "Contract quantity",
				included: "Included records",
				excluded: "Excluded records",
				rule: "Forma 2 factual quantity = the sum of Planned quantity from linked site diary records in the contract unit. Factual quantity is shown for reference. Records with missing planned quantities or incompatible units are excluded. For diaries without separate plan/fact fields, Quantity is used. Cost calculations are unchanged.",
				photos: "Photos",
				date: "Date",
				work: "Work / location",
				planned: "Planned quantity",
				quantity: "Factual quantity",
				recordDescription: "Description / comments",
				status: "Calculation",
				counted: "Included in total",
				missing: "Missing quantity",
				mismatch: "Incompatible unit",
				empty: "No linked work records.",
				loading: "Loading details…",
				error: "Could not load quantity details. Close and try again.",
				above: "Above contract quantity",
				below: "Below contract quantity",
			};
	const [open, setOpen] = useState(false);
	const [details, setDetails] = useState<QuantityDetails | null>(null);
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setDetails(null);
		setFailed(false);
		getDefaultConstructionForma2PositionQuantityDetails({
			siteId,
			positionId,
		}).then(
			(value) => {
				if (!cancelled) setDetails(value);
			},
			() => {
				if (!cancelled) setFailed(true);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [open, siteId, positionId]);
	const comparison = getForma2QuantityComparison(amount, contractQuantity);
	const format = (value: number | null) =>
		value === null
			? "—"
			: new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(
					value,
				);
	const color =
		comparison === "above"
			? "text-red-600 dark:text-red-400"
			: comparison === "below"
				? "text-emerald-600 dark:text-emerald-400"
				: "text-inherit";
	if (amount === null) return <>—</>;
	return (
		<>
			<Button
				type="button"
				variant="link"
				onClick={() => setOpen(true)}
				aria-label={`${copy.title}: ${format(amount)}${comparison === "neutral" ? "" : `, ${copy[comparison]}`}`}
				className={`h-auto min-w-0 p-0 underline decoration-dotted underline-offset-4 hover:text-inherit ${color}`}
			>
				{new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
					amount,
				)}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden p-0 sm:max-w-7xl">
					<DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
						<DialogTitle>{copy.title}</DialogTitle>
						<DialogDescription>
							{details
								? `${details.position.code} ${details.position.name}`
								: copy.description}
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
						{failed ? (
							<p role="alert" className="text-destructive">
								{copy.error}
							</p>
						) : !details ? (
							<output className="flex items-center justify-center gap-2 py-12">
								<Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
								{copy.loading}
							</output>
						) : (
							<div className="space-y-5">
								<dl className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4">
									{[
										[
											copy.contract,
											`${format(details.position.plannedQuantity)} ${details.position.unit}`,
										],
										[
											copy.actual,
											`${format(details.calculatedTotal)} ${details.position.unit}`,
										],
										[copy.included, details.includedRecords],
										[copy.excluded, details.excludedRecords],
									].map(([label, value]) => (
										<div key={label}>
											<dt className="text-xs text-muted-foreground">{label}</dt>
											<dd className="mt-1 text-lg font-semibold tabular-nums">
												{value}
											</dd>
										</div>
									))}
								</dl>
								<p className="text-sm text-muted-foreground">{copy.rule}</p>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>{copy.date}</TableHead>
											<TableHead>{copy.work}</TableHead>
											<TableHead className="text-right">
												{copy.planned}
											</TableHead>
											<TableHead className="text-right">
												{copy.quantity}
											</TableHead>
											<TableHead>{copy.recordDescription}</TableHead>
											<TableHead>{copy.photos}</TableHead>
											<TableHead>{copy.status}</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{details.records.map((row) => (
											<TableRow key={row.id}>
												<TableCell className="whitespace-nowrap">
													{row.date && !Number.isNaN(Date.parse(row.date))
														? new Intl.DateTimeFormat(locale).format(
																new Date(row.date),
															)
														: "—"}
												</TableCell>
												<TableCell className="min-w-40 whitespace-pre-wrap [overflow-wrap:anywhere]">
													<div>{row.label}</div>
													<div className="text-xs text-muted-foreground">
														{row.secondaryLabel || "—"}
													</div>
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{format(row.plannedQuantity)}{" "}
													{row.plannedQuantity === null ? "" : row.unit}
												</TableCell>
												<TableCell className="text-right tabular-nums">
													{format(row.quantity)} {row.unit}
												</TableCell>
												<TableCell className="min-w-56 whitespace-pre-wrap [overflow-wrap:anywhere]">
													{row.description || "—"}
												</TableCell>
												<TableCell className="min-w-32">
													<DiaryRecordPhotos
														photos={row.photos}
														language={isLatvian ? "lv" : "en"}
													/>
												</TableCell>
												<TableCell className="whitespace-normal text-sm">
													{row.exclusion === "missing-quantity"
														? copy.missing
														: row.exclusion === "unit-mismatch"
															? copy.mismatch
															: `${copy.counted}: ${format(row.reportedQuantity)} ${row.unit}`}
												</TableCell>
											</TableRow>
										))}
										{details.records.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={7}
													className="text-center text-muted-foreground"
												>
													{copy.empty}
												</TableCell>
											</TableRow>
										) : null}
									</TableBody>
								</Table>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
