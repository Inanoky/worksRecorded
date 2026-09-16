import type { Prisma } from "@prisma/client";
import {
	normalizeTgemApprovalCurrency,
	normalizeTgemApprovalTemplateSteps,
	type TgemApprovalRoleKey,
	validateTgemInvoiceApprovalParticipants,
} from "@/lib/tgem-invoice-approval/approval";
import { prisma } from "@/lib/utils/db";

export async function startTgemInvoiceApproval(input: {
	invoiceCaseId: string;
	actorUserId: string;
	trigger: "automatic" | "manual";
}) {
	const invoiceCase = await prisma.tgemInvoiceCase.findFirst({
		where: {
			id: input.invoiceCaseId,
			status: { in: ["needs_review", "changes_requested"] },
			organization: {
				users: { some: { id: input.actorUserId, status: "active" } },
			},
		},
		select: {
			id: true,
			organizationId: true,
			siteId: true,
			status: true,
			approvalRound: true,
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
	const routeSteps = normalizedSteps.map((step, index) => ({
		...step,
		approver: template.steps[index].approver,
		applicable: true,
	}));
	validateTgemInvoiceApprovalParticipants({ steps: routeSteps });

	const approvalRound = invoiceCase.approvalRound + 1;
	await prisma.$transaction(async (tx) => {
		const claimed = await tx.tgemInvoiceCase.updateMany({
			where: {
				id: invoiceCase.id,
				siteId: invoiceCase.siteId,
				status: invoiceCase.status,
				approvalRound: invoiceCase.approvalRound,
			},
			data: {
				status: "in_approval",
				approvalRound,
				approvedAt: null,
			},
		});
		if (claimed.count !== 1) {
			throw new Error(
				"The invoice project or approval status changed. Reload and try again",
			);
		}
		await tx.tgemInvoiceApprovalStep.createMany({
			data: routeSteps.map((step, index) => ({
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
				status: index === 0 ? "current" : "waiting",
			})),
		});
		await tx.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: invoiceCase.id,
				organizationId: invoiceCase.organizationId,
				actorUserId: input.actorUserId,
				actorType: input.trigger === "automatic" ? "system" : "user",
				eventType:
					input.trigger === "automatic"
						? "invoice_approval_auto_started"
						: "invoice_submitted_for_approval",
				fromStatus: invoiceCase.status,
				toStatus: "in_approval",
				payload: {
					trigger: input.trigger,
					projectId: invoiceCase.siteId,
					approvalRound,
					templateRevision: template.revision,
					workflowCurrency: currency,
					approvalRoute: routeSteps.map((step, index) => ({
						stepOrder: index + 1,
						approverUserId: step.approver.id,
						approverName:
							`${step.approver.firstName} ${step.approver.lastName}`.trim(),
						roleKey: step.roleKey,
						role: step.roleLabel,
						minimumInvoiceTotal: step.minimumInvoiceTotal,
					})),
					currentApproverUserId: routeSteps[0].approver.id,
					finalApproverUserId: routeSteps[routeSteps.length - 1].approver.id,
				} satisfies Prisma.InputJsonValue,
			},
		});
	});

	return {
		invoiceCaseId: invoiceCase.id,
		approvalRound,
		currentApproverUserId: routeSteps[0].approver.id,
		finalApproverUserId: routeSteps[routeSteps.length - 1].approver.id,
	};
}
