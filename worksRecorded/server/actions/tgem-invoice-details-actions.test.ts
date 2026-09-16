const mockRequireUser = jest.fn();
const mockPrisma = {
	user: { findFirst: jest.fn() },
	tgemInvoiceCase: { findFirst: jest.fn(), updateMany: jest.fn() },
	tgemInvoiceAuditEvent: { create: jest.fn() },
	$transaction: jest.fn(),
};

jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

import { updateTgemInvoiceDetail } from "@/server/actions/tgem-invoice-details-actions";

const invoice = {
	id: "invoice-1",
	status: "in_approval",
	ocrStatus: "complete",
	extractionStatus: "complete",
	invoiceNumber: "AI-123",
	invoiceDate: new Date("2026-09-01T00:00:00.000Z"),
	dueDate: null,
	updatedAt: new Date("2026-09-16T10:00:00.000Z"),
};
const input = {
	invoiceCaseId: "invoice-1",
	field: "invoiceNumber" as const,
	value: " Corrected-123 ",
	expectedUpdatedAt: invoice.updatedAt.toISOString(),
};

describe("TGEM invoice detail corrections", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockRequireUser.mockResolvedValue({ id: "user-1" });
		mockPrisma.user.findFirst.mockResolvedValue({ organizationId: "org-1" });
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(invoice);
		mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.$transaction.mockImplementation(
			(callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
		);
	});

	it("updates one field with organization scoping and an old/new audit, preserving extraction and approval data", async () => {
		await expect(updateTgemInvoiceDetail(input)).resolves.toMatchObject({
			ok: true,
			value: "Corrected-123",
			unchanged: false,
		});
		expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
			where: { id: "user-1", status: "active" },
			select: { organizationId: true },
		});
		expect(mockPrisma.tgemInvoiceCase.findFirst.mock.calls[0][0].where).toEqual(
			{ id: "invoice-1", organizationId: "org-1" },
		);
		const write = mockPrisma.tgemInvoiceCase.updateMany.mock.calls[0][0];
		expect(write.where).toEqual({
			id: "invoice-1",
			organizationId: "org-1",
			updatedAt: invoice.updatedAt,
		});
		expect(Object.keys(write.data).sort()).toEqual([
			"invoiceNumber",
			"updatedAt",
		]);
		expect(write.data.invoiceNumber).toBe("Corrected-123");
		expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
			data: {
				invoiceCaseId: "invoice-1",
				organizationId: "org-1",
				actorUserId: "user-1",
				actorType: "user",
				eventType: "invoice_details_updated",
				fromStatus: "in_approval",
				toStatus: "in_approval",
				payload: {
					field: "invoiceNumber",
					previous: "AI-123",
					next: "Corrected-123",
				},
			},
		});
	});

	it.each(["invoiceDate", "dueDate"] as const)(
		"stores a valid leap-day %s at UTC midnight",
		async (field) => {
			await expect(
				updateTgemInvoiceDetail({ ...input, field, value: "2028-02-29" }),
			).resolves.toMatchObject({ ok: true, value: "2028-02-29" });
			expect(
				mockPrisma.tgemInvoiceCase.updateMany.mock.calls[0][0].data[field],
			).toEqual(new Date("2028-02-29T00:00:00.000Z"));
		},
	);

	it.each([
		"2026-02-29",
		"2026-04-31",
		"2026-13-01",
		"2026-00-10",
		"01.09.2026",
		"0000-01-01",
		"2026-09-01T00:00:00Z",
	])("rejects invalid calendar date %s without writing", async (value) => {
		await expect(
			updateTgemInvoiceDetail({ ...input, field: "invoiceDate", value }),
		).resolves.toEqual({ ok: false, error: "invalid_date" });
		expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
	});

	it.each(["a".repeat(121), "INV\u0000-1", "INV\n-1"])(
		"rejects invalid invoice numbers",
		async (value) => {
			await expect(
				updateTgemInvoiceDetail({ ...input, value }),
			).resolves.toEqual({ ok: false, error: "invalid_number" });
			expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
		},
	);

	it.each(["invoiceNumber", "invoiceDate"] as const)(
		"allows an explicit clear of optional %s",
		async (field) => {
			await expect(
				updateTgemInvoiceDetail({ ...input, field, value: " " }),
			).resolves.toMatchObject({ ok: true, value: null });
			expect(
				mockPrisma.tgemInvoiceCase.updateMany.mock.calls[0][0].data[field],
			).toBeNull();
		},
	);

	it("does not write or audit an unchanged value", async () => {
		await expect(
			updateTgemInvoiceDetail({ ...input, value: " AI-123 " }),
		).resolves.toMatchObject({ ok: true, unchanged: true });
		expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
		expect(mockPrisma.tgemInvoiceAuditEvent.create).not.toHaveBeenCalled();
	});

	it("denies users without an active organization", async () => {
		mockPrisma.user.findFirst.mockResolvedValue(null);
		await expect(updateTgemInvoiceDetail(input)).resolves.toEqual({
			ok: false,
			error: "access_denied",
		});
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("denies invoices outside the organization", async () => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(null);
		await expect(updateTgemInvoiceDetail(input)).resolves.toEqual({
			ok: false,
			error: "access_denied",
		});
		expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
	});

	it.each([
		{ status: "received" },
		{ status: "processing" },
		{ ocrStatus: "processing" },
		{ extractionStatus: "processing" },
	])("blocks edits racing with extraction: %j", async (state) => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue({
			...invoice,
			...state,
		});
		await expect(updateTgemInvoiceDetail(input)).resolves.toEqual({
			ok: false,
			error: "processing",
		});
		expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
	});

	it("rejects a stale edit version", async () => {
		await expect(
			updateTgemInvoiceDetail({
				...input,
				expectedUpdatedAt: "2026-09-15T00:00:00.000Z",
			}),
		).resolves.toEqual({ ok: false, error: "conflict" });
		expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
	});

	it("detects a concurrent update between read and write without auditing a failed correction", async () => {
		mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 0 });
		await expect(updateTgemInvoiceDetail(input)).resolves.toEqual({
			ok: false,
			error: "conflict",
		});
		expect(mockPrisma.tgemInvoiceAuditEvent.create).not.toHaveBeenCalled();
	});

	it("rejects malformed versions and unsupported fields", async () => {
		await expect(
			updateTgemInvoiceDetail({ ...input, expectedUpdatedAt: "yesterday" }),
		).resolves.toEqual({ ok: false, error: "invalid_version" });
		await expect(
			updateTgemInvoiceDetail({ ...input, field: "total" } as never),
		).resolves.toEqual({ ok: false, error: "invalid_input" });
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("fails the transaction if auditing fails", async () => {
		mockPrisma.tgemInvoiceAuditEvent.create.mockRejectedValue(
			new Error("Audit failed"),
		);
		await expect(updateTgemInvoiceDetail(input)).rejects.toThrow(
			"Audit failed",
		);
	});
});
