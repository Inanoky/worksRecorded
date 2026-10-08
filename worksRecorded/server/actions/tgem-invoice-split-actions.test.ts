import { Prisma } from "@prisma/client";

const mockRequireUser = jest.fn();
const mockResolveFlow = jest.fn();
const mockPrisma = {
	user: { findFirst: jest.fn() },
	site: { findMany: jest.fn() },
	tgemInvoiceCase: {
		findFirst: jest.fn(),
		updateMany: jest.fn(),
		create: jest.fn(),
	},
	tgemInvoiceApprovalStep: { updateMany: jest.fn() },
	tgemInvoiceAuditEvent: { create: jest.fn() },
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
import {
	buildTgemSplitInvoiceNumber,
	TgemInvoiceSplitServiceError,
	type TgemInvoiceSplitServiceErrorCode,
} from "@/lib/tgem-invoice-approval/split-service";
import {
	splitTgemInvoice,
	submitTgemInvoiceSplit,
} from "@/server/actions/tgem-invoice-split-actions";

const version = new Date("2026-10-02T08:00:00.000Z");

function line(id: string, lineNumber: number, quantity: string, total: string) {
	return {
		id,
		lineNumber,
		description: `Line ${lineNumber}`,
		quantity: new Prisma.Decimal(quantity),
		unit: "gab.",
		unitPrice: new Prisma.Decimal("10"),
		total: new Prisma.Decimal(total),
		currency: "EUR",
		projectId: null,
		costCode: "MAT",
		category: "materials",
		suggestedProjectId: null,
		suggestedCostCode: "MAT",
		suggestedCategory: "materials",
		aiConfidence: 0.98,
		sourceText: `Source ${lineNumber}`,
	};
}

function parent(overrides: Record<string, unknown> = {}) {
	return {
		id: "invoice-1",
		organizationId: "org-1",
		siteId: "project-original",
		submittedByUserId: "submitter-1",
		idempotencyKey: "original-key",
		source: "email",
		sourceMessageId: "email-1",
		sourceSender: "supplier@example.com",
		status: "in_approval",
		ocrStatus: "complete",
		extractionStatus: "complete",
		processingError: null,
		invoiceNumber: "INV-42",
		supplierName: "Supplier",
		supplierRegistrationNo: "40000000000",
		invoiceDate: new Date("2026-09-30T00:00:00.000Z"),
		dueDate: new Date("2026-10-30T00:00:00.000Z"),
		currency: "EUR",
		subtotal: new Prisma.Decimal("50.00"),
		vat: new Prisma.Decimal("10.00"),
		total: new Prisma.Decimal("60.00"),
		bankAccount: "LV00BANK0000000000000",
		reference: "Contract 1",
		invoiceType: "debit",
		costCode: "MAT",
		validationSummary: { warnings: [] },
		extractionSummary: { provider: "openai" },
		sourceContext: { mailbox: "invoices@example.com" },
		projectMatchConfidence: 0.9,
		projectMatchMethod: "reference",
		projectMatchSummary: { matched: true },
		receivedAt: new Date("2026-09-30T08:00:00.000Z"),
		processedAt: new Date("2026-09-30T08:01:00.000Z"),
		approvedAt: null,
		paymentStatus: "unpaid",
		paidAt: null,
		approvalRound: 1,
		approvalRouteSnapshot: { version: 1 },
		archivedAt: null,
		splitParentInvoiceCaseId: null,
		splitRootInvoiceCaseId: null,
		splitGeneration: 0,
		splitKind: null,
		splitSubtotalAdjustment: null,
		createdAt: new Date("2026-09-30T08:00:00.000Z"),
		updatedAt: version,
		lines: [line("line-1", 1, "2", "20.00"), line("line-2", 2, "3", "30.00")],
		documents: [
			{
				id: "document-1",
				storageProvider: "uploadthing",
				storageKey: "shared-key",
				canonicalUrl: "https://storage.example/invoice.pdf",
				originalFilename: "invoice.pdf",
				contentType: "application/pdf",
				byteSize: 1234,
				sha256: "sha256",
				source: "email",
				createdAt: new Date("2026-09-30T08:00:00.000Z"),
				ocrPages: [
					{
						id: "page-1",
						pageNumber: 1,
						width: 1000,
						height: 1400,
						text: "Invoice text",
						blocks: [{ text: "Invoice" }],
						renderedImageUrl: null,
						status: "complete",
						errorMessage: null,
						createdAt: new Date("2026-09-30T08:00:00.000Z"),
					},
				],
			},
		],
		approvalSteps: [
			{ status: "current", decidedAt: null },
			{ status: "waiting", decidedAt: null },
		],
		splitChildren: [],
		auditEvents: [],
		...overrides,
	};
}

function input(overrides: Record<string, unknown> = {}) {
	return {
		invoiceCaseId: "invoice-1",
		expectedUpdatedAt: version.toISOString(),
		destinationProjectIds: ["project-a"],
		residualProjectId: null,
		lineRequests: [{ lineId: "line-1", wholeProjectId: "project-a" }],
		...overrides,
	};
}

async function expectServiceError(
	promise: Promise<unknown>,
	code: TgemInvoiceSplitServiceErrorCode,
) {
	try {
		await promise;
		throw new Error("Expected the split to fail");
	} catch (error) {
		expect(error).toBeInstanceOf(TgemInvoiceSplitServiceError);
		expect((error as TgemInvoiceSplitServiceError).code).toBe(code);
	}
}

beforeEach(() => {
	jest.resetAllMocks();
	mockRequireUser.mockResolvedValue({ id: "user-1" });
	mockResolveFlow.mockResolvedValue(FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL);
	mockPrisma.user.findFirst.mockResolvedValue({ organizationId: "org-1" });
	mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(parent());
	mockPrisma.site.findMany.mockResolvedValue([
		{ id: "project-a" },
		{ id: "project-original" },
	]);
	mockPrisma.tgemInvoiceCase.updateMany.mockResolvedValue({ count: 1 });
	mockPrisma.tgemInvoiceApprovalStep.updateMany.mockResolvedValue({ count: 2 });
	mockPrisma.tgemInvoiceAuditEvent.create.mockResolvedValue({ id: "audit-1" });
	let childNumber = 0;
	mockPrisma.tgemInvoiceCase.create.mockImplementation(
		({ data }: { data: Record<string, unknown> }) => {
			childNumber += 1;
			return {
				id: `child-${childNumber}`,
				siteId: data.siteId,
				splitKind: data.splitKind,
				splitGeneration: data.splitGeneration,
				total:
					typeof data.total === "string"
						? new Prisma.Decimal(data.total)
						: null,
				updatedAt: new Date("2026-10-02T08:01:00.000Z"),
			};
		},
	);
	mockPrisma.$transaction.mockImplementation(
		(callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
	);
});

it("atomically archives the parent and creates allocated and residual children", async () => {
	await expect(splitTgemInvoice(input())).resolves.toEqual({
		parentInvoiceCaseId: "invoice-1",
		rootInvoiceCaseId: "invoice-1",
		children: [
			{
				id: "child-1",
				projectId: "project-a",
				kind: "allocated",
				generation: 1,
				total: "24",
				updatedAt: "2026-10-02T08:01:00.000Z",
			},
			{
				id: "child-2",
				projectId: "project-original",
				kind: "residual",
				generation: 1,
				total: "36",
				updatedAt: "2026-10-02T08:01:00.000Z",
			},
		],
		replayed: false,
	});

	expect(mockResolveFlow).toHaveBeenCalledWith({ organizationId: "org-1" });
	expect(mockPrisma.$transaction.mock.calls[0][1]).toEqual({
		isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
	});
	expect(mockPrisma.tgemInvoiceCase.updateMany).toHaveBeenCalledWith({
		where: {
			id: "invoice-1",
			organizationId: "org-1",
			archivedAt: null,
			updatedAt: version,
			status: "in_approval",
			paymentStatus: "unpaid",
		},
		data: {
			status: "split",
			archivedAt: expect.any(Date),
			splitRootInvoiceCaseId: "invoice-1",
			updatedAt: expect.any(Date),
		},
	});
	expect(mockPrisma.tgemInvoiceApprovalStep.updateMany).toHaveBeenCalledWith({
		where: {
			invoiceCaseId: "invoice-1",
			status: { in: ["current", "waiting"] },
		},
		data: { status: "cancelled" },
	});
	expect(mockPrisma.tgemInvoiceCase.create).toHaveBeenCalledTimes(2);
	const allocated = mockPrisma.tgemInvoiceCase.create.mock.calls[0][0].data;
	const residual = mockPrisma.tgemInvoiceCase.create.mock.calls[1][0].data;
	expect(allocated).toEqual(
		expect.objectContaining({
			invoiceNumber: "INV-42-S2",
			siteId: "project-a",
			status: "needs_review",
			paymentStatus: "unpaid",
			splitParentInvoiceCaseId: "invoice-1",
			splitRootInvoiceCaseId: "invoice-1",
			splitGeneration: 1,
			splitKind: "allocated",
			subtotal: "20.00",
			vat: "4.00",
			total: "24.00",
		}),
	);
	expect(residual.invoiceNumber).toBe("INV-42-S1");
	expect(allocated.lines.create).toEqual([
		expect.objectContaining({ lineNumber: 1, quantity: "2", total: "20.00" }),
	]);
	expect(residual.lines.create).toEqual([
		expect.objectContaining({ lineNumber: 2, quantity: "3", total: "30.00" }),
	]);
	expect(allocated.documents.create[0]).toEqual(
		expect.objectContaining({
			storageKey: "shared-key",
			canonicalUrl: "https://storage.example/invoice.pdf",
			ocrPages: {
				create: [
					expect.objectContaining({ pageNumber: 1, text: "Invoice text" }),
				],
			},
		}),
	);
	expect(allocated.auditEvents.create).toEqual(
		expect.objectContaining({ eventType: "invoice_created_from_split" }),
	);
	expect(mockPrisma.tgemInvoiceAuditEvent.create).toHaveBeenCalledWith({
		data: expect.objectContaining({
			eventType: "invoice_split",
			fromStatus: "in_approval",
			toStatus: "split",
			payload: expect.objectContaining({
				requestFingerprint: expect.any(String),
				quantityCorrections: [],
				children: expect.arrayContaining([
					expect.objectContaining({ id: "child-1", total: "24.00" }),
					expect.objectContaining({ id: "child-2", total: "36.00" }),
				]),
			}),
		}),
	});
});

it("persists a whole-invoice percentage split with an exact rounded total", async () => {
	mockPrisma.site.findMany.mockResolvedValue([
		{ id: "project-a" },
		{ id: "project-b" },
		{ id: "project-original" },
	]);

	const result = await splitTgemInvoice(
		input({
			destinationProjectIds: ["project-a", "project-b"],
			lineRequests: [],
			invoicePercentageAllocations: [
				{ projectId: "project-a", percentage: "33.33" },
				{ projectId: "project-b", percentage: "33.33" },
			],
		}),
	);

	expect(result.children.map((child) => child.total)).toEqual([
		"20",
		"20",
		"20",
	]);
	expect(
		mockPrisma.tgemInvoiceCase.create.mock.calls.map(
			([call]) => call.data.lines.create,
		),
	).toEqual([
		[
			expect.objectContaining({ quantity: "0.6666", total: "6.67" }),
			expect.objectContaining({ quantity: "0.9999", total: "10.00" }),
		],
		[
			expect.objectContaining({ quantity: "0.6666", total: "6.66" }),
			expect.objectContaining({ quantity: "0.9999", total: "10.00" }),
		],
		[
			expect.objectContaining({ quantity: "0.6668", total: "6.67" }),
			expect.objectContaining({ quantity: "1.0002", total: "10.00" }),
		],
	]);
});

it("preserves exact subtotal, VAT, and total conservation in persisted children", async () => {
	await splitTgemInvoice(input());
	const childData = mockPrisma.tgemInvoiceCase.create.mock.calls.map(
		(call) => call[0].data,
	);
	for (const field of ["subtotal", "vat", "total"] as const) {
		const sum = childData.reduce(
			(current, child) => current.plus(child[field]),
			new Prisma.Decimal(0),
		);
		expect(sum.equals(parent()[field] as Prisma.Decimal)).toBe(true);
	}
});

it("numbers allocated children from S2 onward when no residual remains", async () => {
	mockPrisma.site.findMany.mockResolvedValue([
		{ id: "project-a" },
		{ id: "project-b" },
	]);

	await splitTgemInvoice(
		input({
			destinationProjectIds: ["project-a", "project-b"],
			lineRequests: [
				{ lineId: "line-1", wholeProjectId: "project-a" },
				{ lineId: "line-2", wholeProjectId: "project-b" },
			],
		}),
	);

	const childNumbers = mockPrisma.tgemInvoiceCase.create.mock.calls.map(
		(call) => call[0].data.invoiceNumber,
	);
	expect(childNumbers).toEqual(["INV-42-S2", "INV-42-S3"]);
});

it("inherits an existing root and advances the generation when a child is split again", async () => {
	mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(
		parent({
			id: "child-existing",
			invoiceNumber: "INV-42-S1",
			siteId: "project-a",
			splitParentInvoiceCaseId: "root-1",
			splitRootInvoiceCaseId: "root-1",
			splitGeneration: 1,
			splitKind: "allocated",
		}),
	);
	mockPrisma.site.findMany.mockResolvedValue([
		{ id: "project-b" },
		{ id: "project-a" },
	]);

	const result = await splitTgemInvoice(
		input({
			invoiceCaseId: "child-existing",
			destinationProjectIds: ["project-b"],
			lineRequests: [{ lineId: "line-1", wholeProjectId: "project-b" }],
		}),
	);

	expect(result.rootInvoiceCaseId).toBe("root-1");
	expect(result.children.every((child) => child.generation === 2)).toBe(true);
	const recursiveChildren = mockPrisma.tgemInvoiceCase.create.mock.calls.map(
		(call) => call[0].data,
	);
	expect(recursiveChildren[0]).toEqual(
		expect.objectContaining({
			invoiceNumber: "INV-42-S1.2",
			splitKind: "allocated",
			splitParentInvoiceCaseId: "child-existing",
			splitRootInvoiceCaseId: "root-1",
			splitGeneration: 2,
		}),
	);
	expect(recursiveChildren[1]).toEqual(
		expect.objectContaining({
			invoiceNumber: "INV-42-S1.1",
			splitKind: "residual",
		}),
	);
});

it("keeps generated invoice numbers within the editable length limit", async () => {
	mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(
		parent({ invoiceNumber: "X".repeat(120) }),
	);

	await splitTgemInvoice(input());

	const childNumbers = mockPrisma.tgemInvoiceCase.create.mock.calls.map(
		(call) => call[0].data.invoiceNumber,
	);
	expect(childNumbers).toHaveLength(2);
	expect(childNumbers.every((number) => number.length === 120)).toBe(true);
	expect(new Set(childNumbers).size).toBe(2);
});

it("truncates only the original-number portion of a recursive number", () => {
	const result = buildTgemSplitInvoiceNumber(
		`${"X".repeat(120)}-S1.2`,
		"child-long",
		2,
		3,
	);

	expect(result).toHaveLength(120);
	expect(result.endsWith("-S1.2.3")).toBe(true);
});

it("builds readable recursive invoice-number paths deterministically", () => {
	expect(buildTgemSplitInvoiceNumber("3105-004892", "root-1", 0, 1)).toBe(
		"3105-004892-S1",
	);
	expect(buildTgemSplitInvoiceNumber("3105-004892", "root-1", 0, 2)).toBe(
		"3105-004892-S2",
	);
	expect(buildTgemSplitInvoiceNumber("3105-004892-S1", "child-1", 1, 2)).toBe(
		"3105-004892-S1.2",
	);
	expect(buildTgemSplitInvoiceNumber("3105-004892-S1.2", "child-2", 2, 1)).toBe(
		"3105-004892-S1.2.1",
	);
	expect(buildTgemSplitInvoiceNumber("3105-004892-S1.2", "child-2", 2, 1)).toBe(
		"3105-004892-S1.2.1",
	);
});

it("keeps missing-number split families distinct", () => {
	expect(buildTgemSplitInvoiceNumber(null, "parent-a", 0, 1)).toBe(
		"SPLIT-parent-a-S1",
	);
	expect(buildTgemSplitInvoiceNumber(null, "parent-b", 0, 1)).toBe(
		"SPLIT-parent-b-S1",
	);
});

it("extends legacy hash-suffixed numbers without renaming the parent path", () => {
	expect(
		buildTgemSplitInvoiceNumber(
			"3105-004892-S1-7A3C91D04F2B",
			"legacy-child",
			1,
			2,
		),
	).toBe("3105-004892-S1-7A3C91D04F2B.2");
});

it("allows a full split to recreate a share in the parent's original project", async () => {
	mockPrisma.site.findMany.mockResolvedValue([
		{ id: "project-original" },
		{ id: "project-a" },
	]);

	const result = await splitTgemInvoice(
		input({
			destinationProjectIds: ["project-original", "project-a"],
			lineRequests: [
				{ lineId: "line-1", wholeProjectId: "project-original" },
				{ lineId: "line-2", wholeProjectId: "project-a" },
			],
		}),
	);

	expect(result.children.map((child) => child.kind)).toEqual([
		"allocated",
		"allocated",
	]);
});

it("uses the explicitly selected residual project for an unassigned parent", async () => {
	mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(
		parent({ siteId: null }),
	);
	mockPrisma.site.findMany.mockResolvedValue([
		{ id: "project-a" },
		{ id: "project-residual" },
	]);

	const result = await splitTgemInvoice(
		input({ residualProjectId: "project-residual" }),
	);

	expect(result.children).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				projectId: "project-residual",
				kind: "residual",
			}),
		]),
	);
});

