// app/(whatever)/components/TimesheetsWeekJourneysMockup.tsx
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, Filter, User2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

type Journey = {
  id: string;
  day: DayKey;

  // ✅ for filters
  site: string;       // e.g. "Site 2"
  weekEnding: string; // yyyy-mm-dd (week end)
  jobsite: string;    // e.g. "Block A"

  workerName: string;
  jobNumber: string;

  departBase?: string;
  arriveSite?: string;
  finishSite?: string;
  arriveBase?: string;
  stopLunch?: string;
  resumeWork?: string;
};

const DAYS: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function dayLabel(d: DayKey) {
  const m: Record<DayKey, string> = {
    SUN: "Sun",
    MON: "Mon",
    TUE: "Tue",
    WED: "Wed",
    THU: "Thu",
    FRI: "Fri",
    SAT: "Sat",
  };
  return m[d];
}

function daySort(a: DayKey, b: DayKey) {
  return DAYS.indexOf(a) - DAYS.indexOf(b);
}

// --- Mock data: 4+ workers, different routes + sites/jobsites, all within the same weekEnding ---
const MOCK_WEEK_ENDING = "2026-02-14";
const MOCK_WEEK: Journey[] = [
  // MON (Site 2)
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Office", day: "MON", workerName: "John Smith", jobNumber: "Office", departBase: "06:00", arriveSite: "06:00", finishSite: "10:00" },
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block A", day: "MON", workerName: "John Smith", jobNumber: "501500", arriveSite: "10:15", finishSite: "17:30", arriveBase: "17:30", stopLunch: "12:00", resumeWork: "12:30" },

  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block C", day: "MON", workerName: "Alex Jones", jobNumber: "204900", departBase: "06:10", arriveSite: "07:05", finishSite: "11:50" },
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block A", day: "MON", workerName: "Alex Jones", jobNumber: "501500", arriveSite: "12:10", finishSite: "16:40", arriveBase: "17:25", stopLunch: "12:00", resumeWork: "12:30" },

  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Plant Room", day: "MON", workerName: "Mark Taylor", jobNumber: "U-FIX", departBase: "07:20", arriveSite: "08:00", finishSite: "16:00", stopLunch: "12:00", resumeWork: "12:30" },

  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block B", day: "MON", workerName: "Sam Patel", jobNumber: "ELEC-77", departBase: "07:00", arriveSite: "07:45", finishSite: "15:30", arriveBase: "16:10", stopLunch: "12:10", resumeWork: "12:40" },

  // TUE (Site 2)
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block A", day: "TUE", workerName: "John Smith", jobNumber: "501500", departBase: "06:00", arriveSite: "07:10", finishSite: "10:00" },
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block C", day: "TUE", workerName: "John Smith", jobNumber: "204900", arriveSite: "10:15", finishSite: "17:30", arriveBase: "18:05", stopLunch: "12:05", resumeWork: "12:35" },

  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block C", day: "TUE", workerName: "Alex Jones", jobNumber: "204900", departBase: "06:05", arriveSite: "07:00", finishSite: "16:15", arriveBase: "17:05", stopLunch: "12:00", resumeWork: "12:30" },

  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Plant Room", day: "TUE", workerName: "Mark Taylor", jobNumber: "U-FIX", departBase: "07:25", arriveSite: "08:05", finishSite: "12:15" },
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block B", day: "TUE", workerName: "Mark Taylor", jobNumber: "U-FIX-2", arriveSite: "12:45", finishSite: "16:20", stopLunch: "12:15", resumeWork: "12:45" },

  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block B", day: "TUE", workerName: "Sam Patel", jobNumber: "ELEC-77", departBase: "06:55", arriveSite: "07:40", finishSite: "11:55" },
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block A", day: "TUE", workerName: "Sam Patel", jobNumber: "ELEC-88", arriveSite: "12:15", finishSite: "16:05", arriveBase: "16:50", stopLunch: "11:55", resumeWork: "12:15" },

  // WED
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block C", day: "WED", workerName: "John Smith", jobNumber: "204900", departBase: "06:10", arriveSite: "07:20", finishSite: "16:40", arriveBase: "17:20", stopLunch: "12:00", resumeWork: "12:30" },
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Office", day: "WED", workerName: "Alex Jones", jobNumber: "Office", departBase: "06:00", arriveSite: "06:00", finishSite: "09:30" },
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block A", day: "WED", workerName: "Alex Jones", jobNumber: "501500", arriveSite: "09:50", finishSite: "16:10", arriveBase: "17:00", stopLunch: "12:10", resumeWork: "12:40" },

  // THU
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Block A", day: "THU", workerName: "John Smith", jobNumber: "501500", departBase: "06:00", arriveSite: "07:05", finishSite: "11:10" },
  { id: uid(), weekEnding: MOCK_WEEK_ENDING, site: "Site 2", jobsite: "Office", day: "THU", workerName: "John Smith", jobNumber: "Office", arriveSite: "11:30", finishSite: "15:30", arriveBase: "16:00", stopLunch: "12:10", resumeWork: "12:40" },
];

