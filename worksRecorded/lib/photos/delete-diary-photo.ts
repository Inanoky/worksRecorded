import { hasInlineDiaryPhotos } from "@/flows/default-construction/lib/diary-photos";
import { deleteVisualPhotoEvidence } from "@/flows/default-construction/visual/delete-photo-evidence";
import { auditZtcMutation } from "@/flows/ztc-production/lib/ztc-record-audit";
import { PHOTO_MEDIA_PURPOSE_WAREHOUSE_INVOICE } from "@/lib/photos/media-purpose";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { getUserPhotoStore } from "./flow-photo-store";

export async function deleteDiaryPhoto(id: string, requestedSiteId?: string) {
	const user = await requireUser();
	const photoStore = await getUserPhotoStore(user.id, requestedSiteId);
	const photo = await photoStore.findUnique({
		where: { id },
		select: { siteId: true, organizationId: true, mediaPurpose: true },
	});
	if (!photo?.siteId) throw new Error("Photo not found");
	if (requestedSiteId && requestedSiteId !== photo.siteId)
		throw new Error("Photo not found");
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
	if (photoStore === (prisma.ztcPhoto as unknown)) {
		const result = await auditZtcMutation(
			"deleteZtcGalleryPhoto",
			async (tx) => {
				const deleted = await tx.ztcPhoto.delete({
					where: { id, siteId, organizationId: photo.organizationId },
					select: { URL: true, fileUrl: true, diaryRecordId: true },
				});
				const urls = [
					...new Set(
						[deleted.URL, deleted.fileUrl].filter((url): url is string =>
							Boolean(url),
						),
					),
				];
				const owners = await tx.ztcRecords.findMany({
					where: {
						siteId,
						organizationId: site.organizationId,
						...(deleted.diaryRecordId
							? { id: deleted.diaryRecordId }
							: { Photos: { hasSome: urls } }),
					},
					select: { id: true },
					take: 2,
				});
				if (owners.length > 1)
					throw new Error(
						"Foto ir koplietots vairākos ierakstos. Pirms dzēšanas jāatdala vēsturiskās foto saites.",
					);
				for (const owner of owners) {
					for (const url of urls) {
						await tx.$executeRaw`UPDATE "ZTCrecords" SET "Photos" = array_remove("Photos", ${url}) WHERE id = ${owner.id} AND "siteId" = ${siteId} AND "organizationId" = ${site.organizationId}`;
					}
				}
				return {
					deletedUrls: urls,
					deletedRecordIds: owners.map((owner) => owner.id),
				};
			},
			{ source: "manual", actorId: user.id },
		);
		return { siteId, ...result };
	}
	const result = await prisma.$transaction(async (tx) => {
		const deleted = await tx.photos.delete({
			where: {
				id,
				siteId,
				organizationId: photo.organizationId,
				mediaPurpose: photo.mediaPurpose,
			},
			select: { URL: true, fileUrl: true, diaryRecordId: true },
		});
		if (!hasInlineDiaryPhotos(site.organizationId))
			return { deletedUrls: [], deletedRecordIds: [] };
		const urls = [
			...new Set(
				[deleted.URL, deleted.fileUrl].filter(
					(url): url is string => typeof url === "string" && url.length > 0,
				),
			),
		];
		const owners = deleted.diaryRecordId
			? [{ id: deleted.diaryRecordId }]
			: urls.length
				? await tx.sitediaryrecords.findMany({
						where: {
							siteId,
							organizationId: site.organizationId,
							Photos: { hasSome: urls },
							photoAttachments: {
								none: {
									OR: [{ URL: { in: urls } }, { fileUrl: { in: urls } }],
								},
							},
						},
						select: { id: true },
						take: 2,
					})
				: [];
		if (owners.length > 1) {
			throw new Error(
				"Foto ir koplietots vairākos ierakstos. Pirms dzēšanas jāatdala vēsturiskās foto saites.",
			);
		}
		const deletedRecordIds = owners.map((record) => record.id);
		for (const recordId of deletedRecordIds) {
			for (const url of urls) {
				await tx.$executeRaw`
        UPDATE "sitediaryrecords"
        SET "Photos" = array_remove("Photos", ${url})
        WHERE "siteId" = ${siteId} AND "organizationId" = ${site.organizationId}
          AND id = ${recordId}
          AND ${url} = ANY("Photos")
      `;
			}
		}
		await deleteVisualPhotoEvidence(
			tx,
			siteId,
			site.organizationId,
			urls,
			deletedRecordIds,
		);
		return { deletedUrls: urls, deletedRecordIds };
	});
	return { siteId, ...result };
}
