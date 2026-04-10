import { MembersTable } from "@/components/settings/MembersTable";
import { WorkersSettingsTable } from "@/components/settings/WorkersSettingsTable";
import { OrganizationLanguageSwitcher } from "@/components/settings/OrganizationLanguageSwitcher";
import { requireUser } from "@/lib/utils/requireUser";
import {
  getOrganizationIdByUserId,
  getOrganizationLanguageByUserId,
} from "@/server/actions/shared-actions";
import { getOrganizationWorkers, getUserData } from "@/server/actions/settings-actions";

export default async function SettingsSiteRoute() {
  const user = await requireUser();
  const orgId = await getOrganizationIdByUserId(user.id);
  const userData = await getUserData(orgId);
  const workersData = await getOrganizationWorkers(orgId);
  const currentLanguage = await getOrganizationLanguageByUserId(user.id);

  return (
    <>
      <OrganizationLanguageSwitcher currentLanguage={currentLanguage} />
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
