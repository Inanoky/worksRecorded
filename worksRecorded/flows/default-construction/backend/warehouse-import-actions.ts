"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { PHOTO_MEDIA_PURPOSE_WAREHOUSE_INVOICE } from "@/lib/photos/media-purpose";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import {
	extractAndEnrichBISMaterialsFromPublicUrl,
	normalizeExtractedInvoiceDate,
} from "@/server/actions/META/RoutingHandlers/metaImageHandler";
import {
	requireWarehouseImportAccess,
	verifyWarehouseUpload,
} from "./warehouse-import-upload";

export async function importWarehouseInvoice(receipt: string) {
	const user = await requireUser();
	let upload: ReturnType<typeof verifyWarehouseUpload>;
	try {
		upload = verifyWarehouseUpload(receipt);
		if (upload.userId !== user.id) throw new Error("Upload owner mismatch");
		const access = await requireWarehouseImportAccess(user.id, upload.siteId);
		if (access.organizationId !== upload.organizationId)
			throw new Error("Upload organization mismatch");
	} catch {
		return { ok: false as const, error: "access" as const };
	}
	const importBatchId = `warehouse-web:${createHash("sha256").update(`${upload.siteId}:${upload.fileHash}`).digest("hex")}`;
	const where = {
		siteId: upload.siteId,
		orgId: upload.organizationId,
		importBatchId,
	};
	try {
		const existing = await prisma.bISmaterialRecords.count({ where });
		if (existing)
			return { ok: true as const, count: existing, duplicate: true };
		const payload = await extractAndEnrichBISMaterialsFromPublicUrl({
			publicUrl: upload.url,
			contentType: upload.type,
			source: "web",
			context: {
				siteId: upload.siteId,
				userId: user.id,
				orgId: upload.organizationId,
			},
		});
		if (!payload.items.length)
			return { ok: false as const, error: "empty" as const };
		const result = await prisma.$transaction(
			async (tx) => {
				await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${importBatchId}))`;
				const duplicateCount = await tx.bISmaterialRecords.count({ where });
				if (duplicateCount) return { count: duplicateCount, duplicate: true };
				const saved = await tx.bISmaterialRecords.createMany({
					data: payload.items.map((item) => ({
						...where,
						userId: user.id,
						name: item.name,
						quantity: item.quantity,
						cost: item.cost,
						invoiceNr: item.invoiceNr,
						invoiceDate: normalizeExtractedInvoiceDate(item),
						costCode: item.costCode,
						categoryId:
							item.construction_material_id === "no_match"
								? null
								: item.construction_material_id,
						categoryName: item.categoryName,
						measurementUnitId: item.measurementId,
						measurementUnit: item.measurementUnit,
						sourcePhoto: upload.url,
					})),
				});
				await tx.photos.create({
					data: {
						URL: upload.url,
						fileUrl: upload.url,
						Comment: upload.name,
						Date: new Date(),
						siteId: upload.siteId,
						organizationId: upload.organizationId,
						userId: user.id,
						mediaPurpose: PHOTO_MEDIA_PURPOSE_WAREHOUSE_INVOICE,
					},
				});
				return { count: saved.count, duplicate: false };
			},
			{ timeout: 15000 },
		);
		revalidatePath(`/dashboard/sites/${upload.siteId}/BIS`);
		return { ok: true as const, ...result };
	} catch (error) {
		console.error("[warehouse-import] Failed", {
			siteId: upload.siteId,
			key: upload.key,
			error,
		});
		return { ok: false as const, error: "processing" as const };
	}
}
