import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceItemsDataTable } from "@/components/invoices/InvoiceItemsDataTable";
import { InvoicesDataTable } from "@/components/invoices/InvoicesDataTable";
import AiWidgetRag from "@/components/ai/AiChat";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_invoices } from "@/components/joyride/JoyRideSteps";
import {
  getCachedInvoiceItems,
  getCachedInvoices,
  getCachedProjectName,
} from "@/server/cache/dashboard-preload";




export default async function InvoiceRoute({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);
  if (!site) notFound();

  const invoices = await getCachedInvoices(siteId);
  let invoiceItems = await getCachedInvoiceItems(siteId);
  invoiceItems = invoiceItems.filter((item) => item.invoice?.isInvoice !== false);
  const projectName = await getCachedProjectName(siteId);


  return (
    <>
    

      <div>
        <TourRunner steps={steps_dashboard_siteid_invoices} stepName="steps_dashboard_siteid_invoices" />
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
