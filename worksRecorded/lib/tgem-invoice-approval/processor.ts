import { processTgemInvoiceWithGoogleDocumentAi } from "@/lib/tgem-invoice-approval/google-document-ai";
import type { TgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr-types";
import { processTgemInvoiceWithOpenAi } from "@/lib/tgem-invoice-approval/openai-invoice";

export type TgemInvoiceProcessor = "openai" | "google-document-ai";

type TgemInvoiceProcessorRequest = {
	content: Buffer;
	mimeType: string;
};

type TgemInvoiceProcessorFunction = (
	request: TgemInvoiceProcessorRequest,
) => Promise<TgemInvoiceOcrResult>;

export function getTgemInvoiceProcessor(
	env: Record<string, string | undefined> = process.env,
): TgemInvoiceProcessor {
	const configured = env.TGEM_INVOICE_PROCESSOR?.trim().toLowerCase();
	if (!configured || configured === "openai") return "openai";
	if (configured === "google" || configured === "google-document-ai") {
		return "google-document-ai";
	}

	throw new Error(
		`Unsupported TGEM invoice processor: ${env.TGEM_INVOICE_PROCESSOR}`,
	);
}

export async function processTgemInvoice(
	request: TgemInvoiceProcessorRequest,
	options: {
		env?: Record<string, string | undefined>;
		openAiProcessor?: TgemInvoiceProcessorFunction;
		googleProcessor?: TgemInvoiceProcessorFunction;
	} = {},
) {
	const provider = getTgemInvoiceProcessor(options.env);
	if (provider === "google-document-ai") {
		return (options.googleProcessor ?? processTgemInvoiceWithGoogleDocumentAi)(
			request,
		);
	}

	return (options.openAiProcessor ?? processTgemInvoiceWithOpenAi)(request);
}
