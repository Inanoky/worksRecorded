import {Chat} from "@/components/AI/ChatWithPdf/chat";
import AiWidgetRag from "@/components/AI/RAG/AiWidgetRag";
import {DocumentsDataTable} from "@/components/DocumentDataTable";
import {GetDocumentsFromDB, GetInvoicesFromDB, getProjectNameBySiteId} from "@/app/actions/actions";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {InvoicesDataTable} from "@/components/InvoicesDataTable";

export default async function Documents({params}:

{params : Promise <{siteId:string}>

}){


    const {siteId} = await params
    const projectName = getProjectNameBySiteId(siteId)

     const documents = await GetDocumentsFromDB(siteId)

     return (

        <div className="w-full">

                       <Card className="mt-10">
                          <CardHeader>
                            <CardTitle>Documents</CardTitle>
                            <CardDescription>
                              Manage your Documents for site <strong>{projectName}</strong>
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <DocumentsDataTable data={documents} siteId={siteId}/>
                          </CardContent>
                        </Card>

            <AiWidgetRag siteId={siteId}/>
        </div>

  );
}