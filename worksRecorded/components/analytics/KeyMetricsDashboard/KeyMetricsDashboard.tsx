"use client";

import * as React from "react";
import { IconTrendingUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProject } from "@/components/providers/ProjectProvider";
import { extractSiteDiaryPreviouseWeek } from "@/server/ai-flows/agents/extractors/extractLastWeekProgressMetrics";
import { extractSiteDiaryCurrentWeek } from "@/server/ai-flows/agents/extractors/extractCurrentWeekProgressMetrics";

import MetricsCard from "./MetricsCard";
import MetricsCardWorkers from "./MetricsCardWorkersOnSite";

type WeeklyTarget = { amounts: number; units: string };
type TargetsJson = {
  byWeek?: Record<string, WeeklyTarget>;
  records?: Record<string, WeeklyTarget>;
};

export function KeyMetricsDashboard({
  siteId,
  previousWeekData,
  currentWeekData,
  workersData,
  targets,
  saveTargetAction,
  currentWeekKey,
  previousWeekKey,
}: {
  siteId: string;
  previousWeekData: any;
  currentWeekData: any;
  workersData: any;
  targets?: TargetsJson | null;
  saveTargetAction?: (formData: FormData) => Promise<void>;
  currentWeekKey: string;
  previousWeekKey: string;
}) {
  type MetricsData = {
    elementsAssembled: number;
    hoursWorked: number;
    additionalHoursWorked: number;
    delayedHours: number;
    reason: string;
  };

  const [data, updateData] = React.useState<MetricsData | null>(null);
  const [, setOnRefreshCurrentWeek] = React.useState<boolean>(false);

  console.log(`from key metrics dashbotsd ${JSON.stringify(targets)}`)
  async function handlePreviousWeekClick(sid: string) {
    const newData = await extractSiteDiaryPreviouseWeek(sid);
    updateData(newData);
  }

  async function handleCurrentWeekClick(sid: string) {
    const newData = await extractSiteDiaryCurrentWeek(sid);
    setOnRefreshCurrentWeek(false);
    updateData(newData);
  }

  const { projectName } = useProject();

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">Key metrics</CardTitle>
        <CardDescription className="truncate text-xs sm:text-sm">
          {projectName}
        </CardDescription>
      </CardHeader>

      <div
        className="
          grid grid-cols-1 gap-3 px-3 pb-3
          sm:grid-cols-2 sm:gap-4 sm:px-4 sm:pb-4
          xl:grid-cols-4
          *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs
        "
      >
        <MetricsCard
          cardName="Current week progress"
          siteId={siteId}
          currentWeekData={currentWeekData}
          onRefresh={async (sid) => handleCurrentWeekClick(sid)}
          targets={targets ?? undefined}
          saveTargetAction={saveTargetAction}
          currentWeekKey={currentWeekKey}
          previousWeekKey={previousWeekKey}
        />

        <MetricsCard
          cardName="Previous week progress"
          siteId={siteId}
          currentWeekData={previousWeekData}
          onRefresh={async (sid) => handlePreviousWeekClick(sid)}
          targets={targets ?? undefined}
          currentWeekKey={currentWeekKey}
          previousWeekKey={previousWeekKey}
        />

        <MetricsCardWorkers
          cardName="Works Progress"
          siteId={siteId}
          workerCount={workersData}
          onRefresh={async (sid: string) => {
            await handlePreviousWeekClick(sid);
          }}
        />

        <Card className="@container/card">
          <CardHeader className="p-4 sm:p-6">
            <CardDescription className="text-xs sm:text-sm">
              Deadline (Mockup)
            </CardDescription>
            <CardTitle className="text-base font-semibold tabular-nums sm:text-xl">
              Practical completion forecast — 10.08.2025
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="gap-1 text-[11px] sm:text-xs">
                <IconTrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                Trend
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 p-4 pt-0 text-[11px] sm:text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Practical completion deadline — 25.08.2025
              <IconTrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
            <div className="text-muted-foreground">
              * Interpolated from existing progress
            </div>
          </CardFooter>
        </Card>
      </div>
    </Card>
  );
}
