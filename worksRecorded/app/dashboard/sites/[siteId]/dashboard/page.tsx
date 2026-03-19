import { getProjectNameBySiteId } from "@/server/actions/shared-actions";
import { getInvoiceItemsFromDB, getInvoicesFromDB } from "@/server/actions/invoices-actions";
import { getCurrentWeekMetrics, getDailyAggregatedCosts, getPreviousWeekMetrics, getCurrentWorkersOnSite } from "@/server/actions/analytics-actions";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_dashboard } from "@/components/joyride/JoyRideSteps";
import SiteDiaryList from "@/components/sitediary/SiteDiaryList";
import AiWidgetRag from "@/components/ai/AiChat";
import { prisma } from "@/lib/utils/db";
import { BisConnectionCard } from "@/components/dashboard/BisConnectionCard";
import { requireBisOAuthConfig } from "@/lib/bis/config";
import { listAuthorizedBisCases } from "@/lib/bis/service";
import { readBisSiteSettings, writeBisSiteSettings } from "@/lib/bis/site-settings";
import { formatBisCaseLabel } from "@/lib/bis/format";

export const maxDuration = 800;

export default async function InvoiceRoute({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requireUser();
  const isSuperAdmin = user.id === process.env.SUPERADMIN;

  if (!isSuperAdmin) {
    const site = await orgCheck(user.id, siteId);
    if (!site) notFound();
  }

  async function saveBisCase(siteIdFromAction: string, caseId: string) {
    "use server";

    const cases = await listAuthorizedBisCases();
    const selected = cases.find((item) => item.id === caseId);
    if (!selected) throw new Error("Selected BIS case was not found.");

    const site = await prisma.site.findUnique({ where: { id: siteIdFromAction }, select: { siteDiaryRecordsMap: true } });
    await prisma.site.update({
      where: { id: siteIdFromAction },
      data: {
        siteDiaryRecordsMap: writeBisSiteSettings(site?.siteDiaryRecordsMap, {
          selectedCaseId: selected.id,
          selectedCaseLabel: selected.label,
        }),
      },
    });

    return { success: true as const };
  }

  const [
    invoices,
    invoiceItems,
    chartAreaInteractiveData,
    projectName,
    previousWeekData,
    currentWeekData,
    workersOnSite,
    site,
    token,
  ] = await Promise.all([
    getInvoicesFromDB(siteId),
    getInvoiceItemsFromDB(siteId),
    getDailyAggregatedCosts(siteId),
    getProjectNameBySiteId(siteId),
    getPreviousWeekMetrics(siteId),
    getCurrentWeekMetrics(siteId),
    getCurrentWorkersOnSite(siteId),
    prisma.site.findUnique({ where: { id: siteId }, select: { siteDiaryRecordsMap: true } }),
    prisma.bisToken.findFirst({ orderBy: { updatedAt: "desc" }, select: { id: true } }),
  ]);

  const bisSettings = readBisSiteSettings(site?.siteDiaryRecordsMap);
  let bisCases = [];
  try {
    if (token?.id) {
      bisCases = await listAuthorizedBisCases();
    }
  } catch {
    bisCases = [];
  }

  let connectUrl = "#";
  try {
    const { baseUrl, clientId, redirectUri, scope } = requireBisOAuthConfig();
    connectUrl = `${baseUrl}/bisp/api/auth/oauth2.0/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&prompt=consent`;
  } catch {
    connectUrl = "#";
  }

  return (
    <>
      <div data-tour="key-metrics">
        <TourRunner
          steps={steps_dashboard_siteid_dashboard}
          stepName="steps_dashboard_siteid_dashboard"
        />
      </div>

      <BisConnectionCard
        siteId={siteId}
        isConnected={Boolean(token?.id)}
        selectedCaseId={bisSettings.selectedCaseId}
        selectedCaseLabel={
          bisSettings.selectedCaseLabel ??
          (bisSettings.selectedCaseId
            ? formatBisCaseLabel({ caseNumber: bisSettings.selectedCaseId, constructionName: projectName, stageName: "Selected" })
            : null)
        }
        cases={bisCases}
        connectUrl={connectUrl}
        onSaveCase={saveBisCase}
      />

      <SiteDiaryList siteId={siteId} />
      <AiWidgetRag siteId={siteId} />
    </>
  );
}
