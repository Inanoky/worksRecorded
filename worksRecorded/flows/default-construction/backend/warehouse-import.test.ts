jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: { findUnique: jest.fn() },
		site: { findFirst: jest.fn() },
		bISmaterialRecords: { count: jest.fn(), createMany: jest.fn() },
		photos: { create: jest.fn() },
		$transaction: jest.fn(),
		$executeRaw: jest.fn(),
	},
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(),
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/actions/META/RoutingHandlers/metaImageHandler", () => ({
	extractAndEnrichBISMaterialsFromPublicUrl: jest.fn(),
	normalizeExtractedInvoiceDate: jest.fn(() => new Date("2026-09-15")),
}));

import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import {
	extractAndEnrichBISMaterialsFromPublicUrl,
	normalizeExtractedInvoiceDate,
} from "@/server/actions/META/RoutingHandlers/metaImageHandler";
import {
	validateWarehouseImportFiles,
	WAREHOUSE_IMPORT_MAX_BYTES,
} from "../warehouse-import";
import { importWarehouseInvoice } from "./warehouse-import-actions";
import {
	requireWarehouseImportAccess,
	signWarehouseUpload,
	verifyWarehouseUpload,
} from "./warehouse-import-upload";

const siteId = "2630b409-5f79-43a9-90de-25f668c79df8";
const organizationId = "73bfa5f9-9e49-460e-876e-8d9eb58ba2cb";
const upload = {
	siteId,
	organizationId,
	userId: "user-1",
	key: "file-1",
	url: "https://example.ufs.sh/f/file-1",
	name: "invoice.pdf",
	type: "application/pdf" as const,
	size: 1024,
	fileHash: "hash-1",
};

