"use client"

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/componentsFrontend/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/componentsFrontend/ui/card"
import {useProject} from "@/componentsFrontend/provider/ProjectProvider";

export function KeyMetricsDashboard() {
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
          <CardDescription>Progress this week</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            83 elements assembled
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Increase from average <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Target for the week 80 elements
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Workers on site </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            11 workers |
            1 site manager
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown />
              -20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Up 20% from last week <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Hours worked this week : 522,5 h
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
