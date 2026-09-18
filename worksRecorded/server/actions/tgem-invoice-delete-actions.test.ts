const mockRequireUser = jest.fn();
const mockResolveFlow = jest.fn();
const mockPrisma = {
	user: { findFirst: jest.fn() },
	tgemInvoiceCase: { findMany: jest.fn(), deleteMany: jest.fn() },
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
import { deleteTgemInvoices } from "./tgem-invoice-delete-actions";

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
	mockPrisma.tgemInvoiceCase.deleteMany.mockResolvedValue({ count: 1 });
	mockPrisma.$transaction.mockImplementation(
		(callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
	);
});

it("deletes one invoice only in the authenticated active member's organization", async () => {
	await expect(deleteTgemInvoices([target])).resolves.toEqual({
		ok: true,
		deletedIds: [target.id],
	});
	expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
		where: { id: "user-1", status: "active" },
		select: { organizationId: true },
	});
	expect(mockResolveFlow).toHaveBeenCalledWith({ organizationId: "org-1" });
	expect(mockPrisma.tgemInvoiceCase.findMany.mock.calls[0][0].where).toEqual({
		organizationId: "org-1",
		id: { in: [target.id] },
	});
	expect(mockPrisma.tgemInvoiceCase.deleteMany.mock.calls[0][0].where).toEqual({
		organizationId: "org-1",
		OR: [{ id: target.id, updatedAt: new Date(version) }],
		status: { notIn: ["received", "processing"] },
		ocrStatus: { not: "processing" },
		extractionStatus: { not: "processing" },
	});
});

it("deletes a deduplicated batch in one transaction", async () => {
	mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([
		invoice,
		{ ...invoice, id: "invoice-2" },
	]);
	mockPrisma.tgemInvoiceCase.deleteMany.mockResolvedValue({ count: 2 });
	await expect(
		deleteTgemInvoices([target, target, { ...target, id: "invoice-2" }]),
	).resolves.toEqual({ ok: true, deletedIds: [target.id, "invoice-2"] });
	expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
	expect(mockPrisma.tgemInvoiceCase.deleteMany).toHaveBeenCalledTimes(1);
});

it.each([
	{ input: [] },
	{ input: [{ id: "", updatedAt: version }] },
	{ input: [{ ...target, updatedAt: "bad" }] },
	{ input: [{ ...target, organizationId: "other-org" }] },
])("rejects invalid input without deleting: %j", async ({ input }) => {
	await expect(deleteTgemInvoices(input)).resolves.toEqual({
		ok: false,
		error: "invalid_input",
	});
	expect(mockPrisma.$transaction).not.toHaveBeenCalled();
});

it("rejects inactive users or users without an organization", async () => {
	mockPrisma.user.findFirst.mockResolvedValue(null);
	await expect(deleteTgemInvoices([target])).resolves.toEqual({
		ok: false,
		error: "access_denied",
	});
	expect(mockPrisma.$transaction).not.toHaveBeenCalled();
});

it("requires authentication", async () => {
	mockRequireUser.mockRejectedValue(new Error("Unauthenticated"));
	await expect(deleteTgemInvoices([target])).rejects.toThrow("Unauthenticated");
	expect(mockPrisma.$transaction).not.toHaveBeenCalled();
});

it("rejects non-TGEM flows", async () => {
	mockResolveFlow.mockResolvedValue(FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION);
	await expect(deleteTgemInvoices([target])).resolves.toEqual({
		ok: false,
		error: "access_denied",
	});
	expect(mockPrisma.$transaction).not.toHaveBeenCalled();
});

it("rejects the entire batch when a target is missing or belongs to another organization", async () => {
	await expect(
		deleteTgemInvoices([target, { ...target, id: "foreign-invoice" }]),
	).resolves.toEqual({ ok: false, error: "access_denied" });
	expect(mockPrisma.tgemInvoiceCase.deleteMany).not.toHaveBeenCalled();
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
	await expect(deleteTgemInvoices([target])).resolves.toEqual({
		ok: false,
		error: "processing",
	});
	expect(mockPrisma.tgemInvoiceCase.deleteMany).not.toHaveBeenCalled();
});

it("rejects a version changed after confirmation was opened", async () => {
	mockPrisma.tgemInvoiceCase.findMany.mockResolvedValue([
		{ ...invoice, updatedAt: new Date("2026-09-18T11:00:00Z") },
	]);
	await expect(deleteTgemInvoices([target])).resolves.toEqual({
		ok: false,
		error: "conflict",
	});
	expect(mockPrisma.tgemInvoiceCase.deleteMany).not.toHaveBeenCalled();
});

it("throws inside the transaction to roll back partial deletion on a concurrent change", async () => {
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
		deleteTgemInvoices([target, { ...target, id: "invoice-2" }]),
	).resolves.toEqual({ ok: false, error: "conflict" });
	expect(rolledBack).toBe(true);
});
