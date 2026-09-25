import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
	TGEM_INVOICE_TYPES,
	type TgemInvoiceOcrResult,
} from "@/lib/tgem-invoice-approval/ocr-types";

export const TGEM_INVOICE_OPENAI_DEFAULT_MODEL = "gpt-5.4";

const TGEM_INVOICE_OPENAI_INSTRUCTIONS = [
	"Transcribe and extract this accounting document faithfully. It may be an ordinary invoice, a credit invoice, or a receipt, and may be in Latvian, English, or Russian.",
	"For pages[].text, copy all readable visible text in reading order, preserving line breaks, spelling, numbers, punctuation, and the original language. Do not translate, summarize, or invent missing text. Return one page entry per document page.",
	"For fields, rawText is the exact visible text supporting the value and value is the normalized value. Normalize dates to YYYY-MM-DD only when the full date is visible; otherwise use null. Use ISO 4217 currency codes.",
	"Classify fields.invoiceType from the document as exactly one of 'debit', 'credit', or 'receipt'. Use 'receipt' for a point-of-sale receipt, fiscal receipt, cash-register receipt, card-payment receipt, Čeks, Kvīts, Кассовый чек, or товарный чек. Use 'credit' for a credit note, credit invoice, Kredītrēķins, or Кредит-нота that reduces or reverses an earlier charge. Use 'debit' for an ordinary invoice or debit note that charges the customer. A credit note may print positive amounts, so prioritize the document heading and adjustment wording over the amount sign. A negative final total indicating a refund or reversal supports 'credit'; a discount row alone does not. Do not classify an invoice as a receipt merely because it was paid by card or cash. Copy the visible heading or other supporting text into rawText. Preserve the printed signs of all financial amounts.",
	"For receipts, map the receipt, transaction, fiscal, or check number to fields.invoiceNumber; the merchant or store to fields.supplierName; its registration or tax number to fields.supplierRegistrationNo; and the transaction date to fields.invoiceDate. Leave fields.dueDate and fields.bankAccount null unless they are explicitly printed. Extract subtotal and VAT only when visibly stated, but always extract the final paid total when readable.",
	"Financial totals require special care. fields.subtotal is the priority amount: extract the final invoice amount excluding VAT/PVN after all discounts and other net adjustments. Look carefully for labels such as 'Kopā bez PVN', 'Summa bez PVN', 'Neto', 'Net amount', or 'Subtotal'. Never put a VAT-inclusive or payable amount in fields.subtotal.",
	"fields.vat is the VAT/PVN tax amount in money, not a percentage such as 21%. Prefer the explicit total VAT/PVN amount; when there are several VAT rates and no combined VAT total, sum the visible VAT amounts only if every VAT row is clearly readable.",
	"fields.total is the final amount payable including VAT/PVN after all adjustments; look for labels such as 'Kopā ar PVN', 'Apmaksai', 'Summa apmaksai', 'Gross total', or 'Total incl. VAT'.",
	"Prefer subtotal, VAT, and total from the same final totals block. Check that subtotal plus VAT approximately equals total, allowing only normal currency rounding, but preserve the printed values when the invoice itself is inconsistent.",
	"Do not calculate a missing subtotal from line items or guess any financial amount. If only a VAT-inclusive total is visible, return it as fields.total and leave fields.subtotal null.",
	"Extract every genuine product, material, labor, service, delivery, equipment, rental, discount, or deposit row into lineItems, excluding subtotal, VAT, and grand-total summary rows. Preserve exact row text in sourceText. Use null for values that are absent or unreadable.",
].join(" ");

const stringFieldSchema = z.object({
	rawText: z.string(),
	value: z.string().nullable(),
});

const numberFieldSchema = z.object({
	rawText: z
		.string()
		.describe("Exact visible invoice text supporting the extracted amount."),
	value: z
		.number()
		.nullable()
		.describe("Normalized monetary amount, or null when it is not readable."),
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
		invoiceType: z.object({
			rawText: z.string(),
			value: z
				.enum(TGEM_INVOICE_TYPES)
				.describe(
					"Document classification: debit is an ordinary invoice, credit reduces or reverses a charge, and receipt is a point-of-sale or fiscal receipt.",
				),
		}),
		invoiceNumber: stringFieldSchema,
		supplierName: stringFieldSchema,
		supplierRegistrationNo: stringFieldSchema,
		invoiceDate: stringFieldSchema,
		dueDate: stringFieldSchema,
		currency: stringFieldSchema,
		subtotal: numberFieldSchema.describe(
			"Priority amount: the final invoice net total excluding VAT/PVN, after discounts and other net adjustments.",
		),
		vat: numberFieldSchema.describe(
			"VAT/PVN tax amount in money, not the VAT percentage or tax rate.",
		),
		total: numberFieldSchema.describe(
			"Final gross amount payable including VAT/PVN, after discounts and other adjustments.",
		),
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
			instructions: TGEM_INVOICE_OPENAI_INSTRUCTIONS,
			input: [
				{
					role: "user",
					content: [
						{
							type: "input_text",
							text: "Classify the accounting document and extract its text, fields, and all genuine line items.",
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
