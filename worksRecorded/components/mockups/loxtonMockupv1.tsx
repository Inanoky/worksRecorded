// app/(whatever)/components/MewpChecklistF72Dummy.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Status = "PASS" | "FAIL" | "—";

type CheckItem = {
  id: string;
  label: string;
};

type DayEntry = {
  dayKey: string; // Mon/Tues/...
  time?: string;
  signature?: string;
  statuses: Record<string, Status>; // checkId -> PASS/FAIL/—
};

const CHECKS: CheckItem[] = [
  { id: "cert", label: "Is the Test Certificate in date?" },
  { id: "ipaf", label: "Is the operator trained e.g. has IPAF certificate?" },
  { id: "steer", label: "Does the equipment operate and steer correctly?" },
  { id: "fuel", label: "Is fuel / charge level satisfactory?" },
  { id: "sound", label: "Is there any abnormal sound during operation?" },
  { id: "battery", label: "Is the battery in working condition?" },
  { id: "tyres", label: "Are the tyres in good condition?" },
  { id: "leaks", label: "Are there any diesel / oil leaks?" },
  { id: "lights", label: "Are all the lights functioning correctly?" },
  { id: "alarm", label: "Is the alarm system working properly?" },
  { id: "brakes", label: "Are the brakes working properly?" },
  { id: "hydraulics", label: "Is there any leak in hydraulics?" },
  { id: "labels", label: "Are drive controls operational and accurately labelled?" },
  { id: "estop", label: "Is the emergency stop button visible and working properly?" },
  { id: "structure", label: "Is the structure free from any damage?" },
  { id: "platform", label: "Is work platform clean, dry and clear of debris?" },
  { id: "guardrails", label: "Are all guardrails sound and in place, incl basket and gate door." },
];

const DAYS = ["Mon", "Tues", "Weds", "Thurs", "Fri", "Sat", "Sun"] as const;

function StatusPill({ value }: { value: Status }) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset";
  if (value === "PASS") {
    return (
      <span className={cn(base, "bg-green-50 text-green-700 ring-green-200")}>
        PASS
      </span>
    );
  }
  if (value === "FAIL") {
    return (
      <span className={cn(base, "bg-red-50 text-red-700 ring-red-200")}>
        FAIL
      </span>
    );
  }
  return (
    <span className={cn(base, "bg-muted/40 text-muted-foreground ring-border")}>
      —
    </span>
  );
}

function makeBlankDay(dayKey: string): DayEntry {
  return {
    dayKey,
    time: "",
    signature: "",
    statuses: Object.fromEntries(CHECKS.map((c) => [c.id, "—"])) as Record<
      string,
      Status
    >,
  };
}

// Small dummy data (mix pass/fail just to show how it looks)
const DUMMY_WEEK: DayEntry[] = [
  {
    ...makeBlankDay("Mon"),
    time: "07:10",
    signature: "J. Smith",
    statuses: {
      cert: "PASS",
      ipaf: "PASS",
      steer: "PASS",
      fuel: "PASS",
      sound: "PASS",
      battery: "PASS",
      tyres: "PASS",
      leaks: "PASS",
      lights: "PASS",
      alarm: "PASS",
      brakes: "PASS",
      hydraulics: "PASS",
      labels: "PASS",
      estop: "PASS",
      structure: "PASS",
      platform: "PASS",
      guardrails: "PASS",
    },
  },
  {
    ...makeBlankDay("Tues"),
    time: "07:05",
    signature: "J. Smith",
    statuses: {
      ...makeBlankDay("Tues").statuses,
      tyres: "FAIL",
      leaks: "FAIL",
    },
  },
  makeBlankDay("Weds"),
  makeBlankDay("Thurs"),
  makeBlankDay("Fri"),
  makeBlankDay("Sat"),
  makeBlankDay("Sun"),
];

