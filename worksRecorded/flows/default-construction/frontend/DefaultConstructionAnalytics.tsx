"use client";

import {
	AlertTriangle,
	CheckCircle2,
	FileSpreadsheet,
	Link2,
	Loader2,
	Sparkles,
	Trash2,
	Upload,
} from "lucide-react";
import { Fragment, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	clearDefaultConstructionForma2Import,
	getDefaultConstructionForma2Dashboard,
	saveDefaultConstructionForma2Allocations,
	saveDefaultConstructionForma2Import,
} from "@/flows/default-construction/backend/forma2-analytics-actions";
import {
	type ParsedForma2Sheet,
	parseForma2Workbook,
} from "@/flows/default-construction/lib/forma2-analytics";

type DashboardData = Awaited<
	ReturnType<typeof getDefaultConstructionForma2Dashboard>
>;

const COPY = {
	en: {
		title: "Analytics",
		description:
			"Import Forma 2, assign factual work and material spending, and reconcile the result.",
		importTitle: "Forma 2 document",
		importDescription:
			"Upload an XLSX file. The document is parsed locally and only the reviewed positions are saved.",
		chooseFile: "Choose Forma 2",
		replaceFile: "Replace Forma 2",
		detectedSheet: "Detected sheet",
		positions: "positions",
		import: "Import positions",
		importing: "Importing",
		imported: "Imported",
		clear: "Remove import",
		overview: "Overview",
		mapping: "Record mapping",
		results: "Forma 2 results",
		planned: "Contract value",
		factual: "Factual spending",
		assigned: "Assigned spending",
		unassigned: "Unassigned spending",
		balance: "Remaining balance",
		coverage: "Mapping coverage",
		recordsAssigned: "records assigned",
		noDocument: "Upload and import Forma 2 to start mapping factual records.",
		mappingTitle: "Assign factual records",
		mappingDescription:
			"Work records can only be assigned to work positions; materials can only be assigned to material positions.",
		onlyUnassigned: "Show only unassigned",
		applySuggestions: "Apply confident suggestions",
		applying: "Applying",
		source: "Factual record",
		type: "Type",
		quantity: "Quantity",
		actualCost: "Factual cost",
		position: "Forma 2 position",
		suggested: "Suggested",
		unassignedOption: "Unassigned",
		work: "Work",
		material: "Material",
		mechanism: "Mechanism",
		noRecords: "No matching records.",
		resultsDescription:
			"Contract costs come from Forma 2. Factual costs come only from assigned WorksRecorded records.",
		codeAndName: "Position",
		unit: "Unit",
		contractQuantity: "Contract quantity",
		plannedWork: "Contract work",
		plannedMaterials: "Contract materials",
		plannedTotal: "Contract total",
		actualWork: "Factual work",
		actualMaterials: "Factual materials",
		actualTotal: "Factual total",
		remaining: "Remaining",
		unpricedWarning: "records do not yet have a calculable factual cost.",
		parseError: "Could not extract Forma 2 positions from this workbook.",
		importSuccess: "Forma 2 positions imported.",
		saveError: "Could not save the change.",
		clearConfirm: "Remove the imported Forma 2 and all assignments?",
		noSuggestions: "No confident unassigned suggestions are available.",
		suggestionsApplied: "Confident suggestions applied.",
	},
	lv: {
		title: "Analītika",
		description:
			"Importējiet Formu 2, piesaistiet faktiskās darbu un materiālu izmaksas un pārbaudiet rezultātu.",
		importTitle: "Forma 2 dokuments",
		importDescription:
			"Augšupielādējiet XLSX failu. Dokuments tiek analizēts lokāli, un saglabātas tiek tikai pārskatītās pozīcijas.",
		chooseFile: "Izvēlēties Formu 2",
		replaceFile: "Aizstāt Formu 2",
		detectedSheet: "Atrasta lapa",
		positions: "pozīcijas",
		import: "Importēt pozīcijas",
		importing: "Importē",
		imported: "Importēts",
		clear: "Dzēst importu",
		overview: "Kopsavilkums",
		mapping: "Ierakstu piesaiste",
		results: "Formas 2 rezultāts",
		planned: "Līguma summa",
		factual: "Faktiskās izmaksas",
		assigned: "Piesaistītās izmaksas",
		unassigned: "Nepiesaistītās izmaksas",
		balance: "Atlikums",
		coverage: "Piesaistes pārklājums",
		recordsAssigned: "ieraksti piesaistīti",
		noDocument:
			"Augšupielādējiet un importējiet Formu 2, lai sāktu ierakstu piesaisti.",
		mappingTitle: "Faktisko ierakstu piesaiste",
		mappingDescription:
			"Darbu ierakstus var piesaistīt tikai darbu pozīcijām, bet materiālus — tikai materiālu pozīcijām.",
		onlyUnassigned: "Rādīt tikai nepiesaistītos",
		applySuggestions: "Pielietot drošos ieteikumus",
		applying: "Piesaista",
		source: "Faktiskais ieraksts",
		type: "Tips",
		quantity: "Daudzums",
		actualCost: "Faktiskās izmaksas",
		position: "Formas 2 pozīcija",
		suggested: "Ieteikts",
		unassignedOption: "Nav piesaistīts",
		work: "Darbs",
		material: "Materiāls",
		mechanism: "Mehānisms",
		noRecords: "Atbilstoši ieraksti nav atrasti.",
		resultsDescription:
			"Līguma izmaksas ir no Formas 2. Faktiskās izmaksas veido tikai piesaistītie WorksRecorded ieraksti.",
		codeAndName: "Pozīcija",
		unit: "Mērv.",
		contractQuantity: "Līguma daudzums",
		plannedWork: "Līguma darbi",
		plannedMaterials: "Līguma materiāli",
		plannedTotal: "Līguma kopā",
		actualWork: "Faktiskie darbi",
		actualMaterials: "Faktiskie materiāli",
		actualTotal: "Faktiski kopā",
		remaining: "Atlikums",
		unpricedWarning: "ierakstiem vēl nav aprēķināmu faktisko izmaksu.",
		parseError: "No šīs darbgrāmatas neizdevās iegūt Formas 2 pozīcijas.",
		importSuccess: "Formas 2 pozīcijas importētas.",
		saveError: "Neizdevās saglabāt izmaiņas.",
		clearConfirm: "Dzēst importēto Formu 2 un visas piesaistes?",
		noSuggestions: "Nav drošu ieteikumu nepiesaistītajiem ierakstiem.",
		suggestionsApplied: "Drošie ieteikumi pielietoti.",
	},
} as const;

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
					className={`mt-2 text-2xl font-semibold ${
						tone === "warning"
							? "text-amber-600"
							: tone === "positive"
								? "text-emerald-600"
								: ""
					}`}
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

