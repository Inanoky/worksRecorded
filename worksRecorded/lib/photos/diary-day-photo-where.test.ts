import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { prisma } from "@/lib/utils/db";
import { diaryDayPhotoWhere } from "./diary-day-photo-where";

jest.mock("@/lib/utils/db", () => ({
	prisma: { sitediaryrecords: { findMany: jest.fn() } },
}));
const args = {
	siteId: "site",
	organizationId: LIMENI_ORGANIZATION_ID,
	start: new Date("2026-09-14T21:00:00Z"),
	end: new Date("2026-09-15T21:00:00Z"),
};
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
});

it("includes a photo linked to September 15 even when its gallery date is September 29", async () => {
	const url = "https://example.com/shared-photo.jpg";
	jest
		.mocked(prisma.sitediaryrecords.findMany)
		.mockResolvedValue([
			{ id: "september-15", Photos: [url, url, "javascript:invalid"] },
		] as never);
	const where = await diaryDayPhotoWhere(args);
	expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledWith({
		where: {
			siteId: args.siteId,
			organizationId: args.organizationId,
			archivedAt: null,
			Date: { gte: args.start, lt: args.end },
			Photos: { isEmpty: false },
		},
		select: { id: true, Photos: true },
	});
	expect(where).toEqual({
		siteId: "site",
		AND: [
			{
				OR: [
					{ organizationId: LIMENI_ORGANIZATION_ID },
					{ organizationId: null },
				],
			},
			{ OR: [{ mediaPurpose: null }, { mediaPurpose: "site_diary" }] },
			{
				OR: [
					{ diaryRecordId: { in: ["september-15"] } },
					{
						diaryRecordId: null,
						OR: [
							{ Date: { gte: args.start, lt: args.end } },
							{ URL: { in: [url] } },
							{ fileUrl: { in: [url] } },
						],
					},
				],
			},
		],
	});
});

it("keeps ordinary date-based lookup when there are no linked photos", async () => {
	const where = await diaryDayPhotoWhere(args);
	expect(where.AND).toContainEqual({
		OR: [
			{ diaryRecordId: { in: [] } },
			{
				diaryRecordId: null,
				OR: [{ Date: { gte: args.start, lt: args.end } }],
			},
		],
	});
});

it("does not expand other organizations' galleries to diary photo links", async () => {
	const where = await diaryDayPhotoWhere({ ...args, organizationId: "other" });
	expect(prisma.sitediaryrecords.findMany).not.toHaveBeenCalled();
	expect(where.AND).toContainEqual({
		OR: [{ Date: { gte: args.start, lt: args.end } }],
	});
	expect(where.AND).toContainEqual({
		OR: [{ organizationId: "other" }, { organizationId: null }],
	});
});
