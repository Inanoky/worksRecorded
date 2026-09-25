"use server";

import type { Prisma } from "@prisma/client";
import {
	normalizeTgemApprovalCurrency,
	normalizeTgemApprovalTemplateSteps,
	type TgemApprovalDecision,
	type TgemApprovalRoleKey,
	type TgemApprovalTemplateStepInput,
	validateTgemApprovalDecisionComment,
} from "@/lib/tgem-invoice-approval/approval";
import type { TgemDashboardApprovalSetup } from "@/lib/tgem-invoice-approval/dashboard-types";
import { startTgemInvoiceApproval } from "@/lib/tgem-invoice-approval/start-approval";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

async function requireTgemSite(siteId: string, userId: string) {
	const site = await prisma.site.findFirst({
		where: {
			id: siteId,
			organization: {
				users: { some: { id: userId, status: "active" } },
			},
		},
		select: {
			id: true,
			name: true,
			organizationId: true,
			userId: true,
		},
	});
	if (!site?.organizationId) throw new Error("Project access denied");

	const isSiteOwner = site.userId === userId;
	return {
		siteId: site.id,
		organizationId: site.organizationId,
		projectName: site.name,
		ownerUserId: site.userId,
		canManageWorkflowManagers: isSiteOwner,
	};
}

export async function getTgemApprovalSetupData(siteId: string): Promise<{
	project: { id: string; name: string };
	setup: TgemDashboardApprovalSetup;
}> {
	const user = await requireUser();
	const context = await requireTgemSite(siteId, user.id);
	const [users, template, workflowManagers] = await Promise.all([
		prisma.user.findMany({
			where: { organizationId: context.organizationId, status: "active" },
			orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
			select: { id: true, firstName: true, lastName: true, role: true },
		}),
		prisma.tgemInvoiceApprovalTemplate.findFirst({
			where: {
				organizationId: context.organizationId,
				siteId: context.siteId,
				isCurrent: true,
			},
			orderBy: { revision: "desc" },
			include: { steps: { orderBy: { stepOrder: "asc" } } },
		}),
		prisma.tgemInvoiceWorkflowManager.findMany({
			where: {
				organizationId: context.organizationId,
				siteId: context.siteId,
			},
			orderBy: { createdAt: "asc" },
			select: { userId: true },
		}),
	]);

	return {
		project: { id: context.siteId, name: context.projectName },
		setup: {
			canManageWorkflow: true,
			canManageWorkflowManagers: context.canManageWorkflowManagers,
			ownerUserId: context.ownerUserId,
			workflowManagerUserIds: workflowManagers.map((manager) => manager.userId),
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
							minimumInvoiceTotal: step.minimumInvoiceTotal?.toString() ?? null,
						})),
					}
				: null,
		},
	};
}

export async function saveTgemApprovalTemplate(input: {
	siteId: string;
	currency?: string | null;
	steps: TgemApprovalTemplateStepInput[];
}) {
	const user = await requireUser();
	const context = await requireTgemSite(input.siteId, user.id);

	const currency = normalizeTgemApprovalCurrency(input.currency);
	const steps = normalizeTgemApprovalTemplateSteps(input.steps, {
		requireRole: true,
	});
	const approvers = await prisma.user.findMany({
		where: {
			id: { in: steps.map((step) => step.approverUserId) },
			organizationId: context.organizationId,
			status: "active",
		},
		select: { id: true },
	});
	if (approvers.length !== steps.length) {
		throw new Error("Every approver must be an active organization user");
	}

	const template = await prisma.$transaction(async (tx) => {
		const latest = await tx.tgemInvoiceApprovalTemplate.findFirst({
			where: { siteId: context.siteId },
			orderBy: { revision: "desc" },
			select: { revision: true },
		});
		await tx.tgemInvoiceApprovalTemplate.updateMany({
			where: { siteId: context.siteId, isCurrent: true },
			data: { isCurrent: false },
		});

		return tx.tgemInvoiceApprovalTemplate.create({
			data: {
				organizationId: context.organizationId,
				siteId: context.siteId,
				revision: (latest?.revision ?? 0) + 1,
				currency,
				createdByUserId: user.id,
				steps: {
					create: steps.map((step, index) => ({
						stepOrder: index + 1,
						roleKey: step.roleKey,
						role: step.roleLabel,
						approverUserId: step.approverUserId,
						minimumInvoiceTotal: step.minimumInvoiceTotal,
					})),
				},
			},
			include: { steps: { orderBy: { stepOrder: "asc" } } },
		});
	});
	return template;
}

const TGEM_REASSIGNMENT_REVIEW_STATUSES = new Set([
	"changes_requested",
	"in_approval",
	"approved",
	"rejected",
]);

