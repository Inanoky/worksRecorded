"use server";

import type { Prisma } from "@prisma/client";
import {
	isTgemApprovalStepApplicable,
	normalizeTgemApprovalCurrency,
	normalizeTgemApprovalTemplateSteps,
	type TgemApprovalDecision,
	type TgemApprovalRoleKey,
	type TgemApprovalTemplateStepInput,
	validateTgemApprovalDecisionComment,
	validateTgemInvoiceApprovalParticipants,
} from "@/lib/tgem-invoice-approval/approval";
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
			organizationId: true,
			userId: true,
			tgemInvoiceWorkflowManagers: {
				where: { userId },
				select: { id: true },
			},
		},
	});
	if (!site?.organizationId) throw new Error("Project access denied");

	const isSiteOwner = site.userId === userId;
	return {
		siteId: site.id,
		organizationId: site.organizationId,
		ownerUserId: site.userId,
		canManageWorkflow:
			isSiteOwner || site.tgemInvoiceWorkflowManagers.length > 0,
		canManageWorkflowManagers: isSiteOwner,
	};
}

export async function saveTgemApprovalTemplate(input: {
	siteId: string;
	currency?: string | null;
	steps: TgemApprovalTemplateStepInput[];
}) {
	const user = await requireUser();
	const context = await requireTgemSite(input.siteId, user.id);
	if (!context.canManageWorkflow) {
		throw new Error(
			"Only a TGEM workflow manager can change the approval flow",
		);
	}

	const currency = normalizeTgemApprovalCurrency(input.currency);
	const steps = normalizeTgemApprovalTemplateSteps(input.steps);
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

	return prisma.$transaction(async (tx) => {
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
	const invoiceCase = await prisma.tgemInvoiceCase.findFirst({
		where: {
			id: input.invoiceCaseId,
			status: { in: ["needs_review", "changes_requested"] },
			organization: {
				users: { some: { id: user.id, status: "active" } },
			},
		},
		select: {
			id: true,
			organizationId: true,
			siteId: true,
			submittedByUserId: true,
			status: true,
			approvalRound: true,
			total: true,
			currency: true,
		},
	});
	if (!invoiceCase?.siteId) {
		throw new Error("Invoice is not ready for approval");
	}

	const template = await prisma.tgemInvoiceApprovalTemplate.findFirst({
		where: {
			organizationId: invoiceCase.organizationId,
			siteId: invoiceCase.siteId,
			isCurrent: true,
		},
		include: {
			steps: {
				orderBy: { stepOrder: "asc" },
				include: {
					approver: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							status: true,
							organizationId: true,
						},
					},
				},
			},
		},
	});
	if (!template?.steps.length) {
		throw new Error("Configure the project approval flow before submitting");
	}
	if (
		template.steps.some(
			(step) =>
				step.approver.status !== "active" ||
				step.approver.organizationId !== invoiceCase.organizationId,
		)
	) {
		throw new Error("The approval flow contains an unavailable user");
	}

	const currency = normalizeTgemApprovalCurrency(template.currency);
	const normalizedSteps = normalizeTgemApprovalTemplateSteps(
		template.steps.map((step) => ({
			approverUserId: step.approverUserId,
			roleKey: step.roleKey as TgemApprovalRoleKey,
			roleLabel: step.role,
			minimumInvoiceTotal: step.minimumInvoiceTotal?.toString() ?? null,
		})),
	);
	const evaluatedSteps = normalizedSteps.map((step, index) => ({
		...step,
		approver: template.steps[index].approver,
		applicable: isTgemApprovalStepApplicable({
			minimumInvoiceTotal: step.minimumInvoiceTotal,
			workflowCurrency: currency,
			invoiceTotal: invoiceCase.total?.toString() ?? null,
			invoiceCurrency: invoiceCase.currency,
		}),
	}));
	validateTgemInvoiceApprovalParticipants({
		submittedByUserId: invoiceCase.submittedByUserId,
		steps: evaluatedSteps,
	});

	const firstApplicableIndex = evaluatedSteps.findIndex(
		(step) => step.applicable,
	);
	const approvalRound = invoiceCase.approvalRound + 1;
	await prisma.$transaction(async (tx) => {
		await tx.tgemInvoiceApprovalStep.createMany({
			data: evaluatedSteps.map((step, index) => ({
				invoiceCaseId: invoiceCase.id,
				approvalRound,
				stepOrder: index + 1,
				roleKey: step.roleKey,
				role: step.roleLabel,
				approverUserId: step.approver.id,
				approverName:
					`${step.approver.firstName} ${step.approver.lastName}`.trim(),
				templateRevision: template.revision,
				minimumInvoiceTotal: step.minimumInvoiceTotal,
				thresholdCurrency: step.minimumInvoiceTotal ? currency : null,
				status: !step.applicable
					? "skipped"
					: index === firstApplicableIndex
						? "current"
						: "waiting",
			})),
		});
		await tx.tgemInvoiceCase.update({
			where: { id: invoiceCase.id },
			data: {
				status: "in_approval",
				approvalRound,
				approvedAt: null,
			},
		});
		await tx.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: invoiceCase.id,
				organizationId: invoiceCase.organizationId,
				actorUserId: user.id,
				actorType: "user",
				eventType: "invoice_submitted_for_approval",
				fromStatus: invoiceCase.status,
				toStatus: "in_approval",
				payload: {
					approvalRound,
					templateRevision: template.revision,
					workflowCurrency: currency,
					skippedStepOrders: evaluatedSteps.flatMap((step, index) =>
						step.applicable ? [] : [index + 1],
					),
				} satisfies Prisma.InputJsonValue,
			},
		});
	});

	return { invoiceCaseId: invoiceCase.id, approvalRound };
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
				submittedByUserId: true,
				approvalRound: true,
			},
		});
		if (!invoiceCase) throw new Error("Invoice approval is not available");
		if (invoiceCase.submittedByUserId === user.id) {
			throw new Error("The invoice submitter cannot approve the same invoice");
		}

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
