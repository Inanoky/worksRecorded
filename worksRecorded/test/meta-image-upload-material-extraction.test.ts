import { readFileSync } from "node:fs";
import path from "node:path";

const mockUploadFiles = jest.fn();
const mockStructuredInvoke = jest.fn();
const mockWithStructuredOutput = jest.fn(() => ({
	invoke: mockStructuredInvoke,
}));
const mockSendMessage = jest.fn();
const mockSavePhoto = jest.fn();
const mockCreateMany = jest.fn();
const mockUserFindFirst = jest.fn();
const mockSiteDiarySettingsFindUnique = jest.fn();
const mockHandleProjectSelector = jest.fn();
const mockHandleAudio = jest.fn();
const mockHandleText = jest.fn();
const mockTalkToWhatsappAgent = jest.fn();
const mockGetUserFirstNameById = jest.fn();
const mockGetRandomSiteManagerProcessingAcknowledgement = jest.fn();

const mockFixtureImagePath = path.join(
	process.cwd(),
	"test/fixtures/meta-webhook/material-invoice.jpg",
);
const mockFixtureImageBuffer = readFileSync(mockFixtureImagePath);
const mockUploadedPublicUrl = "https://ut.test.ufs.sh/f/material-invoice.jpg";

jest.mock("uploadthing/server", () => ({
	UTApi: jest.fn(() => ({
		uploadFiles: mockUploadFiles,
	})),
}));

jest.mock("@langchain/openai", () => ({
	ChatOpenAI: jest.fn(() => ({
		withStructuredOutput: mockWithStructuredOutput,
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
		sitediarysettings: {
			findUnique: mockSiteDiarySettingsFindUnique,
		},
	},
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/helpers", () => {
	const actual = jest.requireActual(
		"@/lib/utils/whatsapp-helpers/shared/helpers",
	);
	return {
		...actual,
		fetchWhatsAppMediaAsBuffer: jest.fn(async () => mockFixtureImageBuffer),
	};
});

jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
	sendMessage: mockSendMessage,
}));

jest.mock("@/server/actions/site-diary-actions", () => ({
	savePhoto: mockSavePhoto,
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/projectSelector", () => ({
	handleProjectSelector: mockHandleProjectSelector,
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/handleAudio", () => ({
	handleAudio: mockHandleAudio,
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/handleText", () => ({
	handleText: mockHandleText,
}));

jest.mock(
	"@/flows/default-construction/backend/site-manager-agent/agent",
	() => ({
		__esModule: true,
		default: mockTalkToWhatsappAgent,
	}),
);

jest.mock("@/server/actions/whatsapp-actions", () => ({
	getUserFirstNameById: mockGetUserFirstNameById,
}));

jest.mock(
	"@/flows/default-construction/backend/site-manager-acknowledgements",
	() => ({
		getRandomSiteManagerProcessingAcknowledgement:
			mockGetRandomSiteManagerProcessingAcknowledgement,
	}),
);

jest.mock("@/server/ai-flows/ai-models-settings", () => ({
	metaMaterialImageClassifierModel: "gpt-test-classifier",
	metaMaterialImageClassifierTemperature: 0,
}));

import { handleSiteManagerRoute } from "@/flows/default-construction/backend/site-manager-route";
import { fetchWhatsAppMediaAsBuffer } from "@/lib/utils/whatsapp-helpers/shared/helpers";
import expectedFixture from "./fixtures/meta-webhook/material-invoice.expected.json";

describe("site-manager material image upload extraction", () => {
	let consoleLogSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

		mockHandleProjectSelector.mockResolvedValue(false);
		mockGetUserFirstNameById.mockResolvedValue("Jānis");
		mockSiteDiarySettingsFindUnique.mockResolvedValue({
			siteId: "site-1",
			schema: { fields: [] },
		});
		mockUserFindFirst.mockResolvedValue({
			id: "user-1",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: "site-1",
			siteManagerSelectIdforWhatsapp: null,
		});
		mockUploadFiles.mockResolvedValue({
			data: {
				ufsUrl: mockUploadedPublicUrl,
			},
		});
		mockWithStructuredOutput.mockReturnValue({ invoke: mockStructuredInvoke });
		mockStructuredInvoke
			.mockResolvedValueOnce({
				isMaterialDocument: true,
				confidence: 0.94,
				reason: "readable invoice with construction material rows",
			})
			.mockResolvedValueOnce({
				items: expectedFixture.items,
			});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	it("uploads a repo invoice image fixture, extracts material rows, and acknowledges it", async () => {
		const formData = new FormData();
		formData.set("Body", "Rēķins materiāliem");
		formData.set("NumMedia", "1");
		formData.set("MediaUrl0", "https://meta.test/material-invoice.jpg");
		formData.set("MediaContentType0", "image/jpeg");

		await handleSiteManagerRoute({
			from: "whatsapp:+37120000000",
			formData,
			user: {
				id: "user-1",
				phone: "37120000000",
				firstName: "Jānis",
				lastName: "Bērziņš",
				lastSelectedSiteIdforWhatsapp: "site-1",
			},
		});

		expect(fetchWhatsAppMediaAsBuffer).toHaveBeenCalledWith(
			"https://meta.test/material-invoice.jpg",
		);
		expect(mockUploadFiles).toHaveBeenCalledTimes(1);

		const uploadedFile = mockUploadFiles.mock.calls[0][0][0] as File;
		expect(uploadedFile).toEqual(
			expect.objectContaining({
				name: expect.stringMatching(/^whatsapp_\d+\.jpeg$/),
				type: "image/jpeg",
			}),
		);
		expect(uploadedFile.size).toBe(mockFixtureImageBuffer.byteLength);

		expect(mockStructuredInvoke).toHaveBeenCalledTimes(2);
		expect(mockStructuredInvoke.mock.calls[0][0][0].content[1]).toEqual({
			type: "image_url",
			image_url: { url: mockUploadedPublicUrl },
		});
		expect(mockStructuredInvoke.mock.calls[1][0][0].content[1]).toEqual({
			type: "image_url",
			image_url: { url: mockUploadedPublicUrl },
		});

		const createManyArg = mockCreateMany.mock.calls[0][0];
		expect(createManyArg.data).toHaveLength(expectedFixture.items.length);
		for (const expected of expectedFixture.items) {
			expect(createManyArg.data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: expected.name,
						quantity: expected.quantity,
						invoiceNr: expected.invoiceNr,
						invoiceDate: expected.invoiceDate,
						cost: expected.cost,
						costCode: expected.costCode,
						categoryId: expected.construction_material_id,
						sourcePhoto: mockUploadedPublicUrl,
						siteId: "site-1",
						orgId: "org-1",
						userId: "user-1",
					}),
				]),
			);
		}
		expect(mockSavePhoto).not.toHaveBeenCalled();
		expect(mockHandleAudio).not.toHaveBeenCalled();
		expect(mockHandleText).not.toHaveBeenCalled();
		expect(mockSendMessage).toHaveBeenCalledWith(
			"whatsapp:+37120000000",
			"✅ Materiālu dokuments saņemts. Materiāli tika izvilkti un saglabāti.",
		);
	});
});
