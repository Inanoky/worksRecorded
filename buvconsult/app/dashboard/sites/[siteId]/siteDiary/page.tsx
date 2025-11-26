// app/[...]/page.tsx  (Server Component)
import SiteDiaryCalendar from "@/components/sitediary/Calendar";
import AiWidgetRag from "@/components/ai/AiChat";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";

import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_site_diary} from "@/components/joyride/JoyRideSteps";
import FullPhotoGallery from "@/components/sitediary/FullGalleryView";



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




  return (
    <>
    <div
    
    data-tour="calendar">
         <TourRunner steps={steps_dashboard_siteid_site_diary} stepName="steps_dashboard_siteid_site_diary"/>
   
              
      <SiteDiaryCalendar siteId={siteId} 
       />
 
    <AiWidgetRag siteId={siteId} />
  

      <FullPhotoGallery siteId={siteId}/>


      
       </div>
    </>
  );
}