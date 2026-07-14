const mockResponsesCreate = jest.fn();

const mockOpenAIClient = {
	responses: {
		create: mockResponsesCreate,
	},
	chat: {
		completions: {
			create: jest.fn(),
			parse: jest.fn(),
		},
	},
	completions: {
		create: jest.fn(),
	},
};

const mockUserFindFirst = jest.fn();
const mockCreateMany = jest.fn();

jest.mock("openai", () => ({
	__esModule: true,
	default: jest.fn(() => mockOpenAIClient),
}));

jest.mock("langsmith/wrappers/openai", () => ({
	wrapOpenAI: jest.fn((client) => client),
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

import { wrapOpenAI } from "langsmith/wrappers/openai";
import {
	classifyMaterialDocumentImage,
	extractAndSaveBISMaterialsFromPublicUrl,
	processMaterialDocumentImageFromPublicUrl,
} from "@/server/actions/META/RoutingHandlers/metaImageHandler";

describe("meta image handler LangSmith tracing", () => {
	beforeEach(() => {
		mockResponsesCreate.mockReset();
		mockUserFindFirst.mockReset();
		mockCreateMany.mockReset();
	});

	it("wraps the OpenAI Responses client for LangSmith tracing", () => {
		expect(wrapOpenAI).toHaveBeenCalledWith(mockOpenAIClient);
	});

	it("adds LangSmith trace metadata to image classification calls", async () => {
		const publicUrl = "https://utfs.io/f/secret-image-key.jpg?token=hidden";

		mockResponsesCreate.mockResolvedValueOnce({
			output_text: JSON.stringify({
				isMaterialDocument: false,
				confidence: 0.2,
				reason: "site photo",
			}),
		});

		await classifyMaterialDocumentImage(publicUrl, {
			userId: "user-1",
			orgId: "org-1",
			siteId: "site-1",
		});

		expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
		const [payload, options] = mockResponsesCreate.mock.calls[0];

		expect(payload.input[0].content[0]).toEqual({
			type: "input_image",
			image_url: publicUrl,
		});
		expect(options.langsmithExtra).toMatchObject({
			name: "MetaMaterialImageClassification",
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
		expect(JSON.stringify(options.langsmithExtra.metadata)).not.toContain(
			publicUrl,
		);
	});

	it("adds LangSmith trace metadata to invoice extraction calls", async () => {
		const publicUrl = "https://utfs.io/f/invoice-private-key.jpg?token=hidden";

		mockUserFindFirst.mockResolvedValueOnce({
			id: "user-1",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: "site-1",
			siteManagerSelectIdforWhatsapp: null,
		});
		mockResponsesCreate.mockResolvedValueOnce({
			output_text: JSON.stringify({
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
			}),
		});

		await extractAndSaveBISMaterialsFromPublicUrl(publicUrl, "37120000000");

		expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
		const [payload, options] = mockResponsesCreate.mock.calls[0];

		expect(payload.input[0].content[0]).toEqual({
			type: "input_image",
			image_url: publicUrl,
		});
		expect(options.langsmithExtra).toMatchObject({
			name: "MetaMaterialInvoiceExtraction",
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
		expect(JSON.stringify(options.langsmithExtra.metadata)).not.toContain(
			publicUrl,
		);
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
		mockResponsesCreate
			.mockResolvedValueOnce({
				output_text: JSON.stringify({
					isMaterialDocument: true,
					confidence: 0.9,
					reason: "readable invoice",
				}),
			})
			.mockResolvedValueOnce({
				output_text: JSON.stringify({
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
				}),
			});

		const handled = await processMaterialDocumentImageFromPublicUrl({
			publicUrl,
			senderPhone: "37120000000",
		});

		expect(handled).toBe(true);
		expect(mockUserFindFirst).toHaveBeenCalledTimes(1);
		expect(mockResponsesCreate).toHaveBeenCalledTimes(2);
		expect(
			mockResponsesCreate.mock.calls[0][1].langsmithExtra.metadata,
		).toMatchObject({
			siteId: "site-1",
			userId: "user-1",
			orgId: "org-1",
		});
		expect(
			mockResponsesCreate.mock.calls[1][1].langsmithExtra.metadata,
		).toMatchObject({
			siteId: "site-1",
			userId: "user-1",
			orgId: "org-1",
		});
	});
});