describe("warehouse web import", () => {
	const originalToken = process.env.UPLOADTHING_TOKEN;
	beforeEach(() => {
		jest.resetAllMocks();
		process.env.UPLOADTHING_TOKEN = "test-signing-key";
		jest.mocked(requireUser).mockResolvedValue({ id: "user-1" } as never);
		jest
			.mocked(prisma.user.findUnique)
			.mockResolvedValue({ organizationId, status: "active" } as never);
		jest
			.mocked(prisma.site.findFirst)
			.mockResolvedValue({ id: siteId, organizationId } as never);
		jest
			.mocked(resolveFlowModuleKeyForRuntime)
			.mockResolvedValue(FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION);
		jest.mocked(prisma.bISmaterialRecords.count).mockResolvedValue(0);
		jest
			.mocked(prisma.bISmaterialRecords.createMany)
			.mockResolvedValue({ count: 1 });
		jest
			.mocked(prisma.$transaction)
			.mockImplementation(async (callback) => callback(prisma));
		jest
			.mocked(normalizeExtractedInvoiceDate)
			.mockReturnValue(new Date("2026-09-15"));
		jest.mocked(extractAndEnrichBISMaterialsFromPublicUrl).mockResolvedValue({
			items: [
				{
					name: "Cements",
					quantity: 4,
					cost: 20,
					invoiceNr: "INV-1",
					invoiceDate: "2026-09-15",
					invoiceDateText: "15.09.2026",
					invoiceDateYearVisible: true,
					costCode: "CC-1001",
					construction_material_id: "no_match",
					categoryName: null,
					measurementId: null,
					measurementUnit: null,
				},
			],
		});
	});
	afterEach(() => {
		if (originalToken === undefined) delete process.env.UPLOADTHING_TOKEN;
		else process.env.UPLOADTHING_TOKEN = originalToken;
	});

	it("accepts 20 mixed PDFs/images but rejects 21 total, unsupported types and oversized files", () => {
		const files = Array.from({ length: 20 }, (_, i) => ({
			size: 100,
			type: i % 2 ? "image/jpeg" : "application/pdf",
		}));
		expect(validateWarehouseImportFiles(files)).toBeNull();
		expect(validateWarehouseImportFiles([...files, files[0]])).toBe(
			"file_count",
		);
		expect(validateWarehouseImportFiles([])).toBe("file_count");
		expect(
			validateWarehouseImportFiles([{ type: "text/html", size: 100 }]),
		).toBe("file_type");
		expect(
			validateWarehouseImportFiles([
				{ type: "application/pdf", size: WAREHOUSE_IMPORT_MAX_BYTES + 1 },
			]),
		).toBe("file_size");
		expect(
			validateWarehouseImportFiles([{ type: "application/pdf", size: 0 }]),
		).toBe("file_size");
	});

	it("verifies upload receipts and rejects tampering or expiration", () => {
		const receipt = signWarehouseUpload(upload);
		expect(verifyWarehouseUpload(receipt)).toMatchObject(upload);
		expect(() => verifyWarehouseUpload(`${receipt}x`)).toThrow();
		const now = jest
			.spyOn(Date, "now")
			.mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);
		expect(() => verifyWarehouseUpload(receipt)).toThrow("expired");
		now.mockRestore();
	});

	it("imports a PDF into the scoped warehouse with original document and no BIS submission", async () => {
		expect(await importWarehouseInvoice(signWarehouseUpload(upload))).toEqual({
			ok: true,
			count: 1,
			duplicate: false,
		});
		expect(extractAndEnrichBISMaterialsFromPublicUrl).toHaveBeenCalledWith(
			expect.objectContaining({
				contentType: "application/pdf",
				source: "web",
				context: { siteId, userId: "user-1", orgId: organizationId },
			}),
		);
		expect(prisma.bISmaterialRecords.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					siteId,
					orgId: organizationId,
					userId: "user-1",
					sourcePhoto: upload.url,
					quantity: 4,
					cost: 20,
					categoryId: null,
					invoiceDate: new Date("2026-09-15"),
				}),
			],
		});
		expect(prisma.photos.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				mediaPurpose: "warehouse_invoice",
				URL: upload.url,
				Comment: "invoice.pdf",
			}),
		});
	});

	it("allows an existing organization member with a null status", async () => {
		jest
			.mocked(prisma.user.findUnique)
			.mockResolvedValue({ organizationId, status: null } as never);
		expect(
			await importWarehouseInvoice(signWarehouseUpload(upload)),
		).toMatchObject({ ok: true });
		expect(prisma.site.findFirst).toHaveBeenCalledWith({
			where: { id: siteId, organizationId },
			select: { id: true, organizationId: true },
		});
	});

	it.each(["inactive", "blocked", "suspended", "pending"])(
		"returns a forbidden error for status %s",
		async (status) => {
			jest
				.mocked(prisma.user.findUnique)
				.mockResolvedValue({ organizationId, status } as never);
			await expect(
				requireWarehouseImportAccess("user-1", siteId),
			).rejects.toMatchObject({ code: "FORBIDDEN" });
		},
	);

	it.each(["owner", "organization", "flow", "inactive", "site"])(
		"blocks unauthorized %s before extraction",
		async (kind) => {
			if (kind === "owner")
				jest
					.mocked(requireUser)
					.mockResolvedValue({ id: "another-user" } as never);
			if (kind === "organization")
				jest.mocked(prisma.user.findUnique).mockResolvedValue({
					organizationId: "another-org",
					status: "active",
				} as never);
			if (kind === "flow")
				jest
					.mocked(resolveFlowModuleKeyForRuntime)
					.mockResolvedValue("other-flow" as never);
			if (kind === "inactive")
				jest
					.mocked(prisma.user.findUnique)
					.mockResolvedValue({ organizationId, status: "inactive" } as never);
			if (kind === "site")
				jest.mocked(prisma.site.findFirst).mockResolvedValue(null);
			expect(
				await importWarehouseInvoice(signWarehouseUpload(upload)),
			).toMatchObject({ ok: false, error: "access" });
			expect(extractAndEnrichBISMaterialsFromPublicUrl).not.toHaveBeenCalled();
			expect(prisma.bISmaterialRecords.createMany).not.toHaveBeenCalled();
		},
	);

	it.each(["before extraction", "during save"])(
		"does not duplicate an invoice found %s",
		async (stage) => {
			if (stage === "before extraction")
				jest.mocked(prisma.bISmaterialRecords.count).mockResolvedValue(2);
			else
				jest
					.mocked(prisma.bISmaterialRecords.count)
					.mockResolvedValueOnce(0)
					.mockResolvedValueOnce(2);
			expect(await importWarehouseInvoice(signWarehouseUpload(upload))).toEqual(
				{ ok: true, count: 2, duplicate: true },
			);
			expect(prisma.bISmaterialRecords.createMany).not.toHaveBeenCalled();
			expect(prisma.photos.create).not.toHaveBeenCalled();
		},
	);

	it("does not create a source document or rows for unreadable documents", async () => {
		jest
			.mocked(extractAndEnrichBISMaterialsFromPublicUrl)
			.mockResolvedValue({ items: [] });
		expect(await importWarehouseInvoice(signWarehouseUpload(upload))).toEqual({
			ok: false,
			error: "empty",
		});
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});
});
