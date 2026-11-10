import { getInvoicePrefixesForSupplierSearch } from "@/lib/bis/invoice-supplier-map";
import {
	getWarehouseForma2PositionLabel,
	type WarehouseForma2Sort,
} from "@/lib/bis/warehouse-forma2-sort";
import type {
	WarehouseMaterialQueryInput,
	WarehouseMaterialSort,
	WarehouseSpendInsights,
} from "@/lib/bis/warehouse-material-query";

const WAREHOUSE_CONFIG_FILTER_ALL = "all";
const WAREHOUSE_CONFIG_FILTER_CONFIGURED = "__configured__";
const WAREHOUSE_CONFIG_FILTER_UNCONFIGURED = "__unconfigured__";

export type ClientWarehouseMaterialRow = {
	id: string;
	name: string | null;
	quantity: number | null;
	categoryId: string | null;
	categoryName: string | null;
	measurementUnit: string | null;
	cost: number | null;
	invoiceNr: string | null;
	invoiceDate: Date | string | null;
	materialDate: Date | string | null;
	supplierName: string | null;
	importBatchId: string | null;
	sourcePhoto: string | null;
	BISId: string | null;
	bisStatus: string | null;
	createdAt: Date | string;
	forma2PositionId?: string | null;
};

type ClientWarehouseQueryInput = Omit<WarehouseMaterialQueryInput, "sortBy"> & {
	sortBy?: WarehouseMaterialSort | WarehouseForma2Sort;
	forma2Assignment?: "all" | "assigned" | "unassigned";
	forma2PositionId?: string;
};

type Forma2Position = {
	id: string;
	code?: string | null;
	categoryName?: string | null;
	name?: string | null;
};

