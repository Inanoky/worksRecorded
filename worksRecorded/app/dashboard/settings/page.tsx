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

const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";

export default async function SettingsSiteRoute() {
  const user = await requireUser();
  const orgId = await getOrganizationIdByUserId(user.id);
  const isZtcOrganization = orgId === ZTC_ORGANIZATION_ID;
  const userData = await getUserData(orgId);
  const workersData = await getOrganizationWorkers(orgId);
  const materialConfigurationTemplates = orgId && !isZtcOrganization
    ? await getOrganizationMaterialConfigurationTemplates(orgId)
    : [];
  const materialConfigurationTemplateOptions = orgId && !isZtcOrganization
    ? await getOrganizationMaterialConfigurationTemplateOptions(orgId)
    : { materialMeasures: [], materialTypes: [] };
  const currentLanguage = await getOrganizationLanguageByUserId(user.id);

  return (
    <>
      <OrganizationLanguageSwitcher currentLanguage={currentLanguage} />
      {!isZtcOrganization ? (
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
        hideReminders={isZtcOrganization}
        hidePhone={isZtcOrganization}
        hideRole={isZtcOrganization}
        titleVariant={isZtcOrganization ? "adminPanel" : "default"}
      />
      <WorkersSettingsTable
        orgId={orgId || ""}
        workers={workersData.workers}
        projects={workersData.projects}
        organizationLanguage={currentLanguage}
        hideReminders={isZtcOrganization}
      />
    </>
  );
}
