
import AiWidgetRag from "@/components/ai/AiChat";
import {DocumentsDataTable} from "@/components/documents/DocumentDataTable";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";

import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_documents } from "@/components/joyride/JoyRideSteps";
import { getOrganizationIdByUserId } from "@/server/actions/shared-actions";
import { getCachedDocuments, getCachedProjectName } from "@/server/cache/dashboard-preload";


export default async function Documents({params}:

{params : Promise <{siteId:string}>

}){


    const {siteId} = await params
    const user = await requireUser();
    const site = await orgCheck(user.id, siteId);
    if (!site) {
      notFound();
    }
    const orgId = await getOrganizationIdByUserId(user.id);
    const [projectName, documents] = await Promise.all([
      getCachedProjectName(siteId),
      getCachedDocuments(siteId, orgId),
    ]);
     





     return (

        <div className="w-full">
              <TourRunner steps={steps_dashboard_siteid_documents} stepName="steps_dashboard_siteid_documents"/>
          
                       <Card className="mt-10"
                       data-tour="Documents">
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
