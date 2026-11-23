const mockUploadFiles = jest.fn();
const mockEnqueue = jest.fn();
const mockFetchMedia = jest.fn();
const mockSendMessage = jest.fn();
const mockSendCard = jest.fn();
const mockFindDraft = jest.fn();
const mockReserveFile = jest.fn();
const mockCompleteFile = jest.fn();
const mockApplyAction = jest.fn();
const mockPrisma = {
	user: { findUnique: jest.fn(), update: jest.fn() },
	tgemInvoiceCase: { findUnique: jest.fn() },
};

jest.mock("uploadthing/server", () => ({
	UTApi: jest.fn(() => ({ uploadFiles: mockUploadFiles })),
}));
jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/tgem-invoice-approval/workflow-client", () => ({
	enqueueTgemInvoiceProcessing: (...args: unknown[]) => mockEnqueue(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/upload-drafts", () => ({
	findTgemUploadDraft: (...args: unknown[]) => mockFindDraft(...args),
	reserveTgemDraftFile: (...args: unknown[]) => mockReserveFile(...args),
	completeTgemDraftFile: (...args: unknown[]) => mockCompleteFile(...args),
	applyTgemDraftAction: (...args: unknown[]) => mockApplyAction(...args),
}));
jest.mock("./draft-messages", () => ({
	...jest.requireActual("./draft-messages"),
	sendTgemDraftReply: (...args: unknown[]) => mockSendCard(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/helpers", () => ({
	getString: (form: FormData, key: string) => form.get(key),
	fetchWhatsAppMediaAsBuffer: (...args: unknown[]) => mockFetchMedia(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
	getMetaReplyContext: () => ({ businessPhoneNumberId: "business-1" }),
	sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/meta/sender", () => ({
	sendMetaGraphMessage: jest.fn(),
}));

import { handleTgemInvoiceWhatsappRoute } from "./whatsapp-route";

const draft = {
	id: "00000000-0000-4000-8000-000000000001",
	siteId: "site-1",
	status: "collecting",
	revision: 4,
	files: [],
};
function form(
	input: { contentType?: string; body?: string; button?: string } = {},
) {
	const result = new FormData();
	result.set("Body", input.body ?? "");
	result.set("NumMedia", input.contentType ? "1" : "0");
	result.set("MessageId", "wamid.invoice-1");
	if (input.contentType) {
		result.set("MediaContentType0", input.contentType);
		result.set("MediaUrl0", "https://meta.test/media");
	}
	if (input.button) result.set("TgemDraftButtonId", input.button);
	return result;
}
const call = (formData: FormData) =>
	handleTgemInvoiceWhatsappRoute({
		from: "+37120000000",
		user: { id: "user-1" },
		formData,
	});

describe("TGEM WhatsApp drafts", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: "user-1",
			organizationId: "org-1",
			lastSelectedSiteIdforWhatsapp: "site-1",
			organization: {
				sites: [
					{ id: "site-1", name: "Rīga" },
					{ id: "site-2", name: "Noliktava" },
				],
			},
		});
		mockFindDraft.mockResolvedValue(null);
		mockPrisma.tgemInvoiceCase.findUnique.mockResolvedValue(null);
		mockReserveFile.mockResolvedValue({
			file: { id: "file-1", originalFilename: "invoice.pdf" },
			draft,
			upload: true,
		});
		mockCompleteFile.mockResolvedValue(draft);
		mockFetchMedia.mockResolvedValue(Buffer.from("invoice bytes"));
		mockUploadFiles.mockResolvedValue({
			data: { key: "key-1", ufsUrl: "https://files.ufs.sh/f/key-1" },
		});
	});

	it.each(["image/jpeg", "application/pdf"])(
		"saves %s in a draft without starting extraction",
		async (contentType) => {
			expect(await call(form({ contentType }))).toMatchObject({
				outcome: "draft_file_saved",
				draftId: draft.id,
			});
			expect(mockReserveFile).toHaveBeenCalledWith(
				expect.objectContaining({
					organizationId: "org-1",
					userId: "user-1",
					businessPhoneNumberId: "business-1",
					siteId: "site-1",
				}),
				expect.objectContaining({ messageId: "wamid.invoice-1", contentType }),
			);
			expect(mockCompleteFile).toHaveBeenCalledWith(
				expect.any(Object),
				"file-1",
				expect.objectContaining({
					canonicalUrl: "https://files.ufs.sh/f/key-1",
					sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
				}),
			);
			expect(mockSendCard).toHaveBeenCalledWith("+37120000000", draft, "Rīga");
			expect(mockEnqueue).not.toHaveBeenCalled();
		},
	);

	it("processes only the cases returned by explicit submission", async () => {
		mockFindDraft.mockResolvedValue(draft);
		mockApplyAction.mockResolvedValue({
			decision: "together",
			draft,
			invoices: [
				{ id: "case-1", status: "received", documents: [{ id: "doc-1" }] },
			],
		});
		expect(
			await call(form({ button: `tgem:${draft.id}:4:together` })),
		).toMatchObject({ outcome: "draft_together", invoiceCount: 1 });
		expect(mockApplyAction).toHaveBeenCalledWith(
			expect.any(Object),
			draft.id,
			4,
			"together",
		);
		expect(mockEnqueue).toHaveBeenCalledWith({
			invoiceCaseId: "case-1",
			documentId: "doc-1",
		});
	});

	it.each(["Apstrādāt", "apstradat", "Tas ir viss"])(
		"accepts the processing text command %s",
		async (body) => {
			mockFindDraft.mockResolvedValue(draft);
			mockApplyAction.mockResolvedValue({
				decision: "together",
				draft,
				invoices: [
					{ id: "case-1", status: "received", documents: [{ id: "doc-1" }] },
				],
			});
			await call(form({ body }));
			expect(mockApplyAction).toHaveBeenCalledWith(
				expect.any(Object),
				draft.id,
				4,
				"submit",
			);
			expect(mockEnqueue).toHaveBeenCalledTimes(1);
		},
	);

	it("processes directly from the Apstrādāt reply button", async () => {
		mockFindDraft.mockResolvedValue(draft);
		mockApplyAction.mockResolvedValue({
			decision: "together",
			draft,
			invoices: [
				{ id: "case-1", status: "received", documents: [{ id: "doc-1" }] },
			],
		});
		expect(
			await call(form({ button: `tgem:${draft.id}:4:submit` })),
		).toMatchObject({ outcome: "draft_together", invoiceCount: 1 });
		expect(mockApplyAction).toHaveBeenCalledWith(
			expect.any(Object),
			draft.id,
			4,
			"submit",
		);
	});

	it("rejects an eleventh file before downloading it and resends the saved draft", async () => {
		mockFindDraft.mockResolvedValue(draft);
		mockReserveFile.mockRejectedValue(new Error("draft_file_limit"));
		expect(await call(form({ contentType: "image/jpeg" }))).toMatchObject({
			outcome: "draft_file_limit",
		});
		expect(mockFetchMedia).not.toHaveBeenCalled();
		expect(mockEnqueue).not.toHaveBeenCalled();
		expect(mockSendCard).toHaveBeenCalledWith("+37120000000", draft, "Rīga");
	});

	it.each(["choose", "stale", "uploading"])(
		"does not process on %s",
		async (decision) => {
			mockFindDraft.mockResolvedValue(draft);
			mockApplyAction.mockResolvedValue({ decision, draft, invoices: [] });
			await call(form({ body: "Iesniegt" }));
			expect(mockEnqueue).not.toHaveBeenCalled();
		},
	);

	it.each([{ body: "Atcelt" }, { button: `tgem:${draft.id}:4:cancel` }])(
		"keeps uploaded documents when an old cancel command is received",
		async (input) => {
			mockFindDraft.mockResolvedValue(draft);
			await call(form(input));
			expect(mockApplyAction).not.toHaveBeenCalled();
			expect(mockSendCard).toHaveBeenCalledWith("+37120000000", draft, "Rīga");
			expect(mockEnqueue).not.toHaveBeenCalled();
		},
	);

	it("does not start an already processed invoice on repeated submission", async () => {
		mockFindDraft.mockResolvedValue({ ...draft, status: "submitted" });
		mockApplyAction.mockResolvedValue({
			decision: "submitted",
			draft,
			invoices: [
				{
					id: "case-1",
					status: "awaiting_approval",
					documents: [{ id: "doc-1" }],
				},
			],
		});
		await call(form({ button: `tgem:${draft.id}:4:together` }));
		expect(mockEnqueue).not.toHaveBeenCalled();
	});

	it("keeps the draft project when selection changes elsewhere", async () => {
		mockFindDraft.mockResolvedValue({ ...draft, siteId: "site-2" });
		await call(form({ contentType: "image/jpeg" }));
		expect(mockReserveFile).toHaveBeenCalledWith(
			expect.objectContaining({ siteId: "site-2" }),
			expect.any(Object),
		);
	});

	it("prevents switching projects while collecting files", async () => {
		mockFindDraft.mockResolvedValue(draft);
		expect(await call(form({ body: "projekts" }))).toEqual({
			outcome: "draft_project_locked",
		});
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("skips downloads for duplicate messages", async () => {
		mockReserveFile.mockResolvedValue({ upload: false, draft });
		expect(await call(form({ contentType: "application/pdf" }))).toMatchObject({
			outcome: "draft_duplicate",
		});
		expect(mockFetchMedia).not.toHaveBeenCalled();
	});

	it("rejects unsupported documents before storage", async () => {
		expect(
			await call(form({ contentType: "application/msword" })),
		).toMatchObject({ outcome: "unsupported_content_type" });
		expect(mockReserveFile).not.toHaveBeenCalled();
		expect(mockFetchMedia).not.toHaveBeenCalled();
	});

	it("marks a failed download as failed without submitting other files", async () => {
		mockFetchMedia.mockRejectedValue(new Error("unavailable"));
		await call(form({ contentType: "application/pdf" }));
		expect(mockCompleteFile).toHaveBeenCalledWith(
			expect.any(Object),
			"file-1",
			null,
		);
		expect(mockEnqueue).not.toHaveBeenCalled();
	});

	it("keeps a saved file ready if sending the reply fails", async () => {
		mockSendCard.mockRejectedValue(new Error("provider unavailable"));
		await call(form({ contentType: "application/pdf" }));
		expect(mockCompleteFile).toHaveBeenCalledTimes(1);
	});
});
