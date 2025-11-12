import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectNameBySiteId } from "@/server/actions/shared-actions";
import { getInvoiceItemsFromDB, getInvoicesFromDB } from "@/server/actions/invoices-actions";
import { InvoiceItemsDataTable } from "@/components/invoices/InvoiceItemsDataTable";
import { InvoicesDataTable } from "@/components/invoices/InvoicesDataTable";
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

  const columns = [
    { key: "date", label: "Date" },
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "sellerName", label: "Seller" },
    { key: "buyerName", label: "Buyer" },
    { key: "item", label: "Item" },
    { key: "quantity", label: "Qty" },
    { key: "unitOfMeasure", label: "Unit" },
    { key: "pricePerUnitOfMeasure", label: "Unit Price" },
    { key: "sum", label: "Sum" },
    { key: "currency", label: "Currency" },
    { key: "category", label: "Category" },
    { key: "isInvoice", label: "Is Invoice" },
  ];

  return (
    <>
      <div data-tour="key-metrics">
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

      <div>
        <TourRunner steps={steps_dashboard_siteid_dashboard} stepName="steps_dashboard_siteid_dashboard" />
        <Card className="mt-10" data-tour="invoice-table">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              Manage your invoices for site <strong>{projectName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoicesDataTable data={invoices} siteId={siteId} />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
            <CardDescription>
              Manage your invoice items for site <strong>{projectName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-[300px]">
              <InvoiceItemsDataTable data={invoiceItems} siteId={siteId} />
            </div>
          </CardContent>
        </Card>
      </div>

      <AiWidgetRag siteId={siteId} />
    </>
  );
}
