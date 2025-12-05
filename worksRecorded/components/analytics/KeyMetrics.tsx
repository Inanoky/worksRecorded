"use client"

import { IconTrendingUp, } from "@tabler/icons-react"
import { RefreshCw } from 'lucide-react';

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

export function KeyMetrics() {
  const { projectName } = useProject();

  return (
      <Card>
        <CardHeader>
        <CardTitle>Key metrics (MockUp)</CardTitle>
        <CardDescription>
          {projectName}
        </CardDescription>
      </CardHeader>
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Project spendings</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            753 432 EUR / 1 100 342 EUR spent (68,47% completion)
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Average speed = 12.7 elements per day
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            1021 / 1325 elements assembled (77% spent) <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            2532m2 / 2829m2
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Cash flow forecast </CardDescription>
          <CardTitle className=" text-red-700 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            October 2024 | 110 300 EUR

          </CardTitle>
          <CardAction>
            <Badge variant="outline">


            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            November 2024 | 89 000 EUR
          </div>
          <div className="text-muted-foreground">
            December 2024 | 64 328 EUR
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Income forecast</CardDescription>
          <CardTitle className="text-green-700 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            October 2024 | 120 322 EUR

          </CardTitle>
          <CardAction>
            <Badge variant="outline">

            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
             November 2024 | 94 221 EUR
          </div>
          <div className="text-muted-foreground">December 2024 | 75 399 EUR</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Cost projection</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            Profit 11.3% - 338 000 EUR
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />

            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Increase from average budget planned 3% <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">* Interpolated from existing progress</div>
        </CardFooter>
      </Card>
    </div>
        </Card>
  )
}
