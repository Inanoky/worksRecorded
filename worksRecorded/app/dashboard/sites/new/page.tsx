export const runtime = "nodejs";

import NewSiteFormCard from "@/app/dashboard/sites/new/NewSiteFormCard";
import { requireUser } from "@/lib/utils/requireUser";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

export default async function NewSiteRoute() {
  const user = await requireUser();
  const organizationLanguage = await getOrganizationLanguageByUserId(user.id);

  return <NewSiteFormCard organizationLanguage={organizationLanguage} />;
}
