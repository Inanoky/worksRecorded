import { prisma } from "@/lib/utils/db";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import { normalizeDiaryPhotoUrls } from "../lib/diary-photos";

export async function getDiarySourcePhotoUrls(args: {
	siteId?: string;
	userId?: string;
	workerId?: string;
}) {
	const context = getWhatsappSourceContext();
	if (
		!args.siteId ||
		(!args.userId && !args.workerId) ||
		context.mediaPurpose !== "site_diary_caption" ||
		!context.diaryPhotoIds?.length
	)
		return [];
	const photos = await prisma.photos.findMany({
		where: {
			id: { in: context.diaryPhotoIds },
			siteId: args.siteId,
			...(args.workerId
				? { workerId: args.workerId }
				: { userId: args.userId }),
			OR: [{ mediaPurpose: "site_diary" }, { mediaPurpose: null }],
		},
		select: { URL: true, fileUrl: true },
	});
	return normalizeDiaryPhotoUrls(
		photos.map((photo) => photo.URL || photo.fileUrl),
	);
}
