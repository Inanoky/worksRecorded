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
	mapOpenAiPackageResponse,
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
	const documents = [
		{
			id: "receipt",
			filename: "receipt.jpg",
			mimeType: "image/jpeg",
			content: Buffer.from("receipt"),
		},
		{
			id: "invoice",
			filename: "invoice.pdf",
			mimeType: "application/pdf",
			content: Buffer.from("invoice"),
		},
	];
	const packagePayload = {
		...extractedInvoice,
		primaryDocumentIndex: 1,
		needsReview: false,
		reviewReason: null,
		pages: [
			{ documentIndex: 0, pageNumber: 1, text: "Čeks 60,50 EUR" },
			{ documentIndex: 1, pageNumber: 1, text: "Rēķins 60,50 EUR" },
		],
	};
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("keeps one invoice amount and maps each attachment's first OCR page separately", () => {
		const result = mapOpenAiPackageResponse(packagePayload, documents);
		expect(result.fields.total.value).toBe(60.5);
		expect(result.lineItems).toHaveLength(1);
		expect(result.packageReview).toEqual({
			primaryDocumentId: "invoice",
			needsReview: false,
			reason: null,
		});
		expect(
			result.pages.map(({ documentId, pageNumber }) => [
				documentId,
				pageNumber,
			]),
		).toEqual([
			["receipt", 1],
			["invoice", 1],
		]);
	});

	it.each([
		{ ...packagePayload, primaryDocumentIndex: 2 },
		{ ...packagePayload, pages: [packagePayload.pages[0]] },
		{
			...packagePayload,
			pages: [...packagePayload.pages, packagePayload.pages[0]],
		},
	])("rejects invalid or incomplete package references", (payload) => {
		expect(() => mapOpenAiPackageResponse(payload, documents)).toThrow();
	});

	it("sends all package documents in one request with financial deduplication instructions", async () => {
		mockResponsesParse.mockResolvedValue({ output_parsed: packagePayload });
		const transport = createTgemOpenAiTransport({
			apiKey: "test",
			model: "test-model",
		});
		await processTgemInvoiceWithOpenAi(
			{
				content: documents[0].content,
				mimeType: documents[0].mimeType,
				documents,
			},
			transport,
		);
		expect(mockResponsesParse).toHaveBeenCalledTimes(1);
		const request = mockResponsesParse.mock.calls[0][0];
		expect(
			request.input[0].content.map((part: { type: string }) => part.type),
		).toEqual([
			"input_text",
			"input_text",
			"input_image",
			"input_text",
			"input_file",
		]);
		expect(request.instructions).toContain("NEVER sum or duplicate amounts");
		expect(request.instructions).toContain("must NOT mark the invoice paid");
		expect(request.instructions).toContain("set needsReview=true");
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
