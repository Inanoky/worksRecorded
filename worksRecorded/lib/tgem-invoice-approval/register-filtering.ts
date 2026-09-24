import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";

export const TGEM_FILTER_MISSING_VALUE = "__missing__";

export type TgemInvoiceMissingField =
	| "invoiceNumber"
	| "supplierName"
	| "invoiceDate"
	| "dueDate"
	| "subtotal"
	| "total"
	| "costCode";

export type TgemInvoiceRegisterFilters = {
	search: string;
	statuses: string[];
	suppliers: string[];
	approverUserIds: string[];
	invoiceTypes: Array<"debit" | "credit">;
	costCodes: string[];
	sources: string[];
	currencies: string[];
	ocrStatuses: string[];
	extractionStatuses: string[];
	missingFields: TgemInvoiceMissingField[];
	invoiceDateFrom: string;
	invoiceDateTo: string;
	dueDateFrom: string;
	dueDateTo: string;
	receivedDateFrom: string;
	receivedDateTo: string;
	approvedDateFrom: string;
	approvedDateTo: string;
	netAmountMin: string;
	netAmountMax: string;
	grossAmountMin: string;
	grossAmountMax: string;
};

export type TgemInvoiceFilterFacet = {
	value: string;
	label: string;
};

export type TgemInvoiceRegisterFacets = {
	statuses: TgemInvoiceFilterFacet[];
	suppliers: TgemInvoiceFilterFacet[];
	approvers: TgemInvoiceFilterFacet[];
	costCodes: TgemInvoiceFilterFacet[];
	sources: TgemInvoiceFilterFacet[];
	currencies: TgemInvoiceFilterFacet[];
	ocrStatuses: TgemInvoiceFilterFacet[];
	extractionStatuses: TgemInvoiceFilterFacet[];
};

export function createDefaultTgemInvoiceRegisterFilters(): TgemInvoiceRegisterFilters {
	return {
		search: "",
		statuses: [],
		suppliers: [],
		approverUserIds: [],
		invoiceTypes: [],
		costCodes: [],
		sources: [],
		currencies: [],
		ocrStatuses: [],
		extractionStatuses: [],
		missingFields: [],
		invoiceDateFrom: "",
		invoiceDateTo: "",
		dueDateFrom: "",
		dueDateTo: "",
		receivedDateFrom: "",
		receivedDateTo: "",
		approvedDateFrom: "",
		approvedDateTo: "",
		netAmountMin: "",
		netAmountMax: "",
		grossAmountMin: "",
		grossAmountMax: "",
	};
}

export function getTgemCurrentApprovalStep(invoice: TgemDashboardInvoice) {
	return invoice.approvalSteps.find(
		(step) =>
			step.approvalRound === invoice.approvalRound && step.status === "current",
	);
}

function normalized(value: string | null | undefined) {
	return value?.trim().toLocaleLowerCase() ?? "";
}

function matchesSelectedValue(
	value: string | null | undefined,
	selectedValues: readonly string[],
) {
	if (selectedValues.length === 0) return true;
	const normalizedValue = value?.trim() || null;
	return normalizedValue
		? selectedValues.includes(normalizedValue)
		: selectedValues.includes(TGEM_FILTER_MISSING_VALUE);
}

function calendarDateKey(value: string | null) {
	return value ? value.slice(0, 10) : null;
}

function timestampDateKey(value: string | null, timeZone: string) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((item) => item.type === type)?.value;
	const year = part("year");
	const month = part("month");
	const day = part("day");
	return year && month && day ? `${year}-${month}-${day}` : null;
}

function matchesDateRange(value: string | null, from: string, to: string) {
	if (!from && !to) return true;
	if (!value) return false;
	return (!from || value >= from) && (!to || value <= to);
}

