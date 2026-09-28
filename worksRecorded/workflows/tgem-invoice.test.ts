const mockEmailGet = jest.fn();
const mockAttachmentList = jest.fn();
const mockAttachmentGet = jest.fn();
const mockUploadFilesFromUrl = jest.fn();
const mockCreateTgemInvoiceCaseRecord = jest.fn();
const mockGetUploadThingUfsUrl = jest.fn();
const mockCreateHook = jest.fn();
const mockStart = jest.fn();
const mockPrisma = {
	tgemInboundMailbox: { findMany: jest.fn() },
	flowAssignment: { findFirst: jest.fn() },
	tgemInvoiceCase: { findUnique: jest.fn() },
	tgemInvoiceDocument: { findFirst: jest.fn() },
};

jest.mock("resend", () => ({
	Resend: jest.fn(() => ({
		emails: {
			receiving: {
				get: (...args: unknown[]) => mockEmailGet(...args),
				attachments: {
					list: (...args: unknown[]) => mockAttachmentList(...args),
					get: (...args: unknown[]) => mockAttachmentGet(...args),
				},
			},
		},
	})),
}));

jest.mock("uploadthing/server", () => ({
	UTApi: jest.fn(() => ({
		uploadFilesFromUrl: (...args: unknown[]) => mockUploadFilesFromUrl(...args),
	})),
}));

jest.mock("@/lib/tgem-invoice-approval/create-case", () => ({
	createTgemInvoiceCaseRecord: (...args: unknown[]) =>
		mockCreateTgemInvoiceCaseRecord(...args),
}));

jest.mock("@/lib/tgem-invoice-approval/process-case", () => ({
	processTgemInvoiceCase: jest.fn(),
}));

jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));

jest.mock("@/lib/utils/uploadthing-file-url", () => ({
	getUploadThingUfsUrl: (...args: unknown[]) =>
		mockGetUploadThingUfsUrl(...args),
}));

jest.mock("workflow", () => ({
	createHook: (...args: unknown[]) => mockCreateHook(...args),
	FatalError: class FatalError extends Error {},
}));

jest.mock("workflow/api", () => ({
	start: (...args: unknown[]) => mockStart(...args),
}));

import {
	loadTgemInboundEmailStep,
	processTgemInboundEmailWorkflow,
	resolveTgemInboundOrganizationStep,
	storeTgemInboundAttachmentStep,
} from "@/workflows/tgem-invoice";

