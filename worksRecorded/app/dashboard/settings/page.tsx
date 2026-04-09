import { MembersTable } from "@/components/settings/MembersTable";
import { OrganizationLanguageSwitcher } from "@/components/settings/OrganizationLanguageSwitcher";
import { requireUser } from "@/lib/utils/requireUser";
import {
  getOrganizationIdByUserId,
  getOrganizationLanguageByUserId,
} from "@/server/actions/shared-actions";
import { getUserData } from "@/server/actions/settings-actions";

export default async function SettingsSiteRoute() {
  const user = await requireUser();
  const orgId = await getOrganizationIdByUserId(user.id);
  const userData = await getUserData(orgId);
  const currentLanguage = await getOrganizationLanguageByUserId(user.id);

  return (
    <>
      <OrganizationLanguageSwitcher currentLanguage={currentLanguage} />
      <MembersTable pageSize={5} data={userData} exportFileName="Members" userid={user.id} orgId={orgId} />
    </>
  );
}
