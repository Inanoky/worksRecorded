import { AddWorkerForm } from "@/components/timesheets/AddWorkerFrom";
import { FrontendTable } from "@/components/timesheets/FrontendTable";
import { getTimelogsBySiteId, getWorkersBySiteId } from "@/server/actions/timesheets-actions";
import AiWidgetRag from "@/components/ai/AiChat";
import { getLocationsWorksFromSiteSchema } from "@/server/actions/site-diary-actions";
import { SiteSchemaProvider } from "@/components/providers/SiteSchemaProvider";
import { WorkerTableCard } from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/WorkerTableCard";

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
