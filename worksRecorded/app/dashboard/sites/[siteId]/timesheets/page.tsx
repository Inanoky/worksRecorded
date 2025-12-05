import { AddWorkerForm } from "@/components/timesheets/AddWorkerFrom";
import { FrontendTable } from "@/components/timesheets/FrontendTable";
import {
  getTimelogsBySiteId,
  getWorkersBySiteId,
} from "@/server/actions/timesheets-actions";
import AiWidgetRag from "@/components/ai/AiChat";
import { getLocationsWorksFromSiteSchema } from "@/server/actions/site-diary-actions";
import { SiteSchemaProvider } from "@/components/providers/SiteSchemaProvider";
import { WorkerTableCard } from "@/components/ai/WorkerTableCard";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_timesheets } from "@/components/joyride/JoyRideSteps";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AddWorkerPage({
  params,
}: {
  params: { siteId: string };
}) {
  const { siteId } = await params;

  const user = await requireUser();
  const siteCheck = await orgCheck(user.id, siteId);
  if (!siteCheck) notFound();

  const [timelogs, workers, locations, works] = await Promise.all([
    getTimelogsBySiteId(siteId),
    getWorkersBySiteId(siteId),
    getLocationsWorksFromSiteSchema(siteId, "Location"),
    getLocationsWorksFromSiteSchema(siteId, "Work"),
  ]);

  return (
    <SiteSchemaProvider
      siteId={siteId}
      schemaLocations={locations}
      schemaWorks={works}
    >
      <TourRunner
        steps={steps_dashboard_siteid_timesheets}
        stepName="steps_dashboard_siteid_timesheets"
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Header */}
        <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
            <p className="text-sm text-muted-foreground">
              Review time records and keep your worker list up to date.
            </p>
          </div>
        </header>

             {/* SECONDARY: Workers card (list + modal button) */}
        <section>
          <WorkerTableCard siteId={siteId} initialWorkers={workers} />
        </section>


        {/* MAIN: Time records */}
        <section data-tour="timesheets">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">Time records</CardTitle>
              <p className="text-xs text-muted-foreground">
                All logged entries for this site. Search, edit, and export.
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              <FrontendTable workers={workers} data={timelogs} pageSize={20} />
            </CardContent>
          </Card>
        </section>

   
        <AiWidgetRag siteId={siteId} />
      </div>
    </SiteSchemaProvider>
  );
}
