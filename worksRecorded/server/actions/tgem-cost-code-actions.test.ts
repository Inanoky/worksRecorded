const mockRequireUser = jest.fn();
const mockPrisma = {
	user: { findFirst: jest.fn() },
	tgemCostCode: {
		findFirst: jest.fn(),
		findMany: jest.fn(),
		findUniqueOrThrow: jest.fn(),
		create: jest.fn(),
		updateMany: jest.fn(),
	},
	tgemInvoiceCase: { findFirst: jest.fn(), updateMany: jest.fn() },
	tgemInvoiceAuditEvent: { create: jest.fn() },
	$transaction: jest.fn(),
};

jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

import {
	getTgemCostCodes,
	saveTgemCostCode,
	setTgemCostCodeActive,
	updateTgemInvoiceAccounting,
} from "@/server/actions/tgem-cost-code-actions";

describe("TGEM cost code actions", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockRequireUser.mockResolvedValue({ id: "user-1" });
		mockPrisma.user.findFirst.mockResolvedValue({ organizationId: "org-1" });
		mockPrisma.$transaction.mockImplementation(
			(callback: (transaction: typeof mockPrisma) => unknown) =>
				callback(mockPrisma),
		);
	});

	it("lists only active organization cost codes by default", async () => {
		mockPrisma.tgemCostCode.findMany.mockResolvedValue([]);

		await getTgemCostCodes();

		expect(mockPrisma.tgemCostCode.findMany).toHaveBeenCalledWith({
			where: { organizationId: "org-1", isActive: true },
			orderBy: [{ isActive: "desc" }, { code: "asc" }],
			select: { id: true, code: true, name: true, isActive: true },
		});
	});

	it("normalizes and creates a cost code for the active organization", async () => {
		mockPrisma.tgemCostCode.findFirst.mockResolvedValue(null);
		mockPrisma.tgemCostCode.create.mockResolvedValue({
			id: "code-1",
			code: "A123",
			name: "Administrative expense",
			isActive: true,
		});

		await saveTgemCostCode({
			code: " a123 ",
			name: " Administrative expense ",
		});

		expect(mockPrisma.tgemCostCode.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					organizationId: "org-1",
					code: "A123",
					name: "Administrative expense",
				},
			}),
		);
	});

	it("archives only a cost code owned by the active organization", async () => {
		mockPrisma.tgemCostCode.updateMany.mockResolvedValue({ count: 1 });

		await setTgemCostCodeActive({ id: "code-1", isActive: false });

		expect(mockPrisma.tgemCostCode.updateMany).toHaveBeenCalledWith({
			where: { id: "code-1", organizationId: "org-1" },
			data: { isActive: false },
		});
	});

	it("updates invoice classification with optimistic locking and an audit event", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "invoice-1",
			organizationId: "org-1",
			status: "in_approval",
			invoiceType: "debit",
			costCode: null,
			updatedAt: new Date("2026-09-16T10:00:00.000Z"),
		});
		mockPrisma.tgemCostCode.findFirst.mockResolvedValue({ id: "code-1" });
		mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.tgemInvoiceAuditEvent.create.mockResolvedValue({
			id: "audit-1",
		});

		await updateTgemInvoiceAccounting({
			invoiceCaseId: "invoice-1",
			invoiceType: "credit",
			costCode: "a123",
			expectedUpdatedAt: "2026-09-16T10:00:00.000Z",
		});

		expect(mockPrisma.tgemInvoiceCase.updateMany).toHaveBeenCalledWith({
			where: {
				id: "invoice-1",
				updatedAt: new Date("2026-09-16T10:00:00.000Z"),
			},
			data: { invoiceType: "credit", costCode: "A123" },
		});
		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					eventType: "invoice_accounting_updated",
					fromStatus: "in_approval",
					toStatus: "in_approval",
				}),
			}),
		);
	});

	it("allows a document to be reclassified as a receipt", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "invoice-1",
			organizationId: "org-1",
			status: "needs_review",
			invoiceType: "debit",
			costCode: null,
			updatedAt: new Date("2026-09-16T10:00:00.000Z"),
		});
		mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.tgemInvoiceAuditEvent.create.mockResolvedValue({
			id: "audit-1",
		});

		await updateTgemInvoiceAccounting({
			invoiceCaseId: "invoice-1",
			invoiceType: "receipt",
			costCode: null,
			expectedUpdatedAt: "2026-09-16T10:00:00.000Z",
		});

		expect(mockPrisma.tgemInvoiceCase.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { invoiceType: "receipt", costCode: null },
			}),
		);
	});

	it("rejects an invoice cost code outside the active catalog", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			id: "invoice-1",
			organizationId: "org-1",
			status: "needs_review",
			invoiceType: "debit",
			costCode: null,
			updatedAt: new Date("2026-09-16T10:00:00.000Z"),
		});
		mockPrisma.tgemCostCode.findFirst.mockResolvedValue(null);

		await expect(
			updateTgemInvoiceAccounting({
				invoiceCaseId: "invoice-1",
				invoiceType: "debit",
				costCode: "A123",
				expectedUpdatedAt: "2026-09-16T10:00:00.000Z",
			}),
		).rejects.toThrow("active cost code");
		expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
	});
});
