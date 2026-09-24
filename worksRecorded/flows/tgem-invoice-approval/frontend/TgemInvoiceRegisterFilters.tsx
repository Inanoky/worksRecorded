"use client";

import {
	ChevronDown,
	Clock3,
	Download,
	Loader2,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	countActiveTgemInvoiceFilters,
	createDefaultTgemInvoiceRegisterFilters,
	TGEM_FILTER_MISSING_VALUE,
	type TgemInvoiceFilterFacet,
	type TgemInvoiceMissingField,
	type TgemInvoiceRegisterFacets,
	type TgemInvoiceRegisterFilters as TgemInvoiceRegisterFilterState,
} from "@/lib/tgem-invoice-approval/register-filtering";

type ValueLabels = {
	statuses: Record<string, string>;
	sources: Record<string, string>;
	processingStatuses: Record<string, string>;
};

function getCopy(language?: string | null) {
	if (language === "lv") {
		return {
			search:
				"Meklēt numuru, piegādātāju, reģistrācijas numuru, atsauci vai kontu",
			status: "Statuss",
			allStatuses: "Visi statusi",
			waitingForMe: "Gaida mani",
			moreFilters: "Vairāk filtru",
			activeFilters: "Aktīvie filtri",
			clearAll: "Notīrīt visus filtrus",
			export: "Eksportēt Excel",
			exportCount: "Eksportēt rēķinus",
			exporting: "Veido Excel…",
			exportFailed: "Excel failu neizdevās izveidot. Mēģiniet vēlreiz.",
			invoiceGroup: "Rēķins",
			approvalGroup: "Apstiprināšana",
			datesGroup: "Datumi",
			amountsGroup: "Summas",
			processingGroup: "Apstrāde",
			supplier: "Piegādātājs",
			invoiceType: "Rēķina veids",
			debit: "Debeta rēķins",
			credit: "Kredītrēķins",
			costCode: "Izmaksu kods",
			source: "Avots",
			currency: "Valūta",
			missingData: "Trūkstošie dati",
			approver: "Pašreizējais apstiprinātājs",
			ocrStatus: "OCR statuss",
			extractionStatus: "MI apstrāde",
			invoiceDate: "Rēķina datums",
			dueDate: "Apmaksas termiņš",
			receivedDate: "Saņemšanas datums",
			approvedDate: "Apstiprināšanas datums",
			from: "No",
			to: "Līdz",
			netAmount: "Kopā bez PVN",
			grossAmount: "Kopā ar PVN",
			minimum: "Minimālā summa",
			maximum: "Maksimālā summa",
			missing: "Nav norādīts",
			noOptions: "Nav pieejamu vērtību",
			noMatches: "Nav atrasta neviena vērtība",
			searchOptions: "Meklēt izvēlnē",
			clearSelection: "Notīrīt",
			selected: "atlasīti",
			missingFields: {
				invoiceNumber: "Rēķina numurs",
				supplierName: "Piegādātājs",
				invoiceDate: "Rēķina datums",
				dueDate: "Apmaksas termiņš",
				subtotal: "Summa bez PVN",
				total: "Kopsumma",
				costCode: "Izmaksu kods",
			},
		};
	}
	if (language === "ru") {
		return {
			search: "Поиск по номеру, поставщику, регистрации, ссылке или счёту",
			status: "Статус",
			allStatuses: "Все статусы",
			waitingForMe: "Ожидают меня",
			moreFilters: "Другие фильтры",
			activeFilters: "Активные фильтры",
			clearAll: "Сбросить все фильтры",
			export: "Экспорт в Excel",
			exportCount: "Экспортировать счета",
			exporting: "Создание Excel…",
			exportFailed: "Не удалось создать файл Excel. Попробуйте ещё раз.",
			invoiceGroup: "Счёт",
			approvalGroup: "Согласование",
			datesGroup: "Даты",
			amountsGroup: "Суммы",
			processingGroup: "Обработка",
			supplier: "Поставщик",
			invoiceType: "Тип счёта",
			debit: "Дебетовый счёт",
			credit: "Кредитный счёт",
			costCode: "Код затрат",
			source: "Источник",
			currency: "Валюта",
			missingData: "Недостающие данные",
			approver: "Текущий согласующий",
			ocrStatus: "Статус OCR",
			extractionStatus: "Обработка ИИ",
			invoiceDate: "Дата счёта",
			dueDate: "Срок оплаты",
			receivedDate: "Дата получения",
			approvedDate: "Дата согласования",
			from: "От",
			to: "До",
			netAmount: "Итого без НДС",
			grossAmount: "Итого с НДС",
			minimum: "Минимальная сумма",
			maximum: "Максимальная сумма",
			missing: "Не указано",
			noOptions: "Нет доступных значений",
			noMatches: "Значения не найдены",
			searchOptions: "Поиск в списке",
			clearSelection: "Сбросить",
			selected: "выбрано",
			missingFields: {
				invoiceNumber: "Номер счёта",
				supplierName: "Поставщик",
				invoiceDate: "Дата счёта",
				dueDate: "Срок оплаты",
				subtotal: "Сумма без НДС",
				total: "Итоговая сумма",
				costCode: "Код затрат",
			},
		};
	}
	return {
		search: "Search number, supplier, registration, reference, or bank account",
		status: "Status",
		allStatuses: "All statuses",
		waitingForMe: "Waiting for me",
		moreFilters: "More filters",
		activeFilters: "Active filters",
		clearAll: "Clear all filters",
		export: "Export Excel",
		exportCount: "Export invoices",
		exporting: "Building Excel…",
		exportFailed: "Could not create the Excel file. Try again.",
		invoiceGroup: "Invoice",
		approvalGroup: "Approval",
		datesGroup: "Dates",
		amountsGroup: "Amounts",
		processingGroup: "Processing",
		supplier: "Supplier",
		invoiceType: "Invoice type",
		debit: "Debit invoice",
		credit: "Credit invoice",
		costCode: "Cost code",
		source: "Source",
		currency: "Currency",
		missingData: "Missing data",
		approver: "Current approver",
		ocrStatus: "OCR status",
		extractionStatus: "AI processing",
		invoiceDate: "Invoice date",
		dueDate: "Due date",
		receivedDate: "Received date",
		approvedDate: "Approved date",
		from: "From",
		to: "To",
		netAmount: "Total excl. VAT",
		grossAmount: "Total incl. VAT",
		minimum: "Minimum amount",
		maximum: "Maximum amount",
		missing: "Not provided",
		noOptions: "No values available",
		noMatches: "No matching values",
		searchOptions: "Search options",
		clearSelection: "Clear",
		selected: "selected",
		missingFields: {
			invoiceNumber: "Invoice number",
			supplierName: "Supplier",
			invoiceDate: "Invoice date",
			dueDate: "Due date",
			subtotal: "Total excl. VAT",
			total: "Gross total",
			costCode: "Cost code",
		},
	};
}

