import type { PrismaClient } from "@prisma/client";

import {
	normalizeTgemInvoiceIntake,
	type TgemInvoiceIntakeInput,
} from "@/lib/tgem-invoice-approval/intake";

type TgemInvoiceDatabase = Pick<PrismaClient, "tgemInvoiceCase">;

export async function createTgemInvoiceCaseRecord(
	database: TgemInvoiceDatabase,
	input: TgemInvoiceIntakeInput,
) {
	const normalized = normalizeTgemInvoiceIntake(input);

	return database.tgemInvoiceCase.upsert({
		where: { idempotencyKey: normalized.idempotencyKey },
		update: {},
		create: {
			organizationId: normalized.organizationId,
			siteId: normalized.siteId,
			submittedByUserId: normalized.submittedByUserId,
			idempotencyKey: normalized.idempotencyKey,
			source: normalized.source,
			sourceMessageId: normalized.sourceMessageId,
			sourceSender: normalized.sourceSender,
			status: normalized.status,
			ocrStatus: normalized.ocrStatus,
			extractionStatus: normalized.extractionStatus,
			documents: {
				create: normalized.document,
			},
			auditEvents: {
				create: {
					organizationId: normalized.organizationId,
					actorUserId: normalized.submittedByUserId,
					actorType:
						normalized.source === "dashboard" ? "user" : normalized.source,
					eventType: "invoice_received",
					toStatus: normalized.status,
					payload: {
						source: normalized.source,
						sourceMessageId: normalized.sourceMessageId,
					},
				},
			},
		},
		include: {
			documents: true,
			auditEvents: true,
		},
	});
}