it("returns the existing immediate children for an exact committed retry", async () => {
	await splitTgemInvoice(input());
	const parentAudit =
		mockPrisma.tgemInvoiceAuditEvent.create.mock.calls[0][0].data;
	mockPrisma.tgemInvoiceCase.create.mockClear();
	mockPrisma.tgemInvoiceCase.updateMany.mockClear();
	mockPrisma.tgemInvoiceApprovalStep.updateMany.mockClear();
	mockPrisma.tgemInvoiceAuditEvent.create.mockClear();
	mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(
		parent({
			status: "split",
			archivedAt: new Date("2026-10-02T08:01:00.000Z"),
			splitRootInvoiceCaseId: "invoice-1",
			splitChildren: [
				{
					id: "child-1",
					siteId: "project-a",
					splitKind: "allocated",
					splitGeneration: 1,
					total: new Prisma.Decimal("24.00"),
					updatedAt: new Date("2026-10-02T08:01:00.000Z"),
				},
				{
					id: "child-2",
					siteId: "project-original",
					splitKind: "residual",
					splitGeneration: 1,
					total: new Prisma.Decimal("36.00"),
					updatedAt: new Date("2026-10-02T08:01:00.000Z"),
				},
			],
			auditEvents: [{ payload: parentAudit.payload }],
		}),
	);

	await expect(splitTgemInvoice(input())).resolves.toEqual(
		expect.objectContaining({
			replayed: true,
			children: expect.arrayContaining([
				expect.objectContaining({ id: "child-1" }),
				expect.objectContaining({ id: "child-2" }),
			]),
		}),
	);
	expect(mockPrisma.tgemInvoiceCase.create).not.toHaveBeenCalled();
	expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
	expect(mockPrisma.tgemInvoiceApprovalStep.updateMany).not.toHaveBeenCalled();
	expect(mockPrisma.tgemInvoiceAuditEvent.create).not.toHaveBeenCalled();
});

