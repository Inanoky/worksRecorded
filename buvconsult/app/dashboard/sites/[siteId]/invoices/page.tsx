
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import { getProjectNameBySiteId} from "@/server/actions/shared-actions";
import {GetInvoiceItemsFromDB, GetInvoicesFromDB} from "@/server/actions/invoices-actions";
import {InvoiceItemsDataTable} from "@/components/invoices/InvoiceItemsDataTable";
import { InvoicesDataTable } from "@/components/invoices/InvoicesDataTable";
import {ChartAreaInteractive} from "@/components/landing/analytics/ChartAreaInteractive";
import {getDailyAggregatedCosts} from "@/server/actions/analytics-actions";
import {KeyMetricsDashboard} from "@/components/landing/analytics/KeyMetricsDashboard";
import AiWidgetRag from "@/components/ai/AiChat";


export default async function InvoiceRoute({params}:

{params : Promise <{siteId:string}>

}){

    const {siteId} = await params
    const invoices = await GetInvoicesFromDB(siteId)
    let invoiceItems = await GetInvoiceItemsFromDB(siteId);
    invoiceItems = invoiceItems.filter(item => item.invoice?.isInvoice !== false); // filter out items with invoice.isInvoice === false
    const chartAreaInteractiveData = await getDailyAggregatedCosts(siteId)
    const projectName = getProjectNameBySiteId(siteId)



    //columns for the second table

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
          {/* 2️⃣ Your client upload form */}

            <KeyMetricsDashboard/>
          <ChartAreaInteractive data={chartAreaInteractiveData}/>





          <div>
             <Card className="mt-10">
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
        <AiWidgetRag siteId={siteId}/>
      </>
  );

}