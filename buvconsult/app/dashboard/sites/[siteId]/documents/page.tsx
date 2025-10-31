
import AiWidgetRag from "@/components/ai/AiChat";
import {DocumentsDataTable} from "@/components/documents/DocumentDataTable";
import { getProjectNameBySiteId} from "@/server/actions/shared-actions";
import { getDocumentsFromDB } from "@/server/actions/documents-actions";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";


export default async function Documents({params}:

{params : Promise <{siteId:string}>

}){


    const {siteId} = await params
    const projectName = getProjectNameBySiteId(siteId)

     const documents = await getDocumentsFromDB(siteId)

        const user = await requireUser();  
             const site = await orgCheck(user.id, siteId);
             if (!site) {
             notFound();
             }
     





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