export async function assignTgemInvoiceProject(input: {
	invoiceCaseId: string;
	projectId: string;
	expectedUpdatedAt: string;
}) {
	const user = await requireUser();
	const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
	if (Number.isNaN(expectedUpdatedAt.getTime())) {
		throw new Error("The invoice version is invalid");
	}

	return prisma.$transaction(async (tx) => {
		const invoiceCase = await tx.tgemInvoiceCase.findFirst({
			where: {
				id: input.invoiceCaseId,
				organization: {
					users: { some: { id: user.id, status: "active" } },
				},
			},
			select: {
				id: true,
				organizationId: true,
				siteId: true,
				status: true,
				approvalRound: true,
				updatedAt: true,
				site: { select: { id: true, name: true } },
			},
		});
		if (!invoiceCase) throw new Error("Invoice access denied");
		if (invoiceCase.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
			throw new Error("The invoice changed. Reload it and try again");
		}

		const project = await tx.site.findFirst({
			where: {
				id: input.projectId,
				organizationId: invoiceCase.organizationId,
			},
			select: { id: true, name: true },
		});
		if (!project) throw new Error("Project access denied");
		if (invoiceCase.siteId === project.id) {
			return {
				invoiceCaseId: invoiceCase.id,
				project,
				status: invoiceCase.status,
				unchanged: true,
			};
		}

		const invalidatesApproval = TGEM_REASSIGNMENT_REVIEW_STATUSES.has(
			invoiceCase.status,
		);
		const nextStatus = invalidatesApproval
			? "needs_review"
			: invoiceCase.status;
		const claimed = await tx.tgemInvoiceCase.updateMany({
			where: {
				id: invoiceCase.id,
				updatedAt: expectedUpdatedAt,
			},
			data: {
				siteId: project.id,
				status: nextStatus,
				...(invalidatesApproval ? { approvedAt: null } : {}),
			},
		});
		if (claimed.count !== 1) {
			throw new Error("The invoice changed. Reload it and try again");
		}

		if (invoiceCase.approvalRound > 0) {
			await tx.tgemInvoiceApprovalStep.updateMany({
				where: {
					invoiceCaseId: invoiceCase.id,
					approvalRound: invoiceCase.approvalRound,
					status: { in: ["current", "waiting"] },
				},
				data: { status: "cancelled" },
			});
		}

		await tx.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: invoiceCase.id,
				organizationId: invoiceCase.organizationId,
				actorUserId: user.id,
				actorType: "user",
				eventType: invoiceCase.siteId
					? "invoice_project_reassigned"
					: "invoice_project_assigned",
				fromStatus: invoiceCase.status,
				toStatus: nextStatus,
				payload: {
					oldProject: invoiceCase.site,
					newProject: project,
					previousStatus: invoiceCase.status,
					invalidatedApprovalRound: invalidatesApproval
						? invoiceCase.approvalRound
						: null,
				} satisfies Prisma.InputJsonValue,
			},
		});

		return {
			invoiceCaseId: invoiceCase.id,
			project,
			status: nextStatus,
			unchanged: false,
		};
	});
}

export async function saveTgemWorkflowManagers(input: {
	siteId: string;
	userIds: string[];
}) {
	const user = await requireUser();
	const context = await requireTgemSite(input.siteId, user.id);
	if (!context.canManageWorkflowManagers) {
		throw new Error("Only the project owner can manage TGEM workflow managers");
	}

	const userIds = Array.from(
		new Set(
			input.userIds
				.map((userId) => userId.trim())
				.filter((userId) => userId && userId !== context.ownerUserId),
		),
	);
	const managers = await prisma.user.findMany({
		where: {
			id: { in: userIds },
			organizationId: context.organizationId,
			status: "active",
		},
		select: { id: true },
	});
	if (managers.length !== userIds.length) {
		throw new Error("Workflow managers must be active organization users");
	}

	await prisma.$transaction(async (tx) => {
		await tx.tgemInvoiceWorkflowManager.deleteMany({
			where: { siteId: context.siteId },
		});
		if (userIds.length > 0) {
			await tx.tgemInvoiceWorkflowManager.createMany({
				data: userIds.map((userId) => ({
					organizationId: context.organizationId,
					siteId: context.siteId,
					userId,
					createdByUserId: user.id,
				})),
			});
		}
	});

	return { siteId: context.siteId, userIds };
}

export async function submitTgemInvoiceForApproval(input: {
	invoiceCaseId: string;
}) {
	const user = await requireUser();
	const result = await startTgemInvoiceApproval({
		invoiceCaseId: input.invoiceCaseId,
		actorUserId: user.id,
		trigger: "manual",
	});
	return {
		invoiceCaseId: result.invoiceCaseId,
		approvalRound: result.approvalRound,
	};
}

