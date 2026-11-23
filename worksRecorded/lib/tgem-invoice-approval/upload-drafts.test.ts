const mockPermission = jest.fn();
const mockTgemOrganization = jest.fn();
const mockProcessor = jest.fn();
const mockDb = {
	site: { findFirst: jest.fn() },
	tgemInvoiceUploadDraft: {
		create: jest.fn(),
		findFirst: jest.fn(),
		findUniqueOrThrow: jest.fn(),
		update: jest.fn(),
		upsert: jest.fn(),
	},
	tgemInvoiceDraftFile: {
		findUnique: jest.fn(),
		findFirst: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
		aggregate: jest.fn(),
	},
	tgemInvoiceCase: { create: jest.fn(), findMany: jest.fn() },
	$queryRaw: jest.fn(),
	$transaction: jest.fn(),
};
jest.mock("@/lib/utils/db", () => ({ prisma: mockDb }));
jest.mock("@/lib/tgem-invoice-approval/access", () => ({
	isTgemAccessOrganization: (...args: unknown[]) =>
		mockTgemOrganization(...args),
	requireTgemPermission: (...args: unknown[]) => mockPermission(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/processor-config", () => ({
	getTgemInvoiceProcessor: () => mockProcessor(),
}));

import {
	applyTgemDraftAction,
	completeTgemDraftFile,
	createTgemWebUploadDraft,
	reserveTgemDraftFile,
	type TgemUploadDraft,
	tgemDraftActiveKey,
	tgemDraftDecision,
} from "./upload-drafts";

const scope = {
	organizationId: "org-1",
	userId: "user-1",
	siteId: "site-1",
	businessPhoneNumberId: "business-1",
	sender: "+37120000000",
};
function draft(status = "collecting", count = 2): TgemUploadDraft {
	return {
		source: "whatsapp",
		...scope,
		id: "draft-1",
		activeKey: tgemDraftActiveKey(scope),
		status,
		revision: 4,
		submissionMode: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		files: Array.from({ length: count }, (_, index) => ({
			id: `file-${index}`,
			draftId: "draft-1",
			sourceKey: `source-${index}`,
			messageId: `message-${index}`,
			status: "ready",
			position: index,
			storageKey: `storage-${index}`,
			canonicalUrl: `https://files.test/${index}`,
			byteSize: 100,
			sha256: "hash",
			originalFilename: index ? "receipt.jpg" : "invoice.pdf",
			contentType: index ? "image/jpeg" : "application/pdf",
			createdAt: new Date(),
			updatedAt: new Date(),
		})),
	};
}

describe("TGEM persistent upload drafts", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockTgemOrganization.mockResolvedValue(true);
		mockPermission.mockResolvedValue(undefined);
		mockProcessor.mockReturnValue("openai");
		mockDb.site.findFirst.mockResolvedValue({ id: "site-1" });
		mockDb.$transaction.mockImplementation(
			async (callback: (db: typeof mockDb) => unknown) => callback(mockDb),
		);
	});

	it("reserves every selected web file without creating invoices", async () => {
		await createTgemWebUploadDraft(
			{ ...scope, businessPhoneNumberId: "dashboard" },
			[
				{ name: "invoice.pdf", type: "application/pdf", size: 100 },
				{ name: "receipt.jpg", type: "image/jpeg", size: 100 },
			],
		);
		expect(mockDb.tgemInvoiceUploadDraft.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					source: "dashboard",
					status: "choosing",
					files: {
						create: [
							expect.objectContaining({
								originalFilename: "invoice.pdf",
								position: 0,
							}),
							expect.objectContaining({
								originalFilename: "receipt.jpg",
								position: 1,
							}),
						],
					},
				}),
			}),
		);
		expect(mockDb.tgemInvoiceCase.create).not.toHaveBeenCalled();
	});

	it("rejects packages for non-TGEM organizations before reserving files", async () => {
		mockTgemOrganization.mockResolvedValue(false);
		await expect(
			createTgemWebUploadDraft(
				{ ...scope, businessPhoneNumberId: "dashboard" },
				[{ name: "invoice.pdf", type: "application/pdf", size: 100 }],
			),
		).rejects.toThrow("TGEM access denied");
		expect(mockDb.tgemInvoiceUploadDraft.create).not.toHaveBeenCalled();
	});

	it("rejects partial web uploads and unsupported grouped processors before creating cases", async () => {
		const current = draft("choosing");
		current.source = "dashboard";
		current.files[0].status = "failed";
		mockDb.tgemInvoiceUploadDraft.findFirst.mockResolvedValue(current);
		await expect(
			applyTgemDraftAction(scope, current.id, 4, "together"),
		).rejects.toThrow("Visiem paketes failiem");
		current.files[0].status = "ready";
		mockProcessor.mockReturnValue("google-document-ai");
		await expect(
			applyTgemDraftAction(scope, current.id, 4, "together"),
		).rejects.toThrow("draft_package_processor_unsupported");
		expect(mockDb.tgemInvoiceCase.create).not.toHaveBeenCalled();
	});

	it("processes a WhatsApp package directly and rejects old buttons or pending files", () => {
		const current = draft();
		expect(tgemDraftDecision(current, "more", 4)).toBe("more");
		expect(tgemDraftDecision(current, "submit", 4)).toBe("together");
		expect(tgemDraftDecision(current, "submit", 3)).toBe("stale");
		expect(tgemDraftDecision(current, "together", 4)).toBe("stale");
		current.files[0].status = "uploading";
		expect(tgemDraftDecision(current, "submit", 4)).toBe("uploading");
		expect(tgemDraftDecision(draft("collecting", 1), "submit", 4)).toBe(
			"together",
		);
		expect(tgemDraftDecision(draft("collecting", 0), "submit", 4)).toBe(
			"empty",
		);
		expect(tgemDraftDecision(draft("cancelled"), "submit", 4)).toBe("closed");
		current.source = "dashboard";
		current.files[0].status = "ready";
		expect(tgemDraftDecision(current, "submit", 4)).toBe("choose");
	});

	it.each(["collecting", "choosing"])(
		"keeps a %s draft intact when an old cancel action is replayed",
		async (status) => {
			const current = draft(status);
			mockDb.tgemInvoiceUploadDraft.findFirst.mockResolvedValue(current);
			const result = await applyTgemDraftAction(
				scope,
				current.id,
				current.revision,
				"cancel" as never,
			);
			expect(result.decision).toBe("unsupported");
			expect(result.draft.files).toHaveLength(2);
			expect(mockDb.tgemInvoiceUploadDraft.update).not.toHaveBeenCalled();
			expect(mockDb.tgemInvoiceCase.create).not.toHaveBeenCalled();
		},
	);

	it.each(["submit", "together", "separate"] as const)(
		"creates %s cases atomically and reuses them on repeated submit",
		async (action) => {
			const current = draft(action === "submit" ? "collecting" : "choosing");
			mockDb.tgemInvoiceUploadDraft.findFirst.mockImplementation(
				async () => current,
			);
			mockDb.tgemInvoiceUploadDraft.update.mockImplementation(
				async ({ data }) => {
					current.status = data.status;
					current.revision++;
					return current;
				},
			);
			mockDb.tgemInvoiceCase.findMany.mockResolvedValue([
				{ id: "case-1", status: "received", documents: [{ id: "document-1" }] },
			]);
			await applyTgemDraftAction(scope, current.id, 4, action);
			expect(mockDb.tgemInvoiceCase.create).toHaveBeenCalledTimes(
				action === "separate" ? 2 : 1,
			);
			const created = mockDb.tgemInvoiceCase.create.mock.calls[0][0].data;
			expect(created.documents.create).toHaveLength(
				action === "separate" ? 1 : 2,
			);
			expect(created).toMatchObject({
				organizationId: "org-1",
				siteId: "site-1",
				submittedByUserId: "user-1",
				uploadDraftId: "draft-1",
			});
			expect(created.documents.create[0]).toMatchObject({
				uploadDraftFileId: "file-0",
				canonicalUrl: "https://files.test/0",
			});
			const count = mockDb.tgemInvoiceCase.create.mock.calls.length;
			const repeated = await applyTgemDraftAction(scope, current.id, 4, action);
			expect(repeated.decision).toBe("submitted");
			expect(mockDb.tgemInvoiceCase.create).toHaveBeenCalledTimes(count);
			expect(mockPermission).toHaveBeenCalledWith(
				mockDb,
				expect.objectContaining({ permission: "invoice.submit_approval" }),
			);
		},
	);

	it("leaves the draft untouched for stale submission and foreign ownership", async () => {
		mockDb.tgemInvoiceUploadDraft.findFirst.mockResolvedValue(draft());
		expect(
			(await applyTgemDraftAction(scope, "draft-1", 2, "submit")).decision,
		).toBe("stale");
		expect(mockDb.tgemInvoiceCase.create).not.toHaveBeenCalled();
		mockDb.tgemInvoiceUploadDraft.findFirst.mockResolvedValue(null);
		await expect(
			applyTgemDraftAction(scope, "foreign", 4, "submit"),
		).rejects.toThrow("access denied");
		expect(mockDb.tgemInvoiceUploadDraft.findFirst).toHaveBeenLastCalledWith(
			expect.objectContaining({
				where: {
					id: "foreign",
					userId: "user-1",
					organizationId: "org-1",
					businessPhoneNumberId: "business-1",
					siteId: "site-1",
				},
			}),
		);
	});

	it("blocks submission when approval permission was revoked", async () => {
		mockDb.tgemInvoiceUploadDraft.findFirst.mockResolvedValue(
			draft("choosing"),
		);
		mockPermission.mockImplementation(async (_db, input) => {
			if (input.permission === "invoice.submit_approval")
				throw new Error("permission denied");
		});
		await expect(
			applyTgemDraftAction(scope, "draft-1", 4, "together"),
		).rejects.toThrow("permission denied");
		expect(mockDb.tgemInvoiceCase.create).not.toHaveBeenCalled();
	});

	it("reserves a file without creating or processing an invoice", async () => {
		const current = draft("collecting", 0);
		mockDb.tgemInvoiceDraftFile.findUnique.mockResolvedValue(null);
		mockDb.tgemInvoiceUploadDraft.upsert.mockResolvedValue(current);
		mockDb.tgemInvoiceUploadDraft.findUniqueOrThrow.mockResolvedValue(current);
		mockDb.tgemInvoiceDraftFile.create.mockResolvedValue({ id: "file-1" });
		const result = await reserveTgemDraftFile(scope, {
			messageId: "wamid.1",
			originalFilename: "invoice.pdf",
			contentType: "application/pdf",
		});
		expect(result.upload).toBe(true);
		expect(mockDb.$queryRaw).toHaveBeenCalled();
		expect(mockDb.tgemInvoiceCase.create).not.toHaveBeenCalled();
	});

	it.each([9, 10])(
		"enforces the limit with %s documents already in the draft",
		async (count) => {
			const current = draft("collecting", count);
			mockDb.tgemInvoiceDraftFile.findUnique.mockResolvedValue(null);
			mockDb.tgemInvoiceUploadDraft.upsert.mockResolvedValue(current);
			mockDb.tgemInvoiceUploadDraft.findUniqueOrThrow.mockResolvedValue(
				current,
			);
			mockDb.tgemInvoiceDraftFile.create.mockResolvedValue({ id: "next-file" });
			const attempt = reserveTgemDraftFile(scope, {
				messageId: "wamid.next",
				originalFilename: "next.jpg",
				contentType: "image/jpeg",
			});
			if (count === 9) {
				await expect(attempt).resolves.toMatchObject({ upload: true });
				expect(mockDb.tgemInvoiceDraftFile.create).toHaveBeenCalledTimes(1);
			} else {
				await expect(attempt).rejects.toThrow("draft_file_limit");
				expect(mockDb.tgemInvoiceDraftFile.create).not.toHaveBeenCalled();
			}
		},
	);

	it("does not download a duplicate reserved file again", async () => {
		const current = draft();
		mockDb.tgemInvoiceDraftFile.findUnique.mockResolvedValue({
			...current.files[0],
			draft: current,
		});
		expect(
			(
				await reserveTgemDraftFile(scope, {
					messageId: "wamid.1",
					originalFilename: "invoice.pdf",
					contentType: "application/pdf",
				})
			).upload,
		).toBe(false);
		expect(mockDb.tgemInvoiceDraftFile.create).not.toHaveBeenCalled();
	});

	it("persists a failed file before reporting the package byte limit", async () => {
		mockDb.tgemInvoiceDraftFile.findFirst.mockResolvedValue(draft().files[0]);
		mockDb.tgemInvoiceDraftFile.aggregate.mockResolvedValue({
			_sum: { byteSize: 32 * 1024 * 1024 },
		});
		mockDb.tgemInvoiceUploadDraft.update.mockResolvedValue(draft());
		await expect(
			completeTgemDraftFile(scope, "file-0", {
				canonicalUrl: "https://file.test",
				storageKey: "key",
				byteSize: 1,
				sha256: "hash",
			}),
		).rejects.toThrow("draft_byte_limit");
		expect(mockDb.tgemInvoiceDraftFile.update).toHaveBeenCalledWith({
			where: { id: "file-0" },
			data: { status: "failed" },
		});
	});
});
