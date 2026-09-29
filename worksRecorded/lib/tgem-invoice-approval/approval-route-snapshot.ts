import {
	TGEM_APPROVAL_ROLE_KEYS,
	type TgemApprovalRoleKey,
} from "@/lib/tgem-invoice-approval/approval";

export type TgemApprovalRouteSnapshot = {
	version: 1;
	source: "submitter" | "project" | "legacy_round";
	templateSiteId: string | null;
	flowId: string | null;
	flowName: string | null;
	templateRevision: number | null;
	currency: string;
	steps: Array<{
		stepOrder: number;
		roleKey: TgemApprovalRoleKey;
		role: string | null;
		approverUserId: string;
		approverName: string;
		minimumInvoiceTotal: string | null;
	}>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseTgemApprovalRouteSnapshot(
	value: unknown,
): TgemApprovalRouteSnapshot | null {
	if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.steps)) {
		return null;
	}
	if (
		value.source !== "submitter" &&
		value.source !== "project" &&
		value.source !== "legacy_round"
	) {
		return null;
	}
	const steps = value.steps.flatMap((candidate) => {
		if (!isRecord(candidate)) return [];
		if (
			typeof candidate.stepOrder !== "number" ||
			typeof candidate.approverUserId !== "string" ||
			typeof candidate.approverName !== "string" ||
			typeof candidate.roleKey !== "string" ||
			!TGEM_APPROVAL_ROLE_KEYS.includes(
				candidate.roleKey as TgemApprovalRoleKey,
			)
		) {
			return [];
		}
		return [
			{
				stepOrder: candidate.stepOrder,
				roleKey: candidate.roleKey as TgemApprovalRoleKey,
				role: typeof candidate.role === "string" ? candidate.role : null,
				approverUserId: candidate.approverUserId,
				approverName: candidate.approverName,
				minimumInvoiceTotal:
					typeof candidate.minimumInvoiceTotal === "string"
						? candidate.minimumInvoiceTotal
						: null,
			},
		];
	});
	if (steps.length !== value.steps.length || steps.length === 0) return null;

	return {
		version: 1,
		source: value.source,
		templateSiteId:
			typeof value.templateSiteId === "string" ? value.templateSiteId : null,
		flowId: typeof value.flowId === "string" ? value.flowId : null,
		flowName: typeof value.flowName === "string" ? value.flowName : null,
		templateRevision:
			typeof value.templateRevision === "number"
				? value.templateRevision
				: null,
		currency: typeof value.currency === "string" ? value.currency : "EUR",
		steps: steps.sort((left, right) => left.stepOrder - right.stepOrder),
	};
}

export function buildTgemApprovalRouteSnapshot(input: {
	source: TgemApprovalRouteSnapshot["source"];
	templateSiteId: string | null;
	flowId?: string | null;
	flowName?: string | null;
	templateRevision: number | null;
	currency: string;
	steps: Array<{
		stepOrder: number;
		roleKey: string;
		role: string | null;
		approverUserId: string | null;
		approverName: string | null;
		minimumInvoiceTotal: { toString(): string } | string | null;
	}>;
}): TgemApprovalRouteSnapshot {
	const steps = input.steps.map((step) => {
		if (
			!step.approverUserId ||
			!TGEM_APPROVAL_ROLE_KEYS.includes(step.roleKey as TgemApprovalRoleKey)
		) {
			throw new Error("The approval flow contains an invalid approver step");
		}
		return {
			stepOrder: step.stepOrder,
			roleKey: step.roleKey as TgemApprovalRoleKey,
			role: step.role,
			approverUserId: step.approverUserId,
			approverName: step.approverName?.trim() || step.approverUserId,
			minimumInvoiceTotal: step.minimumInvoiceTotal?.toString() ?? null,
		};
	});
	if (steps.length === 0) throw new Error("The approval flow has no steps");

	return {
		version: 1,
		source: input.source,
		templateSiteId: input.templateSiteId,
		flowId: input.flowId ?? null,
		flowName: input.flowName ?? null,
		templateRevision: input.templateRevision,
		currency: input.currency,
		steps: steps.sort((left, right) => left.stepOrder - right.stepOrder),
	};
}
