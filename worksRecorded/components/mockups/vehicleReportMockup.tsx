// app/(whatever)/components/WeeklyVehicleReportsMockupF25.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Filter, Car, ChevronDown, ChevronUp } from "lucide-react";

type DayKey = "Sun" | "Mon" | "Tues" | "Weds" | "Thurs" | "Fri" | "Sat";
type CheckStatus = "OK" | "N/A" | "Issue" | "—";

const DAYS: DayKey[] = ["Sun", "Mon", "Tues", "Weds", "Thurs", "Fri", "Sat"];

type CheckItem = {
  id: string;
  label: string;
  short?: string;
};

const CHECKS: CheckItem[] = [
  { id: "oil", label: "Oil", short: "Oil" },
  { id: "coolant", label: "Coolant levels", short: "Coolant" },
  { id: "wheels", label: "Wheels / wheel nuts", short: "Wheels" },
  { id: "tyre_tread", label: "Tyres tread / condition", short: "Tread" },
  { id: "tyre_pressure", label: "Tyres pressure", short: "Pressure" },
  { id: "lights", label: "Lights (working order)", short: "Lights" },
  { id: "brakes", label: "Brakes (no sound on use)", short: "Brakes" },
  { id: "windscreen", label: "Windscreen (no cracks/chips)", short: "Glass" },
  { id: "mirrors", label: "Glass / mirrors (undamaged)", short: "Mirrors" },
  { id: "bodywork", label: "Bodywork (no loose/new damage)", short: "Body" },
  { id: "clutch", label: "Clutch (working order)", short: "Clutch" },
  { id: "washers", label: "Windscreen washers", short: "Wash" },
  { id: "wipers", label: "Windscreen wipers", short: "Wipers" },
  { id: "seatbelts", label: "Seatbelts (working order)", short: "Belts" },
  { id: "clean", label: "Vehicle clean and tidy", short: "Clean" },
];

type VehicleReport = {
  id: string;
  weekEnding: string; // yyyy-mm-dd (Saturday)
  site: string;
  driver: string;
  registration: string;
  vehicle: string; // make/model
  mileage: number;

  // checkId -> day -> status
  checks: Record<string, Record<DayKey, CheckStatus>>;

  // optional notes (in the real flow this could be a text area)
  issuesSummary?: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function makeBlankChecks(): VehicleReport["checks"] {
  const perCheck = Object.fromEntries(
    CHECKS.map((c) => [
      c.id,
      Object.fromEntries(DAYS.map((d) => [d, "—" as CheckStatus])),
    ])
  ) as VehicleReport["checks"];
  return perCheck;
}

function pill(status: CheckStatus) {
  if (status === "OK") return "bg-green-50 text-green-700 border-green-200";
  if (status === "Issue") return "bg-red-50 text-red-700 border-red-200";
  if (status === "N/A") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-muted/30 text-foreground border-border";
}

function StatusPill({ status }: { status: CheckStatus }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[52px] items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        pill(status)
      )}
    >
      {status}
    </span>
  );
}

function completionPct(r: VehicleReport) {
  // % of cells that are OK (ignoring N/A and —)
  let ok = 0;
  let total = 0;

  for (const c of CHECKS) {
    for (const d of DAYS) {
      const v = r.checks[c.id]?.[d] ?? "—";
      if (v === "—") continue;
      if (v === "N/A") continue;
      total += 1;
      if (v === "OK") ok += 1;
    }
  }
  if (total === 0) return 0;
  return Math.round((ok / total) * 100);
}

