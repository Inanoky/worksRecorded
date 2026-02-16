// app/(whatever)/components/MewpChecklistF72ExcelLikeDummy.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DayKey = "Mon" | "Tues" | "Weds" | "Thurs" | "Fri" | "Sat" | "Sun";
type Status = "PASS" | "FAIL" | "—";

const DAYS: DayKey[] = ["Mon", "Tues", "Weds", "Thurs", "Fri", "Sat", "Sun"];

type CheckItem = {
  id: string;
  label: string;
  short?: string;
};

const CHECKS: CheckItem[] = [
  { id: "cert", label: "Is the Test Certificate in date?", short: "Cert" },
  { id: "ipaf", label: "Is the operator trained e.g. has IPAF certificate?", short: "IPAF" },
  { id: "operate", label: "Does the equipment operate and steer correctly?", short: "Ops" },
  { id: "fuel", label: "Is fuel / charge level satisfactory?", short: "Fuel" },
  { id: "sound", label: "Is there any abnormal sound during operation?", short: "Sound" },
  { id: "battery", label: "Is the battery in working condition?", short: "Batt" },
  { id: "tyres", label: "Are the tyres in good condition?", short: "Tyres" },
  { id: "leaks", label: "Are there any diesel / oil leaks?", short: "Leaks" },
  { id: "lights", label: "Are all the lights functioning correctly?", short: "Lights" },
  { id: "alarm", label: "Is the alarm system working properly?", short: "Alarm" },
  { id: "brakes", label: "Are the brakes working properly?", short: "Brakes" },
  { id: "hydraulics", label: "Is there any leak in hydraulics?", short: "Hydro" },
  { id: "labels", label: "Are drive controls operational and accurately labelled?", short: "Labels" },
  { id: "estop", label: "Is the emergency stop button visible and working properly?", short: "E-Stop" },
  { id: "damage", label: "Is the structure free from any damage?", short: "Struct" },
  { id: "platform", label: "Is work platform clean, dry and clear of debris?", short: "Deck" },
  { id: "rails", label: "Are all guardrails sound and in place, incl basket and gate door?", short: "Rails" },
];

type WeekGrid = Record<DayKey, Record<string, Status>>;

function makeBlankWeek(): WeekGrid {
  const blankChecks = Object.fromEntries(CHECKS.map((c) => [c.id, "—" as Status]));
  return Object.fromEntries(DAYS.map((d) => [d, { ...blankChecks }])) as WeekGrid;
}

function CellMark({
  active,
  tone,
}: {
  active: boolean;
  tone: "pass" | "fail";
}) {
  return (
    <div
      className={cn(
        "h-5 w-5 rounded-[4px] border transition",
        active ? "border-foreground/30" : "border-border",
        active && tone === "pass" && "bg-green-100",
        active && tone === "fail" && "bg-red-100"
      )}
    />
  );
}