export function DefaultConstructionAnalytics({
	siteId,
	organizationLanguage,
	initialData,
}: {
	siteId: string;
	organizationLanguage?: string | null;
	initialData: DashboardData;
}) {
	const isLatvian = String(organizationLanguage ?? "")
		.toLowerCase()
		.startsWith("lv");
	const sheetSelectId = useId();
	const unassignedOnlyId = useId();
	const t = isLatvian ? COPY.lv : COPY.en;
	const locale = isLatvian ? "lv-LV" : "en-GB";
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [data, setData] = useState(initialData);
	const [parsedSheets, setParsedSheets] = useState<ParsedForma2Sheet[]>([]);
	const [selectedSheetName, setSelectedSheetName] = useState("");
	const [selectedFileName, setSelectedFileName] = useState("");
	const [parsing, setParsing] = useState(false);
	const [savingImport, setSavingImport] = useState(false);
	const [applyingSuggestions, setApplyingSuggestions] = useState(false);
	const [onlyUnassigned, setOnlyUnassigned] = useState(true);
	const [busySources, setBusySources] = useState<Set<string>>(new Set());
	const document = data.state.document;
	const positions = document?.positions ?? [];
	const selectedSheet = parsedSheets.find(
		(sheet) => sheet.sheetName === selectedSheetName,
	);

	const refresh = async () => {
		const next = await getDefaultConstructionForma2Dashboard(siteId);
		setData(next);
	};

	const handleFile = async (file: File | undefined) => {
		if (!file) return;
		setParsing(true);
		try {
			const sheets = await parseForma2Workbook(await file.arrayBuffer());
			if (!sheets.length) throw new Error(t.parseError);
			const preferred = [...sheets].sort(
				(left, right) => right.positions.length - left.positions.length,
			)[0];
			setSelectedFileName(file.name);
			setParsedSheets(sheets);
			setSelectedSheetName(preferred.sheetName);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.parseError);
			setParsedSheets([]);
			setSelectedSheetName("");
			setSelectedFileName("");
		} finally {
			setParsing(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const importSelectedSheet = async () => {
		if (!selectedSheet) return;
		setSavingImport(true);
		try {
			await saveDefaultConstructionForma2Import({
				siteId,
				fileName: selectedFileName,
				sheetName: selectedSheet.sheetName,
				positions: selectedSheet.positions,
			});
			await refresh();
			setParsedSheets([]);
			setSelectedSheetName("");
			setSelectedFileName("");
			toast.success(t.importSuccess);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.saveError);
		} finally {
			setSavingImport(false);
		}
	};

	const clearImport = async () => {
		if (!window.confirm(t.clearConfirm)) return;
		try {
			await clearDefaultConstructionForma2Import(siteId);
			await refresh();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.saveError);
		}
	};

	const updateAllocation = async (
		row: DashboardData["view"]["mappingRows"][number],
		positionId: string | null,
	) => {
		const sourceKey = `${row.type}:${row.id}`;
		setBusySources((current) => new Set(current).add(sourceKey));
		try {
			await saveDefaultConstructionForma2Allocations({
				siteId,
				allocations: [
					{
						sourceType: row.type,
						sourceId: row.id,
						positionId,
						method: "manual",
					},
				],
			});
			await refresh();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.saveError);
		} finally {
			setBusySources((current) => {
				const next = new Set(current);
				next.delete(sourceKey);
				return next;
			});
		}
	};

	const applySuggestions = async () => {
		const confident = data.view.mappingRows.filter(
			(row) =>
				!row.assignedPositionId &&
				row.suggestedPositionId &&
				Number(row.suggestionConfidence) >= 0.9,
		);
		if (!confident.length) {
			toast.info(t.noSuggestions);
			return;
		}
		setApplyingSuggestions(true);
		try {
			await saveDefaultConstructionForma2Allocations({
				siteId,
				allocations: confident.map((row) => ({
					sourceType: row.type,
					sourceId: row.id,
					positionId: row.suggestedPositionId,
					method: "automatic" as const,
					confidence: row.suggestionConfidence,
				})),
			});
			await refresh();
			toast.success(t.suggestionsApplied);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.saveError);
		} finally {
			setApplyingSuggestions(false);
		}
	};

	const visibleMappings = useMemo(
		() =>
			onlyUnassigned
				? data.view.mappingRows.filter((row) => !row.assignedPositionId)
				: data.view.mappingRows,
		[data.view.mappingRows, onlyUnassigned],
	);

	const positionsByType = useMemo(
		() => ({
			work: positions.filter((position) => position.kind === "work"),
			material: positions.filter((position) => position.kind === "material"),
		}),
		[positions],
	);

	const coverage = data.view.summary.factualRecords
		? Math.round(
				(data.view.summary.assignedRecords / data.view.summary.factualRecords) *
					100,
			)
		: 0;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
			</div>

			<Card>
				<CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<FileSpreadsheet className="size-5 text-emerald-600" />
							{t.importTitle}
						</CardTitle>
						<CardDescription className="mt-1">
							{t.importDescription}
						</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						<Input
							ref={fileInputRef}
							type="file"
							accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
							className="hidden"
							onChange={(event) => handleFile(event.target.files?.[0])}
						/>
						<Button
							variant="outline"
							onClick={() => fileInputRef.current?.click()}
							disabled={parsing || savingImport}
						>
							{parsing ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<Upload className="mr-2 size-4" />
							)}
							{document ? t.replaceFile : t.chooseFile}
						</Button>
						{document ? (
							<Button
								variant="ghost"
								className="text-destructive"
								onClick={clearImport}
							>
								<Trash2 className="mr-2 size-4" />
								{t.clear}
							</Button>
						) : null}
					</div>
				</CardHeader>
				<CardContent>
					{selectedSheet ? (
						<div className="rounded-lg border bg-muted/30 p-4">
							<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
								<div className="space-y-2">
									<div className="font-medium">{selectedFileName}</div>
									<label
										htmlFor={sheetSelectId}
										className="block text-xs font-medium text-muted-foreground"
									>
										{t.detectedSheet}
									</label>
									<select
										id={sheetSelectId}
										value={selectedSheetName}
										onChange={(event) =>
											setSelectedSheetName(event.target.value)
										}
										className="h-9 min-w-56 rounded-md border bg-background px-3 text-sm"
									>
										{parsedSheets.map((sheet) => (
											<option key={sheet.sheetName} value={sheet.sheetName}>
												{sheet.sheetName} · {sheet.positions.length}{" "}
												{t.positions}
											</option>
										))}
									</select>
								</div>
								<Button onClick={importSelectedSheet} disabled={savingImport}>
									{savingImport ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : (
										<CheckCircle2 className="mr-2 size-4" />
									)}
									{savingImport ? t.importing : t.import}
								</Button>
							</div>
							<div className="mt-3 text-sm text-muted-foreground">
								{selectedSheet.positions.length} {t.positions}
							</div>
						</div>
					) : document ? (
						<div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-4">
							<Badge variant="secondary">{t.imported}</Badge>
							<span className="font-medium">{document.fileName}</span>
							<span className="text-sm text-muted-foreground">
								{document.sheetName} · {document.positions.length} {t.positions}
							</span>
						</div>
					) : (
						<div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
							{t.noDocument}
						</div>
					)}
				</CardContent>
			</Card>

			<Tabs defaultValue="overview" className="space-y-4">
				<TabsList className="h-auto flex-wrap">
					<TabsTrigger value="overview">{t.overview}</TabsTrigger>
					<TabsTrigger value="mapping">{t.mapping}</TabsTrigger>
					<TabsTrigger value="results">{t.results}</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-4">
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
						<MetricCard
							label={t.planned}
							value={formatCurrency(data.view.summary.plannedCost, locale)}
						/>
						<MetricCard
							label={t.factual}
							value={formatCurrency(data.view.summary.factualCost, locale)}
						/>
						<MetricCard
							label={t.assigned}
							value={formatCurrency(data.view.summary.assignedCost, locale)}
							tone="positive"
						/>
						<MetricCard
							label={t.unassigned}
							value={formatCurrency(data.view.summary.unassignedCost, locale)}
							tone={data.view.summary.unassignedCost ? "warning" : "default"}
						/>
						<MetricCard
							label={t.balance}
							value={formatCurrency(data.view.summary.variance, locale)}
						/>
					</div>
					<Card>
						<CardContent className="p-5">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<div className="text-sm font-medium">{t.coverage}</div>
									<div className="mt-1 text-xs text-muted-foreground">
										{data.view.summary.assignedRecords}/
										{data.view.summary.factualRecords} {t.recordsAssigned}
									</div>
								</div>
								<div className="text-2xl font-semibold">{coverage}%</div>
							</div>
							<div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-emerald-600 transition-all"
									style={{ width: `${coverage}%` }}
								/>
							</div>
							{data.view.summary.unpricedRecords ? (
								<div className="mt-4 flex items-center gap-2 text-sm text-amber-700">
									<AlertTriangle className="size-4" />
									{data.view.summary.unpricedRecords} {t.unpricedWarning}
								</div>
							) : null}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="mapping">
					<Card>
						<CardHeader className="gap-3 lg:flex-row lg:items-start lg:justify-between">
							<div>
								<CardTitle>{t.mappingTitle}</CardTitle>
								<CardDescription className="mt-1">
									{t.mappingDescription}
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<label
									htmlFor={unassignedOnlyId}
									className="flex items-center gap-2 text-sm"
								>
									<Checkbox
										id={unassignedOnlyId}
										checked={onlyUnassigned}
										onCheckedChange={(checked) =>
											setOnlyUnassigned(Boolean(checked))
										}
									/>
									{t.onlyUnassigned}
								</label>
								<Button
									variant="outline"
									onClick={applySuggestions}
									disabled={!document || applyingSuggestions}
								>
									{applyingSuggestions ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : (
										<Sparkles className="mr-2 size-4" />
									)}
									{applyingSuggestions ? t.applying : t.applySuggestions}
								</Button>
							</div>
						</CardHeader>
						<CardContent className="px-0">
							<div className="max-h-[680px] overflow-auto border-y">
								<Table>
									<TableHeader className="sticky top-0 z-10 bg-background">
										<TableRow>
											<TableHead className="min-w-72 pl-6">
												{t.source}
											</TableHead>
											<TableHead>{t.type}</TableHead>
											<TableHead>{t.quantity}</TableHead>
											<TableHead className="text-right">
												{t.actualCost}
											</TableHead>
											<TableHead className="min-w-80 pr-6">
												{t.position}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{visibleMappings.map((row) => {
											const sourceKey = `${row.type}:${row.id}`;
											const sourcePositions = positionsByType[row.type];
											const suggested = sourcePositions.find(
												(position) => position.id === row.suggestedPositionId,
											);
											return (
												<TableRow key={sourceKey}>
													<TableCell className="pl-6 align-top">
														<div className="font-medium">{row.label}</div>
														<div className="mt-1 text-xs text-muted-foreground">
															{row.secondaryLabel || "—"}
														</div>
														{suggested ? (
															<div className="mt-2 text-xs text-blue-600">
																{t.suggested}:{" "}
																{suggested.code ? `${suggested.code} ` : ""}
																{suggested.name} (
																{Math.round(
																	Number(row.suggestionConfidence) * 100,
																)}
																%)
															</div>
														) : null}
													</TableCell>
													<TableCell className="align-top">
														<Badge variant="outline">
															{row.type === "work" ? t.work : t.material}
														</Badge>
													</TableCell>
													<TableCell className="align-top">
														{formatNumber(row.quantity, locale)} {row.unit}
													</TableCell>
													<TableCell className="text-right align-top">
														{row.actualCost == null
															? "—"
															: formatCurrency(row.actualCost, locale)}
													</TableCell>
													<TableCell className="pr-6 align-top">
														<div className="flex items-center gap-2">
															<Select
																value={row.assignedPositionId ?? "unassigned"}
																onValueChange={(value) =>
																	updateAllocation(
																		row,
																		value === "unassigned" ? null : value,
																	)
																}
																disabled={
																	!document || busySources.has(sourceKey)
																}
															>
																<SelectTrigger className="w-full">
																	<SelectValue
																		placeholder={t.unassignedOption}
																	/>
																</SelectTrigger>
																<SelectContent className="max-h-80">
																	<SelectItem value="unassigned">
																		{t.unassignedOption}
																	</SelectItem>
																	{sourcePositions.map((position) => (
																		<SelectItem
																			key={position.id}
																			value={position.id}
																		>
																			{position.code
																				? `${position.code} `
																				: "↳ "}
																			{position.name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
															{busySources.has(sourceKey) ? (
																<Loader2 className="size-4 shrink-0 animate-spin" />
															) : (
																<Link2 className="size-4 shrink-0 text-muted-foreground" />
															)}
														</div>
													</TableCell>
												</TableRow>
											);
										})}
										{!visibleMappings.length ? (
											<TableRow>
												<TableCell
													colSpan={5}
													className="h-28 text-center text-muted-foreground"
												>
													{t.noRecords}
												</TableCell>
											</TableRow>
										) : null}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="results">
					<Card>
						<CardHeader>
							<CardTitle>{t.results}</CardTitle>
							<CardDescription>{t.resultsDescription}</CardDescription>
						</CardHeader>
						<CardContent className="px-0">
							<div className="overflow-auto border-y">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="min-w-80 pl-6">
												{t.codeAndName}
											</TableHead>
											<TableHead>{t.unit}</TableHead>
											<TableHead className="text-right">
												{t.contractQuantity}
											</TableHead>
											<TableHead className="text-right">
												{t.plannedWork}
											</TableHead>
											<TableHead className="text-right">
												{t.plannedMaterials}
											</TableHead>
											<TableHead className="text-right">
												{t.plannedTotal}
											</TableHead>
											<TableHead className="text-right">
												{t.actualWork}
											</TableHead>
											<TableHead className="text-right">
												{t.actualMaterials}
											</TableHead>
											<TableHead className="text-right">
												{t.actualTotal}
											</TableHead>
											<TableHead className="pr-6 text-right">
												{t.remaining}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.view.resultRows.map((row, index) => {
											const previous = data.view.resultRows[index - 1];
											const showCategory =
												!previous || previous.categoryCode !== row.categoryCode;
											return (
												<Fragment key={row.id}>
													{showCategory &&
													(row.categoryCode || row.categoryName) ? (
														<TableRow
															key={`category:${row.categoryCode}:${index}`}
															className="bg-muted/60"
														>
															<TableCell
																colSpan={10}
																className="pl-6 font-semibold"
															>
																{[row.categoryCode, row.categoryName]
																	.filter(Boolean)
																	.join(" ")}
															</TableCell>
														</TableRow>
													) : null}
													<TableRow>
														<TableCell
															className={`pl-6 ${row.parentId ? "font-normal text-muted-foreground" : "font-medium"}`}
														>
															<div className={row.parentId ? "pl-5" : ""}>
																{row.parentId ? "↳ " : ""}
																{row.code ? `${row.code} ` : ""}
																{row.name}
															</div>
															<Badge
																variant="outline"
																className="mt-1 ml-5 text-[10px]"
															>
																{row.kind === "work"
																	? t.work
																	: row.kind === "material"
																		? t.material
																		: t.mechanism}
															</Badge>
														</TableCell>
														<TableCell>{row.unit || "—"}</TableCell>
														<TableCell className="text-right">
															{formatNumber(row.plannedQuantity, locale)}
														</TableCell>
														<TableCell className="text-right">
															{formatCurrency(row.plannedWorkCost, locale)}
														</TableCell>
														<TableCell className="text-right">
															{formatCurrency(row.plannedMaterialCost, locale)}
														</TableCell>
														<TableCell className="text-right font-medium">
															{formatCurrency(row.plannedTotalCost, locale)}
														</TableCell>
														<TableCell className="text-right">
															{formatCurrency(row.actualWorkCost, locale)}
														</TableCell>
														<TableCell className="text-right">
															{formatCurrency(row.actualMaterialCost, locale)}
														</TableCell>
														<TableCell className="text-right font-medium">
															{formatCurrency(row.actualTotalCost, locale)}
														</TableCell>
														<TableCell
															className={`pr-6 text-right font-medium ${row.variance < 0 ? "text-red-600" : ""}`}
														>
															{formatCurrency(row.variance, locale)}
														</TableCell>
													</TableRow>
												</Fragment>
											);
										})}
										{!data.view.resultRows.length ? (
											<TableRow>
												<TableCell
													colSpan={10}
													className="h-28 text-center text-muted-foreground"
												>
													{t.noDocument}
												</TableCell>
											</TableRow>
										) : null}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
