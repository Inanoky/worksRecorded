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




export function KeyMetricsDashboard({siteId, displayData, currentWeekData }) {

  type MetricsData = {
  elementsAssembled: number;
  hoursWorked: number;
  additionalHoursWorked: number;
  delayedHours: number;
  reason: string;
};

  const [data, updateDate] = React.useState<MetricsData | null> (null)  ;


  async function handleClick(siteId:string  ) {

    const newData = await extractSiteDiaryPreviouseWeek(siteId)    
    updateDate(newData);
    
  }

    async function handleCurrentWeekClick(siteId:string  ) {

    const newData = await extractSiteDiaryCurrentWeek(siteId)    
    updateDate(newData);
    
  }


  

  const { projectName } = useProject();

  return (
      <Card>
        <CardHeader>
        <CardTitle>Key metrics (MockUp)</CardTitle>
        <CardDescription>
          {projectName}
        </CardDescription>
      </CardHeader>
    <div className="grid grid-cols-4 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Progress current week</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {currentWeekData?.elementsAssembled} elements assembled
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 inline-flex items-center gap-1.5"
            >
              <Dot className="size-4 text-green-600 fill-current" />
              LIVE
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
             <div className="line-clamp-1 flex gap-2 font-medium">
            Total hours worked : {currentWeekData?.hoursWorked} manhours 
          </div>
          <div className="line-clamp-1 flex gap-2 font-medium">
            Additional works :  {currentWeekData?.additionalHoursWorked} manhours
          </div>
          <div className="flex items-center text-muted-foreground w-full">
    <span>Delays hours worked {currentWeekData?.delayedHours} </span>
    <div  className="flex flex-row gap-2 items-center size-14 ml-auto ">
     <ReasonHover markdown={currentWeekData?.reason} title="How this was calculated"  />
    <RefreshCw 
    className="hover:animate-spin cursor-pointer size-12" 
    onClick={() => handleCurrentWeekClick(siteId)} />
    </div>
  </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Progress last week</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayData?.elementsAssembled} elements assembled
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 inline-flex items-center gap-1.5"
            >
              <Dot className="size-4 text-green-600 fill-current" />
              LIVE
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
             <div className="line-clamp-1 flex gap-2 font-medium">
            Total hours worked : {displayData?.hoursWorked} manhours 
          </div>
          <div className="line-clamp-1 flex gap-2 font-medium">
            Additional works :  {displayData?.additionalHoursWorked} manhours
          </div>
          <div className="flex items-center text-muted-foreground w-full">
    <span>Delays hours worked {displayData?.delayedHours} </span>
    <div  className="flex flex-row gap-2 items-center size-14 ml-auto ">
     <ReasonHover markdown={displayData?.reason} title="How this was calculated"  />
    <RefreshCw 
    className="hover:animate-spin cursor-pointer size-12" 
    onClick={() => handleClick(siteId)} />
    </div>
  </div>
        </CardFooter>
      </Card>
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
