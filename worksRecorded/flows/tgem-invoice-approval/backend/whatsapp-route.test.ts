const mockUploadFiles = jest.fn();
const mockCreateTgemInvoiceCaseRecord = jest.fn();
const mockProcessTgemInvoiceCase = jest.fn();
const mockFetchWhatsAppMediaAsBuffer = jest.fn();
const mockSendMessage = jest.fn();
const mockGetOrganizationLanguageByUserId = jest.fn();
const mockPrisma = {
	user: {
		findUnique: jest.fn(),
		update: jest.fn(),
	},
	tgemInvoiceCase: {
		findUnique: jest.fn(),
	},
};

jest.mock("uploadthing/server", () => ({
	UTApi: jest.fn(() => ({ uploadFiles: mockUploadFiles })),
}));
jest.mock("@/lib/tgem-invoice-approval/create-case", () => ({
	createTgemInvoiceCaseRecord: (...args: unknown[]) =>
		mockCreateTgemInvoiceCaseRecord(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/process-case", () => ({
	processTgemInvoiceCase: (...args: unknown[]) =>
		mockProcessTgemInvoiceCase(...args),
}));
jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/utils/whatsapp-helpers/shared/helpers", () => ({
	getString: (formData: FormData, key: string) => {
		const value = formData.get(key);
		return typeof value === "string" ? value : null;
	},
	fetchWhatsAppMediaAsBuffer: (...args: unknown[]) =>
		mockFetchWhatsAppMediaAsBuffer(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
	sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationLanguageByUserId: (...args: unknown[]) =>
		mockGetOrganizationLanguageByUserId(...args),
}));

import { handleTgemInvoiceWhatsappRoute } from "./whatsapp-route";

function buildFormData(input: {
	contentType?: string;
	filename?: string;
	body?: string;
	messageId?: string;
	mediaUrl?: string;
}) {
	const formData = new FormData();
	formData.set("Body", input.body ?? "");
	formData.set("NumMedia", input.contentType ? "1" : "0");
	formData.set("MessageId", input.messageId ?? "wamid.invoice-1");
	if (input.contentType) {
		formData.set("MediaContentType0", input.contentType);
		formData.set("MediaUrl0", input.mediaUrl ?? "https://meta.test/invoice");
	}
	if (input.filename) formData.set("MediaFilename0", input.filename);
	return formData;
}

