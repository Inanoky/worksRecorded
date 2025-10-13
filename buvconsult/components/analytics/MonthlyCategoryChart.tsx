"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useProject } from "@/components/providers/ProjectProvider"



export function MonthlyCategoryChart({data}) {

const { projectName } = useProject();

  const description = "A stacked bar chart with a legend"

const chartData = data
  const categoryKeys = Object.keys(chartData[0] || {}).filter(key => key !== "month");



const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
  other: {
    label: "Other",
    color: "var(--chart-3)", // Or pick a custom CSS var or color
  },
} satisfies ChartConfig



  return (
    <Card>
      <CardHeader>
        <CardTitle>Spendigs by custom Categories</CardTitle>
        <CardDescription> Period {chartData[0]?.month} - {chartData[chartData.length - 1]?.month}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
             {categoryKeys.map((catKey, i) => (
              <Bar
                key={catKey}
                dataKey={catKey}
                stackId="a"
                fill={`var(--chart-${(i + 1) % 9 || 1})`}
                radius={i === categoryKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                name={catKey}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {projectName}
        </div>
        <div className="text-muted-foreground leading-none">
          You can change categories to custom in project settings
        </div>
      </CardFooter>
    </Card>
  )
}