describe("TGEM email workflows", () => {
	const previousApiKey = process.env.RESEND_API_KEY;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.RESEND_API_KEY = "re_test";
		mockCreateHook.mockReturnValue({
			getConflict: jest.fn().mockResolvedValue(null),
			[Symbol.dispose]: jest.fn(),
		});
	});

	afterAll(() => {
		if (previousApiKey === undefined) {
			delete process.env.RESEND_API_KEY;
		} else {
			process.env.RESEND_API_KEY = previousApiKey;
		}
	});

	it("keeps only supported attachments within the size limit", async () => {
		mockEmailGet.mockResolvedValue({
			data: {
				from: "Supplier <supplier@example.com>",
				to: ["invoice@updates.worksrecorded.com"],
				received_for: [],
				cc: [],
				subject: "Rēķins – Testa projekts",
				text: "Testa projekts",
				html: null,
			},
			error: null,
		});
		mockAttachmentList.mockResolvedValue({
			data: {
				data: [
					{
						id: "pdf-1",
						filename: "invoice.pdf",
						content_type: "application/pdf",
						size: 1024,
					},
					{
						id: "image-1",
						filename: "invoice.png",
						content_type: "image/png",
						size: 2048,
					},
					{
						id: "word-1",
						filename: "invoice.docx",
						content_type:
							"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
						size: 1024,
					},
					{
						id: "large-1",
						filename: "large.pdf",
						content_type: "application/pdf",
						size: 17 * 1024 * 1024,
					},
				],
			},
			error: null,
		});

		const inbound = await loadTgemInboundEmailStep("email-1");

		expect(inbound.recipientAddresses).toEqual([
			"invoice@updates.worksrecorded.com",
		]);
		expect(inbound.attachments.map((attachment) => attachment.id)).toEqual([
			"pdf-1",
			"image-1",
		]);
	});

	it("surfaces transient Resend retrieval failures for retry", async () => {
		mockEmailGet.mockResolvedValue({
			data: null,
			error: { message: "temporarily unavailable" },
		});
		mockAttachmentList.mockResolvedValue({ data: { data: [] }, error: null });

		await expect(loadTgemInboundEmailStep("email-1")).rejects.toThrow(
			"temporarily unavailable",
		);
	});

	it("rejects recipients without an enabled mailbox", async () => {
		mockPrisma.tgemInboundMailbox.findMany.mockResolvedValue([]);

		await expect(
			resolveTgemInboundOrganizationStep(["other@example.com"]),
		).rejects.toThrow("No enabled TGEM mailbox");
	});

	it("rejects a mailbox whose organization is not assigned to TGEM", async () => {
		mockPrisma.tgemInboundMailbox.findMany.mockResolvedValue([
			{ organizationId: "org-1" },
		]);
		mockPrisma.flowAssignment.findFirst.mockResolvedValue(null);

		await expect(
			resolveTgemInboundOrganizationStep(["invoice@updates.worksrecorded.com"]),
		).rejects.toThrow("does not use TGEM");
	});

	it("reuses the existing case for repeated email attachment delivery", async () => {
		mockPrisma.tgemInvoiceCase.findUnique.mockResolvedValue({
			id: "case-1",
			documents: [{ id: "document-1" }],
		});

		await expect(
			storeTgemInboundAttachmentStep({
				emailId: "email-1",
				organizationId: "org-1",
				sender: "supplier@example.com",
				sourceContext: { subject: "Testa projekts" },
				attachment: {
					id: "attachment-1",
					filename: "invoice.pdf",
					contentType: "application/pdf",
					size: 1024,
				},
			}),
		).resolves.toEqual({
			invoiceCaseId: "case-1",
			documentId: "document-1",
		});
		expect(mockAttachmentGet).not.toHaveBeenCalled();
		expect(mockUploadFilesFromUrl).not.toHaveBeenCalled();
	});

	it("surfaces UploadThing failures for workflow retry", async () => {
		mockPrisma.tgemInvoiceCase.findUnique.mockResolvedValue(null);
		mockAttachmentGet.mockResolvedValue({
			data: { download_url: "https://example.com/invoice.pdf" },
			error: null,
		});
		mockUploadFilesFromUrl.mockResolvedValue({
			data: null,
			error: { message: "upload unavailable" },
		});

		await expect(
			storeTgemInboundAttachmentStep({
				emailId: "email-1",
				organizationId: "org-1",
				sender: "supplier@example.com",
				sourceContext: { subject: "Testa projekts" },
				attachment: {
					id: "attachment-1",
					filename: "invoice.pdf",
					contentType: "application/pdf",
					size: 1024,
				},
			}),
		).rejects.toThrow("upload unavailable");
	});

	it("stores and launches processing for every supported attachment", async () => {
		mockEmailGet.mockResolvedValue({
			data: {
				from: "supplier@example.com",
				to: ["invoice@updates.worksrecorded.com"],
				received_for: [],
				cc: [],
				subject: "Rēķins – Testa projekts",
				text: "Testa projekts",
				html: null,
			},
			error: null,
		});
		mockAttachmentList.mockResolvedValue({
			data: {
				data: [
					{
						id: "attachment-1",
						filename: "invoice-1.pdf",
						content_type: "application/pdf",
						size: 1024,
					},
					{
						id: "attachment-2",
						filename: "invoice-2.png",
						content_type: "image/png",
						size: 2048,
					},
				],
			},
			error: null,
		});
		mockPrisma.tgemInboundMailbox.findMany.mockResolvedValue([
			{ organizationId: "org-1" },
		]);
		mockPrisma.flowAssignment.findFirst.mockResolvedValue({
			organizationId: "org-1",
		});
		mockPrisma.tgemInvoiceCase.findUnique.mockResolvedValue(null);
		mockAttachmentGet
			.mockResolvedValueOnce({
				data: { download_url: "https://example.com/invoice-1.pdf" },
				error: null,
			})
			.mockResolvedValueOnce({
				data: { download_url: "https://example.com/invoice-2.png" },
				error: null,
			});
		mockUploadFilesFromUrl
			.mockResolvedValueOnce({
				data: { key: "file-1", ufsUrl: "https://ufs.example/invoice-1.pdf" },
				error: null,
			})
			.mockResolvedValueOnce({
				data: { key: "file-2", ufsUrl: "https://ufs.example/invoice-2.png" },
				error: null,
			});
		mockGetUploadThingUfsUrl
			.mockReturnValueOnce("https://ufs.example/invoice-1.pdf")
			.mockReturnValueOnce("https://ufs.example/invoice-2.png");
		mockCreateTgemInvoiceCaseRecord
			.mockResolvedValueOnce({
				id: "case-1",
				documents: [{ id: "document-1" }],
			})
			.mockResolvedValueOnce({
				id: "case-2",
				documents: [{ id: "document-2" }],
			});
		mockStart
			.mockResolvedValueOnce({ runId: "processing-run-1" })
			.mockResolvedValueOnce({ runId: "processing-run-2" });

		await expect(processTgemInboundEmailWorkflow("email-1")).resolves.toEqual({
			status: "queued",
			emailId: "email-1",
			invoiceCaseIds: ["case-1", "case-2"],
			processingRunIds: ["processing-run-1", "processing-run-2"],
		});
		expect(mockCreateTgemInvoiceCaseRecord).toHaveBeenCalledTimes(2);
		expect(mockStart).toHaveBeenCalledTimes(2);
	});
});
