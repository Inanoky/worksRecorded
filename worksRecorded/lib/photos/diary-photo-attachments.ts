import type { Prisma } from "@prisma/client";
import {
	hasInlineDiaryPhotos,
	normalizeDiaryPhotoUrls,
} from "@/flows/default-construction/lib/diary-photos";
import { siteDiaryPhotoPurposeWhere } from "./media-purpose";

export const diaryPhotoRecordSelect = {
	id: true,
	siteId: true,
	organizationId: true,
	Date: true,
	Photos: true,
	Location: true,
	Comments: true,
	userId: true,
	workerId: true,
} as const;

type AttachmentRecord = Prisma.sitediaryrecordsGetPayload<{
	select: typeof diaryPhotoRecordSelect;
}>;

export async function ensureDiaryPhotoAttachments(
	tx: Prisma.TransactionClient,
	record: AttachmentRecord,
) {
	if (
		!record.siteId ||
		!record.organizationId ||
		!hasInlineDiaryPhotos(record.organizationId)
	)
		return;
	for (const url of normalizeDiaryPhotoUrls(record.Photos)) {
		const existing = await tx.photos.findUnique({
			where: {
				diaryRecordId_fileUrl: { diaryRecordId: record.id, fileUrl: url },
			},
		});
		if (existing) continue;
		const legacy = await tx.photos.findFirst({
			where: {
				siteId: record.siteId,
				diaryRecordId: null,
				Date: record.Date,
				AND: [
					siteDiaryPhotoPurposeWhere(),
					{
						OR: [
							{ organizationId: record.organizationId },
							{ organizationId: null },
						],
					},
					{ OR: [{ URL: url }, { fileUrl: url }] },
				],
			},
			orderBy: { id: "asc" },
			select: { id: true },
		});
		if (legacy) {
			const adopted = await tx.photos.updateMany({
				where: { id: legacy.id, siteId: record.siteId, diaryRecordId: null },
				data: {
					diaryRecordId: record.id,
					organizationId: record.organizationId,
					fileUrl: url,
				},
			});
			if (adopted.count === 1) continue;
		}
		await tx.photos.upsert({
			where: {
				diaryRecordId_fileUrl: { diaryRecordId: record.id, fileUrl: url },
			},
			update: {},
			create: {
				diaryRecordId: record.id,
				siteId: record.siteId,
				organizationId: record.organizationId,
				Date: record.Date,
				URL: url,
				fileUrl: url,
				mediaPurpose: "site_diary",
				Comment: record.Comments,
				Location: record.Location,
				userId: record.userId,
				workerId: record.workerId,
			},
		});
	}
}

export async function ensureDiaryPhotoAttachmentsById(
	tx: Prisma.TransactionClient,
	recordId: string,
	siteId: string,
	organizationId: string,
) {
	if (!hasInlineDiaryPhotos(organizationId)) return;
	const record = await tx.sitediaryrecords.findFirst({
		where: { id: recordId, siteId, organizationId, archivedAt: null },
		select: diaryPhotoRecordSelect,
	});
	if (!record) throw new Error("Diary record not found");
	await ensureDiaryPhotoAttachments(tx, record);
}
