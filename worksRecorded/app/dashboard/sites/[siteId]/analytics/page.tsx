import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	getDefaultConstructionForma2MappingPage,
	getDefaultConstructionForma2Overview,
	getDefaultConstructionForma2Results,
} from "@/flows/default-construction/backend/forma2-analytics-actions";
import { DefaultConstructionForma2Import } from "@/flows/default-construction/frontend/DefaultConstructionForma2Import";
import { DefaultConstructionForma2MappingTable } from "@/flows/default-construction/frontend/DefaultConstructionForma2MappingTable";
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

type AnalyticsView = "overview" | "mapping" | "results";
type Forma2Results = Awaited<
	ReturnType<typeof getDefaultConstructionForma2Results>
>;
type Forma2ResultRow = Forma2Results["resultRows"][number];
type Forma2AnalyticsCopy = ReturnType<typeof getForma2AnalyticsCopy>;

function queryValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

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

function MetricCard({
	label,
	value,
	detail,
	tone = "default",
}: {
	label: string;
	value: string;
	detail?: string;
	tone?: "default" | "warning" | "positive";
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{label}
				</div>
				<div
					className={cn(
						"mt-2 text-2xl font-semibold",
						tone === "warning" && "text-amber-600",
						tone === "positive" && "text-emerald-600",
					)}
				>
					{value}
				</div>
				{detail ? (
					<div className="mt-1 text-xs text-muted-foreground">{detail}</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function viewHref(basePath: string, view: AnalyticsView) {
	return view === "overview" ? basePath : `${basePath}?view=${view}`;
}

function mappingPageHref(args: {
	basePath: string;
	page: number;
	search: string;
	sourceType: string;
	assignment: string;
}) {
	const params = new URLSearchParams({
		view: "mapping",
		page: String(args.page),
	});
	if (args.search) params.set("q", args.search);
	if (args.sourceType !== "all") params.set("type", args.sourceType);
	if (args.assignment !== "unassigned")
		params.set("assignment", args.assignment);
	return `${args.basePath}?${params.toString()}`;
}

function Forma2ResultsView({
	rows,
	t,
	locale,
}: {
	rows: Forma2ResultRow[];
	t: Forma2AnalyticsCopy;
	locale: string;
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
											{formatCurrency(row.actualWorkCost, locale)}
										</TableCell>
										<TableCell className="px-1 text-right tabular-nums">
											{formatCurrency(row.actualMaterialCost, locale)}
										</TableCell>
										<TableCell className="px-1 text-right font-medium tabular-nums">
											{formatCurrency(row.actualTotalCost, locale)}
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
										[t.plannedWork, row.plannedWorkCost],
										[t.plannedMaterials, row.plannedMaterialCost],
										[t.plannedTotal, row.plannedTotalCost],
										[t.actualWork, row.actualWorkCost],
										[t.actualMaterials, row.actualMaterialCost],
										[t.actualTotal, row.actualTotalCost],
										[t.remaining, row.variance],
									].map(([label, value]) => (
										<div key={label} className="min-w-0">
											<div className="text-[10px] uppercase leading-tight text-muted-foreground">
												{label}
											</div>
											<div
												className={cn(
													"mt-1 text-sm font-medium tabular-nums",
													label === t.remaining &&
														row.variance < 0 &&
														"text-red-600",
												)}
											>
												{formatCurrency(value as number, locale)}
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
	searchParams,
}: {
	params: Promise<{ siteId: string }>;
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { siteId } = await params;
	const resolvedSearchParams = (await searchParams) ?? {};
	const requestedView = queryValue(resolvedSearchParams.view);
	const view: AnalyticsView =
		requestedView === "mapping" || requestedView === "results"
			? requestedView
			: "overview";
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
	const basePath = `/dashboard/sites/${siteId}/analytics`;
	const page = Math.max(1, Number(queryValue(resolvedSearchParams.page)) || 1);
	const sourceTypeValue = queryValue(resolvedSearchParams.type);
	const sourceType =
		sourceTypeValue === "work" || sourceTypeValue === "material"
			? sourceTypeValue
			: "all";
	const assignmentValue = queryValue(resolvedSearchParams.assignment);
	const assignment =
		assignmentValue === "assigned" || assignmentValue === "all"
			? assignmentValue
			: "unassigned";
	const search = queryValue(resolvedSearchParams.q).slice(0, 120);

	const data =
		view === "mapping"
			? await getDefaultConstructionForma2MappingPage({
					siteId,
					page,
					pageSize: 25,
					sourceType,
					assignment,
					search,
				})
			: view === "results"
				? await getDefaultConstructionForma2Results(siteId)
				: await getDefaultConstructionForma2Overview(siteId);

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

			<nav className="inline-flex flex-wrap items-center rounded-lg bg-muted p-1">
				{(
					[
						["overview", t.overview],
						["mapping", t.mapping],
						["results", t.results],
					] as const
				).map(([value, label]) => (
					<Link
						key={value}
						href={viewHref(basePath, value)}
						prefetch={false}
						className={cn(
							"rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							view === value
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{label}
					</Link>
				))}
			</nav>

			{view === "overview" && "summary" in data ? (
				<>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
						<MetricCard
							label={t.planned}
							value={formatCurrency(data.summary.plannedCost, locale)}
						/>
						<MetricCard
							label={t.factual}
							value={formatCurrency(data.summary.factualCost, locale)}
						/>
						<MetricCard
							label={t.assigned}
							value={formatCurrency(data.summary.assignedCost, locale)}
							tone="positive"
						/>
						<MetricCard
							label={t.unassigned}
							value={formatCurrency(data.summary.unassignedCost, locale)}
							tone={data.summary.unassignedCost ? "warning" : "default"}
						/>
						<MetricCard
							label={t.balance}
							value={formatCurrency(data.summary.variance, locale)}
						/>
					</div>
					<Card>
						<CardContent className="p-5">
							<div className="flex items-center justify-between gap-3">
								<div>
									<div className="text-sm font-medium">{t.coverage}</div>
									<div className="mt-1 text-xs text-muted-foreground">
										{data.summary.assignedRecords}/{data.summary.factualRecords}{" "}
										{t.recordsAssigned}
									</div>
								</div>
								<div className="text-2xl font-semibold">
									{data.summary.factualRecords
										? Math.round(
												(data.summary.assignedRecords /
													data.summary.factualRecords) *
													100,
											)
										: 0}
									%
								</div>
							</div>
							{data.summary.unpricedRecords ? (
								<div className="mt-4 flex items-center gap-2 text-sm text-amber-700">
									<AlertTriangle className="size-4" />
									{data.summary.unpricedRecords} {t.unpricedWarning}
								</div>
							) : null}
						</CardContent>
					</Card>
				</>
			) : null}

			{view === "mapping" && "rows" in data ? (
				<Card>
					<CardHeader>
						<CardTitle>{t.mappingTitle}</CardTitle>
						<CardDescription>{t.mappingDescription}</CardDescription>
					</CardHeader>
					<CardContent className="px-0">
						<form className="grid gap-3 px-6 pb-4 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
							<input type="hidden" name="view" value="mapping" />
							<Input
								name="q"
								defaultValue={data.filters.search}
								placeholder={t.search}
							/>
							<select
								name="type"
								defaultValue={data.filters.sourceType}
								className="h-9 rounded-md border bg-background px-3 text-sm"
							>
								<option value="all">{t.allTypes}</option>
								<option value="work">{t.work}</option>
								<option value="material">{t.material}</option>
							</select>
							<select
								name="assignment"
								defaultValue={data.filters.assignment}
								className="h-9 rounded-md border bg-background px-3 text-sm"
							>
								<option value="unassigned">{t.unassignedOnly}</option>
								<option value="assigned">{t.assignedOnly}</option>
								<option value="all">{t.allAssignments}</option>
							</select>
							<Button type="submit">{t.filter}</Button>
						</form>
						<DefaultConstructionForma2MappingTable
							siteId={siteId}
							organizationLanguage={organizationLanguage}
							data={data}
						/>
						<div className="flex flex-col gap-3 px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
							<div className="text-muted-foreground">
								{t.showing} {data.rows.length} {t.of}{" "}
								{data.pagination.totalRows}
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									asChild={data.pagination.page > 1}
									disabled={data.pagination.page <= 1}
								>
									{data.pagination.page > 1 ? (
										<Link
											href={mappingPageHref({
												basePath,
												page: data.pagination.page - 1,
												search: data.filters.search,
												sourceType: data.filters.sourceType,
												assignment: data.filters.assignment,
											})}
											prefetch={false}
										>
											{t.previous}
										</Link>
									) : (
										t.previous
									)}
								</Button>
								<Badge variant="secondary" className="px-3">
									{data.pagination.page}/{data.pagination.totalPages}
								</Badge>
								<Button
									variant="outline"
									size="sm"
									asChild={data.pagination.page < data.pagination.totalPages}
									disabled={data.pagination.page >= data.pagination.totalPages}
								>
									{data.pagination.page < data.pagination.totalPages ? (
										<Link
											href={mappingPageHref({
												basePath,
												page: data.pagination.page + 1,
												search: data.filters.search,
												sourceType: data.filters.sourceType,
												assignment: data.filters.assignment,
											})}
											prefetch={false}
										>
											{t.next}
										</Link>
									) : (
										t.next
									)}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			) : null}

			{view === "results" && "resultRows" in data ? (
				<Card>
					<CardHeader>
						<CardTitle>{t.results}</CardTitle>
						<CardDescription>{t.resultsDescription}</CardDescription>
					</CardHeader>
					<CardContent className="px-0">
						<Forma2ResultsView
							rows={data.resultRows as Forma2ResultRow[]}
							t={t}
							locale={locale}
						/>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
