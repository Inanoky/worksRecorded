import AiWidgetRag from "@/components/ai/AiChatLazy";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import TourRunner from "@/components/joyride/TourRunner";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import { ClientFlowDashboard } from "@/components/client-flows/ClientFlowDashboard";
import { getSiteBisConfig, getUserBisTokenByUserId } from "@/server/actions/BIS/service";
import { getOrganizationLanguageByUserId, getSiteOrganizationIdBySiteId } from "@/server/actions/shared-actions";
import { sendFirstProjectWelcomeTemplateIfNeeded } from "@/server/actions/onboarding-actions";
import { resolveClientFlow } from "@/lib/client-flows/resolve-client-flow";
import { CLIENT_FLOW_IDS } from "@/lib/client-flows/constants";

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

  let onboardingProjectName = "";
  let siteOrganizationId: string | null = null;
  if (!isSuperAdmin) {
    const site = await orgCheck(user.id, siteId);
    if (!site) notFound();
    onboardingProjectName = site.name;
    siteOrganizationId = site.organizationId ?? null;
  } else {
    siteOrganizationId = await getSiteOrganizationIdBySiteId(siteId);
  }
  const flowId = resolveClientFlow({ organizationId: siteOrganizationId, siteId });

  // --- Group 1: Data fetch (can stay as-is) ---
  const [
   
    siteBisStatus,
    userBisToken,
    organizationLanguage,
  ] = await Promise.all([
   
    getSiteBisConfig(siteId),
    getUserBisTokenByUserId(user.id),
    getOrganizationLanguageByUserId(user.id),
    sendFirstProjectWelcomeTemplateIfNeeded({ siteId, projectName: onboardingProjectName }),
  ]);

 

  // --- Group 3 ---
 

  return (
    <>
      <div data-tour="key-metrics">
        <TourRunner
          steps={getJoyRideSteps(organizationLanguage).steps_dashboard_siteid_dashboard}
          stepName="steps_dashboard_siteid_dashboard"
        />
      </div>

      <ClientFlowDashboard
        flowId={flowId}
        siteId={siteId}
        bisEnabled={Boolean(siteBisStatus?.bisCaseId && userBisToken?.accessToken)}
        organizationLanguage={organizationLanguage}
      />
      {flowId !== CLIENT_FLOW_IDS.TGEM ? <AiWidgetRag siteId={siteId} /> : null}
    </>
  );
}
