import { hasInlineDiaryPhotos } from "@/flows/default-construction/lib/diary-photos";
import { PHOTO_MEDIA_PURPOSE_WAREHOUSE_INVOICE } from "@/lib/photos/media-purpose";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

export async function deleteDiaryPhoto(id: string) {
	const user = await requireUser();
	const photo = await prisma.photos.findUnique({
		where: { id },
		select: { siteId: true, organizationId: true, mediaPurpose: true },
	});
	if (!photo?.siteId) throw new Error("Photo not found");
	const site = await orgCheck(user.id, photo.siteId);
	if (
		!site ||
		!site.organizationId ||
		(photo.organizationId && photo.organizationId !== site.organizationId)
	) {
		throw new Error("Photo not found");
	}
	if (photo.mediaPurpose === PHOTO_MEDIA_PURPOSE_WAREHOUSE_INVOICE) {
		throw new Error(
			"Warehouse invoice photos cannot be deleted in the site diary.",
		);
	}
	const siteId = photo.siteId;
	await prisma.$transaction(async (tx) => {
		const deleted = await tx.photos.delete({
			where: {
				id,
				siteId,
				organizationId: photo.organizationId,
				mediaPurpose: photo.mediaPurpose,
			},
			select: { URL: true, fileUrl: true },
		});
		if (!hasInlineDiaryPhotos(site.organizationId)) return;
		const urls = [
			...new Set(
				[deleted.URL, deleted.fileUrl].filter(
					(url): url is string => typeof url === "string" && url.length > 0,
				),
			),
		];
		for (const url of urls) {
			await tx.$executeRaw`
        UPDATE "sitediaryrecords"
        SET "Photos" = array_remove("Photos", ${url})
        WHERE "siteId" = ${siteId} AND "organizationId" = ${site.organizationId}
          AND ${url} = ANY("Photos")
      `;
		}
	});
	return { siteId };
}
