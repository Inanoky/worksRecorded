export const TGEM_APPROVAL_DECISIONS = [
	"approve",
	"request_changes",
	"reject",
] as const;

export const TGEM_APPROVAL_ROLE_KEYS = [
	"project_review",
	"financial_review",
	"budget_approval",
	"senior_approval",
] as const;

export const TGEM_APPROVAL_WORKFLOW_CURRENCY = "EUR" as const;

export const TGEM_APPROVAL_ROLE_LABELS = [
	"Valdes loceklis",
	"Finanšu direktors",
	"Grāmatvedis",
	"Projekta vadītājs",
	"Darba vadītājs",
] as const;

export function isTgemApprovalRoleLabel(value: unknown) {
	return TGEM_APPROVAL_ROLE_LABELS.some((role) => role === value);
}

export type TgemApprovalDecision = (typeof TGEM_APPROVAL_DECISIONS)[number];
export type TgemApprovalRoleKey = (typeof TGEM_APPROVAL_ROLE_KEYS)[number];

export type TgemApprovalTemplateStepInput = {
	approverUserId: string;
	roleKey: TgemApprovalRoleKey;
	roleLabel?: string | null;
	minimumInvoiceTotal?: string | number | null;
};

export type NormalizedTgemApprovalTemplateStep = {
	approverUserId: string;
	roleKey: TgemApprovalRoleKey;
	roleLabel: string | null;
	minimumInvoiceTotal: string | null;
};

function normalizeMoney(value: string | number) {
	const raw = String(value).trim().replace(",", ".");
	const match = /^(\d{1,12})(?:\.(\d+))?$/.exec(raw);
	if (!match) {
		throw new Error(
			"Approval threshold must be a positive amount with up to 2 decimals",
		);
	}
	if (match[2]?.slice(2).match(/[1-9]/)) {
		throw new Error(
			"Approval threshold must be a positive amount with up to 2 decimals",
		);
	}

	const whole = match[1].replace(/^0+(?=\d)/, "");
	const fraction = (match[2] ?? "").slice(0, 2).padEnd(2, "0");
	if (BigInt(`${whole}${fraction}`) === BigInt(0)) {
		throw new Error("Approval threshold must be greater than zero");
	}

	return `${whole}.${fraction}`;
}

function toMinorUnits(value: string | number) {
	const normalized = normalizeMoney(value);
	return BigInt(normalized.replace(".", ""));
}

export function normalizeTgemApprovalCurrency(value?: string | null) {
	const currency =
		value?.trim().toUpperCase() || TGEM_APPROVAL_WORKFLOW_CURRENCY;
	if (currency !== TGEM_APPROVAL_WORKFLOW_CURRENCY) {
		throw new Error("TGEM approval thresholds currently support EUR only");
	}
	return currency;
}

export function normalizeTgemApprovalTemplateSteps(
	steps: TgemApprovalTemplateStepInput[],
	options: { requireRole?: boolean } = {},
): NormalizedTgemApprovalTemplateStep[] {
	if (steps.length < 1 || steps.length > 10) {
		throw new Error("Approval flow requires between 1 and 10 approvers");
	}

	const normalized = steps.map((step) => {
		if (!TGEM_APPROVAL_ROLE_KEYS.includes(step.roleKey)) {
			throw new Error("Every approval step requires a supported workflow role");
		}
		const roleLabel = step.roleLabel?.trim() || null;
		if (options.requireRole && !isTgemApprovalRoleLabel(roleLabel)) {
			throw new Error(
				"Katram apstiprināšanas solim jāizvēlas loma no saraksta",
			);
		}
		if (roleLabel && roleLabel.length > 80) {
			throw new Error("Approval role label must be 80 characters or shorter");
		}

		return {
			approverUserId: step.approverUserId.trim(),
			roleKey: step.roleKey,
			roleLabel,
			minimumInvoiceTotal:
				step.minimumInvoiceTotal == null || step.minimumInvoiceTotal === ""
					? null
					: normalizeMoney(step.minimumInvoiceTotal),
		};
	});

	if (normalized.some((step) => !step.approverUserId)) {
		throw new Error("Every approval step requires an active organization user");
	}

	const uniqueApprovers = new Set(
		normalized.map((step) => step.approverUserId),
	);
	if (uniqueApprovers.size !== normalized.length) {
		throw new Error("An approver can appear only once in the approval flow");
	}

	return normalized;
}

export function isTgemApprovalStepApplicable(input: {
	minimumInvoiceTotal: string | number | null;
	workflowCurrency: string;
	invoiceTotal: string | number | null;
	invoiceCurrency: string | null;
}) {
	if (input.minimumInvoiceTotal == null) return true;
	if (
		!input.invoiceCurrency ||
		input.invoiceCurrency.toUpperCase() !== input.workflowCurrency.toUpperCase()
	) {
		return true;
	}
	if (input.invoiceTotal == null) return true;

	try {
		return (
			toMinorUnits(input.invoiceTotal) >=
			toMinorUnits(input.minimumInvoiceTotal)
		);
	} catch {
		return true;
	}
}

export function validateTgemInvoiceApprovalParticipants(input: {
	steps: Array<{
		approverUserId: string;
		applicable: boolean;
	}>;
}) {
	const applicableSteps = input.steps.filter((step) => step.applicable);
	if (applicableSteps.length === 0) {
		throw new Error(
			"Approval flow has no applicable approver for this invoice",
		);
	}
	return applicableSteps;
}

export function validateTgemApprovalDecisionComment(
	decision: TgemApprovalDecision,
	comment?: string | null,
) {
	const normalizedComment = comment?.trim() || null;
	if (decision !== "approve" && !normalizedComment) {
		throw new Error("A comment is required for this decision");
	}
	return normalizedComment;
}
