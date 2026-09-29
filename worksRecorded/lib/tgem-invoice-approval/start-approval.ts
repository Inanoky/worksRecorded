import type { Prisma } from "@prisma/client";
import {
	normalizeTgemApprovalTemplateSteps,
	type TgemApprovalRoleKey,
	validateTgemInvoiceApprovalParticipants,
} from "@/lib/tgem-invoice-approval/approval";
import {
	buildTgemApprovalRouteSnapshot,
	parseTgemApprovalRouteSnapshot,
	type TgemApprovalRouteSnapshot,
} from "@/lib/tgem-invoice-approval/approval-route-snapshot";
import { prisma } from "@/lib/utils/db";

async function loadSnapshot(input: {
	tx: Prisma.TransactionClient;
	invoiceCase: {
		id: string;
		organizationId: string;
		siteId: string;
		submittedByUserId: string | null;
		approvalRound: number;
		approvalRouteSnapshot: Prisma.JsonValue | null;
	};
}) {
	const stored = parseTgemApprovalRouteSnapshot(
		input.invoiceCase.approvalRouteSnapshot,
	);
	if (stored) return stored;

	if (
		input.invoiceCase.approvalRouteSnapshot == null &&
		input.invoiceCase.approvalRound > 0
	) {
		const previousSteps = await input.tx.tgemInvoiceApprovalStep.findMany({
			where: {
				invoiceCaseId: input.invoiceCase.id,
				approvalRound: input.invoiceCase.approvalRound,
			},
			orderBy: { stepOrder: "asc" },
		});
		if (previousSteps.length > 0) {
			return buildTgemApprovalRouteSnapshot({
				source: "legacy_round",
				templateSiteId: input.invoiceCase.siteId,
				templateRevision: previousSteps[0].templateRevision,
				currency: previousSteps[0].thresholdCurrency ?? "EUR",
				steps: previousSteps,
			});
		}
	}

	const assignment = input.invoiceCase.submittedByUserId
		? await input.tx.tgemInvoiceSubmitterApprovalFlow.findFirst({
				where: {
					organizationId: input.invoiceCase.organizationId,
					userId: input.invoiceCase.submittedByUserId,
				},
				include: {
					flow: {
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
					},
				},
			})
		: null;
	if (assignment) {
		if (!assignment.flow.steps.length) {
			throw new Error("Configure the approval flow before submitting");
		}
		if (
			assignment.flow.organizationId !== input.invoiceCase.organizationId ||
			assignment.flow.steps.some(
				(step) =>
					step.approver.status !== "active" ||
					step.approver.organizationId !== input.invoiceCase.organizationId,
			)
		) {
			throw new Error("The approval flow contains an unavailable user");
		}
		return buildTgemApprovalRouteSnapshot({
			source: "submitter",
			templateSiteId: null,
			flowId: assignment.flow.id,
			flowName: assignment.flow.name,
			templateRevision: null,
			currency: assignment.flow.currency,
			steps: assignment.flow.steps.map((step, index) => ({
				stepOrder: index + 1,
				roleKey: step.roleKey,
				role: step.role,
				approverUserId: step.approverUserId,
				approverName:
					`${step.approver.firstName} ${step.approver.lastName}`.trim(),
				minimumInvoiceTotal: step.minimumInvoiceTotal,
			})),
		});
	}

	const templateSiteId = input.invoiceCase.siteId;
	const template = await input.tx.tgemInvoiceApprovalTemplate.findFirst({
		where: {
			organizationId: input.invoiceCase.organizationId,
			siteId: templateSiteId,
			isCurrent: true,
		},
		orderBy: { revision: "desc" },
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
		throw new Error("Configure the approval flow before submitting");
	}
	if (
		template.steps.some(
			(step) =>
				step.approver.status !== "active" ||
				step.approver.organizationId !== input.invoiceCase.organizationId,
		)
	) {
		throw new Error("The approval flow contains an unavailable user");
	}

	return buildTgemApprovalRouteSnapshot({
		source: "project",
		templateSiteId,
		templateRevision: template.revision,
		currency: template.currency,
		steps: template.steps.map((step, index) => ({
			stepOrder: index + 1,
			roleKey: step.roleKey,
			role: step.role,
			approverUserId: step.approverUserId,
			approverName:
				`${step.approver.firstName} ${step.approver.lastName}`.trim(),
			minimumInvoiceTotal: step.minimumInvoiceTotal,
		})),
	});
}

async function validateSnapshotUsers(
	tx: Prisma.TransactionClient,
	organizationId: string,
	snapshot: TgemApprovalRouteSnapshot,
) {
	const userIds = snapshot.steps.map((step) => step.approverUserId);
	const activeUsers = await tx.user.findMany({
		where: {
			id: { in: userIds },
			organizationId,
			status: "active",
		},
		select: { id: true },
	});
	if (activeUsers.length !== new Set(userIds).size) {
		throw new Error(
			"The saved approval flow contains an unavailable user. Update the flow, reset this invoice, and submit it again.",
		);
	}
}

export async function startTgemInvoiceApproval(input: {
	invoiceCaseId: string;
	actorUserId: string | null;
	trigger: "automatic" | "manual";
}) {
	if (input.trigger === "manual" && !input.actorUserId) {
		throw new Error("Manual approval requires an active user");
	}

	return prisma.$transaction(async (tx) => {
		const invoiceCase = await tx.tgemInvoiceCase.findFirst({
			where: {
				id: input.invoiceCaseId,
				archivedAt: null,
				status: { in: ["needs_review", "changes_requested"] },
				...(input.actorUserId
					? {
							organization: {
								users: {
									some: { id: input.actorUserId, status: "active" },
								},
							},
						}
					: {}),
			},
			select: {
				id: true,
				organizationId: true,
				siteId: true,
				submittedByUserId: true,
				status: true,
				approvalRound: true,
				approvalRouteSnapshot: true,
			},
		});
		if (!invoiceCase?.siteId) {
			throw new Error("Invoice is not ready for approval");
		}

		const snapshot = await loadSnapshot({
			tx,
			invoiceCase: { ...invoiceCase, siteId: invoiceCase.siteId },
		});
		await validateSnapshotUsers(tx, invoiceCase.organizationId, snapshot);
		const normalizedSteps = normalizeTgemApprovalTemplateSteps(
			snapshot.steps.map((step) => ({
				approverUserId: step.approverUserId,
				roleKey: step.roleKey as TgemApprovalRoleKey,
				roleLabel: step.role,
				minimumInvoiceTotal: step.minimumInvoiceTotal,
			})),
		);
		const routeSteps = normalizedSteps.map((step, index) => ({
			...step,
			approverName: snapshot.steps[index].approverName,
			applicable: true,
		}));
		validateTgemInvoiceApprovalParticipants({ steps: routeSteps });

		const approvalRound = invoiceCase.approvalRound + 1;
		const claimed = await tx.tgemInvoiceCase.updateMany({
			where: {
				id: invoiceCase.id,
				archivedAt: null,
				siteId: invoiceCase.siteId,
				status: invoiceCase.status,
				approvalRound: invoiceCase.approvalRound,
			},
			data: {
				status: "in_approval",
				approvalRound,
				approvedAt: null,
				approvalRouteSnapshot: snapshot as Prisma.InputJsonValue,
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
				approverUserId: step.approverUserId,
				approverName: step.approverName,
				templateRevision: snapshot.templateRevision,
				minimumInvoiceTotal: step.minimumInvoiceTotal,
				thresholdCurrency: step.minimumInvoiceTotal ? snapshot.currency : null,
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
					templateSiteId: snapshot.templateSiteId,
					flowId: snapshot.flowId,
					flowName: snapshot.flowName,
					templateRevision: snapshot.templateRevision,
					assignmentSource: snapshot.source,
					workflowCurrency: snapshot.currency,
					approvalRoute: snapshot.steps,
					currentApproverUserId: routeSteps[0].approverUserId,
					finalApproverUserId: routeSteps[routeSteps.length - 1].approverUserId,
				} satisfies Prisma.InputJsonValue,
			},
		});

		return {
			invoiceCaseId: invoiceCase.id,
			approvalRound,
			currentApproverUserId: routeSteps[0].approverUserId,
			finalApproverUserId: routeSteps[routeSteps.length - 1].approverUserId,
		};
	});
}