it("rejects an archived parent when the retry fingerprint differs", async () => {
	mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(
		parent({
			status: "split",
			archivedAt: new Date("2026-10-02T08:01:00.000Z"),
			splitChildren: [
				{
					id: "child-1",
					siteId: "project-a",
					splitKind: "allocated",
					splitGeneration: 1,
					total: new Prisma.Decimal("60.00"),
					updatedAt: new Date("2026-10-02T08:01:00.000Z"),
				},
			],
			auditEvents: [{ payload: { requestFingerprint: "different" } }],
		}),
	);

	await expectServiceError(splitTgemInvoice(input()), "conflict");
	expect(mockPrisma.tgemInvoiceCase.create).not.toHaveBeenCalled();
});

it("rejects a stale optimistic version before making writes", async () => {
	mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(
		parent({ updatedAt: new Date("2026-10-02T09:00:00.000Z") }),
	);

	await expectServiceError(splitTgemInvoice(input()), "conflict");
	expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
});

it.each([
	["processing", { extractionStatus: "processing" }],
	["extraction_incomplete", { extractionStatus: "failed" }],
	["paid", { paymentStatus: "paid" }],
	["invalid_state", { status: "approved" }],
	["non_leaf", { splitChildren: [{ id: "existing-child" }] }],
	[
		"approval_decided",
		{ approvalSteps: [{ status: "approved", decidedAt: new Date() }] },
	],
] as Array<[TgemInvoiceSplitServiceErrorCode, Record<string, unknown>]>)(
	"blocks forbidden parent state: %s",
	async (code, state) => {
		mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(parent(state));
		await expectServiceError(splitTgemInvoice(input()), code);
		expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
	},
);

