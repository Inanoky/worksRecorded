import { MembersTable } from "@/components/settings/MembersTable";
import { requireUser } from "@/lib/utils/requireUser";
import { getOrganizationIdByUserId, getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { getUserData } from "@/server/actions/settings-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyLanguageSelector } from "@/components/settings/CompanyLanguageSelector";
import { getDashboardLanguage, tDashboard } from "@/lib/dashboard-i18n";

export default async function CompanySettingsRoute() {
  const user = await requireUser();

  const orgId = await getOrganizationIdByUserId(user.id);
  const [userData, organizationLanguage] = await Promise.all([
    getUserData(orgId),
    getOrganizationLanguageByUserId(user.id),
  ]);

  const language = getDashboardLanguage(organizationLanguage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{tDashboard(language, "companySettingsTitle")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tDashboard(language, "dashboardLanguage")}</CardTitle>
          <CardDescription>{tDashboard(language, "dashboardLanguageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyLanguageSelector language={language} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tDashboard(language, "inviteColleaguesTitle")}</CardTitle>
          <CardDescription>{tDashboard(language, "inviteColleaguesDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable pageSize={5} data={userData} exportFileName="Members" userid={user.id} orgId={orgId} language={language} />
        </CardContent>
      </Card>
    </div>
  );
}
