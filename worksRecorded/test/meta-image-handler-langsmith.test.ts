const mockStructuredInvoke = jest.fn();
const mockWithStructuredOutput = jest.fn(() => ({
	invoke: mockStructuredInvoke,
}));

const mockUserFindFirst = jest.fn();
const mockCreateMany = jest.fn();
const mockPhotosUpdateMany = jest.fn();
const mockPhotosCreate = jest.fn();
const mockTransaction = jest.fn();
const uuidV7Pattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

jest.mock("@langchain/openai", () => ({
	ChatOpenAI: jest.fn(() => ({
		withStructuredOutput: mockWithStructuredOutput,
	})),
}));

jest.mock("uploadthing/server", () => ({
	UTApi: jest.fn(() => ({
		uploadFiles: jest.fn(),
	})),
}));

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$transaction: mockTransaction,
		user: {
			findFirst: mockUserFindFirst,
		},
		bisToken: {
			findFirst: jest.fn(),
		},
		bISmaterialRecords: {
			createMany: mockCreateMany,
		},
		photos: {
			updateMany: mockPhotosUpdateMany,
			create: mockPhotosCreate,
		},
	},
}));

jest.mock("@/server/ai-flows/ai-models-settings", () => ({
	metaMaterialImageClassifierModel: "gpt-test-classifier",
	metaMaterialImageClassifierTemperature: 0,
}));

import { ChatOpenAI } from "@langchain/openai";
import {
	classifyMaterialDocumentImage,
	extractAndSaveBISMaterialsFromPublicUrl,
	normalizeExtractedInvoiceDate,
	processMaterialDocumentImageFromPublicUrl,
} from "@/server/actions/META/RoutingHandlers/metaImageHandler";

