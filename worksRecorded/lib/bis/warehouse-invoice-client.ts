import { resolveInvoiceSupplierName } from "@/lib/bis/invoice-supplier-map";
import {
	type ClientWarehouseMaterialRow,
	queryClientWarehouseMaterials,
} from "@/lib/bis/warehouse-client-query";
import type { WarehouseMaterialQueryInput } from "@/lib/bis/warehouse-material-query";

export type WarehouseInvoiceLocator =
	| { type: "batch"; value: string }
	| { type: "photo"; value: string }
	| {
			type: "number";
			invoiceNumber: string;
			supplierName: string | null;
			invoiceDate: string | null;
	  };

export type WarehouseInvoiceSummary = {
	key: string;
	locator: WarehouseInvoiceLocator;
	invoiceNumber: string | null;
	supplierName: string | null;
	invoiceDate: Date | null;
	createdAt: Date;
	sourcePhoto: string | null;
	itemCount: number;
	totalCost: number;
	sentCount: number;
	movableRowIds: string[];
};

export type WarehouseInvoicePage = {
	invoices: WarehouseInvoiceSummary[];
	nextOffset: number | null;
	totalCount: number;
};

type InvoiceSourceRow = ClientWarehouseMaterialRow;

function normalizeText(value: string | null) {
	return value?.trim() || null;
}

function asDate(value: Date | string | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function getInvoiceIdentity(row: InvoiceSourceRow): {
	key: string;
	locator: WarehouseInvoiceLocator;
} | null {
	const importBatchId = normalizeText(row.importBatchId);
	if (importBatchId) {
		return {
			key: `batch:${importBatchId}`,
			locator: { type: "batch", value: importBatchId },
		};
	}
	const sourcePhoto = normalizeText(row.sourcePhoto);
	if (sourcePhoto) {
		return {
			key: `photo:${sourcePhoto}`,
			locator: { type: "photo", value: sourcePhoto },
		};
	}
	const invoiceNumber = normalizeText(row.invoiceNr);
	if (!invoiceNumber) return null;
	const supplierName = normalizeText(row.supplierName);
	const invoiceDate = asDate(row.invoiceDate)?.toISOString() ?? null;
	return {
		key: `number:${invoiceNumber.toLocaleLowerCase()}|${supplierName?.toLocaleLowerCase() ?? ""}|${invoiceDate ?? ""}`,
		locator: { type: "number", invoiceNumber, supplierName, invoiceDate },
	};
}

export function groupWarehouseInvoiceRows(
	rows: InvoiceSourceRow[],
): WarehouseInvoiceSummary[] {
	const groups = new Map<string, WarehouseInvoiceSummary>();
	for (const row of rows) {
		const identity = getInvoiceIdentity(row);
		if (!identity) continue;
		const createdAt = asDate(row.createdAt) ?? new Date(0);
		const invoiceDate = asDate(row.invoiceDate);
		const current = groups.get(identity.key);
		if (current) {
			current.itemCount += 1;
			current.totalCost += row.cost ?? 0;
			current.sentCount += row.BISId ? 1 : 0;
			if (!row.BISId) current.movableRowIds.push(row.id);
			if (createdAt > current.createdAt) current.createdAt = createdAt;
			if (!current.invoiceNumber)
				current.invoiceNumber = normalizeText(row.invoiceNr);
			if (!current.supplierName)
				current.supplierName = resolveInvoiceSupplierName(
					row.invoiceNr,
					row.supplierName,
				);
			if (!current.invoiceDate) current.invoiceDate = invoiceDate;
			if (!current.sourcePhoto)
				current.sourcePhoto = normalizeText(row.sourcePhoto);
			continue;
		}
		groups.set(identity.key, {
			key: identity.key,
			locator: identity.locator,
			invoiceNumber: normalizeText(row.invoiceNr),
			supplierName: resolveInvoiceSupplierName(row.invoiceNr, row.supplierName),
			invoiceDate,
			createdAt,
			sourcePhoto: normalizeText(row.sourcePhoto),
			itemCount: 1,
			totalCost: row.cost ?? 0,
			sentCount: row.BISId ? 1 : 0,
			movableRowIds: row.BISId ? [] : [row.id],
		});
	}
	return [...groups.values()].sort((left, right) => {
		const leftDate = left.invoiceDate ?? left.createdAt;
		const rightDate = right.invoiceDate ?? right.createdAt;
		return (
			rightDate.getTime() - leftDate.getTime() ||
			left.key.localeCompare(right.key)
		);
	});
}

export function buildClientWarehouseInvoicePage(
	rows: InvoiceSourceRow[],
	input: WarehouseMaterialQueryInput,
	pagination: { offset?: number; limit?: number } = {},
): WarehouseInvoicePage {
	const matchingRows = queryClientWarehouseMaterials(
		rows,
		{
			...input,
			page: 1,
			pageSize: Math.max(1, rows.length),
		},
		{
			showSpendInsights: false,
		},
	).allRows;
	const invoices = groupWarehouseInvoiceRows(matchingRows);
	const offset = Math.max(0, Math.floor(pagination.offset ?? 0));
	const limit = Math.min(100, Math.max(1, Math.floor(pagination.limit ?? 30)));
	const pageInvoices = invoices.slice(offset, offset + limit);
	return {
		invoices: pageInvoices,
		nextOffset:
			offset + pageInvoices.length < invoices.length
				? offset + pageInvoices.length
				: null,
		totalCount: invoices.length,
	};
}

export function getClientWarehouseInvoiceRows<Row extends InvoiceSourceRow>(
	rows: Row[],
	locator: WarehouseInvoiceLocator,
) {
	return rows
		.filter((row) => {
			if (locator.type === "batch")
				return normalizeText(row.importBatchId) === locator.value;
			if (locator.type === "photo")
				return normalizeText(row.sourcePhoto) === locator.value;
			return (
				normalizeText(row.invoiceNr)?.toLocaleLowerCase() ===
					locator.invoiceNumber.toLocaleLowerCase() &&
				normalizeText(row.supplierName) === locator.supplierName &&
				(asDate(row.invoiceDate)?.toISOString() ?? null) === locator.invoiceDate
			);
		})
		.sort((left, right) => {
			const created =
				(asDate(left.createdAt)?.getTime() ?? 0) -
				(asDate(right.createdAt)?.getTime() ?? 0);
			return created || left.id.localeCompare(right.id);
		});
}