it("rejects a destination outside the active organization", async () => {
	mockPrisma.site.findMany.mockResolvedValue([{ id: "project-a" }]);

	await expectServiceError(splitTgemInvoice(input()), "project_unavailable");
	expect(mockPrisma.tgemInvoiceCase.updateMany).not.toHaveBeenCalled();
});

it("surfaces a child-write failure so the transaction rolls back", async () => {
	let rolledBack = false;
	mockPrisma.tgemInvoiceCase.create.mockRejectedValue(
		new Error("child write failed"),
	);
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

	await expect(splitTgemInvoice(input())).rejects.toThrow("child write failed");
	expect(rolledBack).toBe(true);
	expect(mockPrisma.tgemInvoiceAuditEvent.create).not.toHaveBeenCalled();
});

it("retries one serializable transaction conflict", async () => {
	mockPrisma.$transaction
		.mockRejectedValueOnce({ code: "P2034" })
		.mockImplementationOnce((callback: (tx: typeof mockPrisma) => unknown) =>
			callback(mockPrisma),
		);

	await expect(splitTgemInvoice(input())).resolves.toEqual(
		expect.objectContaining({ replayed: false }),
	);
	expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
});

it("requires an active TGEM organization before starting a transaction", async () => {
	mockResolveFlow.mockResolvedValue(FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION);
	await expectServiceError(splitTgemInvoice(input()), "access_denied");
	expect(mockPrisma.$transaction).not.toHaveBeenCalled();
});

it("rejects malformed input before authorization", async () => {
	await expectServiceError(
		splitTgemInvoice(input({ destinationProjectIds: [] })),
		"invalid_input",
	);
	expect(mockRequireUser).not.toHaveBeenCalled();
});

it("returns known workspace conflict codes without exposing an exception", async () => {
	mockPrisma.tgemInvoiceCase.findFirst.mockResolvedValue(
		parent({ updatedAt: new Date("2026-10-02T09:00:00.000Z") }),
	);

	await expect(submitTgemInvoiceSplit(input())).resolves.toEqual({
		ok: false,
		error: "conflict",
	});
});
