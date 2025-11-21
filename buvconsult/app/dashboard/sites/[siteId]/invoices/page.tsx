import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectNameBySiteId } from "@/server/actions/shared-actions";
import { getInvoiceItemsFromDB, getInvoicesFromDB } from "@/server/actions/invoices-actions";
import { InvoiceItemsDataTable } from "@/components/invoices/InvoiceItemsDataTable";
import { InvoicesDataTable } from "@/components/invoices/InvoicesDataTable";
import AiWidgetRag from "@/components/ai/AiChat";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_invoices} from "@/components/joyride/JoyRideSteps";



export default async function InvoiceRoute({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  const invoices = await getInvoicesFromDB(siteId);
  let invoiceItems = await getInvoiceItemsFromDB(siteId);
  invoiceItems = invoiceItems.filter((item) => item.invoice?.isInvoice !== false);


  const projectName = await getProjectNameBySiteId(siteId);

  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);
  if (!site) notFound();



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
