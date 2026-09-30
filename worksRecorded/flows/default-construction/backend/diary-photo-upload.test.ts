import { prisma } from "@/lib/utils/db";
import { LIMENI_ORGANIZATION_ID } from "../lib/diary-photos";
import {
	appendDiaryPhoto,
	requireDiaryPhotoAccess,
} from "./diary-photo-upload";
import { requireWarehouseImportAccess } from "./warehouse-import-upload";

jest.mock("@/lib/utils/db", () => ({
	prisma: { sitediaryrecords: { findFirst: jest.fn() }, $queryRaw: jest.fn() },
}));
jest.mock("./warehouse-import-upload", () => ({
	requireWarehouseImportAccess: jest.fn(),
}));
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(requireWarehouseImportAccess).mockResolvedValue({
		userId: "u",
		siteId: "s",
		organizationId: LIMENI_ORGANIZATION_ID,
	});
	jest
		.mocked(prisma.sitediaryrecords.findFirst)
		.mockResolvedValue({ id: "r" } as never);
});
it("scopes access to an active record in the authorized Limeni project", async () => {
	await requireDiaryPhotoAccess("u", "s", "r");
	expect(prisma.sitediaryrecords.findFirst).toHaveBeenCalledWith({
		where: {
			id: "r",
			siteId: "s",
			organizationId: LIMENI_ORGANIZATION_ID,
			archivedAt: null,
		},
		select: { id: true },
	});
});
it("rejects other organizations", async () => {
	jest
		.mocked(requireWarehouseImportAccess)
		.mockResolvedValue({ userId: "u", siteId: "s", organizationId: "other" });
	await expect(requireDiaryPhotoAccess("u", "s", "r")).rejects.toThrow(
		"organization",
	);
	expect(prisma.sitediaryrecords.findFirst).not.toHaveBeenCalled();
});
it("authorizes legacy non-UUID record IDs against the same tenant and project", async () => {
	const recordId =
		"14d918ca2be80811479dad626cf0016d923a139b0e550f81525628b8fe00bb44";
	const result = await requireDiaryPhotoAccess("u", "s", recordId);
	expect(result.recordId).toBe(recordId);
	expect(prisma.sitediaryrecords.findFirst).toHaveBeenCalledWith({
		where: {
			id: recordId,
			siteId: "s",
			organizationId: LIMENI_ORGANIZATION_ID,
			archivedAt: null,
		},
		select: { id: true },
	});
});
it("rejects missing, archived or different-project records", async () => {
	jest.mocked(prisma.sitediaryrecords.findFirst).mockResolvedValue(null);
	await expect(
		appendDiaryPhoto({
			userId: "u",
			siteId: "s",
			recordId: "r",
			url: "https://host/photo",
		}),
	).rejects.toThrow("not found");
	expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
it("returns existing plus uploaded photos using a scoped atomic append", async () => {
	const photos = ["https://host/old", "https://host/new"];
	jest.mocked(prisma.$queryRaw).mockResolvedValue([{ Photos: photos }]);
	expect(
		await appendDiaryPhoto({
			userId: "u",
			siteId: "s",
			recordId: "r",
			url: photos[1],
		}),
	).toEqual({ photos, url: photos[1] });
	const [sql, ...params] = jest.mocked(prisma.$queryRaw).mock.calls[0];
	expect((sql as unknown as string[]).join("?")).toContain(
		'ANY(COALESCE("Photos"',
	);
	expect((sql as unknown as string[]).join("?")).toContain(
		'"archivedAt" IS NULL',
	);
	expect(params).toEqual([
		photos[1],
		photos[1],
		"r",
		"s",
		LIMENI_ORGANIZATION_ID,
	]);
});
it("fails if the record is archived during upload", async () => {
	jest.mocked(prisma.$queryRaw).mockResolvedValue([]);
	await expect(
		appendDiaryPhoto({
			userId: "u",
			siteId: "s",
			recordId: "r",
			url: "https://host/new",
		}),
	).rejects.toThrow("no longer");
});
