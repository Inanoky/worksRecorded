import { notFound } from "next/navigation";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getDefaultConstructionForma2Results } from "@/flows/default-construction/backend/forma2-analytics-actions";
import { DefaultConstructionForma2CostBreakdown } from "@/flows/default-construction/frontend/DefaultConstructionForma2CostBreakdown";
import { DefaultConstructionForma2Import } from "@/flows/default-construction/frontend/DefaultConstructionForma2Import";
import {
	getForma2AnalyticsCopy,
	getForma2AnalyticsLocale,
} from "@/flows/default-construction/lib/forma2-analytics-copy";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { requireUser } from "@/lib/utils/requireUser";
import { cn } from "@/lib/utils/utils";
import {
	getOrganizationLanguageByUserId,
	orgCheck,
} from "@/server/actions/shared-actions";

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

	return (
		<>
			<div className="hidden border-y lg:block">
				<Table className="table-fixed text-[10px] xl:text-[11px]">
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
											<div className={row.parentId ? "pl-3" : ""}>
												{row.parentId ? "↳ " : ""}
												{row.code ? `${row.code} ` : ""}
												{row.name}
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
					</TableBody>
				</Table>
			</div>

			<div className="divide-y border-y lg:hidden">
				{rows.map((row, index) => {
					const previous = rows[index - 1];
					const showCategory =
						!previous || previous.categoryCode !== row.categoryCode;
					return (
						<Fragment key={row.id}>
							{showCategory && (row.categoryCode || row.categoryName) ? (
								<div className="bg-muted/60 px-4 py-2 text-xs font-semibold">
									{[row.categoryCode, row.categoryName]
										.filter(Boolean)
										.join(" ")}
								</div>
							) : null}
							<div className="space-y-3 px-4 py-4">
								<div
									className={cn(
										"text-sm leading-snug",
										row.parentId ? "pl-3 text-muted-foreground" : "font-medium",
									)}
								>
									{row.parentId ? "↳ " : ""}
									{row.code ? `${row.code} ` : ""}
									{row.name}
								</div>
								<div className="flex flex-wrap gap-2">
									<Badge variant="outline">
										{t.unit}: {row.unit || "—"}
									</Badge>
									<Badge variant="outline">
										{t.contractQuantity}:{" "}
										{formatNumber(row.plannedQuantity, locale)}
									</Badge>
								</div>
								<div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
									{[
										{ label: t.plannedWork, value: row.plannedWorkCost },
										{
											label: t.plannedMaterials,
											value: row.plannedMaterialCost,
										},
										{ label: t.plannedTotal, value: row.plannedTotalCost },
										{
											label: t.actualWork,
											value: row.actualWorkCost,
											costType: "work" as const,
										},
										{
											label: t.actualMaterials,
											value: row.actualMaterialCost,
											costType: "material" as const,
										},
										{
											label: t.actualTotal,
											value: row.actualTotalCost,
											costType: "total" as const,
										},
										{ label: t.remaining, value: row.variance },
									].map((metric) => (
										<div key={metric.label} className="min-w-0">
											<div className="text-[10px] uppercase leading-tight text-muted-foreground">
												{metric.label}
											</div>
											<div
												className={cn(
													"mt-1 text-sm font-medium tabular-nums",
													metric.label === t.remaining &&
														row.variance < 0 &&
														"text-red-600",
												)}
											>
												{metric.costType ? (
													<DefaultConstructionForma2CostBreakdown
														siteId={siteId}
														positionId={row.id}
														costType={metric.costType}
														amount={metric.value}
														organizationLanguage={organizationLanguage}
													/>
												) : (
													formatCurrency(metric.value, locale)
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						</Fragment>
					);
				})}
			</div>
		</>
	);
}

export default async function AnalyticsPage({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const user = await requireUser();
	const site = await orgCheck(user.id, siteId);
	if (!site) notFound();

	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: site.organizationId ?? null,
		siteId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION) notFound();

	const organizationLanguage = await getOrganizationLanguageByUserId(user.id);
	const t = getForma2AnalyticsCopy(organizationLanguage);
	const locale = getForma2AnalyticsLocale(organizationLanguage);
	const data = await getDefaultConstructionForma2Results(siteId);

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
				<CardHeader>
					<CardTitle>{t.results}</CardTitle>
					<CardDescription>{t.resultsDescription}</CardDescription>
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
