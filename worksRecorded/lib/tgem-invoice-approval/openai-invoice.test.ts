const mockResponsesParse = jest.fn();

jest.mock("openai", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		responses: {
			parse: (...args: unknown[]) => mockResponsesParse(...args),
		},
	})),
}));

import {
	buildTgemOpenAiDocumentPart,
	createTgemOpenAiTransport,
	getTgemOpenAiConfig,
	mapOpenAiInvoiceResponse,
	processTgemInvoiceWithOpenAi,
} from "@/lib/tgem-invoice-approval/openai-invoice";

const extractedInvoice = {
	pages: [
		{
			pageNumber: 1,
			text: "RĒĶINS NR. INV-42\nCements 10 gab 5,00 50,00\nKopā 60,50 EUR",
		},
	],
	fields: {
		invoiceType: { rawText: "RĒĶINS", value: "debit" },
		invoiceNumber: { rawText: "INV-42", value: "INV-42" },
		supplierName: { rawText: "SIA Būve", value: "SIA Būve" },
		supplierRegistrationNo: { rawText: "40100000000", value: "40100000000" },
		invoiceDate: { rawText: "11.09.2026", value: "2026-09-11" },
		dueDate: { rawText: "25.09.2026", value: "2026-09-25" },
		currency: { rawText: "EUR", value: "EUR" },
		subtotal: { rawText: "50,00", value: 50 },
		vat: { rawText: "10,50", value: 10.5 },
		total: { rawText: "60,50", value: 60.5 },
		bankAccount: {
			rawText: "LV00BANK0000000000000",
			value: "LV00BANK0000000000000",
		},
		purchaseOrder: { rawText: "", value: null },
	},
	lineItems: [
		{
			productCode: "CEM-1",
			description: "Cements",
			quantity: 10,
			unit: "gab",
			unitPrice: 5,
			total: 50,
			currency: "EUR",
			sourceText: "Cements 10 gab 5,00 50,00",
		},
	],
};

