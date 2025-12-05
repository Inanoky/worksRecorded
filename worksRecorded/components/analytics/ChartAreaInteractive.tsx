"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useIsMobile } from "@/lib/utils/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Point = { date: string | Date; cost: number };

const chartConfig = {
  cost: { label: "Cost", color: "var(--primary)" },
} satisfies ChartConfig;

/** Format as YYYY-MM-DD using *local* time (stable day keys). */
function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse incoming date (string or Date) to a Date (local). */
function toDateLocal(v: string | Date): Date {
  return typeof v === "string" ? new Date(v) : v;
}

/** Build a day-by-day series from start..end (inclusive), filling zeros for missing days. */
function padDailySeries(
  raw: Point[],
  start: Date,
  end: Date
): { date: string; cost: number }[] {
  // Aggregate costs by day key in case multiple items share a date
  const byDay = new Map<string, number>();
  for (const r of raw) {
    const d = toDateLocal(r.date);
    const key = ymdLocal(d);
    byDay.set(key, (byDay.get(key) ?? 0) + (Number(r.cost) || 0));
  }

  const out: { date: string; cost: number }[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    const key = ymdLocal(cursor);
    out.push({ date: key, cost: byDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function ChartAreaInteractive({ data }: { data: Point[] }) {
  const chartData = data ?? [];

  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState<"3mo" | "30d" | "7d">("3mo");

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  // Window anchored to *today* (inclusive)
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  if (timeRange === "7d") {
    start.setDate(start.getDate() - 7);
  } else if (timeRange === "30d") {
    start.setDate(start.getDate() - 30);
  } else {
    // "3mo" — exactly 3 calendar months back
    start.setMonth(start.getMonth() - 3);
  }
  start.setHours(0, 0, 0, 0);

  // Pad the range so the line always extends to "today", with 0s for missing days
  const paddedData = padDailySeries(chartData, start, end);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Cost overview</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Total for the selected period</span>
          <span className="@[540px]/card:hidden">Selected period</span>
        </CardDescription>

        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(v) => v && setTimeRange(v as typeof timeRange)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="3mo">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="3mo" className="rounded-lg">Last 3 months</SelectItem>
              <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
              <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart
            data={paddedData}
            margin={{ left: 12, right: 12, top: 12, bottom: 25 }}
          >
            <defs>
              <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-cost)" stopOpacity={0.9} />
                <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const d = new Date(value as string);
                return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
            />

            {/* Keep baseline at 0 so a month of zeros is a flat line on x-axis */}
            <YAxis
              domain={[0, "dataMax"]}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />

            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value as string).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />

            <Area
              dataKey="cost"
              type="natural"
              fill="url(#fillCost)"
              stroke="var(--color-cost)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
