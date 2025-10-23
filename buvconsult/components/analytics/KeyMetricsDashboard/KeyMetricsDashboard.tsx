"use client"

import * as React from "react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { RefreshCw, Dot, CircleQuestionMark } from 'lucide-react';
import { extractSiteDiaryPreviouseWeek } from "@/server/ai-flows/agents/extractors/extractLastWeekProgressMetrics";
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useProject } from "@/components/providers/ProjectProvider"
import { savePreviousWeekMetrics } from "@/server/actions/analytics-actions";
import { ReasonHover } from "./HooverCardMetrics";
import { extractSiteDiaryCurrentWeek } from "@/server/ai-flows/agents/extractors/extractCurrentWeekProgressMetrics";
import { is } from "date-fns/locale";
import { Spinner } from "@/components/ui/spinner";
import MetricsCard from "./MetricsCard";



export function KeyMetricsDashboard({ siteId, displayData, currentWeekData }) {

  type MetricsData = {
    elementsAssembled: number;
    hoursWorked: number;
    additionalHoursWorked: number;
    delayedHours: number;
    reason: string;
  };

  const [data, updateDate] = React.useState<MetricsData | null>(null);
  const [onRefreshCurrentWeek, setOnRefreshCurrentWeek] = React.useState<boolean>(false);


  async function handlePreviousWeekClick(siteId: string) {

    const newData = await extractSiteDiaryPreviouseWeek(siteId)
    updateDate(newData);

  }

  async function handleCurrentWeekClick(siteId: string) {



    const newData = await extractSiteDiaryCurrentWeek(siteId)
    setOnRefreshCurrentWeek(false);
    updateDate(newData);

  }




  const { projectName } = useProject();

  return (








    <Card>
      <CardHeader>
        <CardTitle>Key metrics </CardTitle>
        <CardDescription>
          {projectName}
        </CardDescription>
      </CardHeader>
      <div className="grid grid-cols-4 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">


   <MetricsCard 
          cardName={'Previous week progress'} 
          siteId={siteId}
         currentWeekData={currentWeekData}
          onRefresh={async (siteId: string) => {          
          await handleCurrentWeekClick(siteId);
          ;
        }}
        />

          <MetricsCard
          cardName={'Current week progress'} 
          siteId={siteId}
         currentWeekData={displayData}
          onRefresh={async (siteId: string) => {          
          await handlePreviousWeekClick(siteId);
          ;
        }}
        />













       
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Next deadline</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              10.07.2026 - Casting floor 5 section 1

            </CardTitle>
            <CardAction>
              <Badge variant="outline">

              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              20.07.2026 - Handover floor 1 section 1
            </div>
            <div className="text-muted-foreground">Engagement exceed targets</div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Deadline</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              Practical completion forecast - 10.08.2025
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconTrendingUp />

              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Practical completion deadline - 25.08.2025 <IconTrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">* Interpolated from existing progress</div>
          </CardFooter>
        </Card>
      </div>
    </Card>
  )
}
