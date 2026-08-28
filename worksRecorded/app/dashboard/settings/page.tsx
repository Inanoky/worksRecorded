import { MembersTable } from "@/components/settings/MembersTable";
import { WorkersSettingsTable } from "@/components/settings/WorkersSettingsTable";
import { OrganizationLanguageSwitcher } from "@/components/settings/OrganizationLanguageSwitcher";
import { MaterialConfigurationTemplatesSettings } from "@/components/settings/MaterialConfigurationTemplatesSettings";
import { WhatsappReminderLogsTable } from "@/components/settings/WhatsappReminderLogsTable";
import { requireUser } from "@/lib/utils/requireUser";
import {
  getOrganizationIdByUserId,
  getOrganizationLanguageByUserId,
} from "@/server/actions/shared-actions";
import {
  getOrganizationWorkers,
  getUserData,
  getWhatsappReminderLogs,
} from "@/server/actions/settings-actions";
import {
  getOrganizationMaterialConfigurationTemplateOptions,
  getOrganizationMaterialConfigurationTemplates,
} from "@/server/actions/material-configuration-template-actions";
import { getFlowModuleUi } from "@/lib/flows/registry";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { redirect } from "next/navigation";

export default async function SettingsSiteRoute() {
  const user = await requireUser();
  const orgId = await getOrganizationIdByUserId(user.id);
  if (!orgId) {
    redirect("/dashboard");
  }

  const flowModuleKey = await resolveFlowModuleKeyForRuntime({ organizationId: orgId });
  const flowUi = getFlowModuleUi(flowModuleKey);
  const hideOrganizationMaterialSettings = Boolean(flowUi.hideOrganizationMaterialSettings);
  const hideMemberReminderSettings = Boolean(flowUi.hideMemberReminderSettings);
  const userData = await getUserData(orgId);
  const workersData = await getOrganizationWorkers(orgId);
  const reminderLogs = hideMemberReminderSettings
    ? []
    : await getWhatsappReminderLogs(orgId, { take: 50 });
  const materialConfigurationTemplates = orgId && !hideOrganizationMaterialSettings
    ? await getOrganizationMaterialConfigurationTemplates(orgId)
    : [];
  const materialConfigurationTemplateOptions = orgId && !hideOrganizationMaterialSettings
    ? await getOrganizationMaterialConfigurationTemplateOptions(orgId)
    : { materialMeasures: [], materialTypes: [] };
  const currentLanguage = await getOrganizationLanguageByUserId(user.id);

  return (
    <>
      <OrganizationLanguageSwitcher currentLanguage={currentLanguage} />
      {!hideOrganizationMaterialSettings ? (
        <MaterialConfigurationTemplatesSettings
          orgId={orgId || ""}
          templates={materialConfigurationTemplates}
          materialMeasures={materialConfigurationTemplateOptions.materialMeasures}
          materialTypes={materialConfigurationTemplateOptions.materialTypes}
          organizationLanguage={currentLanguage}
        />
      ) : null}
      <MembersTable
        pageSize={5}
        data={userData}
        exportFileName="Members"
        userid={user.id}
        orgId={orgId}
        organizationLanguage={currentLanguage}
        hideReminders={hideMemberReminderSettings}
        hidePhone={Boolean(flowUi.hideMemberPhoneSettings)}
        hideRole={Boolean(flowUi.hideMemberRoleSettings)}
        titleVariant={flowUi.settingsTitleVariant ?? "default"}
      />
      <WorkersSettingsTable
        orgId={orgId || ""}
        workers={workersData.workers}
        projects={workersData.projects}
        organizationLanguage={currentLanguage}
        hideReminders={hideMemberReminderSettings}
      />
      {!hideMemberReminderSettings ? (
        <WhatsappReminderLogsTable
          logs={reminderLogs}
          organizationLanguage={currentLanguage}
        />
      ) : null}
    </>
  );
}
