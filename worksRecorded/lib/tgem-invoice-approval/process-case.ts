import { traceable } from "langsmith/traceable";
import type { TgemInvoiceSource } from "@/lib/tgem-invoice-approval/intake";
import {
	buildTgemInvoiceLangSmithConfig,
	buildTgemInvoiceProcessingTraceInput,
	buildTgemInvoiceProcessingTraceOutput,
} from "@/lib/tgem-invoice-approval/langsmith";
import { persistTgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr";
import { processTgemInvoice } from "@/lib/tgem-invoice-approval/processor";
import { startTgemInvoiceApproval } from "@/lib/tgem-invoice-approval/start-approval";
import { prisma } from "@/lib/utils/db";

type ProcessTgemInvoiceCaseInput = {
	invoiceCaseId: string;
	documentId: string;
	organizationId: string;
	siteId?: string | null;
	actorUserId: string;
	actorType: "user" | "whatsapp";
	source: TgemInvoiceSource;
	content: Buffer | (() => Promise<Buffer>);
	contentType: string;
	byteSize?: number | null;
};

async function processTgemInvoiceCaseInternal(
	input: ProcessTgemInvoiceCaseInput,
) {
	await prisma.tgemInvoiceCase.update({
		where: { id: input.invoiceCaseId },
		data: {
			status: "processing",
			ocrStatus: "processing",
			extractionStatus: "processing",
			processingError: null,
		},
	});
	await prisma.tgemInvoiceAuditEvent.create({
		data: {
			invoiceCaseId: input.invoiceCaseId,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			actorType: input.actorType,
			eventType: "invoice_processing_started",
			fromStatus: "received",
			toStatus: "processing",
		},
	});

	try {
		const content =
			typeof input.content === "function"
				? await input.content()
				: input.content;
		const result = await processTgemInvoice({
			content,
			mimeType: input.contentType,
		});
		const persisted = await persistTgemInvoiceOcrResult(prisma, {
			invoiceCaseId: input.invoiceCaseId,
			documentId: input.documentId,
			result,
		});
		await prisma.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: input.invoiceCaseId,
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				actorType: "system",
				eventType: "invoice_extraction_completed",
				fromStatus: "processing",
				toStatus: "needs_review",
				payload: {
					provider: result.provider,
					pageCount: persisted.pageCount,
					lineItemCount: persisted.lineItemCount,
					warningCount: persisted.warningCount,
				},
			},
		});

		try {
			await startTgemInvoiceApproval({
				invoiceCaseId: input.invoiceCaseId,
				actorUserId: input.actorUserId,
				trigger: "automatic",
			});
		} catch (approvalError) {
			const reason =
				approvalError instanceof Error
					? approvalError.message
					: "Approval could not be started automatically";
			await Promise.resolve(
				prisma.tgemInvoiceAuditEvent.create({
					data: {
						invoiceCaseId: input.invoiceCaseId,
						organizationId: input.organizationId,
						actorUserId: input.actorUserId,
						actorType: "system",
						eventType: "invoice_approval_auto_start_skipped",
						fromStatus: "needs_review",
						toStatus: "needs_review",
						payload: { reason },
					},
				}),
			).catch(() => null);
		}

		return {
			provider: result.provider,
			pageCount: persisted.pageCount,
			lineItemCount: persisted.lineItemCount,
			warningCount: persisted.warningCount,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "OCR failed";
		await prisma.tgemInvoiceCase.update({
			where: { id: input.invoiceCaseId },
			data: {
				status: "failed_processing",
				ocrStatus: "failed",
				extractionStatus: "failed",
				processingError: message,
			},
		});
		await prisma.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: input.invoiceCaseId,
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				actorType: "system",
				eventType: "invoice_processing_failed",
				fromStatus: "processing",
				toStatus: "failed_processing",
				payload: { message },
			},
		});
		throw error;
	}
}

function tracedProcessTgemInvoiceCase(source: TgemInvoiceSource) {
	return traceable(processTgemInvoiceCaseInternal, {
		...buildTgemInvoiceLangSmithConfig({ stage: "processing", source }),
		processInputs: buildTgemInvoiceProcessingTraceInput,
		processOutputs: buildTgemInvoiceProcessingTraceOutput,
	});
}

const TRACED_PROCESS_TGEM_INVOICE_CASE = {
	dashboard: tracedProcessTgemInvoiceCase("dashboard"),
	whatsapp: tracedProcessTgemInvoiceCase("whatsapp"),
	email: tracedProcessTgemInvoiceCase("email"),
};

export async function processTgemInvoiceCase(
	input: ProcessTgemInvoiceCaseInput,
) {
	return TRACED_PROCESS_TGEM_INVOICE_CASE[input.source](input);
}
