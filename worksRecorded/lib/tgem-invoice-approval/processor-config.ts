export type TgemInvoiceProcessor = "openai" | "google-document-ai";

export function getTgemInvoiceProcessor(
	env: Record<string, string | undefined> = process.env,
): TgemInvoiceProcessor {
	const configured = env.TGEM_INVOICE_PROCESSOR?.trim().toLowerCase();
	if (!configured || configured === "openai") return "openai";
	if (configured === "google" || configured === "google-document-ai")
		return "google-document-ai";
	throw new Error(
		`Unsupported TGEM invoice processor: ${env.TGEM_INVOICE_PROCESSOR}`,
	);
}
