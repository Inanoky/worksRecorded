import type { Prisma } from "@prisma/client";
import { traceable } from "langsmith/traceable";
import type { TgemInvoiceSource } from "@/lib/tgem-invoice-approval/intake";
import {
	buildTgemInvoiceLangSmithConfig,
	buildTgemInvoiceProcessingTraceInput,
	buildTgemInvoiceProcessingTraceOutput,
} from "@/lib/tgem-invoice-approval/langsmith";
import { persistTgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr";
import { processTgemInvoice } from "@/lib/tgem-invoice-approval/processor";
import { resolveTgemInvoiceProject } from "@/lib/tgem-invoice-approval/project-resolution";
import { startTgemInvoiceApproval } from "@/lib/tgem-invoice-approval/start-approval";
import { prisma } from "@/lib/utils/db";

type ProcessTgemInvoiceCaseInput = {
	invoiceCaseId: string;
	documentId: string;
	organizationId: string;
	siteId?: string | null;
	actorUserId: string | null;
	actorType: "user" | "whatsapp" | "email";
	source: TgemInvoiceSource;
	content: Buffer | (() => Promise<Buffer>);
	contentType: string;
	byteSize?: number | null;
};

async function resolveEmailInvoiceProject(
	input: ProcessTgemInvoiceCaseInput,
	result: Awaited<ReturnType<typeof processTgemInvoice>>,
) {
	if (input.source !== "email" || input.siteId) return;

	const invoiceCase = await prisma.tgemInvoiceCase.findFirst({
		where: { id: input.invoiceCaseId, archivedAt: null },
		select: { sourceContext: true, siteId: true },
	});
	if (!invoiceCase || invoiceCase.siteId) return;
	const context =
		invoiceCase.sourceContext &&
		typeof invoiceCase.sourceContext === "object" &&
		!Array.isArray(invoiceCase.sourceContext)
			? invoiceCase.sourceContext
			: {};

	try {
		const projects = await prisma.site.findMany({
			where: { organizationId: input.organizationId },
			select: {
				id: true,
				name: true,
				description: true,
				subdirectory: true,
				bisCaseNumber: true,
				bisCaseName: true,
			},
		});
		const resolution = await resolveTgemInvoiceProject({
			projects,
			sourceContext: context,
			result,
		});
		await prisma.$transaction(async (tx) => {
			const updated = await tx.tgemInvoiceCase.updateMany({
				where: { id: input.invoiceCaseId, archivedAt: null },
				data: {
					siteId: resolution.selectedSiteId,
					projectMatchConfidence: resolution.confidence,
					projectMatchMethod: resolution.method,
					projectMatchSummary: resolution.summary as Prisma.InputJsonValue,
				},
			});
			if (updated.count !== 1) return;
			await tx.tgemInvoiceAuditEvent.create({
				data: {
					invoiceCaseId: input.invoiceCaseId,
					organizationId: input.organizationId,
					actorUserId: null,
					actorType: "system",
					eventType: resolution.selectedSiteId
						? "invoice_project_auto_assigned"
						: "invoice_project_assignment_deferred",
					fromStatus: "needs_review",
					toStatus: "needs_review",
					payload: {
						projectId: resolution.selectedSiteId,
						confidence: resolution.confidence,
						reason: resolution.summary.reason,
						margin: resolution.summary.margin ?? null,
						conflictDetected: resolution.summary.conflictDetected,
					} satisfies Prisma.InputJsonValue,
				},
			});
		});
	} catch (error) {
		const updated = await prisma.tgemInvoiceCase.updateMany({
			where: { id: input.invoiceCaseId, archivedAt: null },
			data: {
				projectMatchConfidence: null,
				projectMatchMethod: "unassigned",
				projectMatchSummary: {
					reason: "resolution_failed",
				},
			},
		});
		if (updated.count !== 1) return;
		await prisma.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: input.invoiceCaseId,
				organizationId: input.organizationId,
				actorUserId: null,
				actorType: "system",
				eventType: "invoice_project_assignment_deferred",
				fromStatus: "needs_review",
				toStatus: "needs_review",
				payload: {
					reason: "resolution_failed",
					errorType: error instanceof Error ? error.name : "UnknownError",
				},
			},
		});
	}
}

async function processTgemInvoiceCaseInternal(
	input: ProcessTgemInvoiceCaseInput,
) {
	const claim = await prisma.tgemInvoiceCase.updateMany({
		where: {
			id: input.invoiceCaseId,
			organizationId: input.organizationId,
			archivedAt: null,
			status: { in: ["received", "failed_processing"] },
		},
		data: {
			status: "processing",
			ocrStatus: "processing",
			extractionStatus: "processing",
			processingError: null,
		},
	});
	if (claim.count !== 1) {
		return { skipped: true, status: "unavailable" };
	}
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
		await resolveEmailInvoiceProject(input, result);
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
		await prisma.tgemInvoiceCase.updateMany({
			where: { id: input.invoiceCaseId, archivedAt: null },
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