export default function MewpChecklistF72Dummy() {
  const [activeDay, setActiveDay] = React.useState<(typeof DAYS)[number]>("Mon");

  // Meta (dummy fields)
  const weekCommencing = "12 Feb 2026";
  const site = "Site 2";
  const typeOfMewp = "Scissor lift";
  const model = "Genie GS-1932";
  const serialNumber = "GS19-UK-029184";

  const dayEntry = React.useMemo(
    () => DUMMY_WEEK.find((d) => d.dayKey === activeDay) ?? DUMMY_WEEK[0],
    [activeDay]
  );

  const passCount = React.useMemo(() => {
    const vals = Object.values(dayEntry.statuses);
    return vals.filter((v) => v === "PASS").length;
  }, [dayEntry]);

  const failCount = React.useMemo(() => {
    const vals = Object.values(dayEntry.statuses);
    return vals.filter((v) => v === "FAIL").length;
  }, [dayEntry]);

  return (
    <div className="w-full mx-auto px-2 sm:px-4 py-4 max-w-6xl">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-2 py-3 px-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
              MEWP Checklist F72
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Prior to use, the operator must check the following items.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-md border bg-muted/30 px-2 py-1">
              Week: <span className="text-foreground font-medium">{weekCommencing}</span>
            </span>
            <span className="rounded-md border bg-muted/30 px-2 py-1">
              Site: <span className="text-foreground font-medium">{site}</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-3 sm:px-4">
          {/* Meta row (styled like “table-ish” info) */}
          <div className="mb-3 grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-3">
            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Type of MEWP</div>
              <div className="font-medium">{typeOfMewp}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Model</div>
              <div className="font-medium">{model}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Serial Number</div>
              <div className="font-medium">{serialNumber}</div>
            </div>
          </div>

          <Tabs value={activeDay} onValueChange={(v) => setActiveDay(v as any)}>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="self-start">
                {DAYS.map((d) => (
                  <TabsTrigger key={d} value={d}>
                    {d}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border bg-background px-2 py-1">
                  Time:{" "}
                  <span className="text-foreground font-medium">
                    {dayEntry.time || "—"}
                  </span>
                </span>
                <span className="rounded-md border bg-background px-2 py-1">
                  Signature:{" "}
                  <span className="text-foreground font-medium">
                    {dayEntry.signature || "—"}
                  </span>
                </span>
                <span className="rounded-md border bg-background px-2 py-1">
                  PASS:{" "}
                  <span className="text-foreground font-medium">{passCount}</span>
                </span>
                <span className="rounded-md border bg-background px-2 py-1">
                  FAIL:{" "}
                  <span className="text-foreground font-medium">{failCount}</span>
                </span>
              </div>
            </div>

            {DAYS.map((d) => (
              <TabsContent key={d} value={d} className="mt-0">
                {/* MOBILE: stacked cards */}
                <div className="space-y-2 sm:hidden">
                  {CHECKS.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border bg-muted/30 p-2 text-[11px]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium leading-snug">{c.label}</div>
                        <StatusPill value={dayEntry.statuses[c.id] ?? "—"} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* DESKTOP: table like SiteDiaryList */}
                <div className="hidden sm:block">
                  <ScrollArea className="h-[55vh] rounded-md border bg-background">
                    <div className="p-2">
                      <Table className="table-fixed min-w-[900px] text-xs sm:text-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[68%]">Check item</TableHead>
                            <TableHead className="w-[12%] text-center">Status</TableHead>
                            <TableHead className="w-[20%]">Notes</TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {CHECKS.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="align-top px-3 py-2 whitespace-normal break-words">
                                <div className="font-medium">{c.label}</div>
                              </TableCell>

                              <TableCell className="align-top px-3 py-2 text-center">
                                <StatusPill value={dayEntry.statuses[c.id] ?? "—"} />
                              </TableCell>

                              <TableCell className="align-top px-3 py-2 whitespace-normal break-words text-muted-foreground">
                                {/* Dummy placeholder for later */}
                                —
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>

                {/* Footer line (optional, keeps it “checklist-like”) */}
                <div className="mt-3 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                  If any item fails, tag the MEWP out of service and report immediately.
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
