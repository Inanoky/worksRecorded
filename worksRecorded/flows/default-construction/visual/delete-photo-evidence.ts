import type { Prisma } from "@prisma/client";
import {
	VISUAL_DOCUMENT_TYPE,
	VISUAL_LEASE_MS,
	visualStateSchema,
} from "./model";
import { pruneVisualEvidence } from "./prune-evidence";

export async function deleteVisualPhotoEvidence(
	tx: Prisma.TransactionClient,
	siteId: string,
	organizationId: string,
	urls: string[],
) {
	if (!urls.length) return;
	const rows = await tx.$queryRaw<Array<{ id: string; description: string }>>`
    SELECT id, description FROM "Documents"
    WHERE "siteId" = ${siteId} AND "organizationId" = ${organizationId}
      AND "documentType" = ${VISUAL_DOCUMENT_TYPE}
    ORDER BY id FOR UPDATE
  `;
	const removed = new Set(urls);
	for (const row of rows) {
		const state = visualStateSchema.parse(JSON.parse(row.description));
		const next = pruneVisualEvidence(
			state,
			(item) => !removed.has(item.photoUrl),
		);
		if (next === state) continue;
		if (state.lockedAt && Date.now() - state.lockedAt < VISUAL_LEASE_MS)
			throw new Error("Analīze vēl notiek. Uzgaidiet pirms foto dzēšanas.");
		const result = await tx.documents.updateMany({
			where: {
				id: row.id,
				siteId,
				organizationId,
				documentType: VISUAL_DOCUMENT_TYPE,
				description: row.description,
			},
			data: { description: JSON.stringify(next) },
		});
		if (result.count !== 1)
			throw new Error("Drawing changed while deleting photo. Please retry.");
	}
}