describe("TGEM WhatsApp invoice handler", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetOrganizationLanguageByUserId.mockResolvedValue("lv");
		mockPrisma.user.findUnique.mockResolvedValue({
			id: "user-1",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: "site-1",
			organization: {
				sites: [
					{ id: "site-1", name: "Rīgas birojs" },
					{ id: "site-2", name: "Noliktava" },
				],
			},
		});
		mockPrisma.tgemInvoiceCase.findUnique.mockResolvedValue(null);
		mockFetchWhatsAppMediaAsBuffer.mockResolvedValue(
			Buffer.from("invoice bytes"),
		);
		mockUploadFiles.mockResolvedValue({
			data: {
				key: "upload-key-1",
				ufsUrl: "https://files.ufs.sh/f/upload-key-1",
			},
		});
		mockCreateTgemInvoiceCaseRecord.mockResolvedValue({
			id: "case-1",
			status: "received",
			documents: [{ id: "document-1" }],
		});
		mockProcessTgemInvoiceCase.mockResolvedValue({
			provider: "openai",
			pageCount: 1,
			lineItemCount: 2,
			warningCount: 0,
		});
	});

	it.each([
		["image/jpeg", "", "whatsapp-invoice-wamid.invoice-1.jpg"],
		["application/pdf", "supplier-invoice.pdf", "supplier-invoice.pdf"],
	])(
		"stores and processes %s invoices through the shared TGEM case",
		async (contentType, filename, expectedFilename) => {
			await handleTgemInvoiceWhatsappRoute({
				from: "whatsapp:+37120000000",
				formData: buildFormData({ contentType, filename }),
				user: { id: "user-1" },
			});

			expect(mockFetchWhatsAppMediaAsBuffer).toHaveBeenCalledWith(
				"https://meta.test/invoice",
			);
			expect(mockUploadFiles).toHaveBeenCalledTimes(1);
			expect(mockCreateTgemInvoiceCaseRecord).toHaveBeenCalledWith(
				mockPrisma,
				expect.objectContaining({
					organizationId: "org-1",
					siteId: "site-1",
					submittedByUserId: "user-1",
					source: "whatsapp",
					sourceMessageId: "wamid.invoice-1",
					storageFile: {
						ufsUrl: "https://files.ufs.sh/f/upload-key-1",
					},
					storageKey: "upload-key-1",
					originalFilename: expectedFilename,
					contentType,
					byteSize: Buffer.byteLength("invoice bytes"),
					sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
				}),
			);
			expect(mockProcessTgemInvoiceCase).toHaveBeenCalledWith({
				invoiceCaseId: "case-1",
				documentId: "document-1",
				organizationId: "org-1",
				actorUserId: "user-1",
				actorType: "whatsapp",
				content: Buffer.from("invoice bytes"),
				contentType,
			});
			expect(mockSendMessage).toHaveBeenLastCalledWith(
				"whatsapp:+37120000000",
				"Rēķins ir saglabāts un apstrādāts. Tas ir pieejams TGEM rēķinu panelī.",
			);
		},
	);

	it("requires a concrete project before accepting an invoice", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({
			id: "user-1",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: null,
			organization: {
				sites: [
					{ id: "site-1", name: "Rīgas birojs" },
					{ id: "site-2", name: "Noliktava" },
				],
			},
		});

		await handleTgemInvoiceWhatsappRoute({
			from: "whatsapp:+37120000000",
			formData: buildFormData({ contentType: "application/pdf" }),
			user: { id: "user-1" },
		});

		expect(mockSendMessage).toHaveBeenCalledWith(
			"whatsapp:+37120000000",
			"Izvēlieties projektu, nosūtot tā numuru:\n1 - Rīgas birojs\n2 - Noliktava",
		);
		expect(mockFetchWhatsAppMediaAsBuffer).not.toHaveBeenCalled();
		expect(mockCreateTgemInvoiceCaseRecord).not.toHaveBeenCalled();
	});

	it("selects a project from the numbered WhatsApp list", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({
			id: "user-1",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: null,
			organization: {
				sites: [
					{ id: "site-1", name: "Rīgas birojs" },
					{ id: "site-2", name: "Noliktava" },
				],
			},
		});

		await handleTgemInvoiceWhatsappRoute({
			from: "whatsapp:+37120000000",
			formData: buildFormData({ body: "2" }),
			user: { id: "user-1" },
		});

		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: { lastSelectedSiteIdforWhatsapp: "site-2" },
		});
		expect(mockSendMessage).toHaveBeenCalledWith(
			"whatsapp:+37120000000",
			"Projekts “Noliktava” ir izvēlēts. Tagad nosūtiet rēķina attēlu vai PDF dokumentu.",
		);
	});

	it("rejects Word documents before download or persistence", async () => {
		await handleTgemInvoiceWhatsappRoute({
			from: "whatsapp:+37120000000",
			formData: buildFormData({
				contentType:
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				filename: "invoice.docx",
			}),
			user: { id: "user-1" },
		});

		expect(mockSendMessage).toHaveBeenCalledWith(
			"whatsapp:+37120000000",
			expect.stringContaining("Word dokumenti pašlaik netiek pieņemti"),
		);
		expect(mockFetchWhatsAppMediaAsBuffer).not.toHaveBeenCalled();
		expect(mockUploadFiles).not.toHaveBeenCalled();
		expect(mockCreateTgemInvoiceCaseRecord).not.toHaveBeenCalled();
	});

	it("does not upload a duplicate Meta invoice message again", async () => {
		mockPrisma.tgemInvoiceCase.findUnique.mockResolvedValue({ id: "case-1" });

		await handleTgemInvoiceWhatsappRoute({
			from: "whatsapp:+37120000000",
			formData: buildFormData({ contentType: "application/pdf" }),
			user: { id: "user-1" },
		});

		expect(mockPrisma.tgemInvoiceCase.findUnique).toHaveBeenCalledWith({
			where: {
				idempotencyKey: "tgem-invoice:org-1:whatsapp:wamid.invoice-1",
			},
			select: { id: true },
		});
		expect(mockFetchWhatsAppMediaAsBuffer).not.toHaveBeenCalled();
		expect(mockUploadFiles).not.toHaveBeenCalled();
		expect(mockSendMessage).toHaveBeenCalledWith(
			"whatsapp:+37120000000",
			"Šis rēķins jau ir saņemts un ir pieejams TGEM rēķinu panelī.",
		);
	});
});
