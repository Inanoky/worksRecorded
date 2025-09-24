import { AddWorkerForm } from "@/componentsFrontend/ClockInOut/AddWorkerFrom";
import { FrontendTable } from "@/componentsFrontend/Timesheets/FrontendTable";
import { getTimelogsBySiteId, getWorkersBySiteId } from "@/app/actions/clockinActions";
import { WorkerTableCard } from "@/componentsFrontend/AI/ClockInOut/WorkerTableCard";
import AiWidgetRag from "@/componentsFrontend/AI/RAG/AiWidgetRag";
import { getLocationsWorksFromSiteSchema } from "@/app/actions/SchemaActions";
import { SiteSchemaProvider } from "@/componentsFrontend/provider/SiteSchemaProvider";

export default async function AddWorkerPage({params}) {
  const {siteId} = await params


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


    <div className="grid grid-cols-1">
      <div className="flex flex-row justify-start gap-10  max-h-[400px] overflow-hidden">
        <WorkerTableCard siteId={siteId} initialWorkers={workers} />
        <div>
          <AddWorkerForm siteId={siteId} />
        </div>
      </div>
      <div className="mt-8">
        <FrontendTable workers= {workers} data={timelogs} pageSize={20}  />
      </div>
       <AiWidgetRag siteId={siteId}/>
    </div>

    </SiteSchemaProvider>

  );
}
