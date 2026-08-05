import { Fragment } from "react";
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
import { getDefaultConstructionForma2Results } from "@/flows/default-construction/backend/forma2-analytics-actions";
import { DefaultConstructionForma2ContractEditor } from "@/flows/default-construction/frontend/DefaultConstructionForma2ContractEditor";
import { DefaultConstructionForma2CostBreakdown } from "@/flows/default-construction/frontend/DefaultConstructionForma2CostBreakdown";
import { DefaultConstructionForma2Export } from "@/flows/default-construction/frontend/DefaultConstructionForma2Export";
import { DefaultConstructionForma2Import } from "@/flows/default-construction/frontend/DefaultConstructionForma2Import";
import { DefaultConstructionForma2TableScroll } from "@/flows/default-construction/frontend/DefaultConstructionForma2TableScroll";
import {
	calculateForma2MoneyTotals,
	type Forma2MoneyTotals,
} from "@/flows/default-construction/lib/forma2-analytics";
import {
	getForma2AnalyticsCopy,
	getForma2AnalyticsLocale,
} from "@/flows/default-construction/lib/forma2-analytics-copy";
import { requireUser } from "@/lib/utils/requireUser";
import { cn } from "@/lib/utils/utils";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

type Forma2Results = Awaited<
	ReturnType<typeof getDefaultConstructionForma2Results>
>;
type Forma2ResultRow = Forma2Results["resultRows"][number];
type Forma2AnalyticsCopy = ReturnType<typeof getForma2AnalyticsCopy>;

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
			<TableCell colSpan={3} className="pl-4 font-bold">
				{t.total}
			</TableCell>
			<TableCell className="border-l px-1 text-right font-bold tabular-nums">
				{formatCurrency(totals.plannedWorkCost, locale)}
			</TableCell>
			<TableCell className="px-1 text-right font-bold tabular-nums">
				{formatCurrency(totals.plannedMaterialCost, locale)}
			</TableCell>
			<TableCell className="px-1 text-right font-bold tabular-nums">
				{formatCurrency(totals.plannedTotalCost, locale)}
			</TableCell>
			<TableCell className="border-l px-1 text-right font-bold tabular-nums">
				{formatCurrency(totals.actualWorkCost, locale)}
			</TableCell>
			<TableCell className="px-1 text-right font-bold tabular-nums">
				{formatCurrency(totals.actualMaterialCost, locale)}
			</TableCell>
			<TableCell className="px-1 text-right font-bold tabular-nums">
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
}: {
	siteId: string;
	rows: Forma2ResultRow[];
	t: Forma2AnalyticsCopy;
	locale: string;
	organizationLanguage?: string | null;
}) {
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
			<table className="w-full min-w-[1180px] table-fixed caption-bottom text-[10px] xl:text-[11px]">
				<colgroup>
					<col className="w-[25%]" />
					<col className="w-[5%]" />
					<col className="w-[7%]" />
					<col className="w-[9%]" />
					<col className="w-[9%]" />
					<col className="w-[9%]" />
					<col className="w-[9%]" />
					<col className="w-[9%]" />
					<col className="w-[9%]" />
					<col className="w-[9%]" />
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
							colSpan={3}
							className="h-auto border-l py-2 text-center leading-tight"
						>
							{t.planned}
						</TableHead>
						<TableHead
							colSpan={3}
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
							{t.plannedTotal}
						</TableHead>
						<TableHead className="h-auto whitespace-normal border-l px-1 py-2 text-right leading-tight">
							{t.work}
						</TableHead>
						<TableHead className="h-auto whitespace-normal px-1 py-2 text-right leading-tight">
							{t.material}
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
						return (
							<Fragment key={row.id}>
								{showCategory && (row.categoryCode || row.categoryName) ? (
									<TableRow className="bg-muted/60">
										<TableCell
											colSpan={10}
											className="whitespace-normal pl-4 font-semibold"
										>
											{[row.categoryCode, row.categoryName]
												.filter(Boolean)
												.join(" ")}
										</TableCell>
									</TableRow>
								) : null}
								<TableRow>
									<TableCell
										className={cn(
											"whitespace-normal break-words py-2 pl-4 leading-snug",
											row.parentId ? "text-muted-foreground" : "font-medium",
										)}
									>
										<div className="flex items-start justify-between gap-2">
											<div className={row.parentId ? "pl-3" : ""}>
												{row.parentId ? "↳ " : ""}
												{row.code ? `${row.code} ` : ""}
												{row.name}
											</div>
											<DefaultConstructionForma2ContractEditor
												siteId={siteId}
												row={row}
												organizationLanguage={organizationLanguage}
											/>
										</div>
									</TableCell>
									<TableCell className="whitespace-normal px-1">
										{row.unit || "—"}
									</TableCell>
									<TableCell className="px-1 text-right tabular-nums">
										{formatNumber(row.plannedQuantity, locale)}
									</TableCell>
									<TableCell className="border-l px-1 text-right tabular-nums">
										{formatCurrency(row.plannedWorkCost, locale)}
									</TableCell>
									<TableCell className="px-1 text-right tabular-nums">
										{formatCurrency(row.plannedMaterialCost, locale)}
									</TableCell>
									<TableCell className="px-1 text-right font-medium tabular-nums">
										{formatCurrency(row.plannedTotalCost, locale)}
									</TableCell>
									<TableCell className="border-l px-1 text-right tabular-nums">
										<DefaultConstructionForma2CostBreakdown
											siteId={siteId}
											positionId={row.id}
											costType="work"
											amount={row.actualWorkCost}
											organizationLanguage={organizationLanguage}
										/>
									</TableCell>
									<TableCell className="px-1 text-right tabular-nums">
										<DefaultConstructionForma2CostBreakdown
											siteId={siteId}
											positionId={row.id}
											costType="material"
											amount={row.actualMaterialCost}
											organizationLanguage={organizationLanguage}
										/>
									</TableCell>
									<TableCell className="px-1 text-right font-medium tabular-nums">
										<DefaultConstructionForma2CostBreakdown
											siteId={siteId}
											positionId={row.id}
											costType="total"
											amount={row.actualTotalCost}
											organizationLanguage={organizationLanguage}
										/>
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
							</Fragment>
						);
					})}
					<Forma2TotalsRow totals={totals} t={t} locale={locale} />
				</TableBody>
			</table>
		</DefaultConstructionForma2TableScroll>
	);
}

export default async function AnalyticsPage({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const user = await requireUser();
	const [organizationLanguage, data] = await Promise.all([
		getOrganizationLanguageByUserId(user.id),
		getDefaultConstructionForma2Results(siteId),
	]);
	const t = getForma2AnalyticsCopy(organizationLanguage);
	const locale = getForma2AnalyticsLocale(organizationLanguage);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
			</div>

			<DefaultConstructionForma2Import
				siteId={siteId}
				organizationLanguage={organizationLanguage}
				document={data.document}
			/>

			<Card>
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<CardTitle>{t.results}</CardTitle>
						<CardDescription>{t.resultsDescription}</CardDescription>
					</div>
					<DefaultConstructionForma2Export
						siteName={data.siteName}
						document={data.document}
						rows={data.resultRows as Forma2ResultRow[]}
						organizationLanguage={organizationLanguage}
					/>
				</CardHeader>
				<CardContent className="px-0">
					<Forma2ResultsView
						siteId={siteId}
						rows={data.resultRows as Forma2ResultRow[]}
						t={t}
						locale={locale}
						organizationLanguage={organizationLanguage}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
