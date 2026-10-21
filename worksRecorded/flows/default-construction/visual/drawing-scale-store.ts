import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import {
	VISUAL_DOCUMENT_TYPE,
	VISUAL_LEASE_MS,
	visualStateSchema,
} from "./model";
import { requireVisualAccess } from "./store";

const inputSchema = z
	.object({
		page: z.number().int().min(1).max(1000),
		scale: z.number().finite().min(1).max(10_000).nullable(),
		expected: z.number().nullable(),
	})
	.strict();

export async function persistVisualDrawingScale(
	userId: string,
	siteId: string,
	drawingId: string,
	input: unknown,
) {
	const value = inputSchema.parse(input);
	const access = await requireVisualAccess(userId, siteId);
	const where = {
		id: drawingId,
		siteId,
		organizationId: access.organizationId,
		documentType: VISUAL_DOCUMENT_TYPE,
	};
	for (let attempt = 0; attempt < 3; attempt++) {
		const row = await prisma.documents.findFirst({
			where,
			select: { description: true },
		});
		if (!row) throw new Error("Rasējums nav atrasts.");
		const state = visualStateSchema.parse(JSON.parse(row.description));
		if (state.lockedAt && Date.now() - state.lockedAt < VISUAL_LEASE_MS)
			throw new Error(
				"Rasējums tiek atjaunināts. Mēģiniet vēlreiz pēc atjaunošanas.",
			);
		const current = state.pageScales?.[value.page] ?? null;
		if (current !== value.expected && current !== value.scale)
			throw new Error("Mērogs ir mainīts citā logā. Atjaunojiet rasējumu.");
		if (state.pageCount && value.page > state.pageCount)
			throw new Error("Rasējuma lapa nav atrasta.");
		const pageScales = { ...state.pageScales };
		if (value.scale === null) delete pageScales[value.page];
		else pageScales[value.page] = value.scale;
		const result = await prisma.documents.updateMany({
			where: { ...where, description: row.description },
			data: { description: JSON.stringify({ ...state, pageScales }) },
		});
		if (result.count === 1) return pageScales;
	}
	throw new Error("Rasējums ir mainījies. Mēģiniet vēlreiz.");
}
