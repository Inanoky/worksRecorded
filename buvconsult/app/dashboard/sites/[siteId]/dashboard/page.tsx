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

import {
  getTargetData,
  saveTargetDataForm,
  getCurrentWeekKey,
  getPrevWeekKey,
} from "@/server/actions/metrics-card-actions";

export default async function InvoiceRoute({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  const invoices = await getInvoicesFromDB(siteId);
  let invoiceItems = await getInvoiceItemsFromDB(siteId);
  invoiceItems = invoiceItems.filter((item) => item.invoice?.isInvoice !== false);

  const chartAreaInteractiveData = await getDailyAggregatedCosts(siteId);
  const projectName = await getProjectNameBySiteId(siteId);
  const previousWeekData = await getPreviousWeekMetrics(siteId);
  const currentWeekData = await getCurrentWeekMetrics(siteId);
  const workersOnSite = await getCurrentWorkersOnSite(siteId);

  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);
  if (!site) notFound();

  const targets = await getTargetData(siteId);
  const currentWeekKey = await getCurrentWeekKey();
  const previousWeekKey = await getPrevWeekKey();



  return (
    <>
      <div data-tour="key-metrics">
      <TourRunner steps={steps_dashboard_siteid_dashboard} stepName="steps_dashboard_siteid_dashboard" />
        
        <KeyMetricsDashboard
          siteId={siteId}
          previousWeekData={previousWeekData}
          currentWeekData={currentWeekData}
          workersData={workersOnSite}
          targets={targets ?? undefined}
          saveTargetAction={saveTargetDataForm}
          currentWeekKey={currentWeekKey}
          previousWeekKey={previousWeekKey}
        />
        <ChartAreaInteractive data={chartAreaInteractiveData} />
      </div>

     

   

      <AiWidgetRag siteId={siteId} />
    </>
  );
}
