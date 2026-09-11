import {
	getGoogleDocumentAiConfig,
	mapGoogleDocumentAiInvoiceResponse,
	processTgemInvoiceWithGoogleDocumentAi,
} from "@/lib/tgem-invoice-approval/google-document-ai";

describe("Google Document AI invoice adapter", () => {
	it("maps text anchors, normalized coordinates, and invoice entities", () => {
		const result = mapGoogleDocumentAiInvoiceResponse({
			document: {
				text: "Invoice Date: 18/01/24\nTotal 216.00 GBP",
				pages: [
					{
						pageNumber: 1,
						width: 3024,
						height: 4032,
						tokens: [
							{
								layout: {
									textAnchor: {
										textSegments: [{ startIndex: 0, endIndex: 22 }],
									},
									confidence: 0.97,
									boundingPoly: {
										vertices: [
											{ x: 302, y: 403 },
											{ x: 1512, y: 403 },
											{ x: 1512, y: 484 },
											{ x: 302, y: 484 },
										],
									},
								},
							},
						],
					},
				],
				entities: [
					{
						type: "invoice_date",
						confidence: 0.96,
						textAnchor: { content: "18/01/24" },
						pageAnchor: {
							pageRefs: [
								{
									page: "0",
									boundingPoly: {
										normalizedVertices: [
											{ x: 0.6, y: 0.31 },
											{ x: 0.85, y: 0.31 },
											{ x: 0.85, y: 0.33 },
											{ x: 0.6, y: 0.33 },
										],
									},
								},
							],
						},
						normalizedValue: { text: "2024-01-18" },
					},
					{
						type: "total_amount",
						confidence: 0.98,
						textAnchor: { content: "216.00 GBP" },
						normalizedValue: {
							moneyValue: { units: "216", nanos: 0 },
						},
					},
					{
						type: "line_item",
						confidence: 0.95,
						textAnchor: { content: "80 bags Mortar 16.00 1280.00" },
						properties: [
							{
								type: "line_item/description",
								mentionText: "Winter mortar",
								confidence: 0.94,
							},
							{
								type: "line_item/quantity",
								normalizedValue: { text: "80" },
								confidence: 0.97,
							},
							{
								type: "line_item/unit_price",
								normalizedValue: { text: "16.00" },
								confidence: 0.96,
							},
							{
								type: "line_item/amount",
								normalizedValue: { text: "1280.00" },
								confidence: 0.95,
							},
						],
					},
				],
			},
		});

		expect(result.provider).toBe("google-document-ai");
		expect(result.pages[0]).toMatchObject({
			text: "Invoice Date: 18/01/24",
			width: 3024,
			height: 4032,
		});
		expect(result.pages[0].blocks[0].text).toBe("Invoice Date: 18/01/24");
		expect(result.pages[0].blocks[0].kind).toBe("token");
		expect(result.pages[0].blocks[0].readingOrder).toBe(0);
		expect(result.pages[0].blocks[0].left).toBeCloseTo(0.1);
		expect(result.pages[0].blocks[0].top).toBeCloseTo(0.1);
		expect(result.pages[0].blocks[0].width).toBeCloseTo(0.4);
		expect(result.pages[0].blocks[0].height).toBeCloseTo(81 / 4032);
		expect(result.fields.invoiceDate).toMatchObject({
			rawText: "18/01/24",
			value: "2024-01-18",
			sourceAnchor: {
				pageNumber: 1,
				left: 0.6,
				top: 0.31,
			},
		});
		expect(result.fields.total.value).toBe(216);
		expect(result.lineItems).toEqual([
			expect.objectContaining({
				description: "Winter mortar",
				quantity: 80,
				unitPrice: 16,
				total: 1280,
				confidence: 0.94,
			}),
		]);
	});

	it("uses injected transport without requiring Google credentials", async () => {
		const transport = jest.fn().mockResolvedValue({
			document: { text: "hello", pages: [] },
		});

		await expect(
			processTgemInvoiceWithGoogleDocumentAi(
				{ content: Buffer.from("invoice"), mimeType: "image/png" },
				transport,
			),
		).resolves.toMatchObject({ provider: "google-document-ai", pages: [] });
		expect(transport).toHaveBeenCalledWith({
			content: Buffer.from("invoice"),
			mimeType: "image/png",
		});
	});

	it("requires project and processor configuration", () => {
		expect(() => getGoogleDocumentAiConfig({})).toThrow(
			"GOOGLE_DOCUMENT_AI_PROJECT_ID",
		);
	});
});
