"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import type { TgemApprovalRoleKey } from "@/lib/tgem-invoice-approval/approval";
import { createTgemInvoiceCaseRecord } from "@/lib/tgem-invoice-approval/create-case";
import type {
	TgemDashboardData,
	TgemDashboardInvoice,
	TgemDashboardOcrBlock,
	TgemDashboardSourceAnchor,
} from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	ensureTgemInvoiceFixture,
	isTgemInvoiceFixtureModeEnabled,
} from "@/lib/tgem-invoice-approval/fixture";
import type {
	TgemInvoiceIntakeInput,
	TgemInvoiceSource,
} from "@/lib/tgem-invoice-approval/intake";
import { persistTgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr";
import { processTgemInvoice } from "@/lib/tgem-invoice-approval/processor";
import { startTgemInvoiceApproval } from "@/lib/tgem-invoice-approval/start-approval";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

const TGEM_UNASSIGNED_PROJECT_FILTER = "unassigned";

type TgemInvoiceProjectFilter = string | null;

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
		const result = await processTgemInvoice({
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
				actorUserId: user.id,
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
						organizationId: dbUser.organizationId,
						actorUserId: user.id,
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

	return value.flatMap((block, index): TgemDashboardOcrBlock[] => {
		if (!block || typeof block !== "object") return [];
		const candidate = block as Partial<TgemDashboardOcrBlock>;
		if (
			typeof candidate.text === "string" &&
			typeof candidate.left === "number" &&
			typeof candidate.top === "number" &&
			typeof candidate.width === "number" &&
			typeof candidate.height === "number"
		) {
			return [
				{
					text: candidate.text,
					confidence:
						typeof candidate.confidence === "number"
							? candidate.confidence
							: null,
					kind: candidate.kind === "token" ? "token" : "line",
					readingOrder:
						typeof candidate.readingOrder === "number"
							? candidate.readingOrder
							: index,
					left: candidate.left,
					top: candidate.top,
					width: candidate.width,
					height: candidate.height,
					polygon: Array.isArray(candidate.polygon) ? candidate.polygon : [],
				},
			];
		}
		return [];
	});
}

function serializeFieldAnchors(
	value: unknown,
): Record<string, TgemDashboardSourceAnchor> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const fields = (value as { fields?: unknown }).fields;
	if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};

	return Object.fromEntries(
		Object.entries(fields).flatMap(([name, field]) => {
			if (!field || typeof field !== "object" || Array.isArray(field))
				return [];
			const sourceAnchor = (field as { sourceAnchor?: unknown }).sourceAnchor;
			if (
				!sourceAnchor ||
				typeof sourceAnchor !== "object" ||
				Array.isArray(sourceAnchor)
			) {
				return [];
			}
			const anchor = sourceAnchor as Partial<TgemDashboardSourceAnchor>;
			if (
				typeof anchor.pageNumber !== "number" ||
				typeof anchor.left !== "number" ||
				typeof anchor.top !== "number" ||
				typeof anchor.width !== "number" ||
				typeof anchor.height !== "number"
			) {
				return [];
			}

			return [
				[
					name,
					{
						pageNumber: anchor.pageNumber,
						left: anchor.left,
						top: anchor.top,
						width: anchor.width,
						height: anchor.height,
						polygon: Array.isArray(anchor.polygon) ? anchor.polygon : [],
					},
				],
			];
		}),
	);
}

