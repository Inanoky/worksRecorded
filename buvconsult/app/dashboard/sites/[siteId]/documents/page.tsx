
import AiWidgetRag from "@/components/ai/AiChat";
import {DocumentsDataTable} from "@/components/documents/DocumentDataTable";
import { getProjectNameBySiteId} from "@/server/actions/shared-actions";
import { GetDocumentsFromDB } from "@/server/actions/documents-actions";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

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