// app/[...]/page.tsx  (Server Component)
import AiWidgetRag from "@/components/ai/AiChatLazy";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";

import TourRunner from "@/components/joyride/TourRunner";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import FullPhotoGallery from "@/components/sitediary/FullGalleryViewLazy";
import { ClientFlowSiteDiary } from "@/components/client-flows/ClientFlowSiteDiary";
import { resolveClientFlow } from "@/lib/client-flows/resolve-client-flow";
import { CLIENT_FLOW_IDS } from "@/lib/client-flows/constants";



export default async function Home({
  params,
}: {
  params: { siteId: string };
}) {

  const { siteId } = await params;
  const user = await requireUser();
  const siteCheck = await orgCheck(user.id, siteId);
  if (!siteCheck) {
    notFound();
  }
  const flowId = resolveClientFlow({
    organizationId: siteCheck.organizationId ?? null,
    siteId,
  });
  const showAiWidget = flowId === CLIENT_FLOW_IDS.DEFAULT;




  return (
    <>
    <div  
>
         <TourRunner steps={getJoyRideSteps("en").steps_dashboard_siteid_site_diary} stepName="steps_dashboard_siteid_site_diary"/>
   
              
      <ClientFlowSiteDiary flowId={flowId} siteId={siteId} />
 
    {showAiWidget ? <AiWidgetRag siteId={siteId} /> : null}
  

      <FullPhotoGallery siteId={siteId}/>


      
       </div>
    </>
  );
}
