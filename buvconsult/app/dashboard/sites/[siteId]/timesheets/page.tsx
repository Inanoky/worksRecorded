import { AddWorkerForm } from "@/componentsFrontend/ClockInOut/AddWorkerFrom";
import { TemplateTable } from "@/componentsFrontend/templates/frontendTable";
import { getTimelogsBySiteId, getWorkersBySiteId } from "@/app/actions/clockinActions";
import { WorkerTableCard } from "@/componentsFrontend/AI/ClockInOut/WorkerTableCard";
import AiWidgetRag from "@/componentsFrontend/AI/RAG/AiWidgetRag";

export default async function AddWorkerPage({params}) {
  const {siteId} = await params
  const timelogs = await getTimelogsBySiteId(siteId);
  const workers = await getWorkersBySiteId(siteId);

  return (
    <div className="grid grid-cols-1">
      <div className="flex flex-row justify-start gap-10  max-h-[400px] overflow-hidden">
        <WorkerTableCard siteId={siteId} initialWorkers={workers} />
        <div>
          <AddWorkerForm siteId={siteId} />
        </div>
      </div>
      <div className="mt-8">
        <TemplateTable data={timelogs} pageSize={20}  />
      </div>
       <AiWidgetRag siteId={siteId}/>
    </div>
  );
}
