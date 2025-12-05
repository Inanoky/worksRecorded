"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
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
import { useProject} from "@/components/providers/ProjectProvider";


function renderMonthLabel(props) {
  const {
    x, y, width, height, value,
    fontSize = 16, // whatever default you use
  } = props;

  // Estimate character width (not perfect, but works well for monospace/short labels)
  const charWidth = fontSize * 0.7; // tweak as needed
  const labelWidth = String(value).length * charWidth;

  // Only render if bar is wide enough
  if (width > labelWidth + 8) { // 8px padding for offset
    return (
      <text
        x={x + 8}
        y={y + height / 2}
        fontSize={fontSize}
        fontFamily="var(--font-primary)"
        dominantBaseline="middle"
        fill="white"
        style={{ whiteSpace: "nowrap" }}
      >
        {value}
      </text>
    );
  }
  // else, render nothing
  return null;
}

export function MonthlySpendingsChart({data}) {

    const { projectName } = useProject();

  console.log(JSON.stringify(data))

 

      const chartData = data

      const chartConfig = {
        spendings: {
          label: "Desktop",
          color: "var(--primary)",
        },
        something: {
          label: "Mobile",
          color: "var(--chart-2)",
        },
        label: {
          color: "var(--background)",
        },
      } satisfies ChartConfig





  return (
    <Card >
      <CardHeader>
        <CardTitle>Montly Spendings</CardTitle>
        <CardDescription>Period {chartData[0]?.month} - {chartData[chartData.length - 1]?.month} </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              right: 65,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="month"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}

              tickFormatter={(value) => value.slice(0, 3)}
              hide
            />
            <XAxis dataKey="spendings" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent
                  indicator="line"
                  style={{
                  minWidth: 200,
                  maxWidth: 320,
                  fontSize: "1.2rem",
                  padding: 12,
                  borderRadius: 8,
                }}
              />}
            />
            <Bar
              dataKey="spendings"
              layout="vertical"
              fill="var(--color-spendings)"
              radius={4}
            >
              <LabelList
                dataKey="month"
                position="insideLeft"
                content={renderMonthLabel}
                offset={8}
                className="fill-(--color-label)"
                fontSize={12}
                style={{ fontFamily: "var(--font-primary)"
                   }}

              />
              <LabelList
                dataKey="spendings"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                style={{ fontFamily: "var(--font-primary)" }}
                formatter={(value) =>
                            value != null
                              ? value
                                  .toLocaleString("fr-FR", {
                                    useGrouping: true,
                                  })
                                  .replace(/\s/g, "\u2009") + " €" // The last space is a thin space!
                              : ""
                          }
              />
            </Bar>
          </BarChart>
        </ChartContainer >
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
            {projectName}
        </div>
        <div className="text-muted-foreground leading-none">
          Showing latest cost spendings
        </div>
      </CardFooter>
    </Card>
  )
}
