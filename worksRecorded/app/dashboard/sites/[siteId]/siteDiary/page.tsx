// app/[...]/page.tsx  (Server Component)
import SiteDiaryCalendar from "@/components/sitediary/Calendar";
import AiWidgetRag from "@/components/ai/AiChatLazy";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";

import TourRunner from "@/components/joyride/TourRunner";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import FullPhotoGallery from "@/components/sitediary/FullGalleryViewLazy";

const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";



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
  const showAiWidget = siteId !== ZTC_SITE_ID;




  return (
    <>
    <div  
>
         <TourRunner steps={getJoyRideSteps("en").steps_dashboard_siteid_site_diary} stepName="steps_dashboard_siteid_site_diary"/>
   
              
      <SiteDiaryCalendar siteId={siteId} 
       />
 
    {showAiWidget ? <AiWidgetRag siteId={siteId} /> : null}
  

      <FullPhotoGallery siteId={siteId}/>


      
       </div>
    </>
  );
}
