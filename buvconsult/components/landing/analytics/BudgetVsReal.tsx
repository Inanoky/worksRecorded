"use client"

import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useProject } from "@/components/providers/ProjectProvider"

export const description = "A stacked area chart"



const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function BudgetVsReal({data}) {

    const { projectName } = useProject();

  //This is a mockup function

        function addRandomBudget(data) {
        return data.map(item => {
        const spendings = Number(item.spendings);
        // Calculate a random value between 70% and 130% of spendings
        const min = spendings * 0.7;
        const max = spendings * 1.3;
        const budget = Math.round(Math.random() * (max - min) + min);

        return {
          ...item,
          budget: budget.toString()
        };
        });
        }




  const chartData = addRandomBudget(data)

  console.log(`This is budget data after format ${JSON.stringify(chartData)}`)



  return (
    <Card>
      <CardHeader>
        <CardTitle>{projectName} Budget (MockUp) </CardTitle>
        <CardDescription>
          Period {chartData[0]?.month} - {chartData[chartData.length - 1]?.month}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
                    left: 12,
                    right: 12,
                    top: 12,            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="spendings"
              type="natural"
              fill="var(--primary)"
              fillOpacity={0.4}
              stroke="var(--primary)"
              stackId="a"
            />
            <Area
              dataKey="budget"
              type="natural"
              fill="hsl(0 73.7% 41.8%)"
              fillOpacity={0.4}
              stroke="hsl(0 73.7% 41.8%)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
                {projectName}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Cost in EUR
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
