import { notFound } from "next/navigation";
import { TgemCostCodeSettings } from "@/flows/tgem-invoice-approval/frontend/TgemCostCodeSettings";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { getTgemCostCodes } from "@/server/actions/tgem-cost-code-actions";
import { getTgemApprovalSetupData } from "@/server/actions/tgem-invoice-approval-actions";

function firstValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function TgemInvoiceSettingsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const user = await requireUser();
	const [dbUser, rawSearchParams] = await Promise.all([
		prisma.user.findFirst({
			where: { id: user.id, status: "active" },
			select: {
				organizationId: true,
				organization: { select: { orgLanguage: true } },
			},
		}),
		searchParams,
	]);
	if (!dbUser?.organizationId) notFound();

	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: dbUser.organizationId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) notFound();

	const projectFilter = firstValue(rawSearchParams.project);
	const selectedProjectId =
		projectFilter && projectFilter !== "unassigned" ? projectFilter : null;
	if (selectedProjectId) {
		const selectedProject = await prisma.site.findFirst({
			where: {
				id: selectedProjectId,
				organizationId: dbUser.organizationId,
			},
			select: { id: true },
		});
		if (!selectedProject) notFound();
	}
	const [costCodes, approvalData] = await Promise.all([
		getTgemCostCodes({ includeArchived: true }),
		selectedProjectId
			? getTgemApprovalSetupData(selectedProjectId)
			: Promise.resolve(null),
	]);

	return (
		<TgemCostCodeSettings
			initialCostCodes={costCodes}
			organizationLanguage={dbUser.organization?.orgLanguage}
			selectedProject={approvalData?.project ?? null}
			approvalSetup={approvalData?.setup ?? null}
		/>
	);
}
