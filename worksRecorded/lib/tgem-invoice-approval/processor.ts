import { processTgemInvoiceWithGoogleDocumentAi } from "@/lib/tgem-invoice-approval/google-document-ai";
import type { TgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr-types";
import { processTgemInvoiceWithOpenAi } from "@/lib/tgem-invoice-approval/openai-invoice";
import { getTgemInvoiceProcessor } from "@/lib/tgem-invoice-approval/processor-config";

export {
	getTgemInvoiceProcessor,
	type TgemInvoiceProcessor,
} from "@/lib/tgem-invoice-approval/processor-config";

type TgemInvoiceProcessorRequest = {
	content: Buffer;
	mimeType: string;
	documents?: Array<{
		id: string;
		content: Buffer;
		mimeType: string;
		filename: string;
	}>;
};

type TgemInvoiceProcessorFunction = (
	request: TgemInvoiceProcessorRequest,
) => Promise<TgemInvoiceOcrResult>;

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
		if (request.documents && request.documents.length > 1)
			throw new Error(
				"Grouped invoice packages require the OpenAI invoice processor",
			);
		return (options.googleProcessor ?? processTgemInvoiceWithGoogleDocumentAi)(
			request,
		);
	}

	return (options.openAiProcessor ?? processTgemInvoiceWithOpenAi)(request);
}