export default function MewpChecklistF72ExcelLikeDummy2() {
  // Header (dummy)
  const weekCommencing = "12/02/2026";
  const site = "Site 2";
  const typeOfMewp = "Scissor lift";
  const model = "Genie GS-1932";
  const serialNumber = "GS19-UK-029184";

  // ✅ deterministic "random" per page load
  const signaturesByDay = React.useMemo(() => {
    const names = ["John Smith", "Alex Jones"] as const;

    // simple seeded-ish hash from current date/time so it's "random"
    const seed = Date.now() ^ Math.floor(Math.random() * 1e9);
    const pick = (i: number) => names[(seed + i * 9973) % names.length];

    return Object.fromEntries(
      DAYS.map((d, i) => [d, pick(i)])
    ) as Record<DayKey, string>;
  }, []);

  const [grid, setGrid] = React.useState<WeekGrid>(() => {
    const w = makeBlankWeek();
    w.Mon.cert = "PASS";
    w.Mon.ipaf = "PASS";
    w.Tues.tyres = "FAIL";
    w.Tues.leaks = "FAIL";
    return w;
  });

  const toggle = (day: DayKey, checkId: string, value: Status) => {
    setGrid((prev) => {
      const current = prev[day][checkId];
      const next: Status = current === value ? "—" : value;
      return {
        ...prev,
        [day]: {
          ...prev[day],
          [checkId]: next,
        },
      };
    });
  };

  return (
    <TooltipProvider>
      <div className="w-full mx-auto px-2 sm:px-4 py-4 max-w-[98vw] 2xl:max-w-[1700px]">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-col gap-2 py-3 px-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
                MEWP User Checklist — F72
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Prior to use it is the operator&apos;s responsibility to check the following.
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-3 pb-3 sm:px-4">
            {/* Header fields */}
            <div className="mb-3 grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-5">
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Week Commencing</div>
                <div className="font-medium">{weekCommencing}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Site</div>
                <div className="font-medium">{site}</div>
              </div>
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

            <div className="rounded-md border bg-background">
              {/* DESKTOP */}
              <div className="hidden lg:block p-2">
                <Table className="w-full table-fixed text-xs">
                  <colgroup>
                    <col className="w-[80px]" />
                    <col className="w-[80px]" />
                    {CHECKS.map((c) => (
                      <col key={c.id} className="w-[calc((100%-240px)/17)]" />
                    ))}
                    <col className="w-[80px]" />
                  </colgroup>

                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Day</TableHead>
                      <TableHead className="text-center">Time</TableHead>

                      {CHECKS.map((c) => (
                        <TableHead key={c.id} className="p-2 text-center align-bottom">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className="text-[11px] leading-snug font-medium whitespace-normal break-words">
                                  {c.label}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[320px] text-xs">
                              {c.label}
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                      ))}

                      <TableHead className="text-center">Signature</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {DAYS.map((day) => {
                      const checks = grid[day];
                      return (
                        <React.Fragment key={day}>
                          <TableRow>
                            <TableCell rowSpan={2} className="align-middle font-medium text-center">
                              {day}
                            </TableCell>

                            {/* Time spans pass/fail */}
                            <TableCell rowSpan={2} className="align-middle text-muted-foreground text-center">
                              —
                            </TableCell>

                            {CHECKS.map((c) => (
                              <TableCell key={`${day}-${c.id}-pass`} className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggle(day, c.id, "PASS")}
                                  className="inline-flex items-center justify-center"
                                >
                                  <CellMark active={checks[c.id] === "PASS"} tone="pass" />
                                </button>
                              </TableCell>
                            ))}

                            {/* ✅ Signature prepopulated, spans pass/fail */}
                            <TableCell rowSpan={2} className="align-middle text-center">
                              <span className="text-[11px] text-muted-foreground">
                                {signaturesByDay[day]}
                              </span>
                            </TableCell>
                          </TableRow>

                          <TableRow>
                            {CHECKS.map((c) => (
                              <TableCell key={`${day}-${c.id}-fail`} className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggle(day, c.id, "FAIL")}
                                  className="inline-flex items-center justify-center"
                                >
                                  <CellMark active={checks[c.id] === "FAIL"} tone="fail" />
                                </button>
                              </TableCell>
                            ))}
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* MOBILE/TABLET */}
              <div className="lg:hidden">
                <ScrollArea className="h-[70vh]">
                  <div className="p-2">
                    <Table className="table-fixed min-w-[1400px] text-xs sm:text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[90px] text-center">Day</TableHead>
                          <TableHead className="w-[90px] text-center">Time</TableHead>

                          {CHECKS.map((c) => (
                            <TableHead key={c.id} className="w-[120px] p-2 text-center align-bottom">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <div className="text-[11px] leading-snug font-medium break-words whitespace-normal">
                                      {c.label}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[320px] text-xs">
                                  {c.label}
                                </TooltipContent>
                              </Tooltip>
                            </TableHead>
                          ))}

                          <TableHead className="w-[140px] text-center">User Signature</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {DAYS.map((day) => {
                          const checks = grid[day];
                          return (
                            <React.Fragment key={day}>
                              <TableRow>
                                <TableCell rowSpan={2} className="align-middle font-medium">
                                  {day}
                                </TableCell>

                                <TableCell rowSpan={2} className="align-middle text-muted-foreground">
                                  —
                                </TableCell>

                                {CHECKS.map((c) => (
                                  <TableCell key={`${day}-${c.id}-pass`} className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => toggle(day, c.id, "PASS")}
                                      className="inline-flex items-center justify-center"
                                    >
                                      <CellMark active={checks[c.id] === "PASS"} tone="pass" />
                                    </button>
                                  </TableCell>
                                ))}

                                {/* ✅ Signature prepopulated */}
                                <TableCell rowSpan={2} className="align-middle text-center">
                                  <span className="text-[11px] text-muted-foreground">
                                    {signaturesByDay[day]}
                                  </span>
                                </TableCell>
                              </TableRow>

                              <TableRow>
                                {CHECKS.map((c) => (
                                  <TableCell key={`${day}-${c.id}-fail`} className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => toggle(day, c.id, "FAIL")}
                                      className="inline-flex items-center justify-center"
                                    >
                                      <CellMark active={checks[c.id] === "FAIL"} tone="fail" />
                                    </button>
                                  </TableCell>
                                ))}
                              </TableRow>
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
