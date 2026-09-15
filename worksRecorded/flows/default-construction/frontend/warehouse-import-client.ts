import type { importWarehouseInvoice as importInvoice } from "../backend/warehouse-import-actions";

export async function importWarehouseInvoice(
	receipt: string,
): Promise<Awaited<ReturnType<typeof importInvoice>>> {
	const response = await fetch("/api/warehouse/invoices/import", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "same-origin",
		redirect: "error",
		body: JSON.stringify({ receipt }),
	});
	if (response.status === 401 || response.status === 403)
		return { ok: false, error: "access" };
	const result = await response.json();
	if (typeof result?.ok !== "boolean")
		throw new Error("Invalid import response");
	return result;
}
