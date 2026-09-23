import { getDiarySourcePhotoUrls } from "./diary-photo-source";
import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

jest.mock("@/lib/utils/db", () => ({
	prisma: { photos: { findMany: jest.fn() } },
}));
import { prisma } from "@/lib/utils/db";
const findMany = prisma.photos.findMany as jest.Mock;

beforeEach(() => {
	findMany.mockReset();
});

it("does not look up unrelated text or invoice photos", async () => {
	expect(
		await getDiarySourcePhotoUrls({ siteId: "site", userId: "user" }),
	).toEqual([]);
	expect(
		await runWithWhatsappSourceContext(
			{ mediaPurpose: "warehouse_invoice", diaryPhotoIds: ["photo"] },
			() => getDiarySourcePhotoUrls({ siteId: "site", userId: "user" }),
		),
	).toEqual([]);
	expect(findMany).not.toHaveBeenCalled();
});

it("requires a trusted site and sender", async () => {
	await runWithWhatsappSourceContext(
		{ mediaPurpose: "site_diary_caption", diaryPhotoIds: ["photo"] },
		async () => {
			expect(await getDiarySourcePhotoUrls({ siteId: "site" })).toEqual([]);
			expect(await getDiarySourcePhotoUrls({ userId: "user" })).toEqual([]);
		},
	);
	expect(findMany).not.toHaveBeenCalled();
});

it("scopes worker photos to the source IDs, site and sender and validates URLs", async () => {
	findMany.mockResolvedValue([
		{ URL: null, fileUrl: "https://utfs.io/f/photo" },
		{ URL: "javascript:bad", fileUrl: null },
	]);
	expect(
		await runWithWhatsappSourceContext(
			{ mediaPurpose: "site_diary_caption", diaryPhotoIds: ["photo"] },
			() => getDiarySourcePhotoUrls({ siteId: "site", workerId: "worker" }),
		),
	).toEqual(["https://utfs.io/f/photo"]);
	expect(findMany).toHaveBeenCalledWith({
		where: {
			id: { in: ["photo"] },
			siteId: "site",
			workerId: "worker",
			OR: [{ mediaPurpose: "site_diary" }, { mediaPurpose: null }],
		},
		select: { URL: true, fileUrl: true },
	});
});
