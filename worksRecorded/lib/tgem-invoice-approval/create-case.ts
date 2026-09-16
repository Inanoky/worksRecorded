import type { PrismaClient } from "@prisma/client";
import { traceable } from "langsmith/traceable";

import {
	normalizeTgemInvoiceIntake,
	type TgemInvoiceIntakeInput,
} from "@/lib/tgem-invoice-approval/intake";
import {
	buildTgemInvoiceIntakeTraceInput,
	buildTgemInvoiceIntakeTraceOutput,
	buildTgemInvoiceLangSmithConfig,
} from "@/lib/tgem-invoice-approval/langsmith";

type TgemInvoiceDatabase = Pick<PrismaClient, "tgemInvoiceCase">;

type CreateTgemInvoiceCaseArgs = {
	database: TgemInvoiceDatabase;
	input: TgemInvoiceIntakeInput;
};

async function createTgemInvoiceCaseRecordInternal({
	database,
	input,
}: CreateTgemInvoiceCaseArgs) {
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

function tracedCreateTgemInvoiceCaseRecord(
	source: TgemInvoiceIntakeInput["source"],
) {
	return traceable(createTgemInvoiceCaseRecordInternal, {
		...buildTgemInvoiceLangSmithConfig({ stage: "intake", source }),
		processInputs: ({ input }) => buildTgemInvoiceIntakeTraceInput(input),
		processOutputs: buildTgemInvoiceIntakeTraceOutput,
	});
}

const TRACED_CREATE_TGEM_INVOICE_CASE = {
	dashboard: tracedCreateTgemInvoiceCaseRecord("dashboard"),
	whatsapp: tracedCreateTgemInvoiceCaseRecord("whatsapp"),
	email: tracedCreateTgemInvoiceCaseRecord("email"),
};

export async function createTgemInvoiceCaseRecord(
	database: TgemInvoiceDatabase,
	input: TgemInvoiceIntakeInput,
) {
	return TRACED_CREATE_TGEM_INVOICE_CASE[input.source]({ database, input });
}
