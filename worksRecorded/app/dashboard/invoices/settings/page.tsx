import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TgemAccessGroupSettings } from "@/flows/tgem-invoice-approval/frontend/TgemAccessGroupSettings";
import { TgemCostCodeSettings } from "@/flows/tgem-invoice-approval/frontend/TgemCostCodeSettings";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
import {
	canTgem,
	loadTgemAccessScope,
} from "@/lib/tgem-invoice-approval/access";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { getTgemSiteAccessData } from "@/server/actions/tgem-access-actions";
import { getTgemCostCodes } from "@/server/actions/tgem-cost-code-actions";
import {
	getTgemApprovalSetupData,
	getTgemSubmitterApprovalFlowSettings,
} from "@/server/actions/tgem-invoice-approval-actions";

function firstValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function TgemInvoiceSettingsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const user = await requireUser();
	const [dbUser, rawSearchParams, requestHeaders] = await Promise.all([
		prisma.user.findFirst({
			where: { id: user.id, status: "active" },
			select: {
				organizationId: true,
				organization: { select: { orgLanguage: true } },
			},
		}),
		searchParams,
		headers(),
	]);
	if (!dbUser?.organizationId) notFound();
	const isPlatformAdmin = canAccessFlowConfigAdmin(
		user.id,
		requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
	);
	const access = await loadTgemAccessScope(prisma, {
		userId: user.id,
		organizationId: dbUser.organizationId,
	});
	if (!access) notFound();

	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: dbUser.organizationId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) notFound();

	const projectFilter = firstValue(rawSearchParams.project);
	const selectedProjectId =
		projectFilter && projectFilter !== "unassigned" ? projectFilter : null;
	let selectedProject: {
		id: string;
		name: string;
		userId: string | null;
	} | null = null;
	let canViewSelectedProject = false;
	let ownsSelectedProject = false;
	if (selectedProjectId) {
		selectedProject = await prisma.site.findFirst({
			where: {
				id: selectedProjectId,
				organizationId: dbUser.organizationId,
			},
			select: { id: true, name: true, userId: true },
		});
		if (!selectedProject) notFound();
		canViewSelectedProject = canTgem(
			access,
			selectedProject.id,
			"invoice.view",
		);
		ownsSelectedProject = selectedProject.userId === user.id;
		if (!canViewSelectedProject && !ownsSelectedProject && !isPlatformAdmin)
			notFound();
	}
	const [costCodes, approvalData, submitterFlowSettings, siteAccess] =
		await Promise.all([
			getTgemCostCodes({ includeArchived: true }),
			selectedProjectId && canViewSelectedProject
				? getTgemApprovalSetupData(selectedProjectId)
				: Promise.resolve(null),
			getTgemSubmitterApprovalFlowSettings(),
			selectedProjectId && (ownsSelectedProject || isPlatformAdmin)
				? getTgemSiteAccessData(selectedProjectId)
				: Promise.resolve(null),
		]);

	return (
		<TgemCostCodeSettings
			initialCostCodes={costCodes}
			organizationLanguage={dbUser.organization?.orgLanguage}
			selectedProject={approvalData?.project ?? null}
			deletableProject={
				selectedProject && (ownsSelectedProject || isPlatformAdmin)
					? { id: selectedProject.id, name: selectedProject.name }
					: null
			}
			approvalSetup={approvalData?.setup ?? null}
			submitterFlowSettings={submitterFlowSettings}
		>
			{siteAccess?.organizationId && siteAccess.organization ? (
				<div className="mt-6">
					<TgemAccessGroupSettings
						organizationId={siteAccess.organizationId}
						siteId={siteAccess.id}
						canEditGroups={isPlatformAdmin}
						groups={siteAccess.organization.tgemAccessGroups.map((group) => ({
							id: group.id,
							name: group.name,
							permissions: group.permissions,
							memberUserIds: group.siteMemberships.map(
								(membership) => membership.userId,
							),
							organizationMemberUserIds: group.organizationMemberships.map(
								(membership) => membership.userId,
							),
						}))}
						users={siteAccess.organization.users.map((member) => ({
							id: member.id,
							name: `${member.firstName} ${member.lastName}`.trim(),
							email: member.email,
						}))}
					/>
				</div>
			) : null}
		</TgemCostCodeSettings>
	);
}
