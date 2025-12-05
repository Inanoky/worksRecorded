import { AddWorkerForm } from "@/components/timesheets/AddWorkerFrom";
import { FrontendTable } from "@/components/timesheets/FrontendTable";
import { getTimelogsBySiteId, getWorkersBySiteId } from "@/server/actions/timesheets-actions";
import AiWidgetRag from "@/components/ai/AiChat";
import { getLocationsWorksFromSiteSchema } from "@/server/actions/site-diary-actions";
import { SiteSchemaProvider } from "@/components/providers/SiteSchemaProvider";
import { WorkerTableCard } from "@/components/ai/WorkerTableCard";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_timesheets} from "@/components/joyride/JoyRideSteps";




export default async function AddWorkerPage({params}) {
  const {siteId} = await params


    const user = await requireUser();
    const siteCheck = await orgCheck(user.id, siteId);
    if (!siteCheck) {
      notFound();
    }
  


  const [timelogs, workers, locations, works] = await Promise.all([
    getTimelogsBySiteId(siteId),
    getWorkersBySiteId(siteId),
    getLocationsWorksFromSiteSchema(siteId, "Location"),
    getLocationsWorksFromSiteSchema(siteId, "Work"), // ← fix
  ]);


 
  return (

    <SiteSchemaProvider
      siteId={siteId}
      schemaLocations={locations}
      schemaWorks={works}
    >
        <TourRunner steps={steps_dashboard_siteid_timesheets} stepName="steps_dashboard_siteid_timesheets"/>


    <div className="grid grid-cols-1">
      <div className="flex flex-row justify-start gap-10  max-h-[400px] overflow-hidden">
        <WorkerTableCard siteId={siteId} initialWorkers={workers} />
        <div
        data-tour="add-worker">
          <AddWorkerForm siteId={siteId} />
        </div>
      </div>
      <div className="mt-8"
      data-tour="timesheets">
        <FrontendTable workers= {workers} data={timelogs} pageSize={20}  />
      </div>
       <AiWidgetRag siteId={siteId}/>
    </div>

    </SiteSchemaProvider>

  );
}
