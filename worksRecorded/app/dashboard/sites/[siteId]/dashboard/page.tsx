import { getProjectNameBySiteId } from "@/server/actions/shared-actions";
import { getInvoiceItemsFromDB, getInvoicesFromDB } from "@/server/actions/invoices-actions";

import { ChartAreaInteractive } from "@/components/analytics/ChartAreaInteractive";
import { getCurrentWeekMetrics, getDailyAggregatedCosts, getPreviousWeekMetrics, getCurrentWorkersOnSite } from "@/server/actions/analytics-actions";
import { KeyMetricsDashboard } from "@/components/analytics/KeyMetricsDashboard/KeyMetricsDashboard";
import AiWidgetRag from "@/components/ai/AiChat";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_dashboard } from "@/components/joyride/JoyRideSteps";
import SiteDiaryList from "@/components/sitediary/SiteDiaryList";
import MewpChecklistF72Dummy from "@/components/mockups/loxtonMockupv1";
import MewpChecklistF72ExcelLikeDummy2 from "@/components/mockups/loxtonMockupv2";
import TimesheetMockupF17 from "@/components/mockups/TimesheetMockupF17";
import WeeklyVehicleReportsMockupF25 from "@/components/mockups/vehicleReportMockup";
import ElectricalInstallationsInspectionReportMockup from "@/components/mockups/inspectiosnReportMockup";
import InspectionReportsSummaryMockup from "@/components/mockups/inspectonReportsdashboard";

export const maxDuration = 800;


import {
  getTargetData,
  saveTargetDataForm,
  getCurrentWeekKey,
  getPrevWeekKey,
} from "@/server/actions/metrics-card-actions";

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
    invoices,
    invoiceItems,
    chartAreaInteractiveData,
    projectName,
    previousWeekData,
    currentWeekData,
    workersOnSite,
  ] = await Promise.all([
    getInvoicesFromDB(siteId),
    getInvoiceItemsFromDB(siteId),
    getDailyAggregatedCosts(siteId),
    getProjectNameBySiteId(siteId),
    getPreviousWeekMetrics(siteId),
    getCurrentWeekMetrics(siteId),
    getCurrentWorkersOnSite(siteId),
  ]);

  const filteredInvoiceItems = invoiceItems.filter(
    (item) => item.invoice?.isInvoice !== false
  );

  // --- Group 3 ---
  const [targets, currentWeekKey, previousWeekKey] = await Promise.all([
    getTargetData(siteId),
    getCurrentWeekKey(),
    getPrevWeekKey(),
  ]);

  return (
    <>
      <div data-tour="key-metrics">
        <TourRunner
          steps={steps_dashboard_siteid_dashboard}
          stepName="steps_dashboard_siteid_dashboard"
        />
      </div>

      <SiteDiaryList siteId={siteId} />
      <AiWidgetRag siteId={siteId} />
    </>
  );
}