 
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
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 export default function MetricsCard({cardName, siteId,  currentWeekData, onRefresh }) 
 
    
 { 
    const [onCardRefresh, setOnCardRefresh] = React.useState<boolean>(false)  ;






    return (


        <Card className="@container/card relative overflow-hidden">     

      {onCardRefresh && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-xs rounded-inherit">
                <Spinner className="size-8" />
                </div>
      )}


        
<CardHeader className={onCardRefresh? "opacity-100  pointer-events-none" : ""}>
          <CardDescription>{cardName}</CardDescription>
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
    onClick={async () => 
    
    {
        setOnCardRefresh(true);
      await onRefresh(siteId).then(() => setOnCardRefresh(false));
      
      
      
              
              }} />
            </div>
          </div>
        </CardFooter>

   


        
      </Card>
       






    )


 
 }
 
 
 
 
 