function asDate(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function lower(value: string | null | undefined) {
	return value?.trim().toLocaleLowerCase() ?? "";
}

function compareNullable(
	left: number | string | null,
	right: number | string | null,
	direction: 1 | -1,
	nullsFirst = false,
) {
	if (left == null && right == null) return 0;
	if (left == null) return nullsFirst ? -1 : 1;
	if (right == null) return nullsFirst ? 1 : -1;
	return left < right ? -direction : left > right ? direction : 0;
}

function effectiveSpendDate(row: ClientWarehouseMaterialRow) {
	const invoiceDate = asDate(row.invoiceDate);
	const createdAt = asDate(row.createdAt);
	if (row.importBatchId) return invoiceDate ?? createdAt;
	if (row.sourcePhoto) {
		return invoiceDate &&
			invoiceDate.getUTCFullYear() <= new Date().getUTCFullYear()
			? invoiceDate
			: createdAt;
	}
	return invoiceDate ?? createdAt;
}

function dateBoundary(value: string | undefined, end: boolean) {
	if (!value) return null;
	const suffix = end ? "T23:59:59.999Z" : "T00:00:00.000Z";
	const date = new Date(`${value}${suffix}`);
	return Number.isNaN(date.getTime()) ? null : date;
}

function matchesQuery(
	row: ClientWarehouseMaterialRow,
	input: ClientWarehouseQueryInput,
	useEffectiveSpendDate: boolean,
) {
	const search = lower(input.search);
	if (search) {
		const searchable = [
			row.name,
			row.categoryName,
			row.measurementUnit,
			row.invoiceNr,
			row.supplierName,
			row.BISId,
			row.bisStatus,
		].some((value) => lower(value).includes(search));
		const prefixMatch = getInvoicePrefixesForSupplierSearch(search).some(
			(prefix) => lower(row.invoiceNr).startsWith(prefix.toLocaleLowerCase()),
		);
		if (!searchable && !prefixMatch) return false;
	}

	if (
		input.invoiceNumber &&
		lower(row.invoiceNr) !== lower(input.invoiceNumber)
	)
		return false;
	if (
		input.supplierName &&
		lower(row.supplierName) !== lower(input.supplierName)
	)
		return false;
	if (input.status === "sent" && !row.BISId) return false;
	if (input.status === "unsent" && row.BISId) return false;

	const configFilter =
		input.configFilter?.trim() || WAREHOUSE_CONFIG_FILTER_ALL;
	const configured = Boolean(row.categoryId && row.categoryId !== "no_match");
	if (configFilter === WAREHOUSE_CONFIG_FILTER_CONFIGURED && !configured)
		return false;
	if (configFilter === WAREHOUSE_CONFIG_FILTER_UNCONFIGURED && configured)
		return false;
	if (
		configFilter !== WAREHOUSE_CONFIG_FILTER_ALL &&
		configFilter !== WAREHOUSE_CONFIG_FILTER_CONFIGURED &&
		configFilter !== WAREHOUSE_CONFIG_FILTER_UNCONFIGURED &&
		row.categoryId !== configFilter
	)
		return false;

	if (input.forma2Assignment === "assigned" && !row.forma2PositionId)
		return false;
	if (input.forma2Assignment === "unassigned" && row.forma2PositionId)
		return false;
	if (
		input.forma2PositionId &&
		input.forma2PositionId !== "all" &&
		row.forma2PositionId !== input.forma2PositionId
	)
		return false;

	const from = dateBoundary(input.invoiceDateFrom, false);
	const to = dateBoundary(input.invoiceDateTo, true);
	const date = useEffectiveSpendDate
		? effectiveSpendDate(row)
		: asDate(row.invoiceDate);
	if (from && (!date || date < from)) return false;
	if (to && (!date || date > to)) return false;
	return true;
}

function sortRows<Row extends ClientWarehouseMaterialRow>(
	rows: Row[],
	sortBy: ClientWarehouseQueryInput["sortBy"] = "default",
	positions: Forma2Position[] = [],
) {
	if (sortBy === "forma2Position_asc" || sortBy === "forma2Position_desc") {
		const labels = new Map(
			positions.map((position) => [
				position.id,
				getWarehouseForma2PositionLabel(position).toLocaleLowerCase("lv"),
			]),
		);
		const direction = sortBy === "forma2Position_asc" ? 1 : -1;
		return [...rows].sort((left, right) => {
			const leftLabel = left.forma2PositionId
				? labels.get(left.forma2PositionId)
				: null;
			const rightLabel = right.forma2PositionId
				? labels.get(right.forma2PositionId)
				: null;
			return (
				compareNullable(leftLabel ?? null, rightLabel ?? null, direction) ||
				left.id.localeCompare(right.id)
			);
		});
	}

	return [...rows].sort((left, right) => {
		const leftCreated = asDate(left.createdAt)?.getTime() ?? null;
		const rightCreated = asDate(right.createdAt)?.getTime() ?? null;
		const leftMaterial = asDate(left.materialDate)?.getTime() ?? null;
		const rightMaterial = asDate(right.materialDate)?.getTime() ?? null;
		const leftInvoice = asDate(left.invoiceDate)?.getTime() ?? null;
		const rightInvoice = asDate(right.invoiceDate)?.getTime() ?? null;
		const tie = () => left.id.localeCompare(right.id);
		switch (sortBy) {
			case "sourcePhoto_asc":
				return (
					compareNullable(
						lower(left.sourcePhoto) || null,
						lower(right.sourcePhoto) || null,
						1,
					) || tie()
				);
			case "sourcePhoto_desc":
				return (
					compareNullable(
						lower(left.sourcePhoto) || null,
						lower(right.sourcePhoto) || null,
						-1,
					) || -tie()
				);
			case "name_asc":
				return (
					compareNullable(
						lower(left.name) || null,
						lower(right.name) || null,
						1,
					) || tie()
				);
			case "name_desc":
				return (
					compareNullable(
						lower(left.name) || null,
						lower(right.name) || null,
						-1,
					) || -tie()
				);
			case "supplierName_asc":
				return (
					compareNullable(
						lower(left.supplierName) || null,
						lower(right.supplierName) || null,
						1,
					) || tie()
				);
			case "supplierName_desc":
				return (
					compareNullable(
						lower(left.supplierName) || null,
						lower(right.supplierName) || null,
						-1,
					) || -tie()
				);
			case "status_asc":
				return (
					compareNullable(
						lower(left.bisStatus) || (left.BISId ? "sent" : null),
						lower(right.bisStatus) || (right.BISId ? "sent" : null),
						1,
					) || tie()
				);
			case "status_desc":
				return (
					compareNullable(
						lower(left.bisStatus) || (left.BISId ? "sent" : null),
						lower(right.bisStatus) || (right.BISId ? "sent" : null),
						-1,
					) || -tie()
				);
			case "categoryName_asc":
				return (
					compareNullable(
						lower(left.categoryName) || null,
						lower(right.categoryName) || null,
						1,
					) || tie()
				);
			case "categoryName_desc":
				return (
					compareNullable(
						lower(left.categoryName) || null,
						lower(right.categoryName) || null,
						-1,
					) || -tie()
				);
			case "materialDate_asc":
				return compareNullable(leftMaterial, rightMaterial, 1, true) || tie();
			case "materialDate_desc":
				return compareNullable(leftMaterial, rightMaterial, -1) || -tie();
			case "quantity_asc":
				return compareNullable(left.quantity, right.quantity, 1) || tie();
			case "quantity_desc":
				return compareNullable(left.quantity, right.quantity, -1) || -tie();
			case "measurementUnit_asc":
				return (
					compareNullable(
						lower(left.measurementUnit) || null,
						lower(right.measurementUnit) || null,
						1,
					) || tie()
				);
			case "measurementUnit_desc":
				return (
					compareNullable(
						lower(left.measurementUnit) || null,
						lower(right.measurementUnit) || null,
						-1,
					) || -tie()
				);
			case "cost_asc":
				return compareNullable(left.cost, right.cost, 1) || tie();
			case "cost_desc":
				return compareNullable(left.cost, right.cost, -1) || -tie();
			case "invoiceNr_asc":
				return (
					compareNullable(
						lower(left.invoiceNr) || null,
						lower(right.invoiceNr) || null,
						1,
					) || tie()
				);
			case "invoiceNr_desc":
				return (
					compareNullable(
						lower(left.invoiceNr) || null,
						lower(right.invoiceNr) || null,
						-1,
					) || -tie()
				);
			case "invoiceDate_asc":
				return compareNullable(leftInvoice, rightInvoice, 1, true) || tie();
			case "invoiceDate_desc":
				return compareNullable(leftInvoice, rightInvoice, -1) || -tie();
			case "createdAt_asc":
				return compareNullable(leftCreated, rightCreated, 1) || tie();
			case "createdAt_desc":
				return compareNullable(leftCreated, rightCreated, -1) || -tie();
			default:
				return (
					compareNullable(leftMaterial, rightMaterial, -1) ||
					compareNullable(leftInvoice, rightInvoice, -1) ||
					-tie()
				);
		}
	});
}

export function buildClientWarehouseSpendInsights(
	rows: ClientWarehouseMaterialRow[],
): WarehouseSpendInsights {
	const suppliers = new Map<
		string,
		WarehouseSpendInsights["supplierTotals"][number]
	>();
	const months = new Map<
		string,
		WarehouseSpendInsights["monthlyTotals"][number]
	>();
	for (const row of rows) {
		if (typeof row.cost !== "number" || Number.isNaN(row.cost)) continue;
		const supplierLabel = row.supplierName?.trim() || "";
		const supplierKey = supplierLabel.toLocaleLowerCase() || "__no_supplier__";
		const supplier = suppliers.get(supplierKey) ?? {
			key: supplierKey,
			label: supplierLabel,
			totalCost: 0,
			count: 0,
		};
		supplier.totalCost += row.cost;
		supplier.count += 1;
		suppliers.set(supplierKey, supplier);
		const date = effectiveSpendDate(row);
		if (!date) continue;
		const monthKey = date.toISOString().slice(0, 7);
		const month = months.get(monthKey) ?? {
			key: monthKey,
			label: monthKey,
			totalCost: 0,
			count: 0,
		};
		month.totalCost += row.cost;
		month.count += 1;
		months.set(monthKey, month);
	}
	return {
		supplierTotals: [...suppliers.values()].sort(
			(left, right) =>
				right.totalCost - left.totalCost ||
				left.label.localeCompare(right.label),
		),
		monthlyTotals: [...months.values()].sort((left, right) =>
			right.key.localeCompare(left.key),
		),
	};
}

export function queryClientWarehouseMaterials<
	Row extends ClientWarehouseMaterialRow,
>(
	rows: Row[],
	input: ClientWarehouseQueryInput,
	options: {
		showSpendInsights: boolean;
		forma2Positions?: Forma2Position[];
	},
) {
	const filtered = rows.filter((row) =>
		matchesQuery(row, input, options.showSpendInsights),
	);
	const sorted = sortRows(filtered, input.sortBy, options.forma2Positions);
	const pageSize = Math.max(1, Math.floor(input.pageSize ?? 50));
	const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
	const page = Math.min(Math.max(1, Math.floor(input.page ?? 1)), totalPages);
	const start = (page - 1) * pageSize;
	return {
		rows: sorted.slice(start, start + pageSize),
		allRows: sorted,
		totalCount: sorted.length,
		totalCost: sorted.reduce((total, row) => total + (row.cost ?? 0), 0),
		page,
		pageSize,
		totalPages,
		spendInsights: options.showSpendInsights
			? buildClientWarehouseSpendInsights(sorted)
			: undefined,
	};
}
