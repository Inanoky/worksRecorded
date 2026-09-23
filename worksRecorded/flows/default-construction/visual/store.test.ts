import { prisma } from "@/lib/utils/db";
import { requireWarehouseImportAccess } from "../backend/warehouse-import-upload";
import { LIMENI_ORGANIZATION_ID } from "../lib/diary-photos";
import { VISUAL_DOCUMENT_TYPE, type VisualState } from "./model";
import {
	createVisualDrawing,
	loadVisualDrawing,
	requireVisualAccess,
	saveVisualState,
} from "./store";

jest.mock("../backend/warehouse-import-upload", () => ({
	requireWarehouseImportAccess: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		sitediaryrecords: { findMany: jest.fn() },
		documents: {
			create: jest.fn(),
			findFirst: jest.fn(),
			updateMany: jest.fn(),
		},
	},
}));

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(requireWarehouseImportAccess).mockResolvedValue({
		userId: "user",
		siteId: "site",
		organizationId: LIMENI_ORGANIZATION_ID,
	});
	jest
		.mocked(prisma.documents.create)
		.mockResolvedValue({ id: "drawing" } as never);
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
		{
			id: "first",
			Location: " 1. STĀVS ",
			Works: "XPS",
			Comments: "Pabeigts",
			Photos: ["https://example.com/one.jpg"],
			Date: null,
			Amounts: 10,
			Units: "m2",
		},
		{
			id: "second",
			Location: "2. stāvs",
			Photos: ["https://example.com/two.jpg"],
		},
	] as never);
});

it("rejects non-Limeni organizations", async () => {
	jest.mocked(requireWarehouseImportAccess).mockResolvedValue({
		userId: "user",
		siteId: "site",
		organizationId: "other",
	});
	await expect(requireVisualAccess("user", "site")).rejects.toThrow(
		"nav pieejams",
	);
	expect(prisma.documents.create).not.toHaveBeenCalled();
});

it("snapshots only the selected location and enforces site/org/archive scope", async () => {
	await createVisualDrawing({
		userId: "user",
		siteId: "site",
		location: "1. stāvs",
		name: "Plan.pdf",
		url: "https://a.ufs.sh/f/plan",
	});
	expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				siteId: "site",
				organizationId: LIMENI_ORGANIZATION_ID,
				archivedAt: null,
			}),
		}),
	);
	const data = jest.mocked(prisma.documents.create).mock.calls[0][0].data;
	const state = JSON.parse(data.description as string) as VisualState;
	expect(state.evidence.map((item) => item.recordId)).toEqual(["first"]);
	expect(data.documentType).toBe(VISUAL_DOCUMENT_TYPE);
});

it("does not save a drawing with no linked photos in the location", async () => {
	await expect(
		createVisualDrawing({
			userId: "user",
			siteId: "site",
			location: "3. stāvs",
			name: "Plan.pdf",
			url: "https://a.ufs.sh/f/plan",
		}),
	).rejects.toThrow("Nevar atrast darbus");
	expect(prisma.documents.create).not.toHaveBeenCalled();
});

it("scopes reads to the requested site and organization", async () => {
	jest.mocked(prisma.documents.findFirst).mockResolvedValue(null);
	await expect(
		loadVisualDrawing("user", "site", "other-drawing"),
	).rejects.toThrow("nav atrasts");
	expect(prisma.documents.findFirst).toHaveBeenCalledWith({
		where: {
			id: "other-drawing",
			siteId: "site",
			organizationId: LIMENI_ORGANIZATION_ID,
			documentType: VISUAL_DOCUMENT_TYPE,
		},
	});
});

it("uses compare-and-swap to prevent concurrent results overwriting one another", async () => {
	await createVisualDrawing({
		userId: "user",
		siteId: "site",
		location: "1. stāvs",
		name: "Plan.pdf",
		url: "https://a.ufs.sh/f/plan",
	});
	const state = JSON.parse(
		jest.mocked(prisma.documents.create).mock.calls[0][0].data
			.description as string,
	);
	jest.mocked(prisma.documents.updateMany).mockResolvedValue({ count: 0 });
	await expect(
		saveVisualState(
			{
				id: "drawing",
				siteId: "site",
				organizationId: LIMENI_ORGANIZATION_ID,
				description: "old-state",
			},
			state,
		),
	).rejects.toThrow("jau tiek atjaunināta");
	expect(prisma.documents.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				description: "old-state",
				siteId: "site",
			}),
		}),
	);
});
