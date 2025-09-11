import {Chat} from "@/componentsFrontend/AI/ChatWithPdf/chat";
import AiWidgetRag from "@/componentsFrontend/AI/RAG/AiWidgetRag";
import {DocumentsDataTable} from "@/componentsFrontend/DocumentDataTable";
import {GetDocumentsFromDB, GetInvoicesFromDB, getProjectNameBySiteId} from "@/app/actions/actions";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/componentsFrontend/ui/card";
import {InvoicesDataTable} from "@/componentsFrontend/InvoicesDataTable";

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