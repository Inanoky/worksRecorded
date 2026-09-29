const mockRequireUser = jest.fn();
const mockResolveFlow = jest.fn();
const mockPrisma = {
	user: { findFirst: jest.fn() },
	tgemInvoiceCase: { findMany: jest.fn(), updateMany: jest.fn() },
	tgemInvoiceAuditEvent: { createMany: jest.fn() },
	$transaction: jest.fn(),
};
jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: (...args: unknown[]) =>
		mockResolveFlow(...args),
}));

import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { archiveTgemInvoices } from "./tgem-invoice-archive-actions";

const version = "2026-09-18T10:00:00.000Z";
const target = { id: "invoice-1", updatedAt: version };
const invoice = {
	...target,
	updatedAt: new Date(version),
	status: "needs_review",
	ocrStatus: "complete",
	extractionStatus: "complete",
};

beforeEach(() => {
	jest.resetAllMocks();
	mockRequireUser.mockResolvedValue({ id: "user-1" });
	mockResolveFlow.mockResolvedValue(FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL);
	mockPrisma.user.findFirst.mockResolvedValue({ organizationId: "org-1" });
	mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([invoice]);
	mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 1 });
	mockPrisma.tgemInvoiceAuditEvent.createMany.mockResolvedValue({ count: 1 });
	mockPrisma.$transaction.mockImplementation(
		(callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
	);
});

it("archives one invoice only in the authenticated active member's organization", async () => {
	await expect(archiveTgemInvoices([target])).resolves.toEqual({
		ok: true,
		archivedIds: [target.id],
	});
	expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
		where: { id: "user-1", status: "active" },
		select: { organizationId: true },
	});
	expect(mockResolveFlow).toHaveBeenCalledWith({ organizationId: "org-1" });
	expect(mockPrisma.tgemInvoiceCase.findMany.mock.calls[0][0].where).toEqual({
		organizationId: "org-1",
		archivedAt: null,
		id: { in: [target.id] },
	});
	expect(mockPrisma.tgemInvoiceCase.updateMany.mock.calls[0][0].where).toEqual({
		organizationId: "org-1",
		archivedAt: null,
		OR: [{ id: target.id, updatedAt: new Date(version) }],
		status: { notIn: ["received", "processing"] },
		ocrStatus: { not: "processing" },
		extractionStatus: { not: "processing" },
	});
	expect(
		mockPrisma.tgemInvoiceCase.updateMany.mock.calls[0][0].data.archivedAt,
	).toBeInstanceOf(Date);
	expect(mockPrisma.tgemInvoiceAuditEvent.createMany).toHaveBeenCalledWith({
		data: [
			expect.objectContaining({
				invoiceCaseId: target.id,
				organizationId: "org-1",
				actorUserId: "user-1",
				eventType: "invoice_archived",
			}),
		],
	});
});

it("archives a deduplicated batch in one transaction", async () => {
	mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([
		invoice,
		{ ...invoice, id: "invoice-2" },
	]);
	mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 2 });
	await expect(
		archiveTgemInvoices([target, target, { ...target, id: "invoice-2" }]),
	).resolves.toEqual({ ok: true, archivedIds: [target.id, "invoice-2"] });
	expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
	expect(mockPrisma.tgemInvoiceCase.updateMany).toHaveBeenCalledTimes(1);
});

it.each([
	{ input: [] },
	{ input: [{ id: "", updatedAt: version }] },
	{ input: [{ ...target, updatedAt: "bad" }] },
	{ input: [{ ...target, organizationId: "other-org" }] },
])("rejects invalid input without archiving: %j", async ({ input }) => {
	await expect(archiveTgemInvoices(input)).resolves.toEqual({
		ok: false,
		error: "invalid_input",
	});
	expect(mockPrisma.$transaction).not.toHaveBeenCalled();
});

it("rejects inactive users or users without an organization", async () => {
	mockPrisma.user.findFirst.mockResolvedValue(null);
	await expect(archiveTgemInvoices([target])).resolves.toEqual({
		ok: false,
		error: "access_denied",
	});
	expect(mockPrisma.$transaction).not.toHaveBeenCalled();
});

it("requires authentication", async () => {
	mockRequireUser.mockRejectedValue(new Error("Unauthenticated"));
	await expect(archiveTgemInvoices([target])).rejects.toThrow(
		"Unauthenticated",
	);
	expect(mockPrisma.$transaction).not.toHaveBeenCalled();
});

it("rejects non-TGEM flows", async () => {
	mockResolveFlow.mockResolvedValue(FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION);
	await expect(archiveTgemInvoices([target])).resolves.toEqual({
		ok: false,
		error: "access_denied",
	});
	expect(mockPrisma.$transaction).not.toHaveBeenCalled();
});

it("rejects the entire batch when a target is missing, archived, or belongs to another organization", async () => {
	await expect(
		archiveTgemInvoices([target, { ...target, id: "foreign-invoice" }]),
	).resolves.toEqual({ ok: false, error: "access_denied" });
	expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
});

it.each([
	{ status: "received" },
	{ status: "processing" },
	{ ocrStatus: "processing" },
	{ extractionStatus: "processing" },
])("blocks processing invoices: %j", async (state) => {
	mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([
		{ ...invoice, ...state },
	]);
	await expect(archiveTgemInvoices([target])).resolves.toEqual({
		ok: false,
		error: "processing",
	});
	expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
});

it("rejects a version changed after confirmation was opened", async () => {
	mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([
		{ ...invoice, updatedAt: new Date("2026-09-18T11:00:00Z") },
	]);
	await expect(archiveTgemInvoices([target])).resolves.toEqual({
		ok: false,
		error: "conflict",
	});
	expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
});

it("throws inside the transaction to roll back partial archive on a concurrent change", async () => {
	mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([
		invoice,
		{ ...invoice, id: "invoice-2" },
	]);
	let rolledBack = false;
	mockPrisma.$transaction.mockImplementation(
		async (callback: (tx: typeof mockPrisma) => unknown) => {
			try {
				return await callback(mockPrisma);
			} catch (error) {
				rolledBack = true;
				throw error;
			}
		},
	);
	await expect(
		archiveTgemInvoices([target, { ...target, id: "invoice-2" }]),
	).resolves.toEqual({ ok: false, error: "conflict" });
	expect(rolledBack).toBe(true);
});