function issuesCount(r: VehicleReport) {
  let count = 0;
  for (const c of CHECKS) {
    for (const d of DAYS) {
      if (r.checks[c.id]?.[d] === "Issue") count += 1;
    }
  }
  return count;
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full border bg-muted/20">
      <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------- Mock data (several vehicles) ----------
const MOCK: VehicleReport[] = (() => {
  const a: VehicleReport = {
    id: uid(),
    weekEnding: "2026-02-14",
    site: "Site 2",
    driver: "John Smith",
    registration: "LOX-2714",
    vehicle: "Ford Transit",
    mileage: 62140,
    checks: makeBlankChecks(),
    issuesSummary: "Tue: low tyre pressure noted. Fri: washer fluid topped up.",
  };
  // sprinkle statuses
  DAYS.forEach((d) => {
    a.checks.oil[d] = "OK";
    a.checks.coolant[d] = "OK";
    a.checks.lights[d] = "OK";
    a.checks.brakes[d] = "OK";
    a.checks.seatbelts[d] = "OK";
    a.checks.clean[d] = d === "Sat" ? "OK" : "OK";
    a.checks.tyre_tread[d] = "OK";
    a.checks.tyre_pressure[d] = d === "Tues" ? "Issue" : "OK";
  });

  const b: VehicleReport = {
    id: uid(),
    weekEnding: "2026-02-14",
    site: "Site 2",
    driver: "Alex Jones",
    registration: "LOX-8841",
    vehicle: "VW Transporter",
    mileage: 48810,
    checks: makeBlankChecks(),
    issuesSummary: "Weds: windscreen chip reported.",
  };
  DAYS.forEach((d) => {
    b.checks.oil[d] = "OK";
    b.checks.coolant[d] = "OK";
    b.checks.wipers[d] = "OK";
    b.checks.washers[d] = "OK";
    b.checks.tyre_pressure[d] = "OK";
    b.checks.tyre_tread[d] = "OK";
    b.checks.lights[d] = "OK";
    b.checks.windscreen[d] = d === "Weds" ? "Issue" : "OK";
    b.checks.mirrors[d] = "OK";
    b.checks.clean[d] = d === "Sun" ? "—" : "OK";
  });

  const c: VehicleReport = {
    id: uid(),
    weekEnding: "2026-02-14",
    site: "Site 1",
    driver: "Sam Patel",
    registration: "LOX-5502",
    vehicle: "Nissan Navara",
    mileage: 74205,
    checks: makeBlankChecks(),
    issuesSummary: "Thurs: bodywork scratch (photo logged).",
  };
  DAYS.forEach((d) => {
    c.checks.oil[d] = "OK";
    c.checks.coolant[d] = "OK";
    c.checks.wheels[d] = "OK";
    c.checks.brakes[d] = "OK";
    c.checks.bodywork[d] = d === "Thurs" ? "Issue" : "OK";
    c.checks.clean[d] = d === "Sat" ? "OK" : "OK";
    c.checks.seatbelts[d] = "OK";
    c.checks.tyre_tread[d] = "OK";
    c.checks.tyre_pressure[d] = "OK";
    c.checks.lights[d] = "OK";
  });

  const d: VehicleReport = {
    id: uid(),
    weekEnding: "2026-02-14",
    site: "Depot",
    driver: "Mark Taylor",
    registration: "LOX-1930",
    vehicle: "Mercedes Sprinter",
    mileage: 90512,
    checks: makeBlankChecks(),
    issuesSummary: "Mon: wiper blade replaced. Sat: vehicle cleaned.",
  };
  DAYS.forEach((day) => {
    d.checks.oil[day] = "OK";
    d.checks.coolant[day] = "OK";
    d.checks.lights[day] = "OK";
    d.checks.brakes[day] = "OK";
    d.checks.washers[day] = "OK";
    d.checks.wipers[day] = day === "Mon" ? "Issue" : "OK";
    d.checks.clean[day] = day === "Sat" ? "OK" : "OK";
    d.checks.tyre_tread[day] = "OK";
    d.checks.tyre_pressure[day] = "OK";
    d.checks.windscreen[day] = "OK";
  });

  return [a, b, c, d];
})();

// ---------- Component ----------
export default function WeeklyVehicleReportsMockupF25() {
  // filters
  const [week, setWeek] = React.useState<string>("2026-02-14");
  const [site, setSite] = React.useState<string>("__ALL__");
  const [driver, setDriver] = React.useState<string>("__ALL__");
  const [q, setQ] = React.useState<string>("");

  const weekOptions = React.useMemo(() => {
    return Array.from(new Set(MOCK.map((r) => r.weekEnding))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, []);

  const siteOptions = React.useMemo(() => {
    return Array.from(new Set(MOCK.map((r) => r.site))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, []);

  const driverOptions = React.useMemo(() => {
    return Array.from(new Set(MOCK.map((r) => r.driver))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return MOCK.filter((r) => {
      if (week !== "__ALL__" && r.weekEnding !== week) return false;
      if (site !== "__ALL__" && r.site !== site) return false;
      if (driver !== "__ALL__" && r.driver !== driver) return false;
      if (s) {
        const hit =
          r.driver.toLowerCase().includes(s) ||
          r.registration.toLowerCase().includes(s) ||
          r.vehicle.toLowerCase().includes(s) ||
          r.site.toLowerCase().includes(s);
        if (!hit) return false;
      }
      return true;
    });
  }, [week, site, driver, q]);

  const [openId, setOpenId] = React.useState<string | null>(filtered[0]?.id ?? null);

  React.useEffect(() => {
    // if currently open card was filtered out, open first
    if (openId && filtered.some((r) => r.id === openId)) return;
    setOpenId(filtered[0]?.id ?? null);
  }, [filtered, openId]);

  const clear = () => {
    setWeek("2026-02-14");
    setSite("__ALL__");
    setDriver("__ALL__");
    setQ("");
  };

  return (
    <div className="w-full mx-auto px-2 sm:px-4 py-4 max-w-[98vw] 2xl:max-w-[1700px]">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-2 py-3 px-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
              Weekly Vehicle Reports — F25 
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Web view: filters + vehicle cards + expandable weekly checks grid.
            </p>
          </div>

          <Badge variant="secondary" className="self-start sm:self-auto">
            {filtered.length} vehicle report{filtered.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>

        <CardContent className="px-3 pb-3 sm:px-4">
          {/* Filters */}
          <Card className="mb-3 border-muted bg-muted/30">
            <CardContent className="px-3 py-3 sm:px-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filters
                </div>

                <div className="flex flex-1 flex-wrap gap-2">
                  <Select value={week} onValueChange={setWeek}>
                    <SelectTrigger className="h-9 w-full sm:w-[200px]">
                      <SelectValue placeholder="Week ending" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All weeks</SelectItem>
                      {weekOptions.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={site} onValueChange={setSite}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px]">
                      <SelectValue placeholder="Site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All sites</SelectItem>
                      {siteOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={driver} onValueChange={setDriver}>
                    <SelectTrigger className="h-9 w-full sm:w-[220px]">
                      <SelectValue placeholder="Driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All drivers</SelectItem>
                      {driverOptions.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search reg / vehicle / driver…"
                    className="h-9 w-full sm:w-[260px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clear}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards list */}
          <ScrollArea className="h-[72vh] rounded-md border bg-background">
            <div className="space-y-3 p-2 sm:p-3">
              {filtered.map((r) => {
                const pct = completionPct(r);
                const issues = issuesCount(r);
                const open = openId === r.id;

                return (
                  <Card
                    key={r.id}
                    className="border-border/80 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="flex flex-col gap-2 py-3 px-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <div className="text-base font-semibold">
                            {r.registration}
                          </div>
                          <Badge variant="secondary">{r.vehicle}</Badge>
                          <Badge variant="outline">{r.site}</Badge>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            Driver:{" "}
                            <span className="text-foreground font-medium">
                              {r.driver}
                            </span>
                          </span>
                          <span>
                            Mileage:{" "}
                            <span className="text-foreground font-medium">
                              {r.mileage.toLocaleString()}
                            </span>
                          </span>
                          <span>
                            Week ending:{" "}
                            <span className="text-foreground font-medium">
                              {r.weekEnding}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-stretch gap-2 sm:items-end">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "border",
                              issues > 0
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-green-50 text-green-700 border-green-200"
                            )}
                            variant="secondary"
                          >
                            {issues > 0 ? `${issues} issue(s)` : "No issues"}
                          </Badge>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setOpenId(open ? null : r.id)}
                            className="gap-2"
                          >
                            {open ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Hide checks
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                View checks
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="w-full sm:w-[240px]">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Completion</span>
                            <span className="text-foreground font-medium">
                              {pct}%
                            </span>
                          </div>
                          <Bar pct={pct} />
                        </div>
                      </div>
                    </CardHeader>

                    {open && (
                      <CardContent className="px-2 pb-3 sm:px-4">
                        {/* Web-friendly weekly grid: checks as rows, days as columns */}
                        <div className="overflow-x-auto">
                          <Table className="min-w-[980px] table-fixed text-xs sm:text-sm">
                            <colgroup>
                              <col className="w-[280px]" />
                              {DAYS.map((d) => (
                                <col key={d} className="w-[100px]" />
                              ))}
                            </colgroup>

                            <TableHeader>
                              <TableRow>
                                <TableHead>Check</TableHead>
                                {DAYS.map((d) => (
                                  <TableHead key={d} className="text-center">
                                    {d}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {CHECKS.map((c) => (
                                <TableRow key={c.id}>
                                  <TableCell className="whitespace-normal">
                                    <div className="font-medium">{c.label}</div>
                                    {c.short ? (
                                      <div className="text-[11px] text-muted-foreground">
                                        {c.short}
                                      </div>
                                    ) : null}
                                  </TableCell>

                                  {DAYS.map((d) => (
                                    <TableCell key={`${c.id}-${d}`} className="text-center">
                                      <StatusPill status={r.checks[c.id]?.[d] ?? "—"} />
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {r.issuesSummary ? (
                          <div className="mt-3 rounded-md border bg-muted/20 p-3 text-sm">
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Issues / comments (mock)
                            </div>
                            <div className="text-sm">{r.issuesSummary}</div>
                          </div>
                        ) : null}

                        <div className="mt-3 text-xs text-muted-foreground">
                          In the real flow you can swap the “OK/Issue/N/A” pills to
                          checkboxes or quick buttons, and attach photos to “Issue”
                          cells.
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              {filtered.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No vehicle reports match your filters.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
