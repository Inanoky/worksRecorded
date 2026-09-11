"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { createTgemInvoiceCaseRecord } from "@/lib/tgem-invoice-approval/create-case";
import type {
	TgemDashboardData,
	TgemDashboardInvoice,
	TgemDashboardOcrBlock,
} from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	ensureTgemInvoiceFixture,
	isTgemInvoiceFixtureModeEnabled,
} from "@/lib/tgem-invoice-approval/fixture";
import { processTgemInvoiceWithGoogleDocumentAi } from "@/lib/tgem-invoice-approval/google-document-ai";
import type {
	TgemInvoiceIntakeInput,
	TgemInvoiceSource,
} from "@/lib/tgem-invoice-approval/intake";
import { persistTgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export type CreateTgemInvoiceCaseInput = Omit<
	TgemInvoiceIntakeInput,
	"organizationId" | "submittedByUserId" | "source"
> & {
	source?: TgemInvoiceSource;
};

export async function createTgemInvoiceCase(input: CreateTgemInvoiceCaseInput) {
	const user = await requireUser();
	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
		select: { organizationId: true },
	});

	if (!dbUser?.organizationId) {
		throw new Error("The current user is not assigned to an organization");
	}

	if (input.siteId) {
		const site = await prisma.site.findFirst({
			where: {
				id: input.siteId,
				organizationId: dbUser.organizationId,
			},
			select: { id: true },
		});

		if (!site) {
			throw new Error(
				"The selected invoice site is not available to the current organization",
			);
		}
	}

	return createTgemInvoiceCaseRecord(prisma, {
		...input,
		organizationId: dbUser.organizationId,
		submittedByUserId: user.id,
		source: input.source ?? "dashboard",
	});
}

export async function getTgemInvoiceCase(invoiceCaseId: string) {
	const user = await requireUser();
	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
		select: { organizationId: true },
	});

	if (!dbUser?.organizationId) return null;

	return prisma.tgemInvoiceCase.findFirst({
		where: {
			id: invoiceCaseId,
			organizationId: dbUser.organizationId,
		},
		include: {
			documents: {
				include: { ocrPages: true },
				orderBy: { createdAt: "asc" },
			},
			lines: { orderBy: { lineNumber: "asc" } },
			approvalSteps: { orderBy: { stepOrder: "asc" } },
			auditEvents: { orderBy: { createdAt: "asc" } },
		},
	});
}

async function readTgemInvoiceDocument(document: {
	storageProvider: string;
	storageKey: string | null;
	canonicalUrl: string;
}) {
	if (document.storageProvider === "fixture") {
		if (
			!isTgemInvoiceFixtureModeEnabled() ||
			document.storageKey !== "TGEMinvoice.png"
		) {
			throw new Error("The TGEM fixture document is not enabled");
		}

		return readFile(
			path.join(process.cwd(), "public", "TGEM", "TGEMinvoice.png"),
		);
	}

	const response = await fetch(document.canonicalUrl);
	if (!response.ok) {
		throw new Error(
			`Could not download the TGEM invoice document: ${response.status}`,
		);
	}

	return Buffer.from(await response.arrayBuffer());
}

