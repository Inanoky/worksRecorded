"use client";

import { MaterialConfigurationTemplatesSettings } from "@/components/settings/MaterialConfigurationTemplatesSettings";
import { MembersTable } from "@/components/settings/MembersTable";
import { OrganizationLanguageSwitcher } from "@/components/settings/OrganizationLanguageSwitcher";
import { WhatsappReminderLogsTable } from "@/components/settings/WhatsappReminderLogsTable";
import { WorkersSettingsTable } from "@/components/settings/WorkersSettingsTable";
import type { OrganizationSettingsData } from "./load-settings";

export function OrganizationSettingsView({
	data,
}: {
	data: OrganizationSettingsData;
}) {
	const {
		userId,
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
	} = data;
	return (
		<>
			<OrganizationLanguageSwitcher currentLanguage={currentLanguage} />
			{!hideOrganizationMaterialSettings ? (
				<MaterialConfigurationTemplatesSettings
					orgId={orgId || ""}
					templates={materialConfigurationTemplates}
					materialMeasures={
						materialConfigurationTemplateOptions.materialMeasures
					}
					materialTypes={materialConfigurationTemplateOptions.materialTypes}
					organizationLanguage={currentLanguage}
				/>
			) : null}
			<MembersTable
				pageSize={5}
				data={userData}
				exportFileName="Members"
				userid={userId}
				orgId={orgId}
				organizationLanguage={currentLanguage}
				hideReminders={hideMemberReminderSettings}
				hidePhone={Boolean(flowUi.hideMemberPhoneSettings)}
				hideRole={isTgemOrganization || Boolean(flowUi.hideMemberRoleSettings)}
				hideStatus={isTgemOrganization}
				titleVariant={
					isTgemOrganization
						? "team"
						: (flowUi.settingsTitleVariant ?? "default")
				}
			/>
			{workersData ? (
				<WorkersSettingsTable
					orgId={orgId || ""}
					workers={workersData.workers}
					projects={workersData.projects}
					organizationLanguage={currentLanguage}
					hideReminders={hideMemberReminderSettings}
				/>
			) : null}
			{!hideMemberReminderSettings ? (
				<WhatsappReminderLogsTable
					logs={reminderLogs}
					organizationLanguage={currentLanguage}
				/>
			) : null}
		</>
	);
}
