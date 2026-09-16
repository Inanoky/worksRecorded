import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";

export type TgemInvoiceSortField =
	| "invoiceNumber"
	| "project"
	| "supplier"
	| "invoiceDate"
	| "dueDate"
	| "total"
	| "status"
	| "currentApprover";
export type TgemInvoiceSort = {
	field: TgemInvoiceSortField;
	direction: "asc" | "desc";
};

export function sortTgemInvoiceRegister(
	invoices: readonly TgemDashboardInvoice[],
	sort: TgemInvoiceSort | null,
	context: {
		locale: string;
		statusLabels: Record<string, string>;
		getCurrentApprover: (invoice: TgemDashboardInvoice) => string | null;
	},
) {
	if (!sort) return [...invoices];
	const collator = new Intl.Collator(context.locale, {
		numeric: true,
		sensitivity: "base",
	});
	const direction = sort.direction === "asc" ? 1 : -1;
	const rows = invoices.map((invoice, index) => {
		let value: string | number | null;
		switch (sort.field) {
			case "project":
				value = invoice.project?.name ?? null;
				break;
			case "supplier":
				value = invoice.supplierName;
				break;
			case "currentApprover":
				value = context.getCurrentApprover(invoice);
				break;
			case "status":
				value = context.statusLabels[invoice.status] ?? invoice.status;
				break;
			case "total":
				value = invoice.total?.trim() ? Number(invoice.total) : null;
				break;
			case "invoiceDate":
			case "dueDate": {
				const date = invoice[sort.field];
				value = date ? Date.parse(date) : null;
				break;
			}
			default:
				value = invoice.invoiceNumber;
		}
		if (typeof value === "number" && !Number.isFinite(value)) value = null;
		if (typeof value === "string") value = value.trim() || null;
		return { invoice, index, value };
	});
	return rows
		.sort((left, right) => {
			if (left.value === null)
				return right.value === null ? left.index - right.index : 1;
			if (right.value === null) return -1;
			const comparison =
				typeof left.value === "number" && typeof right.value === "number"
					? left.value - right.value
					: collator.compare(String(left.value), String(right.value));
			return comparison * direction || left.index - right.index;
		})
		.map((row) => row.invoice);
}
