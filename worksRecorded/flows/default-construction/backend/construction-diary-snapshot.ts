import { siteDiaryPhotoPurposeWhere } from "@/lib/photos/media-purpose";
import { prisma } from "@/lib/utils/db";
import {
	constructionDiaryListSelect,
	mapConstructionDiaryListRecord,
} from "./diary-list-record";

export type ConstructionDiarySnapshotOptions = {
	ids?: string[];
	media?: boolean;
};
export async function readConstructionDiarySnapshot(
	siteId: string,
	organizationId: string,
	options: ConstructionDiarySnapshotOptions = {},
) {
	const [rows, mediaPhotos] = await Promise.all([
		options.ids?.length === 0
			? []
			: prisma.sitediaryrecords.findMany({
					where: {
						siteId,
						organizationId,
						archivedAt: null,
						...(options.ids ? { id: { in: options.ids } } : {}),
					},
					orderBy: [{ Date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
					select: constructionDiaryListSelect,
				}),
		options.media === false
			? []
			: prisma.photos.findMany({
					where: {
						siteId,
						organizationId,
						AND: [siteDiaryPhotoPurposeWhere()],
						OR: [
							{ AND: [{ URL: { not: null } }, { URL: { not: "" } }] },
							{ AND: [{ fileUrl: { not: null } }, { fileUrl: { not: "" } }] },
						],
					},
					select: {
						Date: true,
						Comment: true,
						Location: true,
						URL: true,
						fileUrl: true,
					},
				}),
	]);
	return { rows: rows.map(mapConstructionDiaryListRecord), mediaPhotos };
}
