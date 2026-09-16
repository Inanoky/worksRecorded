import { persistTgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr";

describe("persistTgemInvoiceOcrResult", () => {
	it.each(["credit", "debit", undefined, "invalid"])(
		"persists only a valid extracted invoice type: %s",
		async (invoiceType) => {
			const update = jest.fn();
			await persistTgemInvoiceOcrResult(
				{
					tgemInvoiceOcrPage: { upsert: jest.fn() },
					tgemInvoiceLine: { upsert: jest.fn() },
					tgemInvoiceCase: { update },
				} as never,
				{
					invoiceCaseId: "case-1",
					documentId: "document-1",
					result: {
						provider: "openai",
						pages: [],
						lineItems: [],
						fields:
							invoiceType === undefined
								? {}
								: {
										invoiceType: {
											rawText: "Kredītrēķins",
											value: invoiceType,
											confidence: null,
											sourceAnchor: null,
										},
									},
					},
				},
			);
			const data = update.mock.calls[0][0].data;
			if (invoiceType === "credit" || invoiceType === "debit") {
				expect(data.invoiceType).toBe(invoiceType);
				expect(data.extractionSummary.fields.invoiceType.value).toBe(
					invoiceType,
				);
			} else {
				expect(data).not.toHaveProperty("invoiceType");
			}
			expect(data).not.toHaveProperty("costCode");
		},
	);

	it("upserts OCR pages and marks the invoice OCR complete", async () => {
		const upsert = jest.fn().mockResolvedValue({ id: "ocr-page-1" });
		const lineUpsert = jest.fn().mockResolvedValue({ id: "line-1" });
		const update = jest.fn().mockResolvedValue({ id: "case-1" });
		const database = {
			tgemInvoiceOcrPage: { upsert },
			tgemInvoiceLine: { upsert: lineUpsert },
			tgemInvoiceCase: { update },
		} as never;

		await expect(
			persistTgemInvoiceOcrResult(database, {
				invoiceCaseId: "case-1",
				documentId: "document-1",
				result: {
					provider: "openai",
					fields: {
						invoiceNumber: {
							rawText: "INV-1",
							value: "INV-1",
							confidence: 0.98,
							sourceAnchor: null,
						},
						subtotal: {
							rawText: "Kopā bez PVN 1057,85",
							value: 1057.85,
							confidence: 0.97,
							sourceAnchor: null,
						},
						vat: {
							rawText: "PVN 21% 222,15",
							value: 222.15,
							confidence: 0.97,
							sourceAnchor: null,
						},
						total: {
							rawText: "Apmaksai 1280,00",
							value: 1280,
							confidence: 0.97,
							sourceAnchor: null,
						},
					},
					lineItems: [
						{
							productCode: "MAT-1",
							description: "Winter mortar",
							quantity: 80,
							unit: "bag",
							unitPrice: 16,
							total: 1280,
							currency: "EUR",
							confidence: 0.94,
							sourceText: "80 bags Winter mortar 16.00 1280.00",
						},
					],
					pages: [
						{
							pageNumber: 1,
							width: 3024,
							height: 4032,
							text: "Invoice Date: 18/01/24",
							blocks: [],
							status: "complete",
						},
					],
				},
			}),
		).resolves.toEqual({
			pageCount: 1,
			lineItemCount: 1,
			warningCount: 0,
		});

		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					documentId_pageNumber: { documentId: "document-1", pageNumber: 1 },
				},
				create: expect.objectContaining({
					documentId: "document-1",
					status: "complete",
				}),
			}),
		);
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "case-1" },
				data: expect.objectContaining({
					ocrStatus: "complete",
					extractionStatus: "complete",
					invoiceNumber: "INV-1",
					subtotal: 1057.85,
					vat: 222.15,
					total: 1280,
					status: "needs_review",
				}),
			}),
		);
		expect(lineUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					invoiceCaseId_lineNumber: {
						invoiceCaseId: "case-1",
						lineNumber: 1,
					},
				},
				create: expect.objectContaining({
					description: "Winter mortar",
					quantity: 80,
					total: 1280,
				}),
			}),
		);
	});

	it("warns when the priority amount excluding VAT is missing", async () => {
		const update = jest.fn().mockResolvedValue({ id: "case-1" });
		const database = {
			tgemInvoiceOcrPage: { upsert: jest.fn() },
			tgemInvoiceLine: { upsert: jest.fn() },
			tgemInvoiceCase: { update },
		} as never;

		await expect(
			persistTgemInvoiceOcrResult(database, {
				invoiceCaseId: "case-1",
				documentId: "document-1",
				result: {
					provider: "openai",
					fields: {
						invoiceNumber: {
							rawText: "INV-2",
							value: "INV-2",
							confidence: null,
							sourceAnchor: null,
						},
						total: {
							rawText: "Apmaksai 121,00",
							value: 121,
							confidence: null,
							sourceAnchor: null,
						},
					},
					lineItems: [],
					pages: [
						{
							pageNumber: 1,
							width: null,
							height: null,
							text: "Apmaksai 121,00",
							blocks: [],
							status: "complete",
						},
					],
				},
			}),
		).resolves.toEqual({
			pageCount: 1,
			lineItemCount: 0,
			warningCount: 1,
		});

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					validationSummary: {
						state: "warning",
						warnings: ["Invoice amount excluding VAT/PVN was not detected."],
					},
				}),
			}),
		);
	});
});
