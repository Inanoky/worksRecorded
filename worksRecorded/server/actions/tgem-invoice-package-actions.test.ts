const mockFindDraft = jest.fn();
const mockApply = jest.fn();
const mockEnqueue = jest.fn();
const mockUser = jest.fn();
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: async () => ({ id: "user-1" }),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: { user: { findUnique: (...args: unknown[]) => mockUser(...args) } },
}));
jest.mock("@/lib/tgem-invoice-approval/upload-drafts", () => ({
	findTgemUploadDraft: (...args: unknown[]) => mockFindDraft(...args),
	applyTgemDraftAction: (...args: unknown[]) => mockApply(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/workflow-client", () => ({
	enqueueTgemInvoiceProcessing: (...args: unknown[]) => mockEnqueue(...args),
}));

import { submitTgemWebInvoicePackage } from "./tgem-invoice-package-actions";

describe("submitTgemWebInvoicePackage", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockUser.mockResolvedValue({ organizationId: "org-1" });
		mockFindDraft.mockResolvedValue({
			id: "draft-1",
			siteId: "site-1",
			source: "dashboard",
			revision: 3,
		});
		mockApply.mockResolvedValue({
			invoices: [
				{ id: "case-1", status: "received", documents: [{ id: "document-1" }] },
			],
		});
	});
	it("uses the authenticated owner and the draft project before dispatch", async () => {
		await expect(
			submitTgemWebInvoicePackage({ draftId: "draft-1", mode: "together" }),
		).resolves.toEqual([{ invoiceCaseId: "case-1", documentId: "document-1" }]);
		expect(mockApply).toHaveBeenCalledWith(
			{
				userId: "user-1",
				organizationId: "org-1",
				businessPhoneNumberId: "dashboard",
				siteId: "site-1",
				sender: "user-1",
			},
			"draft-1",
			3,
			"together",
		);
		expect(mockEnqueue).toHaveBeenCalledWith({
			invoiceCaseId: "case-1",
			documentId: "document-1",
		});
	});
	it("rejects an unavailable or foreign draft without dispatch", async () => {
		mockFindDraft.mockResolvedValue(null);
		await expect(
			submitTgemWebInvoicePackage({ draftId: "foreign", mode: "together" }),
		).rejects.toThrow("access denied");
		expect(mockEnqueue).not.toHaveBeenCalled();
	});
	it("does not dispatch until all files can be submitted", async () => {
		mockApply.mockResolvedValue({ invoices: [] });
		await expect(
			submitTgemWebInvoicePackage({ draftId: "draft-1", mode: "separate" }),
		).rejects.toThrow("vēl nav saglabāti");
		expect(mockEnqueue).not.toHaveBeenCalled();
	});
});
