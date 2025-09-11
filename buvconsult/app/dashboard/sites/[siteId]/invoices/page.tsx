import InvoiceUpload from "@/componentsFrontend/InvoiceUpload";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/componentsFrontend/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/componentsFrontend/ui/table";
import Image from "next/image";
import {Badge} from "@/componentsFrontend/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/componentsFrontend/ui/dropdown-menu";
import {Button} from "@/componentsFrontend/ui/button";
import {MoreHorizontal} from "lucide-react";
import Link from "next/link";
import {GetInvoiceItemsFromDB, GetInvoicesFromDB, getProjectNameBySiteId} from "@/app/actions/actions";
import {InvoiceHoverPreview} from "@/componentsFrontend/ui/InvoiceHoverPreview";
import {InvoiceItemsDataTable} from "@/componentsFrontend/InvoiceItemsDataTable";
import { InvoicesDataTable } from "@/componentsFrontend/InvoicesDataTable";
import {InvoiceChatBox} from "@/componentsFrontend/AI/SQL/InvoiceChatBox";
import AIassistant from "@/componentsFrontend/AI/SQL/aiAssistant";
import AIChatGeneral from "@/componentsFrontend/AI/SQL/AIwidget";
import {ChartAreaInteractive} from "@/app/components/frontend/analytics/ChartAreaInteractive";
import {getDailyAggregatedCosts} from "@/app/actions/AnalyticsActions";
import {KeyMetrics} from "@/app/components/frontend/analytics/keyMetrics";
import {KeyMetricsDashboard} from "@/app/components/frontend/analytics/keyMetricsDashboard";
import AiWidgetRag from "@/componentsFrontend/AI/RAG/AiWidgetRag";


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