describe("OpenAI TGEM invoice extraction", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("builds high-detail image and PDF inputs from document bytes", () => {
		expect(
			buildTgemOpenAiDocumentPart({
				content: Buffer.from("image"),
				mimeType: "image/jpeg",
			}),
		).toEqual({
			type: "input_image",
			detail: "high",
			image_url: `data:image/jpeg;base64,${Buffer.from("image").toString("base64")}`,
		});

		expect(
			buildTgemOpenAiDocumentPart({
				content: Buffer.from("pdf"),
				mimeType: "application/pdf",
			}),
		).toEqual({
			type: "input_file",
			detail: "high",
			filename: "invoice.pdf",
			file_data: `data:application/pdf;base64,${Buffer.from("pdf").toString("base64")}`,
		});
	});

	it("maps copyable page text, fields, and invoice rows without fake coordinates", () => {
		const result = mapOpenAiInvoiceResponse(extractedInvoice);

		expect(result.provider).toBe("openai");
		expect(result.fields.invoiceType).toMatchObject({
			rawText: "RĒĶINS",
			value: "debit",
		});
		expect(result.pages).toEqual([
			expect.objectContaining({
				pageNumber: 1,
				text: expect.stringContaining("Cements 10 gab"),
				blocks: [],
				status: "complete",
			}),
		]);
		expect(result.fields.invoiceDate).toEqual({
			rawText: "11.09.2026",
			value: "2026-09-11",
			confidence: null,
			sourceAnchor: null,
		});
		expect(result.lineItems).toEqual([
			expect.objectContaining({
				description: "Cements",
				quantity: 10,
				total: 50,
				confidence: null,
			}),
		]);
	});

	it("maps a credit note with positive printed amounts to credit", () => {
		const result = mapOpenAiInvoiceResponse({
			...extractedInvoice,
			fields: {
				...extractedInvoice.fields,
				invoiceType: { rawText: "Kredītrēķins", value: "credit" },
			},
		});
		expect(result.fields.invoiceType).toMatchObject({
			rawText: "Kredītrēķins",
			value: "credit",
		});
		expect(result.fields.total.value).toBe(60.5);
	});

	it("maps a sparse Latvian receipt to the shared accounting fields", () => {
		const result = mapOpenAiInvoiceResponse({
			...extractedInvoice,
			fields: {
				...extractedInvoice.fields,
				invoiceType: { rawText: "ČEKS", value: "receipt" },
				invoiceNumber: { rawText: "Čeks Nr. 0042", value: "0042" },
				dueDate: { rawText: "", value: null },
				subtotal: { rawText: "", value: null },
				vat: { rawText: "PVN 2,10", value: 2.1 },
				bankAccount: { rawText: "", value: null },
			},
		});

		expect(result.fields.invoiceType.value).toBe("receipt");
		expect(result.fields.invoiceNumber.value).toBe("0042");
		expect(result.fields.dueDate.value).toBeNull();
		expect(result.fields.subtotal.value).toBeNull();
		expect(result.fields.total.value).toBe(60.5);
	});

	it.each(["unknown", "", null, undefined])(
		"rejects an invalid AI invoice type: %s",
		(value) => {
			expect(() =>
				mapOpenAiInvoiceResponse({
					...extractedInvoice,
					fields: {
						...extractedInvoice.fields,
						invoiceType: { rawText: "", value },
					},
				}),
			).toThrow();
		},
	);

	it("uses an injected transport without requiring a live API call", async () => {
		const transport = jest.fn().mockResolvedValue(extractedInvoice);

		await expect(
			processTgemInvoiceWithOpenAi(
				{ content: Buffer.from("invoice"), mimeType: "image/png" },
				transport,
			),
		).resolves.toMatchObject({ provider: "openai" });
		expect(transport).toHaveBeenCalledWith({
			content: Buffer.from("invoice"),
			mimeType: "image/png",
		});
	});

	it("sends the document through the Responses API with structured output", async () => {
		mockResponsesParse.mockResolvedValue({ output_parsed: extractedInvoice });
		const transport = createTgemOpenAiTransport({
			apiKey: "test-key",
			model: "gpt-test",
		});

		await expect(
			transport({ content: Buffer.from("invoice"), mimeType: "image/png" }),
		).resolves.toEqual(extractedInvoice);
		expect(mockResponsesParse).toHaveBeenCalledWith(
			expect.objectContaining({
				model: "gpt-test",
				store: false,
				instructions: expect.stringMatching(
					/fields\.subtotal is the priority amount[\s\S]*Never put a VAT-inclusive or payable amount in fields\.subtotal[\s\S]*fields\.vat is the VAT\/PVN tax amount in money, not a percentage[\s\S]*fields\.total is the final amount payable including VAT\/PVN/,
				),
				input: [
					expect.objectContaining({
						content: expect.arrayContaining([
							expect.objectContaining({
								type: "input_image",
								detail: "high",
							}),
						]),
					}),
				],
				text: { format: expect.any(Object) },
			}),
		);
		expect(mockResponsesParse.mock.calls[0][0].instructions).toContain(
			"Classify fields.invoiceType from the document",
		);
		expect(
			mockResponsesParse.mock.calls[0][0].text.format.schema.properties.fields
				.properties.invoiceType.properties.value.enum,
		).toEqual(["debit", "credit", "receipt"]);
		expect(mockResponsesParse.mock.calls[0][0].instructions).toContain("Čeks");
	});

	it("requires the existing production OpenAI API key", () => {
		expect(() => getTgemOpenAiConfig({})).toThrow("OPENAI_API_KEY");
		expect(
			getTgemOpenAiConfig({
				OPENAI_API_KEY: "test-key",
				TGEM_INVOICE_OPENAI_MODEL: "test-model",
			}),
		).toEqual({ apiKey: "test-key", model: "test-model" });
	});
});
