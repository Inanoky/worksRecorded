import type { Prisma } from "@prisma/client";
import {
	hasInlineDiaryPhotos,
	normalizeDiaryPhotoUrls,
} from "@/flows/default-construction/lib/diary-photos";
import { prisma } from "@/lib/utils/db";
import { siteDiaryPhotoPurposeWhere } from "./media-purpose";

export async function diaryDayPhotoWhere({
	siteId,
	organizationId,
	start,
	end,
}: {
	siteId: string;
	organizationId: string;
	start: Date;
	end: Date;
}): Promise<Prisma.photosWhereInput> {
	const dates = { gte: start, lt: end };
	const records = hasInlineDiaryPhotos(organizationId)
		? await prisma.sitediaryrecords.findMany({
				where: {
					siteId,
					organizationId,
					archivedAt: null,
					Date: dates,
					Photos: { isEmpty: false },
				},
				select: { id: true, Photos: true },
			})
		: [];
	const urls = normalizeDiaryPhotoUrls(
		records.flatMap((record) => record.Photos),
	);
	return {
		siteId,
		AND: [
			{ OR: [{ organizationId }, { organizationId: null }] },
			siteDiaryPhotoPurposeWhere(),
			hasInlineDiaryPhotos(organizationId)
				? {
						OR: [
							{ diaryRecordId: { in: records.map((record) => record.id) } },
							{
								diaryRecordId: null,
								OR: [
									{ Date: dates },
									...(urls.length
										? [{ URL: { in: urls } }, { fileUrl: { in: urls } }]
										: []),
								],
							},
						],
					}
				: {
						OR: [
							{ Date: dates },
							...(urls.length
								? [{ URL: { in: urls } }, { fileUrl: { in: urls } }]
								: []),
						],
					},
		],
	};
}
