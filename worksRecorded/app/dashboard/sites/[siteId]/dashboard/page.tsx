import AiWidgetRag from "@/components/ai/AiChatLazy";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import TourRunner from "@/components/joyride/TourRunner";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import { ClientFlowDashboard } from "@/components/client-flows/ClientFlowDashboard";
import { getSiteBisConfig, getUserBisTokenByUserId } from "@/server/actions/BIS/service";
import { getOrganizationLanguageByUserId, getSiteOrganizationIdBySiteId } from "@/server/actions/shared-actions";
import { sendFirstProjectWelcomeTemplateIfNeeded } from "@/server/actions/onboarding-actions";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { shouldShowDashboardAiWidgetForFlowModule } from "@/lib/flows/registry";
import { isSuperUserId } from "@/lib/utils/super-user";

export const maxDuration = 800;



export default async function InvoiceRoute({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // --- Group 2: User Check ---
  const user = await requireUser();

  const isSuperAdmin = isSuperUserId(user.id);

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
  const [
    flowModuleKey,
    siteBisStatus,
    userBisToken,
    organizationLanguage,
  ] = await Promise.all([
    resolveFlowModuleKeyForRuntime({ organizationId: siteOrganizationId, siteId }),
    getSiteBisConfig(siteId),
    getUserBisTokenByUserId(user.id),
    getOrganizationLanguageByUserId(user.id),
  ]);

  if (onboardingProjectName) {
    after(async () => {
      try {
        await sendFirstProjectWelcomeTemplateIfNeeded({
          siteId,
          projectName: onboardingProjectName,
        });
      } catch (error) {
        console.error("[dashboard] deferred onboarding message failed", {
          siteId,
          error,
        });
      }
    });
  }

  return (
    <>
      <div data-tour="key-metrics">
        <TourRunner
          steps={getJoyRideSteps(organizationLanguage).steps_dashboard_siteid_dashboard}
          stepName="steps_dashboard_siteid_dashboard"
        />
      </div>

      <ClientFlowDashboard
        flowModuleKey={flowModuleKey}
        siteId={siteId}
        bisEnabled={Boolean(siteBisStatus?.bisCaseId && userBisToken?.accessToken)}
        organizationLanguage={organizationLanguage}
      />
      {shouldShowDashboardAiWidgetForFlowModule(flowModuleKey) ? <AiWidgetRag siteId={siteId} /> : null}
    </>
  );
}