type TgemDashboardInvoiceRecord = Prisma.TgemInvoiceCaseGetPayload<{
	include: {
		site: { select: { id: true; name: true } };
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
		project: invoiceCase.site,
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
		fieldAnchors: serializeFieldAnchors(invoiceCase.extractionSummary),
		createdAt: invoiceCase.createdAt.toISOString(),
		updatedAt: invoiceCase.updatedAt.toISOString(),
		approvalRound: invoiceCase.approvalRound,
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
			approvalRound: step.approvalRound,
			roleKey: step.roleKey as TgemApprovalRoleKey,
			role: step.role,
			approverUserId: step.approverUserId,
			approverName: step.approverName,
			templateRevision: step.templateRevision,
			minimumInvoiceTotal: serializeDecimal(step.minimumInvoiceTotal),
			thresholdCurrency: step.thresholdCurrency,
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
	projectFilter: TgemInvoiceProjectFilter = null,
): Promise<TgemDashboardData | null> {
	const user = await requireUser();
	const dbUser = await prisma.user.findFirst({
		where: { id: user.id, status: "active" },
		select: { organizationId: true },
	});
	if (!dbUser?.organizationId) return null;

	const projects = await prisma.site.findMany({
		where: { organizationId: dbUser.organizationId },
		select: { id: true, name: true, userId: true },
		orderBy: { createdAt: "desc" },
	});
	const selectedProject =
		projectFilter && projectFilter !== TGEM_UNASSIGNED_PROJECT_FILTER
			? projects.find((project) => project.id === projectFilter)
			: null;
	if (
		projectFilter &&
		projectFilter !== TGEM_UNASSIGNED_PROJECT_FILTER &&
		!selectedProject
	) {
		throw new Error("Project access denied");
	}

	if (isTgemInvoiceFixtureModeEnabled()) {
		const fixtureProject = selectedProject ?? projects[0];
		if (fixtureProject) {
			await ensureTgemInvoiceFixture(prisma, {
				organizationId: dbUser.organizationId,
				siteId: fixtureProject.id,
				userId: user.id,
			});
		}
	}

	const [invoiceCases, users, template, workflowManagers] = await Promise.all([
		prisma.tgemInvoiceCase.findMany({
			where: {
				organizationId: dbUser.organizationId,
				...(projectFilter === TGEM_UNASSIGNED_PROJECT_FILTER
					? { siteId: null }
					: selectedProject
						? { siteId: selectedProject.id }
						: {}),
			},
			orderBy: { createdAt: "desc" },
			include: {
				site: { select: { id: true, name: true } },
				documents: {
					include: { ocrPages: true },
					orderBy: { createdAt: "asc" },
				},
				lines: { orderBy: { lineNumber: "asc" } },
				approvalSteps: {
					orderBy: [{ approvalRound: "asc" }, { stepOrder: "asc" }],
				},
				auditEvents: { orderBy: { createdAt: "asc" } },
			},
		}),
		prisma.user.findMany({
			where: { organizationId: dbUser.organizationId, status: "active" },
			orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
			select: { id: true, firstName: true, lastName: true, role: true },
		}),
		selectedProject
			? prisma.tgemInvoiceApprovalTemplate.findFirst({
					where: {
						organizationId: dbUser.organizationId,
						siteId: selectedProject.id,
						isCurrent: true,
					},
					orderBy: { revision: "desc" },
					include: { steps: { orderBy: { stepOrder: "asc" } } },
				})
			: Promise.resolve(null),
		selectedProject
			? prisma.tgemInvoiceWorkflowManager.findMany({
					where: {
						organizationId: dbUser.organizationId,
						siteId: selectedProject.id,
					},
					orderBy: { createdAt: "asc" },
					select: { userId: true },
				})
			: Promise.resolve([]),
	]);
	const isSiteOwner = selectedProject?.userId === user.id;

	return {
		currentUserId: user.id,
		projects: projects.map(({ id, name }) => ({ id, name })),
		invoices: invoiceCases.map(serializeTgemDashboardInvoice),
		approvalSetup: selectedProject
			? {
					canManageWorkflow: true,
					canManageWorkflowManagers: isSiteOwner,
					ownerUserId: selectedProject.userId,
					workflowManagerUserIds: workflowManagers.map(
						(manager) => manager.userId,
					),
					users: users.map((approver) => ({
						id: approver.id,
						name: `${approver.firstName} ${approver.lastName}`.trim(),
						role: approver.role,
					})),
					template: template
						? {
								id: template.id,
								revision: template.revision,
								currency: template.currency,
								steps: template.steps.map((step) => ({
									id: step.id,
									stepOrder: step.stepOrder,
									roleKey: step.roleKey as TgemApprovalRoleKey,
									role: step.role,
									approverUserId: step.approverUserId,
									minimumInvoiceTotal: serializeDecimal(
										step.minimumInvoiceTotal,
									),
								})),
							}
						: null,
				}
			: null,
	};
}
