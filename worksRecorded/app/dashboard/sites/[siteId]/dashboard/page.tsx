import AiWidgetRag from "@/components/ai/AiChat";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_dashboard } from "@/components/joyride/JoyRideSteps";
import SiteDiaryList from "@/components/sitediary/SiteDiaryList";
import { getSiteBisConfig, getUserBisTokenByUserId } from "@/server/actions/BIS/service";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

export const maxDuration = 800;



export default async function InvoiceRoute({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // --- Group 2: User Check ---
  const user = await requireUser();

  const isSuperAdmin = user.id === process.env.SUPERADMIN;

  if (!isSuperAdmin) {
    const site = await orgCheck(user.id, siteId);
    if (!site) notFound();
  }

  // --- Group 1: Data fetch (can stay as-is) ---
  const [
   
    siteBisStatus,
    userBisToken,
    organizationLanguage,
  ] = await Promise.all([
   
    getSiteBisConfig(siteId),
    getUserBisTokenByUserId(user.id),
    getOrganizationLanguageByUserId(user.id),
  ]);

 

  // --- Group 3 ---
 

  return (
    <>
      <div data-tour="key-metrics">
        <TourRunner
          steps={steps_dashboard_siteid_dashboard}
          stepName="steps_dashboard_siteid_dashboard"
        />
      </div>

      <SiteDiaryList
        siteId={siteId}
        bisEnabled={Boolean(siteBisStatus?.bisCaseId && userBisToken?.accessToken)}
        organizationLanguage={organizationLanguage}
      />
      <AiWidgetRag siteId={siteId} />
    </>
  );
}
