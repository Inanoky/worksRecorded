const mockStructuredInvoke = jest.fn();
const mockWithStructuredOutput = jest.fn(() => ({
	invoke: mockStructuredInvoke,
}));

const mockUserFindFirst = jest.fn();
const mockCreateMany = jest.fn();
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
		user: {
			findFirst: mockUserFindFirst,
		},
		bisToken: {
			findFirst: jest.fn(),
		},
		bISmaterialRecords: {
			createMany: mockCreateMany,
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
	processMaterialDocumentImageFromPublicUrl,
} from "@/server/actions/META/RoutingHandlers/metaImageHandler";

describe("meta image handler LangSmith tracing", () => {
	let consoleLogSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		mockWithStructuredOutput.mockReturnValue({ invoke: mockStructuredInvoke });
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
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
			runName: "MetaMaterialImageClassification",
			tags: [
				"whatsapp-site-manager",
				"meta-image",
				"material-document",
				"image-classification",
			],
			metadata: {
				source: "meta-image-handler",
				model: "gpt-test-classifier",
				imageHost: "utfs.io",
				siteId: "site-1",
				userId: "user-1",
				orgId: "org-1",
			},
		});
		expect(JSON.stringify(config.metadata)).not.toContain(publicUrl);
		expect(config.runId).toMatch(uuidV7Pattern);
	});

	it("adds native LangChain run metadata to invoice extraction calls", async () => {
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
					invoiceDate: null,
					costCode: "MAT",
					quantity: 2,
					construction_material_id: "no_match",
				},
			],
		});

		await extractAndSaveBISMaterialsFromPublicUrl(publicUrl, "37120000000");

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
		expect(config).toMatchObject({
			runName: "MetaMaterialInvoiceExtraction",
			tags: [
				"whatsapp-site-manager",
				"meta-image",
				"material-document",
				"invoice-extraction",
			],
			metadata: {
				source: "meta-image-handler",
				model: "gpt-5.4",
				imageHost: "utfs.io",
				siteId: "site-1",
				userId: "user-1",
				orgId: "org-1",
			},
		});
		expect(JSON.stringify(config.metadata)).not.toContain(publicUrl);
		expect(config.runId).toMatch(uuidV7Pattern);
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
		expect(mockStructuredInvoke.mock.calls[0][1].metadata).toMatchObject({
			siteId: "site-1",
			userId: "user-1",
			orgId: "org-1",
		});
		expect(mockStructuredInvoke.mock.calls[1][1].metadata).toMatchObject({
			siteId: "site-1",
			userId: "user-1",
			orgId: "org-1",
		});
		expect(mockStructuredInvoke.mock.calls[0][1].runId).toMatch(uuidV7Pattern);
		expect(mockStructuredInvoke.mock.calls[1][1].runId).toMatch(uuidV7Pattern);
	});
});