type Copy = ReturnType<typeof getCopy>;

function localizedOptions(
	options: TgemInvoiceFilterFacet[],
	labels: Record<string, string> | undefined,
	missingLabel: string,
) {
	return options.map((option) => ({
		...option,
		label:
			option.value === TGEM_FILTER_MISSING_VALUE
				? missingLabel
				: (labels?.[option.value] ?? option.label),
	}));
}

function MultiSelectFilter({
	label,
	options,
	values,
	onChange,
	copy,
}: {
	label: string;
	options: TgemInvoiceFilterFacet[];
	values: string[];
	onChange: (values: string[]) => void;
	copy: Copy;
}) {
	const optionListId = React.useId();
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const normalizedSearch = search.trim().toLocaleLowerCase();
	const visibleOptions = normalizedSearch
		? options.filter((option) =>
				`${option.label} ${option.value}`
					.toLocaleLowerCase()
					.includes(normalizedSearch),
			)
		: options;
	const searchInputId = `${optionListId}-search`;

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setSearch("");
			}}
		>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className="w-full justify-between bg-background font-normal"
				>
					<span className="truncate">
						{label}
						{values.length ? ` · ${values.length} ${copy.selected}` : ""}
					</span>
					<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-72 p-2">
				<div className="flex items-center justify-between gap-2 px-2 py-1">
					<div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						{label}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={values.length === 0}
						onClick={() => onChange([])}
						aria-label={`${copy.clearSelection}: ${label}`}
						className="h-6 px-1.5 text-[11px] font-medium text-tgem-primary disabled:text-muted-foreground"
					>
						{copy.clearSelection}
					</Button>
				</div>
				<div className="relative mb-1.5">
					<label htmlFor={searchInputId} className="sr-only">
						{copy.searchOptions}: {label}
					</label>
					<Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						id={searchInputId}
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={copy.searchOptions}
						className="h-8 bg-background pr-2 pl-8 text-sm"
					/>
				</div>
				<div className="max-h-64 overflow-y-auto">
					{visibleOptions.length ? (
						visibleOptions.map((option) => {
							const checked = values.includes(option.value);
							const checkboxId = `${optionListId}-${options.indexOf(option)}`;
							return (
								<label
									key={option.value}
									htmlFor={checkboxId}
									className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
								>
									<Checkbox
										className="data-[state=checked]:border-tgem-primary data-[state=checked]:bg-tgem-primary focus-visible:border-tgem-primary focus-visible:ring-tgem-primary/40 dark:data-[state=checked]:bg-tgem-primary"
										id={checkboxId}
										checked={checked}
										onCheckedChange={(next) =>
											onChange(
												next === true
													? [...values, option.value]
													: values.filter((value) => value !== option.value),
											)
										}
									/>
									<span className="min-w-0 truncate">{option.label}</span>
								</label>
							);
						})
					) : (
						<p className="px-2 py-3 text-sm text-muted-foreground">
							{options.length ? copy.noMatches : copy.noOptions}
						</p>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function FilterGroup({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-2 rounded-lg border border-slate-200/80 bg-background p-3 dark:border-slate-800">
			<h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
				{title}
			</h3>
			{children}
		</section>
	);
}

function RangeInputs({
	label,
	from,
	to,
	type,
	copy,
	onChange,
}: {
	label: string;
	from: string;
	to: string;
	type: "date" | "number";
	copy: Copy;
	onChange: (range: { from: string; to: string }) => void;
}) {
	return (
		<fieldset className="space-y-1.5">
			<legend className="text-xs font-medium text-muted-foreground">
				{label}
			</legend>
			<div className="grid grid-cols-2 gap-2">
				<Input
					type={type}
					step={type === "number" ? "any" : undefined}
					aria-label={`${label}: ${type === "number" ? copy.minimum : copy.from}`}
					placeholder={type === "number" ? copy.minimum : copy.from}
					value={from}
					onChange={(event) => onChange({ from: event.target.value, to })}
					className="bg-background"
				/>
				<Input
					type={type}
					step={type === "number" ? "any" : undefined}
					aria-label={`${label}: ${type === "number" ? copy.maximum : copy.to}`}
					placeholder={type === "number" ? copy.maximum : copy.to}
					value={to}
					onChange={(event) => onChange({ from, to: event.target.value })}
					className="bg-background"
				/>
			</div>
		</fieldset>
	);
}

type Chip = { key: string; label: string; remove: () => void };

export function TgemInvoiceRegisterFilters({
	filters,
	facets,
	currentUserId,
	matchingCount,
	language,
	valueLabels,
	onChange,
	onExport,
}: {
	filters: TgemInvoiceRegisterFilterState;
	facets: TgemInvoiceRegisterFacets;
	currentUserId: string;
	matchingCount: number;
	language?: string | null;
	valueLabels: ValueLabels;
	onChange: (filters: TgemInvoiceRegisterFilterState) => void;
	onExport: () => Promise<void>;
}) {
	const copy = getCopy(language);
	const [open, setOpen] = React.useState(false);
	const [exporting, setExporting] = React.useState(false);
	const [exportError, setExportError] = React.useState(false);
	const searchId = React.useId();
	const activeCount = countActiveTgemInvoiceFilters(filters);
	const update = <Key extends keyof TgemInvoiceRegisterFilterState>(
		key: Key,
		value: TgemInvoiceRegisterFilterState[Key],
	) => onChange({ ...filters, [key]: value });
	const facetOptions = {
		statuses: localizedOptions(
			facets.statuses,
			valueLabels.statuses,
			copy.missing,
		),
		suppliers: localizedOptions(facets.suppliers, undefined, copy.missing),
		approvers: localizedOptions(facets.approvers, undefined, copy.missing),
		costCodes: localizedOptions(facets.costCodes, undefined, copy.missing),
		sources: localizedOptions(
			facets.sources,
			valueLabels.sources,
			copy.missing,
		),
		currencies: localizedOptions(facets.currencies, undefined, copy.missing),
		ocrStatuses: localizedOptions(
			facets.ocrStatuses,
			valueLabels.processingStatuses,
			copy.missing,
		),
		extractionStatuses: localizedOptions(
			facets.extractionStatuses,
			valueLabels.processingStatuses,
			copy.missing,
		),
	};
	const optionLabel = (options: TgemInvoiceFilterFacet[], value: string) =>
		options.find((option) => option.value === value)?.label ?? value;
	const chips: Chip[] = [];
	if (filters.search.trim()) {
		chips.push({
			key: "search",
			label: `“${filters.search.trim()}”`,
			remove: () => update("search", ""),
		});
	}
	const addValueChips = (
		key:
			| "statuses"
			| "suppliers"
			| "approverUserIds"
			| "invoiceTypes"
			| "costCodes"
			| "sources"
			| "currencies"
			| "ocrStatuses"
			| "extractionStatuses"
			| "missingFields",
		label: string,
		options: TgemInvoiceFilterFacet[],
	) => {
		for (const value of filters[key]) {
			chips.push({
				key: `${key}-${value}`,
				label: `${label}: ${optionLabel(options, value)}`,
				remove: () =>
					update(
						key,
						filters[key].filter((current) => current !== value) as never,
					),
			});
		}
	};
	addValueChips("statuses", copy.status, facetOptions.statuses);
	addValueChips("suppliers", copy.supplier, facetOptions.suppliers);
	addValueChips("approverUserIds", copy.approver, facetOptions.approvers);
	addValueChips("invoiceTypes", copy.invoiceType, [
		{ value: "debit", label: copy.debit },
		{ value: "credit", label: copy.credit },
	]);
	addValueChips("costCodes", copy.costCode, facetOptions.costCodes);
	addValueChips("sources", copy.source, facetOptions.sources);
	addValueChips("currencies", copy.currency, facetOptions.currencies);
	addValueChips("ocrStatuses", copy.ocrStatus, facetOptions.ocrStatuses);
	addValueChips(
		"extractionStatuses",
		copy.extractionStatus,
		facetOptions.extractionStatuses,
	);
	addValueChips(
		"missingFields",
		copy.missingData,
		Object.entries(copy.missingFields).map(([value, label]) => ({
			value,
			label,
		})),
	);
	const addRangeChip = (
		key: string,
		label: string,
		from: string,
		to: string,
		remove: () => void,
	) => {
		if (!from && !to) return;
		chips.push({
			key,
			label: `${label}: ${from || "…"}–${to || "…"}`,
			remove,
		});
	};
	addRangeChip(
		"invoice-date",
		copy.invoiceDate,
		filters.invoiceDateFrom,
		filters.invoiceDateTo,
		() => onChange({ ...filters, invoiceDateFrom: "", invoiceDateTo: "" }),
	);
	addRangeChip(
		"due-date",
		copy.dueDate,
		filters.dueDateFrom,
		filters.dueDateTo,
		() => onChange({ ...filters, dueDateFrom: "", dueDateTo: "" }),
	);
	addRangeChip(
		"received-date",
		copy.receivedDate,
		filters.receivedDateFrom,
		filters.receivedDateTo,
		() => onChange({ ...filters, receivedDateFrom: "", receivedDateTo: "" }),
	);
	addRangeChip(
		"approved-date",
		copy.approvedDate,
		filters.approvedDateFrom,
		filters.approvedDateTo,
		() => onChange({ ...filters, approvedDateFrom: "", approvedDateTo: "" }),
	);
	addRangeChip(
		"net-amount",
		copy.netAmount,
		filters.netAmountMin,
		filters.netAmountMax,
		() => onChange({ ...filters, netAmountMin: "", netAmountMax: "" }),
	);
	addRangeChip(
		"gross-amount",
		copy.grossAmount,
		filters.grossAmountMin,
		filters.grossAmountMax,
		() => onChange({ ...filters, grossAmountMin: "", grossAmountMax: "" }),
	);
	const waitingForMe =
		filters.approverUserIds.length === 1 &&
		filters.approverUserIds[0] === currentUserId;

	async function exportRows() {
		if (exporting || matchingCount === 0) return;
		setExporting(true);
		setExportError(false);
		try {
			await onExport();
		} catch {
			setExportError(true);
		} finally {
			setExporting(false);
		}
	}

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<div className="mt-4 grid gap-2 xl:grid-cols-[minmax(18rem,1fr)_auto_auto_auto_auto]">
				<div className="relative min-w-0">
					<label htmlFor={searchId} className="sr-only">
						{copy.search}
					</label>
					<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id={searchId}
						value={filters.search}
						onChange={(event) => update("search", event.target.value)}
						placeholder={copy.search}
						className="bg-background pl-9"
					/>
				</div>
				<div className="min-w-48">
					<MultiSelectFilter
						label={copy.status}
						options={facetOptions.statuses}
						values={filters.statuses}
						onChange={(values) => update("statuses", values)}
						copy={copy}
					/>
				</div>
				<Button
					type="button"
					variant="outline"
					aria-pressed={waitingForMe}
					onClick={() =>
						update("approverUserIds", waitingForMe ? [] : [currentUserId])
					}
					className={
						waitingForMe
							? "border-[#7CA5E8] bg-[#F1F6FF] text-tgem-primary dark:border-tgem-primary/50 dark:bg-tgem-primary/15 dark:text-blue-200"
							: "bg-background"
					}
				>
					<Clock3 className="h-4 w-4" />
					{copy.waitingForMe}
				</Button>
				<CollapsibleTrigger asChild>
					<Button type="button" variant="outline" className="bg-background">
						<SlidersHorizontal className="h-4 w-4" />
						{copy.moreFilters}
						{activeCount ? (
							<span className="rounded-full bg-[#DCE9FC] px-1.5 py-0.5 text-[11px] font-semibold text-tgem-primary dark:bg-tgem-primary/25 dark:text-blue-100">
								{activeCount}
							</span>
						) : null}
						<ChevronDown
							className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
						/>
					</Button>
				</CollapsibleTrigger>
				<Button
					type="button"
					variant="outline"
					onClick={() => void exportRows()}
					disabled={exporting || matchingCount === 0}
					className="border-tgem-primary/30 bg-tgem-primary/10 text-tgem-primary shadow-sm hover:border-tgem-primary/50 hover:bg-tgem-primary/20 hover:text-tgem-primary dark:bg-tgem-primary/10 dark:hover:bg-tgem-primary/20"
					aria-label={`${copy.exportCount}: ${matchingCount}`}
				>
					{exporting ? (
						<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
					) : (
						<Download className="h-4 w-4" />
					)}
					{exporting ? copy.exporting : copy.export}
				</Button>
			</div>

			<section
				aria-label={copy.activeFilters}
				data-testid="tgem-active-filter-slot"
				className={`mt-3 flex min-h-7 flex-wrap items-center gap-2 border-l-2 pl-3 ${chips.length ? "border-tgem-primary" : "border-transparent"}`}
			>
				{chips.length ? (
					<>
						<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
							{copy.activeFilters}
						</span>
						{chips.map((chip) => (
							<button
								key={chip.key}
								type="button"
								onClick={chip.remove}
								className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#B8CDF1] bg-[#EEF4FF] px-2.5 py-1 text-xs font-medium text-slate-950 transition hover:border-[#7CA5E8] hover:text-tgem-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50 dark:border-tgem-primary/40 dark:bg-tgem-primary/15 dark:text-blue-100"
							>
								<span className="truncate">{chip.label}</span>
								<X className="h-3 w-3 shrink-0" />
							</button>
						))}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() =>
								onChange(createDefaultTgemInvoiceRegisterFilters())
							}
							className="h-7 px-2 text-xs"
						>
							{copy.clearAll}
						</Button>
					</>
				) : null}
			</section>

			<CollapsibleContent>
				<div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 md:grid-cols-2 xl:grid-cols-5 dark:border-slate-800">
					<FilterGroup title={copy.invoiceGroup}>
						<MultiSelectFilter
							label={copy.supplier}
							options={facetOptions.suppliers}
							values={filters.suppliers}
							onChange={(values) => update("suppliers", values)}
							copy={copy}
						/>
						<MultiSelectFilter
							label={copy.invoiceType}
							options={[
								{ value: "debit", label: copy.debit },
								{ value: "credit", label: copy.credit },
							]}
							values={filters.invoiceTypes}
							onChange={(values) =>
								update("invoiceTypes", values as Array<"debit" | "credit">)
							}
							copy={copy}
						/>
						<MultiSelectFilter
							label={copy.costCode}
							options={facetOptions.costCodes}
							values={filters.costCodes}
							onChange={(values) => update("costCodes", values)}
							copy={copy}
						/>
						<MultiSelectFilter
							label={copy.source}
							options={facetOptions.sources}
							values={filters.sources}
							onChange={(values) => update("sources", values)}
							copy={copy}
						/>
						<MultiSelectFilter
							label={copy.currency}
							options={facetOptions.currencies}
							values={filters.currencies}
							onChange={(values) => update("currencies", values)}
							copy={copy}
						/>
						<MultiSelectFilter
							label={copy.missingData}
							options={Object.entries(copy.missingFields).map(
								([value, label]) => ({ value, label }),
							)}
							values={filters.missingFields}
							onChange={(values) =>
								update("missingFields", values as TgemInvoiceMissingField[])
							}
							copy={copy}
						/>
					</FilterGroup>

					<FilterGroup title={copy.approvalGroup}>
						<MultiSelectFilter
							label={copy.approver}
							options={facetOptions.approvers}
							values={filters.approverUserIds}
							onChange={(values) => update("approverUserIds", values)}
							copy={copy}
						/>
					</FilterGroup>

					<FilterGroup title={copy.datesGroup}>
						<RangeInputs
							label={copy.invoiceDate}
							from={filters.invoiceDateFrom}
							to={filters.invoiceDateTo}
							type="date"
							copy={copy}
							onChange={({ from, to }) =>
								onChange({
									...filters,
									invoiceDateFrom: from,
									invoiceDateTo: to,
								})
							}
						/>
						<RangeInputs
							label={copy.dueDate}
							from={filters.dueDateFrom}
							to={filters.dueDateTo}
							type="date"
							copy={copy}
							onChange={({ from, to }) =>
								onChange({ ...filters, dueDateFrom: from, dueDateTo: to })
							}
						/>
						<RangeInputs
							label={copy.receivedDate}
							from={filters.receivedDateFrom}
							to={filters.receivedDateTo}
							type="date"
							copy={copy}
							onChange={({ from, to }) =>
								onChange({
									...filters,
									receivedDateFrom: from,
									receivedDateTo: to,
								})
							}
						/>
						<RangeInputs
							label={copy.approvedDate}
							from={filters.approvedDateFrom}
							to={filters.approvedDateTo}
							type="date"
							copy={copy}
							onChange={({ from, to }) =>
								onChange({
									...filters,
									approvedDateFrom: from,
									approvedDateTo: to,
								})
							}
						/>
					</FilterGroup>

					<FilterGroup title={copy.amountsGroup}>
						<RangeInputs
							label={copy.netAmount}
							from={filters.netAmountMin}
							to={filters.netAmountMax}
							type="number"
							copy={copy}
							onChange={({ from, to }) =>
								onChange({ ...filters, netAmountMin: from, netAmountMax: to })
							}
						/>
						<RangeInputs
							label={copy.grossAmount}
							from={filters.grossAmountMin}
							to={filters.grossAmountMax}
							type="number"
							copy={copy}
							onChange={({ from, to }) =>
								onChange({
									...filters,
									grossAmountMin: from,
									grossAmountMax: to,
								})
							}
						/>
					</FilterGroup>

					<FilterGroup title={copy.processingGroup}>
						<MultiSelectFilter
							label={copy.ocrStatus}
							options={facetOptions.ocrStatuses}
							values={filters.ocrStatuses}
							onChange={(values) => update("ocrStatuses", values)}
							copy={copy}
						/>
						<MultiSelectFilter
							label={copy.extractionStatus}
							options={facetOptions.extractionStatuses}
							values={filters.extractionStatuses}
							onChange={(values) => update("extractionStatuses", values)}
							copy={copy}
						/>
					</FilterGroup>
				</div>
			</CollapsibleContent>
			{exportError ? (
				<p role="alert" className="mt-2 text-sm text-destructive">
					{copy.exportFailed}
				</p>
			) : null}
		</Collapsible>
	);
}
