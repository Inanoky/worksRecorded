import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { TgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr-types";

export const TGEM_INVOICE_OPENAI_DEFAULT_MODEL = "gpt-5.4";

const stringFieldSchema = z.object({
	rawText: z.string(),
	value: z.string().nullable(),
});

const numberFieldSchema = z.object({
	rawText: z.string(),
	value: z.number().nullable(),
});

export const tgemOpenAiInvoiceSchema = z.object({
	pages: z
		.array(
			z.object({
				pageNumber: z.number().int().positive(),
				text: z.string(),
			}),
		)
		.min(1),
	fields: z.object({
		invoiceNumber: stringFieldSchema,
		supplierName: stringFieldSchema,
		supplierRegistrationNo: stringFieldSchema,
		invoiceDate: stringFieldSchema,
		dueDate: stringFieldSchema,
		currency: stringFieldSchema,
		subtotal: numberFieldSchema,
		vat: numberFieldSchema,
		total: numberFieldSchema,
		bankAccount: stringFieldSchema,
		purchaseOrder: stringFieldSchema,
	}),
	lineItems: z.array(
		z.object({
			productCode: z.string().nullable(),
			description: z.string().nullable(),
			quantity: z.number().nullable(),
			unit: z.string().nullable(),
			unitPrice: z.number().nullable(),
			total: z.number().nullable(),
			currency: z.string().nullable(),
			sourceText: z.string(),
		}),
	),
});

type TgemOpenAiInvoicePayload = z.infer<typeof tgemOpenAiInvoiceSchema>;

export type TgemOpenAiConfig = {
	apiKey: string;
	model: string;
};

export type TgemOpenAiInvoiceRequest = {
	content: Buffer;
	mimeType: string;
};

export type TgemOpenAiTransport = (
	request: TgemOpenAiInvoiceRequest,
) => Promise<unknown>;

type TgemOpenAiDocumentPart =
	| {
			type: "input_image";
			detail: "high";
			image_url: string;
	  }
	| {
			type: "input_file";
			detail: "high";
			filename: string;
			file_data: string;
	  };

export function getTgemOpenAiConfig(
	env: Record<string, string | undefined> = process.env,
): TgemOpenAiConfig {
	const apiKey = env.OPENAI_API_KEY?.trim();
	if (!apiKey) {
		throw new Error("OpenAI invoice extraction requires OPENAI_API_KEY");
	}

	return {
		apiKey,
		model:
			env.TGEM_INVOICE_OPENAI_MODEL?.trim() ||
			TGEM_INVOICE_OPENAI_DEFAULT_MODEL,
	};
}

export function buildTgemOpenAiDocumentPart(
	request: TgemOpenAiInvoiceRequest,
): TgemOpenAiDocumentPart {
	const encodedContent = request.content.toString("base64");
	if (request.mimeType === "application/pdf") {
		return {
			type: "input_file",
			detail: "high",
			filename: "invoice.pdf",
			file_data: `data:${request.mimeType};base64,${encodedContent}`,
		};
	}

	if (!request.mimeType.startsWith("image/")) {
		throw new Error(
			`Unsupported OpenAI invoice content type: ${request.mimeType}`,
		);
	}

	return {
		type: "input_image",
		detail: "high",
		image_url: `data:${request.mimeType};base64,${encodedContent}`,
	};
}

export function mapOpenAiInvoiceResponse(
	response: unknown,
): TgemInvoiceOcrResult {
	const payload = tgemOpenAiInvoiceSchema.parse(response);
	const fields = Object.fromEntries(
		Object.entries(payload.fields).map(([name, field]) => [
			name,
			{
				...field,
				confidence: null,
				sourceAnchor: null,
			},
		]),
	);

	return {
		provider: "openai",
		pages: payload.pages.map((page) => ({
			pageNumber: page.pageNumber,
			width: null,
			height: null,
			text: page.text,
			blocks: [],
			status: "complete",
		})),
		fields,
		lineItems: payload.lineItems.map((lineItem) => ({
			...lineItem,
			confidence: null,
		})),
	};
}

export function createTgemOpenAiTransport(
	config = getTgemOpenAiConfig(),
): TgemOpenAiTransport {
	const client = new OpenAI({ apiKey: config.apiKey });

	return async (request) => {
		const response = await client.responses.parse({
			model: config.model,
			store: false,
			max_output_tokens: 12_000,
			instructions:
				"Transcribe and extract this invoice faithfully. The document may be in Latvian, English, or Russian. For pages[].text, copy all readable visible text in reading order, preserving line breaks, spelling, numbers, punctuation, and the original language. Do not translate, summarize, or invent missing text. Return one page entry per document page. For fields, rawText is the exact visible text and value is the normalized value. Normalize dates to YYYY-MM-DD only when the full date is visible; otherwise use null. Use ISO 4217 currency codes. Extract every genuine product, material, labor, service, delivery, equipment, rental, discount, or deposit row into lineItems, excluding subtotal, VAT, and grand-total summary rows. Preserve exact row text in sourceText. Use null for values that are absent or unreadable.",
			input: [
				{
					role: "user",
					content: [
						{
							type: "input_text",
							text: "Extract the invoice text, fields, and all invoice line items.",
						},
						buildTgemOpenAiDocumentPart(request),
					],
				},
			],
			text: {
				format: zodTextFormat(
					tgemOpenAiInvoiceSchema,
					"tgem_invoice_extraction",
				),
			},
		});

		if (!response.output_parsed) {
			throw new Error("OpenAI invoice extraction returned no parsed output");
		}

		return response.output_parsed as TgemOpenAiInvoicePayload;
	};
}

export async function processTgemInvoiceWithOpenAi(
	request: TgemOpenAiInvoiceRequest,
	transport: TgemOpenAiTransport = createTgemOpenAiTransport(),
) {
	return mapOpenAiInvoiceResponse(await transport(request));
}
