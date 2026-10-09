import { prisma } from "@/lib/utils/db";
import { ensureDiaryPhotoAttachmentsById } from "@/lib/photos/diary-photo-attachments";
import {
	LIMENI_ORGANIZATION_ID,
	normalizeDiaryPhotoUrls,
} from "../lib/diary-photos";
import { requireWarehouseImportAccess } from "./warehouse-import-upload";

export async function requireDiaryPhotoAccess(
	userId: string,
	siteId: string,
	recordId: string,
) {
	const access = await requireWarehouseImportAccess(userId, siteId);
	if (access.organizationId !== LIMENI_ORGANIZATION_ID)
		throw new Error("Photo upload is unavailable for this organization");
	const record = await prisma.sitediaryrecords.findFirst({
		where: {
			id: recordId,
			siteId,
			organizationId: access.organizationId,
			archivedAt: null,
		},
		select: { id: true },
	});
	if (!record) throw new Error("Diary record not found");
	return { ...access, recordId };
}

export async function appendDiaryPhoto(input: {
	userId: string;
	siteId: string;
	recordId: string;
	url: string;
}) {
	const access = await requireDiaryPhotoAccess(
		input.userId,
		input.siteId,
		input.recordId,
	);
	if (normalizeDiaryPhotoUrls([input.url]).length !== 1)
		throw new Error("Invalid photo URL");
	return prisma.$transaction(async (tx) => {
		const rows = await tx.$queryRaw<Array<{ Photos: string[] }>>`
    UPDATE "sitediaryrecords"
    SET "Photos" = CASE
      WHEN ${input.url} = ANY(COALESCE("Photos", ARRAY[]::text[])) THEN "Photos"
      ELSE array_append(COALESCE("Photos", ARRAY[]::text[]), ${input.url})
    END
    WHERE id = ${input.recordId} AND "siteId" = ${input.siteId}
      AND "organizationId" = ${access.organizationId} AND "archivedAt" IS NULL
    RETURNING "Photos"
  `;
		if (!rows[0]) throw new Error("Diary record no longer available");
		await ensureDiaryPhotoAttachmentsById(
			tx,
			input.recordId,
			input.siteId,
			access.organizationId,
		);
		return { photos: rows[0].Photos, url: input.url };
	});
}