describe("meta image handler LangSmith tracing", () => {
	let consoleLogSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		mockWithStructuredOutput.mockReturnValue({ invoke: mockStructuredInvoke });
		mockPhotosUpdateMany.mockResolvedValue({ count: 0 });
		mockTransaction.mockImplementation((callback) =>
			callback({
				bISmaterialRecords: {
					createMany: mockCreateMany,
				},
				photos: {
					updateMany: mockPhotosUpdateMany,
					create: mockPhotosCreate,
				},
			}),
		);
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		jest.useRealTimers();
	});

	it("uses ChatOpenAI structured output with Responses API for image classification", async () => {
		const publicUrl = "https://utfs.io/f/secret-image-key.jpg?token=hidden";

		mockStructuredInvoke.mockResolvedValueOnce({
			isMaterialDocument: false,
			confidence: 0.2,
			reason: "site photo",
		});

		await classifyMaterialDocumentImage(publicUrl, {
			userId: "user-1",
			orgId: "org-1",
			siteId: "site-1",
			senderFirstName: "Anna",
			senderLastName: "Bērziņa",
			senderName: "Anna Bērziņa",
			senderInitials: "AB",
			senderLabel: "Anna Bērziņa",
		});

		expect(ChatOpenAI).toHaveBeenCalledWith({
			model: "gpt-test-classifier",
			temperature: 0,
			useResponsesApi: true,
		});
		expect(mockWithStructuredOutput).toHaveBeenCalledWith(expect.any(Object), {
			name: "material_image_classification",
			method: "jsonSchema",
			strict: true,
		});
		expect(mockStructuredInvoke).toHaveBeenCalledTimes(1);
		const [messages, config] = mockStructuredInvoke.mock.calls[0];

		expect(messages[0].content[1]).toEqual({
			type: "image_url",
			image_url: { url: publicUrl },
		});
		expect(config).toMatchObject({
			runName: "MetaMaterialImageClassification - Anna Bērziņa",
			tags: [
				"whatsapp-site-manager",
				"meta-image",
				"material-document",
				"image-classification",
				"sender:Anna-B_rzi_a",
			],
			metadata: {
				source: "meta-image-handler",
				model: "gpt-test-classifier",
				imageHost: "utfs.io",
				siteId: "site-1",
				userId: "user-1",
				orgId: "org-1",
				senderFirstName: "Anna",
				senderLastName: "Bērziņa",
				senderName: "Anna Bērziņa",
				senderInitials: "AB",
				senderLabel: "Anna Bērziņa",
			},
		});
		expect(JSON.stringify(config.metadata)).not.toContain(publicUrl);
		expect(config.runId).toMatch(uuidV7Pattern);
	});

	it("adds native LangChain run metadata to invoice extraction calls", async () => {
		const publicUrl = "https://utfs.io/f/invoice-private-key.jpg?token=hidden";

		mockUserFindFirst.mockResolvedValueOnce({
			id: "user-1",
			firstName: "Anna",
			lastName: "Bērziņa",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: "site-1",
			siteManagerSelectIdforWhatsapp: null,
		});
		mockStructuredInvoke.mockResolvedValueOnce({
			items: [
				{
					name: "Cements",
					cost: 12.34,
					invoiceNr: "INV-1",
					invoiceDate: null,
					invoiceDateText: "",
					invoiceDateYearVisible: false,
					costCode: "MAT",
					quantity: 2,
					construction_material_id: "no_match",
				},
			],
		});

		const result = await extractAndSaveBISMaterialsFromPublicUrl(
			publicUrl,
			"37120000000",
		);
		const payload = JSON.parse(result);

		expect(ChatOpenAI).toHaveBeenCalledWith({
			model: "gpt-5.4",
			temperature: 0,
			useResponsesApi: true,
		});
		expect(mockWithStructuredOutput).toHaveBeenCalledWith(expect.any(Object), {
			name: "material_invoice_extraction",
			method: "jsonSchema",
			strict: true,
		});
		expect(mockStructuredInvoke).toHaveBeenCalledTimes(1);
		const [messages, config] = mockStructuredInvoke.mock.calls[0];

		expect(messages[0].content[1]).toEqual({
			type: "image_url",
			image_url: { url: publicUrl },
		});
		expect(messages[0].content[0].text).toContain("Today is");
		expect(messages[0].content[0].text).toContain("Europe/Riga");
		expect(config).toMatchObject({
			runName: "MetaMaterialInvoiceExtraction - Anna Bērziņa",
			tags: [
				"whatsapp-site-manager",
				"meta-image",
				"material-document",
				"invoice-extraction",
				"sender:Anna-B_rzi_a",
			],
			metadata: {
				source: "meta-image-handler",
				model: "gpt-5.4",
				imageHost: "utfs.io",
				siteId: "site-1",
				userId: "user-1",
				orgId: "org-1",
				senderFirstName: "Anna",
				senderLastName: "Bērziņa",
				senderName: "Anna Bērziņa",
				senderInitials: "AB",
				senderLabel: "Anna Bērziņa",
			},
		});
		expect(JSON.stringify(config.metadata)).not.toContain(publicUrl);
		expect(config.runId).toMatch(uuidV7Pattern);
		expect(payload.items[0]).toMatchObject({
			senderFirstName: "Anna",
			senderLastName: "Bērziņa",
			senderName: "Anna Bērziņa",
			senderInitials: "AB",
			senderLabel: "Anna Bērziņa",
		});
		expect(mockCreateMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					name: "Cements",
					siteId: "site-1",
					orgId: "org-1",
					userId: "user-1",
					sourcePhoto: publicUrl,
				}),
			],
		});
	});

	it("reuses resolved context across classification and extraction traces", async () => {
		const publicUrl = "https://utfs.io/f/invoice-private-key.jpg?token=hidden";

		mockUserFindFirst.mockResolvedValueOnce({
			id: "user-1",
			firstName: "Anna",
			lastName: "Bērziņa",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: "site-1",
			siteManagerSelectIdforWhatsapp: null,
		});
		mockStructuredInvoke
			.mockResolvedValueOnce({
				isMaterialDocument: true,
				confidence: 0.9,
				reason: "readable invoice",
			})
			.mockResolvedValueOnce({
				items: [
					{
						name: "Cements",
						cost: 12.34,
						invoiceNr: "INV-1",
						invoiceDate: null,
						invoiceDateText: "",
						invoiceDateYearVisible: false,
						costCode: "MAT",
						quantity: 2,
						construction_material_id: "no_match",
					},
				],
			});

		const handled = await processMaterialDocumentImageFromPublicUrl({
			publicUrl,
			senderPhone: "37120000000",
		});

		expect(handled).toBe(true);
		expect(mockUserFindFirst).toHaveBeenCalledTimes(1);
		expect(mockStructuredInvoke).toHaveBeenCalledTimes(2);
		expect(mockStructuredInvoke.mock.calls[0][1].runName).toBe(
			"MetaMaterialImageClassification - Anna Bērziņa",
		);
		expect(mockStructuredInvoke.mock.calls[1][1].runName).toBe(
			"MetaMaterialInvoiceExtraction - Anna Bērziņa",
		);
		expect(mockStructuredInvoke.mock.calls[0][1].metadata).toMatchObject({
			siteId: "site-1",
			userId: "user-1",
			orgId: "org-1",
			senderFirstName: "Anna",
			senderLastName: "Bērziņa",
			senderName: "Anna Bērziņa",
		});
		expect(mockStructuredInvoke.mock.calls[1][1].metadata).toMatchObject({
			siteId: "site-1",
			userId: "user-1",
			orgId: "org-1",
			senderFirstName: "Anna",
			senderLastName: "Bērziņa",
			senderName: "Anna Bērziņa",
		});
		expect(mockStructuredInvoke.mock.calls[0][1].tags).toContain(
			"sender:Anna-B_rzi_a",
		);
		expect(mockStructuredInvoke.mock.calls[1][1].tags).toContain(
			"sender:Anna-B_rzi_a",
		);
		expect(mockStructuredInvoke.mock.calls[0][1].runId).toMatch(uuidV7Pattern);
		expect(mockStructuredInvoke.mock.calls[1][1].runId).toMatch(uuidV7Pattern);
	});

	it("uses route-provided sender names when DB context has no names", async () => {
		const publicUrl = "https://utfs.io/f/invoice-private-key.jpg?token=hidden";

		mockUserFindFirst.mockResolvedValueOnce({
			id: "user-1",
			firstName: null,
			lastName: null,
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: "site-1",
			siteManagerSelectIdforWhatsapp: null,
		});
		mockStructuredInvoke
			.mockResolvedValueOnce({
				isMaterialDocument: true,
				confidence: 0.9,
				reason: "readable invoice",
			})
			.mockResolvedValueOnce({
				items: [
					{
						name: "Cements",
						cost: 12.34,
						invoiceNr: "INV-1",
						invoiceDate: null,
						invoiceDateText: "",
						invoiceDateYearVisible: false,
						costCode: "MAT",
						quantity: 2,
						construction_material_id: "no_match",
					},
				],
			});

		const handled = await processMaterialDocumentImageFromPublicUrl({
			publicUrl,
			senderPhone: "37120000000",
			senderFirstName: "Jānis",
			senderLastName: "Bērziņš",
		});

		expect(handled).toBe(true);
		expect(mockStructuredInvoke.mock.calls[0][1]).toMatchObject({
			runName: "MetaMaterialImageClassification - Jānis Bērziņš",
			metadata: {
				siteId: "site-1",
				userId: "user-1",
				orgId: "org-1",
				senderFirstName: "Jānis",
				senderLastName: "Bērziņš",
				senderName: "Jānis Bērziņš",
				senderInitials: "JB",
				senderLabel: "Jānis Bērziņš",
			},
		});
		expect(mockStructuredInvoke.mock.calls[1][1]).toMatchObject({
			runName: "MetaMaterialInvoiceExtraction - Jānis Bērziņš",
			metadata: {
				siteId: "site-1",
				userId: "user-1",
				orgId: "org-1",
				senderFirstName: "Jānis",
				senderLastName: "Bērziņš",
				senderName: "Jānis Bērziņš",
				senderInitials: "JB",
				senderLabel: "Jānis Bērziņš",
			},
		});
		expect(mockStructuredInvoke.mock.calls[0][1].tags).toContain(
			"sender:J_nis-B_rzi__",
		);
		expect(mockStructuredInvoke.mock.calls[1][1].tags).toContain(
			"sender:J_nis-B_rzi__",
		);
		expect(mockCreateMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					siteId: "site-1",
					orgId: "org-1",
					userId: "user-1",
				}),
			],
		});
	});

	it("uses visible Latvian day-month-year text before AI ISO conversion", async () => {
		expect(
			normalizeExtractedInvoiceDate({
				invoiceDate: "2025-04-12T00:00:00Z",
				invoiceDateText: "04.12.2025",
				invoiceDateYearVisible: true,
				now: new Date("2026-07-20T10:00:00.000Z"),
			})?.toISOString(),
		).toBe("2025-12-04T00:00:00.000Z");

		expect(
			normalizeExtractedInvoiceDate({
				invoiceDate: "2025-12-04T00:00:00Z",
				invoiceDateText: "12.04.2025",
				invoiceDateYearVisible: true,
				now: new Date("2026-07-20T10:00:00.000Z"),
			})?.toISOString(),
		).toBe("2025-04-12T00:00:00.000Z");
	});

	it("rejects visible invoice years before 2025", async () => {
		expect(
			normalizeExtractedInvoiceDate({
				invoiceDate: "2024-12-04T00:00:00Z",
				invoiceDateText: "04.12.2024",
				invoiceDateYearVisible: true,
				now: new Date("2026-07-20T10:00:00.000Z"),
			}),
		).toBeNull();
	});

	it("uses the current Riga year when only day and month are visible recently", async () => {
		expect(
			normalizeExtractedInvoiceDate({
				invoiceDate: "2025-07-15T00:00:00Z",
				invoiceDateText: "15.07.",
				invoiceDateYearVisible: false,
				now: new Date("2026-07-20T10:00:00.000Z"),
			})?.toISOString(),
		).toBe("2026-07-15T00:00:00.000Z");
	});

	it("rejects suspicious future or stale inferred invoice years", async () => {
		expect(
			normalizeExtractedInvoiceDate({
				invoiceDate: "2042-01-01T00:00:00Z",
				invoiceDateText: "",
				invoiceDateYearVisible: false,
				now: new Date("2026-07-20T10:00:00.000Z"),
			}),
		).toBeNull();

		expect(
			normalizeExtractedInvoiceDate({
				invoiceDate: "3000-07-20T00:00:00Z",
				invoiceDateText: "20.07.3000",
				invoiceDateYearVisible: true,
				now: new Date("2026-07-20T10:00:00.000Z"),
			}),
		).toBeNull();

		expect(
			normalizeExtractedInvoiceDate({
				invoiceDate: "2026-02-28T00:00:00Z",
				invoiceDateText: "31.02.2026",
				invoiceDateYearVisible: true,
				now: new Date("2026-07-20T10:00:00.000Z"),
			}),
		).toBeNull();
	});

	it("saves normalized invoice dates to BIS material records", async () => {
		jest.useFakeTimers().setSystemTime(new Date("2026-07-20T10:00:00.000Z"));
		const publicUrl = "https://utfs.io/f/invoice-private-key.jpg?token=hidden";

		mockUserFindFirst.mockResolvedValueOnce({
			id: "user-1",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: "site-1",
			siteManagerSelectIdforWhatsapp: null,
		});
		mockStructuredInvoke.mockResolvedValueOnce({
			items: [
				{
					name: "Cements",
					cost: 12.34,
					invoiceNr: "INV-1",
					invoiceDate: "2025-07-15T00:00:00Z",
					invoiceDateText: "15.07.",
					invoiceDateYearVisible: false,
					costCode: "MAT",
					quantity: 2,
					construction_material_id: "no_match",
				},
			],
		});

		await extractAndSaveBISMaterialsFromPublicUrl(publicUrl, "37120000000");

		expect(mockCreateMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					invoiceDate: new Date("2026-07-15T00:00:00.000Z"),
				}),
			],
		});
	});

	it("keeps material rows when only the invoice date is rejected or corrected", async () => {
		jest.useFakeTimers().setSystemTime(new Date("2026-07-20T10:00:00.000Z"));
		const publicUrl = "https://utfs.io/f/invoice-private-key.jpg?token=hidden";

		mockUserFindFirst.mockResolvedValueOnce({
			id: "user-1",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: "site-1",
			siteManagerSelectIdforWhatsapp: null,
		});
		mockStructuredInvoke.mockResolvedValueOnce({
			items: [
				{
					name: "Rows with invalid date are preserved",
					cost: 12.34,
					invoiceNr: "INV-BAD-DATE",
					invoiceDate: "3000-07-20T00:00:00Z",
					invoiceDateText: "20.07.3000",
					invoiceDateYearVisible: true,
					costCode: "CC-1001",
					quantity: 2,
					construction_material_id: "no_match",
				},
				{
					name: "Rows with swapped AI dates are corrected",
					cost: 56.78,
					invoiceNr: "INV-SWAPPED-DATE",
					invoiceDate: "2025-04-12T00:00:00Z",
					invoiceDateText: "04.12.2025",
					invoiceDateYearVisible: true,
					costCode: "CC-1002",
					quantity: 4,
					construction_material_id: "no_match",
				},
			],
		});

		await extractAndSaveBISMaterialsFromPublicUrl(publicUrl, "37120000000");

		expect(mockCreateMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					name: "Rows with invalid date are preserved",
					cost: 12.34,
					invoiceNr: "INV-BAD-DATE",
					quantity: 2,
					invoiceDate: null,
				}),
				expect.objectContaining({
					name: "Rows with swapped AI dates are corrected",
					cost: 56.78,
					invoiceNr: "INV-SWAPPED-DATE",
					quantity: 4,
					invoiceDate: new Date("2025-12-04T00:00:00.000Z"),
				}),
			],
		});
	});
});
