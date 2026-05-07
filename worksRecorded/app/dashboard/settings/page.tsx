import { MembersTable } from "@/components/settings/MembersTable";
import { WorkersSettingsTable } from "@/components/settings/WorkersSettingsTable";
import { OrganizationLanguageSwitcher } from "@/components/settings/OrganizationLanguageSwitcher";
import { MaterialConfigurationTemplatesSettings } from "@/components/settings/MaterialConfigurationTemplatesSettings";
import { requireUser } from "@/lib/utils/requireUser";
import {
  getOrganizationIdByUserId,
  getOrganizationLanguageByUserId,
} from "@/server/actions/shared-actions";
import { getOrganizationWorkers, getUserData } from "@/server/actions/settings-actions";
import {
  getOrganizationMaterialConfigurationTemplateOptions,
  getOrganizationMaterialConfigurationTemplates,
} from "@/server/actions/material-configuration-template-actions";

export default async function SettingsSiteRoute() {
  const user = await requireUser();
  const orgId = await getOrganizationIdByUserId(user.id);
  const userData = await getUserData(orgId);
  const workersData = await getOrganizationWorkers(orgId);
  const materialConfigurationTemplates = orgId
    ? await getOrganizationMaterialConfigurationTemplates(orgId)
    : [];
  const materialConfigurationTemplateOptions = orgId
    ? await getOrganizationMaterialConfigurationTemplateOptions(orgId)
    : { materialMeasures: [], materialTypes: [] };
  const currentLanguage = await getOrganizationLanguageByUserId(user.id);

  return (
    <>
      <OrganizationLanguageSwitcher currentLanguage={currentLanguage} />
      <MaterialConfigurationTemplatesSettings
        orgId={orgId || ""}
        templates={materialConfigurationTemplates}
        materialMeasures={materialConfigurationTemplateOptions.materialMeasures}
        materialTypes={materialConfigurationTemplateOptions.materialTypes}
        organizationLanguage={currentLanguage}
      />
      <MembersTable
        pageSize={5}
        data={userData}
        exportFileName="Members"
        userid={user.id}
        orgId={orgId}
        organizationLanguage={currentLanguage}
      />
      <WorkersSettingsTable orgId={orgId || ""} workers={workersData.workers} projects={workersData.projects} />
    </>
  );
}
