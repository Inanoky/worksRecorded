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
import SiteDiaryCalendar from "@/components/sitediary/Calendar";
import FullPhotoGallery from "@/components/sitediary/FullGalleryView";
import SiteDiaryList from "@/components/sitediary/SiteDiaryList";

import {
  getTargetData,
  saveTargetDataForm,
  getCurrentWeekKey,
  getPrevWeekKey,
} from "@/server/actions/metrics-card-actions";

export default async function InvoiceRoute({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  // --- Group 1: Invoice and Core Metrics Data (all run concurrently) ---
  const [
    invoices,
    invoiceItems, // This is the *raw* array of all items, to be filtered next
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

  // Filter invoiceItems after the concurrent fetch is complete
  const filteredInvoiceItems = invoiceItems.filter((item) => item.invoice?.isInvoice !== false);
  // Note: 'invoices' is not used in the return, but kept for completeness based on original code flow.

  // --- Group 2: User Check (sequential, as it uses the returned 'user' for 'orgCheck') ---
  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);
  if (!site) notFound();

  // --- Group 3: Target and Week Key Data (all run concurrently) ---
  const [targets, currentWeekKey, previousWeekKey] = await Promise.all([
    getTargetData(siteId),
    getCurrentWeekKey(),
    getPrevWeekKey(),
  ]);

  return (
    <>
      <div data-tour="key-metrics">
        <TourRunner steps={steps_dashboard_siteid_dashboard} stepName="steps_dashboard_siteid_dashboard" />
        
  
      </div>
      <SiteDiaryList siteId={siteId}/>
        
       

      <AiWidgetRag siteId={siteId} />
    
    </>
  );
}