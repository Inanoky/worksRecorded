const mockProcessTgemInvoice = jest.fn();
const mockPersistTgemInvoiceOcrResult = jest.fn();
const mockResolveTgemInvoiceProject = jest.fn();
const mockStartTgemInvoiceApproval = jest.fn();

const mockPrisma = {
	tgemInvoiceCase: {
		findUnique: jest.fn(),
		update: jest.fn(),
	},
	tgemInvoiceAuditEvent: { create: jest.fn() },
	site: { findMany: jest.fn() },
	$transaction: jest.fn(),
};

jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/tgem-invoice-approval/processor", () => ({
	processTgemInvoice: (...args: unknown[]) => mockProcessTgemInvoice(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/ocr", () => ({
	persistTgemInvoiceOcrResult: (...args: unknown[]) =>
		mockPersistTgemInvoiceOcrResult(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/project-resolution", () => ({
	resolveTgemInvoiceProject: (...args: unknown[]) =>
		mockResolveTgemInvoiceProject(...args),
}));
jest.mock("@/lib/tgem-invoice-approval/start-approval", () => ({
	startTgemInvoiceApproval: (...args: unknown[]) =>
		mockStartTgemInvoiceApproval(...args),
}));

import { processTgemInvoiceCase } from "@/lib/tgem-invoice-approval/process-case";

describe("processTgemInvoiceCase email project resolution", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockPrisma.$transaction.mockImplementation(
			async (callback: (database: typeof mockPrisma) => unknown) =>
				callback(mockPrisma),
		);
		mockPrisma.tgemInvoiceCase.findUnique.mockResolvedValue({
			siteId: null,
			sourceContext: {
				sender: "supplier@example.com",
				subject: "Invoice for RC-100",
				cc: [],
				description: "Riga project",
			},
		});
		mockPrisma.site.findMany.mockResolvedValue([
			{
				id: "site-1",
				name: "Riga Central",
				description: "Riga project",
				subdirectory: "RC-100",
				bisCaseNumber: null,
				bisCaseName: null,
			},
		]);
		mockProcessTgemInvoice.mockResolvedValue({
			provider: "openai",
			pages: [
				{
					pageNumber: 1,
					width: null,
					height: null,
					text: "Invoice RC-100",
					blocks: [],
					status: "complete",
				},
			],
			fields: {},
			lineItems: [],
		});
		mockPersistTgemInvoiceOcrResult.mockResolvedValue({
			pageCount: 1,
			lineItemCount: 0,
			warningCount: 0,
		});
		mockResolveTgemInvoiceProject.mockResolvedValue({
			selectedSiteId: "site-1",
			confidence: 0.96,
			method: "automatic",
			summary: {
				confidence: 0.85,
				margin: 0.4,
				conflictDetected: false,
				reason: "thresholds_met",
				candidates: [],
			},
		});
		mockStartTgemInvoiceApproval.mockResolvedValue({
			invoiceCaseId: "case-1",
		});
	});

	it("assigns a confident organization project before automatic approval", async () => {
		await processTgemInvoiceCase({
			invoiceCaseId: "case-1",
			documentId: "document-1",
			organizationId: "org-1",
			siteId: null,
			actorUserId: null,
			actorType: "email",
			source: "email",
			content: Buffer.from("invoice"),
			contentType: "application/pdf",
		});

		expect(mockResolveTgemInvoiceProject).toHaveBeenCalledWith(
			expect.objectContaining({
				projects: expect.arrayContaining([
					expect.objectContaining({ id: "site-1" }),
				]),
				sourceContext: expect.objectContaining({
					subject: "Invoice for RC-100",
				}),
			}),
		);
		expect(mockPrisma.tgemInvoiceCase.update).toHaveBeenCalledWith({
			where: { id: "case-1" },
			data: expect.objectContaining({
				siteId: "site-1",
				projectMatchConfidence: 0.96,
				projectMatchMethod: "automatic",
			}),
		});
		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				eventType: "invoice_project_auto_assigned",
			}),
		});
		expect(mockStartTgemInvoiceApproval).toHaveBeenCalledWith({
			invoiceCaseId: "case-1",
			actorUserId: null,
			trigger: "automatic",
		});
	});
});