export async function markTgemInvoicePaid(input: {
	invoiceCaseId: string;
	expectedUpdatedAt: string;
}) {
	const user = await requireUser();
	const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
	if (Number.isNaN(expectedUpdatedAt.getTime())) {
		throw new Error("The invoice version is invalid");
	}

	return prisma.$transaction(async (tx) => {
		const invoiceCase = await tx.tgemInvoiceCase.findFirst({
			where: {
				id: input.invoiceCaseId,
				organization: {
					users: { some: { id: user.id, status: "active" } },
				},
			},
			select: {
				id: true,
				organizationId: true,
				status: true,
				paymentStatus: true,
				updatedAt: true,
			},
		});
		if (!invoiceCase) throw new Error("Invoice access denied");
		if (invoiceCase.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
			throw new Error("The invoice changed. Reload it and try again");
		}
		if (invoiceCase.status !== "approved") {
			throw new Error("Only an approved invoice can be marked as paid");
		}
		if (invoiceCase.paymentStatus === "paid") {
			return { invoiceCaseId: invoiceCase.id, unchanged: true };
		}

		const paidAt = new Date();
		const updated = await tx.tgemInvoiceCase.updateMany({
			where: {
				id: invoiceCase.id,
				updatedAt: expectedUpdatedAt,
				status: "approved",
				paymentStatus: "unpaid",
			},
			data: { paymentStatus: "paid", paidAt },
		});
		if (updated.count !== 1) {
			throw new Error("The invoice changed. Reload it and try again");
		}

		await tx.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: invoiceCase.id,
				organizationId: invoiceCase.organizationId,
				actorUserId: user.id,
				actorType: "user",
				eventType: "invoice_marked_paid",
				fromStatus: invoiceCase.status,
				toStatus: invoiceCase.status,
				payload: {
					previousPaymentStatus: invoiceCase.paymentStatus,
					paymentStatus: "paid",
					paidAt: paidAt.toISOString(),
				} satisfies Prisma.InputJsonValue,
			},
		});

		return {
			invoiceCaseId: invoiceCase.id,
			paidAt: paidAt.toISOString(),
			unchanged: false,
		};
	});
}

export async function decideTgemInvoiceApproval(input: {
	invoiceCaseId: string;
	decision: TgemApprovalDecision;
	comment?: string | null;
}) {
	const user = await requireUser();
	const comment = validateTgemApprovalDecisionComment(
		input.decision,
		input.comment,
	);

	return prisma.$transaction(async (tx) => {
		const invoiceCase = await tx.tgemInvoiceCase.findFirst({
			where: {
				id: input.invoiceCaseId,
				status: "in_approval",
				organization: {
					users: { some: { id: user.id, status: "active" } },
				},
			},
			select: {
				id: true,
				organizationId: true,
				approvalRound: true,
			},
		});
		if (!invoiceCase) throw new Error("Invoice approval is not available");

		const currentStep = await tx.tgemInvoiceApprovalStep.findFirst({
			where: {
				invoiceCaseId: invoiceCase.id,
				approvalRound: invoiceCase.approvalRound,
				status: "current",
				approverUserId: user.id,
			},
			orderBy: { stepOrder: "asc" },
		});
		if (!currentStep) {
			throw new Error("Only the current approver can make this decision");
		}

		const decidedAt = new Date();
		const stepStatus =
			input.decision === "approve"
				? "approved"
				: input.decision === "reject"
					? "rejected"
					: "changes_requested";
		const claimed = await tx.tgemInvoiceApprovalStep.updateMany({
			where: {
				id: currentStep.id,
				status: "current",
				approverUserId: user.id,
			},
			data: { status: stepStatus, comment, decidedAt },
		});
		if (claimed.count !== 1) {
			throw new Error("This approval step has already been decided");
		}

		let resultingInvoiceStatus = "in_approval";
		if (input.decision === "approve") {
			const nextStep = await tx.tgemInvoiceApprovalStep.findFirst({
				where: {
					invoiceCaseId: invoiceCase.id,
					approvalRound: invoiceCase.approvalRound,
					status: "waiting",
					stepOrder: { gt: currentStep.stepOrder },
				},
				orderBy: { stepOrder: "asc" },
			});
			if (nextStep) {
				await tx.tgemInvoiceApprovalStep.update({
					where: { id: nextStep.id },
					data: { status: "current" },
				});
			} else {
				resultingInvoiceStatus = "approved";
				await tx.tgemInvoiceCase.update({
					where: { id: invoiceCase.id },
					data: { status: "approved", approvedAt: decidedAt },
				});
			}
		} else {
			const nextStatus =
				input.decision === "reject" ? "rejected" : "changes_requested";
			resultingInvoiceStatus = nextStatus;
			await tx.tgemInvoiceApprovalStep.updateMany({
				where: {
					invoiceCaseId: invoiceCase.id,
					approvalRound: invoiceCase.approvalRound,
					status: "waiting",
					stepOrder: { gt: currentStep.stepOrder },
				},
				data: { status: "cancelled" },
			});
			await tx.tgemInvoiceCase.update({
				where: { id: invoiceCase.id },
				data: { status: nextStatus },
			});
		}

		const eventSuffix =
			input.decision === "approve"
				? "approval_step_approved"
				: input.decision === "reject"
					? "rejected"
					: "changes_requested";
		await tx.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: invoiceCase.id,
				organizationId: invoiceCase.organizationId,
				actorUserId: user.id,
				actorType: "user",
				eventType: `invoice_${eventSuffix}`,
				fromStatus: "in_approval",
				toStatus: resultingInvoiceStatus,
				payload: {
					approvalRound: invoiceCase.approvalRound,
					stepOrder: currentStep.stepOrder,
					comment,
				} satisfies Prisma.InputJsonValue,
			},
		});

		return { invoiceCaseId: invoiceCase.id, decision: input.decision };
	});
}