export async function runTgemInvoiceOcr(input: {
	invoiceCaseId: string;
	documentId: string;
}) {
	const user = await requireUser();
	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
		select: { organizationId: true },
	});

	if (!dbUser?.organizationId) return null;

	const document = await prisma.tgemInvoiceDocument.findFirst({
		where: {
			id: input.documentId,
			invoiceCase: {
				id: input.invoiceCaseId,
				organizationId: dbUser.organizationId,
			},
		},
		select: {
			id: true,
			contentType: true,
			storageProvider: true,
			storageKey: true,
			canonicalUrl: true,
		},
	});

	if (!document) return null;

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
			organizationId: dbUser.organizationId,
			actorUserId: user.id,
			actorType: "user",
			eventType: "invoice_processing_started",
			fromStatus: "received",
			toStatus: "processing",
		},
	});

	try {
		const content = await readTgemInvoiceDocument(document);
		const result = await processTgemInvoiceWithGoogleDocumentAi({
			content,
			mimeType: document.contentType,
		});

		const persisted = await persistTgemInvoiceOcrResult(prisma, {
			invoiceCaseId: input.invoiceCaseId,
			documentId: document.id,
			result,
		});
		await prisma.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: input.invoiceCaseId,
				organizationId: dbUser.organizationId,
				actorUserId: user.id,
				actorType: "system",
				eventType: "google_ocr_completed",
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
				organizationId: dbUser.organizationId,
				actorUserId: user.id,
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

function serializeDate(value: Date | null) {
	return value?.toISOString() ?? null;
}

function serializeDecimal(value: { toString(): string } | number | null) {
	return value == null ? null : value.toString();
}

function serializeOcrBlocks(value: unknown): TgemDashboardOcrBlock[] {
	if (!Array.isArray(value)) return [];

	return value.filter((block): block is TgemDashboardOcrBlock => {
		if (!block || typeof block !== "object") return false;
		const candidate = block as Partial<TgemDashboardOcrBlock>;
		return (
			typeof candidate.text === "string" &&
			typeof candidate.left === "number" &&
			typeof candidate.top === "number" &&
			typeof candidate.width === "number" &&
			typeof candidate.height === "number"
		);
	});
}

type TgemDashboardInvoiceRecord = Prisma.TgemInvoiceCaseGetPayload<{
	include: {
		documents: { include: { ocrPages: true } };
		lines: true;
		approvalSteps: true;
		auditEvents: true;
	};
}>;

function serializeTgemDashboardInvoice(
	invoiceCase: TgemDashboardInvoiceRecord,
): TgemDashboardInvoice {
	return {
		id: invoiceCase.id,
		source: invoiceCase.source,
		status: invoiceCase.status,
		ocrStatus: invoiceCase.ocrStatus,
		extractionStatus: invoiceCase.extractionStatus,
		invoiceNumber: invoiceCase.invoiceNumber,
		supplierName: invoiceCase.supplierName,
		supplierRegistrationNo: invoiceCase.supplierRegistrationNo,
		invoiceDate: serializeDate(invoiceCase.invoiceDate),
		dueDate: serializeDate(invoiceCase.dueDate),
		currency: invoiceCase.currency,
		subtotal: serializeDecimal(invoiceCase.subtotal),
		vat: serializeDecimal(invoiceCase.vat),
		total: serializeDecimal(invoiceCase.total),
		bankAccount: invoiceCase.bankAccount,
		reference: invoiceCase.reference,
		validationSummary: invoiceCase.validationSummary,
		extractionSummary: invoiceCase.extractionSummary,
		createdAt: invoiceCase.createdAt.toISOString(),
		documents: invoiceCase.documents.map((document) => ({
			id: document.id,
			contentType: document.contentType,
			originalFilename: document.originalFilename,
			storageProvider: document.storageProvider,
			documentPath: `/api/tgem/invoices/${encodeURIComponent(invoiceCase.id)}/documents/${encodeURIComponent(document.id)}`,
			ocrPages: document.ocrPages.map((page) => ({
				id: page.id,
				pageNumber: page.pageNumber,
				width: page.width,
				height: page.height,
				text: page.text,
				blocks: serializeOcrBlocks(page.blocks),
				status: page.status,
			})),
		})),
		lines: invoiceCase.lines.map((line) => ({
			id: line.id,
			lineNumber: line.lineNumber,
			description: line.description,
			quantity: serializeDecimal(line.quantity),
			unit: line.unit,
			unitPrice: serializeDecimal(line.unitPrice),
			total: serializeDecimal(line.total),
			currency: line.currency,
			suggestedCostCode: line.suggestedCostCode,
			suggestedCategory: line.suggestedCategory,
			aiConfidence: line.aiConfidence,
		})),
		approvalSteps: invoiceCase.approvalSteps.map((step) => ({
			id: step.id,
			stepOrder: step.stepOrder,
			role: step.role,
			status: step.status,
			comment: step.comment,
			decidedAt: serializeDate(step.decidedAt),
		})),
		auditEvents: invoiceCase.auditEvents.map((event) => ({
			id: event.id,
			actorType: event.actorType,
			eventType: event.eventType,
			fromStatus: event.fromStatus,
			toStatus: event.toStatus,
			createdAt: event.createdAt.toISOString(),
		})),
	};
}

export async function getTgemInvoiceDashboardData(
	siteId: string,
): Promise<TgemDashboardData | null> {
	const user = await requireUser();
	const site = await prisma.site.findFirst({
		where: {
			id: siteId,
			organization: { users: { some: { id: user.id } } },
		},
		select: { id: true, organizationId: true },
	});

	if (!site?.organizationId) return null;

	if (isTgemInvoiceFixtureModeEnabled()) {
		await ensureTgemInvoiceFixture(prisma, {
			organizationId: site.organizationId,
			siteId: site.id,
			userId: user.id,
		});
	}

	const invoiceCases = await prisma.tgemInvoiceCase.findMany({
		where: {
			organizationId: site.organizationId,
			siteId: site.id,
		},
		orderBy: { createdAt: "desc" },
		include: {
			documents: {
				include: { ocrPages: true },
				orderBy: { createdAt: "asc" },
			},
			lines: { orderBy: { lineNumber: "asc" } },
			approvalSteps: { orderBy: { stepOrder: "asc" } },
			auditEvents: { orderBy: { createdAt: "asc" } },
		},
	});

	return { invoices: invoiceCases.map(serializeTgemDashboardInvoice) };
}
