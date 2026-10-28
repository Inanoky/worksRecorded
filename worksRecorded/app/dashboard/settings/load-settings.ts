"use server";

import { redirect } from "next/navigation";
import { TGEM_ORGANIZATION_ID } from "@/lib/client-flows/constants";
import { getFlowModuleUi } from "@/lib/flows/registry";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { requireUser } from "@/lib/utils/requireUser";
import {
	getOrganizationMaterialConfigurationTemplateOptions,
	getOrganizationMaterialConfigurationTemplates,
} from "@/server/actions/material-configuration-template-actions";
import {
	getOrganizationWorkers,
	getUserData,
	getWhatsappReminderLogs,
} from "@/server/actions/settings-actions";
import {
	getOrganizationIdByUserId,
	getOrganizationLanguageByUserId,
} from "@/server/actions/shared-actions";

export async function loadOrganizationSettings() {
	const user = await requireUser();
	const orgId = await getOrganizationIdByUserId(user.id);
	if (!orgId) redirect("/dashboard");

	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: orgId,
	});
	const flowUi = getFlowModuleUi(flowModuleKey);
	const isTgemOrganization = orgId === TGEM_ORGANIZATION_ID;
	const hideOrganizationMaterialSettings =
		isTgemOrganization || Boolean(flowUi.hideOrganizationMaterialSettings);
	const hideMemberReminderSettings =
		isTgemOrganization || Boolean(flowUi.hideMemberReminderSettings);
	const [
		userData,
		workersData,
		reminderLogs,
		materialConfigurationTemplates,
		materialConfigurationTemplateOptions,
		currentLanguage,
	] = await Promise.all([
		getUserData(orgId),
		isTgemOrganization ? null : getOrganizationWorkers(orgId),
		hideMemberReminderSettings
			? []
			: getWhatsappReminderLogs(orgId, { take: 50 }),
		hideOrganizationMaterialSettings
			? []
			: getOrganizationMaterialConfigurationTemplates(orgId),
		hideOrganizationMaterialSettings
			? { materialMeasures: [], materialTypes: [] }
			: getOrganizationMaterialConfigurationTemplateOptions(orgId),
		getOrganizationLanguageByUserId(user.id),
	]);

	return {
		userId: user.id,
		orgId,
		flowUi,
		isTgemOrganization,
		hideOrganizationMaterialSettings,
		hideMemberReminderSettings,
		userData,
		workersData,
		reminderLogs,
		materialConfigurationTemplates,
		materialConfigurationTemplateOptions,
		currentLanguage,
	};
}

export type OrganizationSettingsData = Awaited<
	ReturnType<typeof loadOrganizationSettings>
>;