// ✅ extra options just to show filter working (even if empty results)
const ALL_SITES = ["Site 1", "Site 2", "Site 3"];
const ALL_JOBSITES = ["Office", "Block A", "Block B", "Block C", "Plant Room", "Warehouse"];
const ALL_WORKERS = ["John Smith", "Alex Jones", "Mark Taylor", "Sam Patel", "Chris Brown"];
const ALL_WEEKS = ["2026-02-07", "2026-02-14", "2026-02-21"];

export default function TimesheetsWeekJourneysMockup() {
  // ✅ mock filter state
  const [siteFilter, setSiteFilter] = React.useState<string>("__ALL__");
  const [weekFilter, setWeekFilter] = React.useState<string>(MOCK_WEEK_ENDING);
  const [workerFilter, setWorkerFilter] = React.useState<string>("__ALL__");
  const [jobsiteFilter, setJobsiteFilter] = React.useState<string>("__ALL__");

  const rows = React.useMemo(() => {
    const filtered = MOCK_WEEK.filter((r) => {
      if (weekFilter !== "__ALL__" && r.weekEnding !== weekFilter) return false;
      if (siteFilter !== "__ALL__" && r.site !== siteFilter) return false;
      if (workerFilter !== "__ALL__" && r.workerName !== workerFilter) return false;
      if (jobsiteFilter !== "__ALL__" && r.jobsite !== jobsiteFilter) return false;
      return true;
    });

    // sort by day, then worker, then time-ish
    const copy = [...filtered];
    copy.sort((a, b) => {
      const d = daySort(a.day, b.day);
      if (d !== 0) return d;
      const w = a.workerName.localeCompare(b.workerName);
      if (w !== 0) return w;
      const ta = (a.departBase || a.arriveSite || "");
      const tb = (b.departBase || b.arriveSite || "");
      return ta.localeCompare(tb);
    });
    return copy;
  }, [siteFilter, weekFilter, workerFilter, jobsiteFilter]);

  const grouped = React.useMemo(() => {
    const m: Record<DayKey, Journey[]> = {
      SUN: [],
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
      SAT: [],
    };
    rows.forEach((r) => m[r.day].push(r));
    return m;
  }, [rows]);

  const clearFilters = () => {
    setSiteFilter("__ALL__");
    setWorkerFilter("__ALL__");
    setJobsiteFilter("__ALL__");
    setWeekFilter(MOCK_WEEK_ENDING);
  };

  return (
    <div className="w-full mx-auto px-2 sm:px-4 py-4 max-w-[98vw] 2xl:max-w-[1700px]">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-2 py-3 px-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
              Timesheets — Weekly Journeys (Mockup)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              One row = one worker journey. Add web-friendly filters: Site, Week, Worker, Jobsite.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            Week ending <span className="text-foreground font-medium">{weekFilter}</span>
            <Badge variant="secondary" className="ml-2">
              {rows.length} journeys
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-3 sm:px-4">
          {/* ✅ Filters mockup */}
          <Card className="mb-3 border-muted bg-muted/30">
            <CardContent className="px-3 py-3 sm:px-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filters
                </div>

                <div className="flex flex-1 flex-wrap gap-2">
                  {/* Week */}
                  <Select value={weekFilter} onValueChange={setWeekFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-[200px]">
                      <SelectValue placeholder="Week ending" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All weeks</SelectItem>
                      {ALL_WEEKS.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Site */}
                  <Select value={siteFilter} onValueChange={setSiteFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px]">
                      <SelectValue placeholder="Site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All sites</SelectItem>
                      {ALL_SITES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Worker */}
                  <Select value={workerFilter} onValueChange={setWorkerFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-[220px]">
                      <SelectValue placeholder="Worker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All workers</SelectItem>
                      {ALL_WORKERS.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Jobsite */}
                  <Select value={jobsiteFilter} onValueChange={setJobsiteFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-[220px]">
                      <SelectValue placeholder="Jobsite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All jobsites</SelectItem>
                      {ALL_JOBSITES.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing header fields (optional, keep) */}
          <div className="mb-3 grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Site</div>
              <Input value={siteFilter === "__ALL__" ? "All sites" : siteFilter} readOnly />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Worker</div>
              <Input value={workerFilter === "__ALL__" ? "All workers" : workerFilter} readOnly />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Week ending</div>
              <Input value={weekFilter === "__ALL__" ? "All weeks" : weekFilter} readOnly />
            </div>
          </div>

          <div className="rounded-md border bg-background">
            <ScrollArea className="h-[72vh]">
              <div className="p-2">
                <Table className="w-full table-fixed text-xs sm:text-sm min-w-[1150px]">
                  <colgroup>
                    <col className="w-[90px]" />
                    <col className="w-[200px]" />
                    <col className="w-[160px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                  </colgroup>

                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Day</TableHead>
                      <TableHead>
                        <div className="inline-flex items-center gap-2">
                          <User2 className="h-4 w-4 text-muted-foreground" />
                          Worker
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Job number</TableHead>
                      <TableHead className="text-center">Depart base</TableHead>
                      <TableHead className="text-center">Arrive site</TableHead>
                      <TableHead className="text-center">Finish site</TableHead>
                      <TableHead className="text-center">Arrive base</TableHead>
                      <TableHead className="text-center">Stop lunch</TableHead>
                      <TableHead className="text-center">Resume work</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {DAYS.map((d) => {
                      const dayRows = grouped[d];
                      if (!dayRows || dayRows.length === 0) return null;

                      return (
                        <React.Fragment key={d}>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={9} className="py-2">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold">{dayLabel(d)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {dayRows.length} journey record{dayRows.length === 1 ? "" : "s"}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>

                          {dayRows.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="text-center text-muted-foreground">
                                {dayLabel(r.day)}
                              </TableCell>
                              <TableCell className="font-medium">{r.workerName}</TableCell>
                              <TableCell className="text-center">{r.jobNumber || "—"}</TableCell>
                              <TableCell className="text-center">{r.departBase || "—"}</TableCell>
                              <TableCell className="text-center">{r.arriveSite || "—"}</TableCell>
                              <TableCell className="text-center">{r.finishSite || "—"}</TableCell>
                              <TableCell className="text-center">{r.arriveBase || "—"}</TableCell>
                              <TableCell className="text-center">{r.stopLunch || "—"}</TableCell>
                              <TableCell className="text-center">{r.resumeWork || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      );
                    })}

                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                          No journeys match these filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="mt-3 text-xs text-muted-foreground">
                  Multi-site days are represented as multiple rows per worker. Example:{" "}
                  <span className="font-medium text-foreground">Finish site 10:00</span>{" "}
                  then next journey{" "}
                  <span className="font-medium text-foreground">Arrive site 10:15</span>{" "}
                  (next job/site).
                </div>
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