function optionalNumber(value: string) {
	if (!value.trim()) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function matchesAmountRange(
	value: string | null,
	minimum: string,
	maximum: string,
) {
	const min = optionalNumber(minimum);
	const max = optionalNumber(maximum);
	if (min === null && max === null) return true;
	if (value === null || !value.trim()) return false;
	const parsedValue = Number(value);
	if (!Number.isFinite(parsedValue)) return false;
	return (
		(min === null || parsedValue >= min) && (max === null || parsedValue <= max)
	);
}

function isMissing(
	invoice: TgemDashboardInvoice,
	field: TgemInvoiceMissingField,
) {
	return !invoice[field]?.trim();
}

export function filterTgemInvoiceRegister(
	invoices: readonly TgemDashboardInvoice[],
	filters: TgemInvoiceRegisterFilters,
	options: { timeZone?: string } = {},
) {
	const search = normalized(filters.search);
	const timeZone = options.timeZone ?? "Europe/Riga";

	return invoices.filter((invoice) => {
		const currentStep = getTgemCurrentApprovalStep(invoice);
		const matchesSearch =
			!search ||
			[
				invoice.invoiceNumber,
				invoice.supplierName,
				invoice.supplierRegistrationNo,
				invoice.reference,
				invoice.bankAccount,
			].some((value) => normalized(value).includes(search));
		const matchesStatus =
			filters.statuses.length === 0 ||
			filters.statuses.includes(invoice.status);
		const matchesSupplier = matchesSelectedValue(
			invoice.supplierName,
			filters.suppliers,
		);
		const matchesApprover = matchesSelectedValue(
			currentStep?.approverUserId,
			filters.approverUserIds,
		);
		const matchesInvoiceType =
			filters.invoiceTypes.length === 0 ||
			filters.invoiceTypes.includes(invoice.invoiceType);
		const matchesCostCode = matchesSelectedValue(
			invoice.costCode,
			filters.costCodes,
		);
		const matchesSource =
			filters.sources.length === 0 || filters.sources.includes(invoice.source);
		const matchesCurrency = matchesSelectedValue(
			invoice.currency,
			filters.currencies,
		);
		const matchesOcr =
			filters.ocrStatuses.length === 0 ||
			filters.ocrStatuses.includes(invoice.ocrStatus);
		const matchesExtraction =
			filters.extractionStatuses.length === 0 ||
			filters.extractionStatuses.includes(invoice.extractionStatus);
		const matchesMissing =
			filters.missingFields.length === 0 ||
			filters.missingFields.some((field) => isMissing(invoice, field));

		return (
			matchesSearch &&
			matchesStatus &&
			matchesSupplier &&
			matchesApprover &&
			matchesInvoiceType &&
			matchesCostCode &&
			matchesSource &&
			matchesCurrency &&
			matchesOcr &&
			matchesExtraction &&
			matchesMissing &&
			matchesDateRange(
				calendarDateKey(invoice.invoiceDate),
				filters.invoiceDateFrom,
				filters.invoiceDateTo,
			) &&
			matchesDateRange(
				calendarDateKey(invoice.dueDate),
				filters.dueDateFrom,
				filters.dueDateTo,
			) &&
			matchesDateRange(
				timestampDateKey(invoice.receivedAt, timeZone),
				filters.receivedDateFrom,
				filters.receivedDateTo,
			) &&
			matchesDateRange(
				timestampDateKey(invoice.approvedAt, timeZone),
				filters.approvedDateFrom,
				filters.approvedDateTo,
			) &&
			matchesAmountRange(
				invoice.subtotal,
				filters.netAmountMin,
				filters.netAmountMax,
			) &&
			matchesAmountRange(
				invoice.total,
				filters.grossAmountMin,
				filters.grossAmountMax,
			)
		);
	});
}

function uniqueFacets(
	values: Array<{ value: string | null | undefined; label?: string | null }>,
	locale: string,
) {
	const facets = new Map<string, string>();
	for (const item of values) {
		const value = item.value?.trim() || TGEM_FILTER_MISSING_VALUE;
		if (!facets.has(value)) facets.set(value, item.label?.trim() || value);
	}
	return [...facets.entries()]
		.map(([value, label]) => ({ value, label }))
		.sort((left, right) =>
			left.value === TGEM_FILTER_MISSING_VALUE
				? 1
				: right.value === TGEM_FILTER_MISSING_VALUE
					? -1
					: left.label.localeCompare(right.label, locale, {
							numeric: true,
							sensitivity: "base",
						}),
		);
}

export function getTgemInvoiceRegisterFacets(
	invoices: readonly TgemDashboardInvoice[],
	locale: string,
): TgemInvoiceRegisterFacets {
	return {
		statuses: uniqueFacets(
			invoices.map((invoice) => ({ value: invoice.status })),
			locale,
		),
		suppliers: uniqueFacets(
			invoices.map((invoice) => ({ value: invoice.supplierName })),
			locale,
		),
		approvers: uniqueFacets(
			invoices.map((invoice) => {
				const currentStep = getTgemCurrentApprovalStep(invoice);
				return {
					value: currentStep?.approverUserId,
					label: currentStep?.approverName,
				};
			}),
			locale,
		),
		costCodes: uniqueFacets(
			invoices.map((invoice) => ({ value: invoice.costCode })),
			locale,
		),
		sources: uniqueFacets(
			invoices.map((invoice) => ({ value: invoice.source })),
			locale,
		),
		currencies: uniqueFacets(
			invoices.map((invoice) => ({ value: invoice.currency })),
			locale,
		),
		ocrStatuses: uniqueFacets(
			invoices.map((invoice) => ({ value: invoice.ocrStatus })),
			locale,
		),
		extractionStatuses: uniqueFacets(
			invoices.map((invoice) => ({ value: invoice.extractionStatus })),
			locale,
		),
	};
}

export function countActiveTgemInvoiceFilters(
	filters: TgemInvoiceRegisterFilters,
) {
	return (
		(filters.search.trim() ? 1 : 0) +
		filters.statuses.length +
		filters.suppliers.length +
		filters.approverUserIds.length +
		filters.invoiceTypes.length +
		filters.costCodes.length +
		filters.sources.length +
		filters.currencies.length +
		filters.ocrStatuses.length +
		filters.extractionStatuses.length +
		filters.missingFields.length +
		(filters.invoiceDateFrom || filters.invoiceDateTo ? 1 : 0) +
		(filters.dueDateFrom || filters.dueDateTo ? 1 : 0) +
		(filters.receivedDateFrom || filters.receivedDateTo ? 1 : 0) +
		(filters.approvedDateFrom || filters.approvedDateTo ? 1 : 0) +
		(filters.netAmountMin || filters.netAmountMax ? 1 : 0) +
		(filters.grossAmountMin || filters.grossAmountMax ? 1 : 0)
	);
}
