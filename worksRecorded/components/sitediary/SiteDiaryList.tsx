// calendar.tsx
"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import DialogWindow from "@/components/sitediary/DialogWindow";
import {
  getFilledDays,
  getSitediaryRecordsBySiteIdForExcel,
} from "@/server/actions/site-diary-actions";
import { generateSiteDiaryPdf } from "@/server/actions/pdfBuilderForFrontend";
import * as XLSX from "xlsx";
import {
  CalendarIcon,
  Filter,
  Images,
  Loader2,
} from "lucide-react";
import TourRunner from "@/components/joyride/TourRunner";
import { steps_dashboard_siteid_site_diary_completed } from "@/components/joyride/JoyRideSteps";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ImageGallery from "@/components/sitediary/ImageGallery";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WhatsAppIcon = ({ size = 22 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 32 32"
  >
    <path
      d="M16 3C9.383 3 4 8.383 4 15c0 2.383.699 4.699 2.016 6.699L4 29l7.516-1.984C13.301 28.301 14.699 29 17 29c6.617 0 12-5.383 12-12S22.617 3 16 3z"
      fill="#e0e0e0"
    />
    <path
      d="M16 5C10.477 5 6 9.477 6 15c0 2.148.668 4.172 1.926 5.918l.309.414-1.223 4.602 4.711-1.234.402.238A9.89 9.89 0 0016 25c5.523 0 10-4.477 10-10S21.523 5 16 5z"
      fill="#fff"
    />
    <path
      d="M16 7C11.589 7 8 10.589 8 15c0 1.91.637 3.773 1.781 5.25l.285.371-.73 2.738 2.797-.734.359.211A8.02 8.02 0 0016 23c4.411 0 8-3.589 8-8s-3.589-8-8-8z"
      fill="#25D366"
    />
    <path
      d="M21.395 17.695c-.309-.152-1.828-.914-2.113-1.016-.285-.102-.492-.152-.699.152-.207.309-.801 1.016-.984 1.223-.18.207-.363.234-.672.086-.309-.152-1.305-.48-2.484-1.53-.918-.812-1.539-1.812-1.723-2.121-.18-.309-.02-.484.133-.636.137-.137.309-.359.465-.539.156-.18.207-.309.309-.512.102-.203.051-.383-.024-.539-.078-.156-.699-1.68-.957-2.297-.254-.617-.512-.531-.699-.539-.18-.008-.383-.008-.586-.008-.203 0-.52.074-.793.359-.27.285-1.043 1.02-1.043 2.484 0 1.465 1.066 2.879 1.215 3.074.152.195 2.09 3.195 5.074 4.488.711.305 1.266.488 1.699.625.711.223 1.352.191 1.863.117.57-.082 1.828-.742 2.086-1.453.258-.711.258-1.324.18-1.453-.078-.133-.285-.207-.609-.359z"
      fill="#fff"
    />
  </svg>
);

type DiaryRow = {
  id?: string;
  Date: string | Date;
  Location?: string | null;
  Works?: string | null;
  Units?: string | null;
  Amounts?: number | null;
  WorkersInvolved?: number | null;
  TimeInvolved?: number | null;
  Comments?: string | null;
};

type DayGroup = {
  key: string; // yyyy-mm-dd
  date: Date;
  rows: DiaryRow[];
};

function getCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) week.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(Date.UTC(year, month, d)));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  while (week.length && week.length < 7) week.push(null);
  if (week.length) weeks.push(week);
  return weeks;
}

function toLocalDateKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SiteDiaryCalendar({
  siteId,
}: {
  siteId: string | null;
}) {
  const today = new Date();

  // View toggle – LIST is default now 👇
  const [viewMode, setViewMode] =
    React.useState<"calendar" | "list">("list");

  // Shared dialog for editing a day
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogDate, setDialogDate] = React.useState<Date | null>(null);

  // Photos dialog
  const [photosDialogOpen, setPhotosDialogOpen] = React.useState(false);
  const [photosDate, setPhotosDate] = React.useState<Date | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
  const [calendarDate, setCalendarDate] = React.useState<Date | null>(null);
  const [filledDays, setFilledDays] = React.useState<number[]>([]);
  const weeks = getCalendarGrid(currentYear, currentMonth);
  const monthName = new Date(
    currentYear,
    currentMonth,
  ).toLocaleString("default", {
    month: "long",
  });

  // List view state
  const [rows, setRows] = React.useState<DiaryRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dateFrom, setDateFrom] = React.useState<Date | null>(null);
  const [dateTo, setDateTo] = React.useState<Date | null>(null);
  const [workFilter, setWorkFilter] = React.useState<string>("__ALL__");
  const [floorFilter, setFloorFilter] = React.useState<string>("__ALL__"); // 👈 NEW

  // PDF loading per day (key = yyyy-mm-dd)
  const [pdfLoadingKey, setPdfLoadingKey] =
    React.useState<string | null>(null);

  const reloadFilledDays = React.useCallback(() => {
    if (!siteId) {
      setFilledDays([]);
      return;
    }
    getFilledDays({ siteId, year: currentYear, month: currentMonth }).then(
      setFilledDays,
    );
  }, [siteId, currentMonth, currentYear]);

  // Load filled days for calendar
  React.useEffect(() => {
    let cancelled = false;
    async function fetchFilledDays() {
      if (!siteId) {
        setFilledDays([]);
        return;
      }
      const days = await getFilledDays({
        siteId,
        year: currentYear,
        month: currentMonth,
      });
      if (!cancelled) setFilledDays(days);
    }
    fetchFilledDays();
    return () => {
      cancelled = true;
    };
  }, [siteId, currentMonth, currentYear]);

  // Load list rows once
  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!siteId) {
        setRows([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data: DiaryRow[] =
          await getSitediaryRecordsBySiteIdForExcel(siteId);
        if (!cancelled) {
          setRows(data || []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load site diary");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const hasFilledDays = filledDays.length > 0;
  const hasRecords = rows.length > 0;

  // Works filter options
  const worksOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.Works && r.Works.trim()) set.add(r.Works.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Floor filter options (based on Location)
  const floorOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.Location && r.Location.trim()) set.add(r.Location.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Rows after applying all filters (date, works, floor)
  const filteredRows: DiaryRow[] = React.useMemo(() => {
    const startMs = dateFrom
      ? new Date(dateFrom.setHours(0, 0, 0, 0)).getTime()
      : null;
    const endMs = dateTo
      ? new Date(dateTo.setHours(23, 59, 59, 999)).getTime()
      : null;

    return rows.filter((r) => {
      const d = new Date(r.Date);
      if (Number.isNaN(d.getTime())) return false;
      const t = d.getTime();
      if (startMs !== null && t < startMs) return false;
      if (endMs !== null && t > endMs) return false;

      if (workFilter !== "__ALL__") {
        if (!r.Works || r.Works !== workFilter) return false;
      }

      if (floorFilter !== "__ALL__") {
        if (!r.Location || r.Location !== floorFilter) return false;
      }

      return true;
    });
  }, [rows, dateFrom, dateTo, workFilter, floorFilter]);

  // Group filtered rows by day
  const dayGroups: DayGroup[] = React.useMemo(() => {
    const res: Record<string, DayGroup> = {};
    for (const r of filteredRows) {
      const d = new Date(r.Date);
      if (Number.isNaN(d.getTime())) continue;
      const key = toLocalDateKey(d);
      if (!res[key]) res[key] = { key, date: d, rows: [] };
      res[key].rows.push(r);
    }
    return Object.values(res).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }, [filteredRows]);

  const clearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setWorkFilter("__ALL__");
    setFloorFilter("__ALL__");
  };

  // Export ONLY currently filtered rows
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Site diary records");
    XLSX.writeFile(workbook, "SiteDiaryRecords.xlsx");
  };

  const openDayDialog = (date: Date) => {
    setDialogDate(date);
    setCalendarDate(date);
    setDialogOpen(true);
  };

  const openPhotos = (date: Date) => {
    setPhotosDate(date);
    setPhotosDialogOpen(true);
  };

  const dayLabel = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });

  // Call server action and download PDF
  const handleDownloadPdf = async (groupKey: string, date: Date) => {
    if (!siteId) return;

    try {
      setPdfLoadingKey(groupKey);

      const res = await generateSiteDiaryPdf({
        siteId,
        dateISO: date.toISOString(),
      });

      const { fileName, base64 } = res;

      const byteChars = atob(base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download =
        fileName || `SiteDiary_${date.toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating PDF via server action", err);
    } finally {
      setPdfLoadingKey(null);
    }
  };

  // this flag is reset on every render – used to mark only the first green day / first card
  let firstFilledMarked = false;

  return (
    <TooltipProvider>
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4">
        {(hasFilledDays || hasRecords) && (
          <TourRunner
            steps={steps_dashboard_siteid_site_diary_completed}
            stepName="steps_dashboard_siteid_site_diary_completed"
          />
        )}

        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "calendar" | "list")}
        >
          {/* Header with toggle */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Site Diary
              </h2>
              <p className="text-sm text-muted-foreground">
                Switch between calendar and list to review recorded site works.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <TabsList className="self-start sm:self-end">
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() =>
                    window.open("https://wa.me/13135131153", "_blank")
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-green-100 bg-white px-3 py-1.5 text-sm font-medium text-green-600 shadow-sm transition hover:bg-green-50 hover:text-green-700"
                >
                  <WhatsAppIcon />
                  <span className="hidden sm:inline">
                    Record site work via WhatsApp
                  </span>
                  <span className="sm:hidden">Record via WhatsApp</span>
                </button>

                <Button variant="outline" onClick={exportToExcel}>
                  Export to Excel
                </Button>
              </div>
            </div>
          </div>

          {/* CALENDAR VIEW */}
          <TabsContent value="calendar" className="mt-0">
            {/* Month Navigation */}
            <div className="mb-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="p-2 text-sm sm:px-4 sm:py-2"
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear((y) => y - 1);
                  } else setCurrentMonth((m) => m - 1);
                }}
              >
                &lt;
              </Button>
              <div className="px-2 text-center text-lg font-medium sm:text-xl">
                {monthName} {currentYear}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="p-2 text-sm sm:px-4 sm:py-2"
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear((y) => y + 1);
                  } else setCurrentMonth((m) => m + 1);
                }}
              >
                &gt;
              </Button>
            </div>

            {/* Days of Week Header */}
            <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="truncate text-center text-xs font-medium text-gray-500 sm:text-sm"
                >
                  {day.substring(0, 2)}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weeks.map((week, i) =>
                week.map((dateObj, j) => {
                  const isFilled =
                    !!dateObj && filledDays.includes(dateObj.getDate());

                  let dataTour: string | undefined;
                  if (isFilled && !firstFilledMarked) {
                    dataTour = "first-completed-diary-record";
                    firstFilledMarked = true;
                  }

                  return (
                    <Card
                      key={`${i}-${j}`}
                      data-tour={dataTour}
                      className={cn(
                        "flex aspect-square min-h-[32px] items-center justify-center transition-all sm:min-h-[64px]",
                        !dateObj && "border-0 bg-transparent shadow-none",
                        isFilled && "bg-green-50",
                        dateObj && "cursor-pointer hover:shadow-md",
                      )}
                      onClick={() => {
                        if (dateObj) openDayDialog(dateObj);
                      }}
                    >
                      <CardContent className="flex h-full w-full items-center justify-center p-0">
                        {dateObj && (
                          <span
                            className={cn(
                              "text-xs sm:text-sm",
                              isFilled ? "text-green-700" : "text-gray-700",
                            )}
                          >
                            {dateObj.getDate()}
                            {isFilled && (
                              <span className="ml-1 hidden sm:inline">✓</span>
                            )}
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  );
                }),
              )}
            </div>
          </TabsContent>

          {/* LIST VIEW */}
          <TabsContent value="list" className="mt-0">
            {/* Filters */}
            <Card className="mb-4 border-muted bg-muted/30">
              <CardContent className="px-3 py-3 sm:px-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Filters
                  </div>

                  <div className="flex flex-1 flex-wrap gap-2">
                    {/* Date from */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal sm:w-auto",
                            !dateFrom && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom
                            ? dateFrom.toLocaleDateString("en-GB", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "From date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom || undefined}
                          onSelect={(d) => setDateFrom(d ?? null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Date to */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal sm:w-auto",
                            !dateTo && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo
                            ? dateTo.toLocaleDateString("en-GB", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "To date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo || undefined}
                          onSelect={(d) => setDateTo(d ?? null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Works filter */}
                    <Select
                      value={workFilter}
                      onValueChange={(val) => setWorkFilter(val)}
                    >
                      <SelectTrigger className="h-9 w-full text-sm sm:w-[220px]">
                        <SelectValue placeholder="Filter by works" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ALL__">All works</SelectItem>
                        {worksOptions.map((w) => (
                          <SelectItem key={w} value={w}>
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Floor filter (Location) */}
                    <Select
                      value={floorFilter}
                      onValueChange={(val) => setFloorFilter(val)}
                    >
                      <SelectTrigger className="h-9 w-full text-sm sm:w-[200px]">
                        <SelectValue placeholder="Filter by floor/location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ALL__">
                          All floors / locations
                        </SelectItem>
                        {floorOptions.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                    {loading && (
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading…
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error / empty */}
            {error && (
              <Card className="mb-4 border-destructive/40 bg-destructive/5">
                <CardContent className="py-3 text-sm text-destructive">
                  {error}
                </CardContent>
              </Card>
            )}

            {!loading && dayGroups.length === 0 && !error && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No site diary records match your filters.
                </CardContent>
              </Card>
            )}

            {/* List of days */}
            <ScrollArea className="h-[60vh] rounded-md border bg-background sm:h-[70vh]">
              <div className="space-y-3 p-2 sm:p-3">
                {dayGroups.map((group) => {
                  const totalTasks = group.rows.length;
                  const totalHours = group.rows.reduce(
                    (sum, r) => sum + (r.TimeInvolved ?? 0),
                    0,
                  );
                  const totalWorkers = group.rows.reduce(
                    (sum, r) => sum + (r.WorkersInvolved ?? 0),
                    0,
                  );

                  const dataTour =
                    !firstFilledMarked && totalTasks > 0
                      ? ((firstFilledMarked = true),
                        "first-completed-diary-record")
                      : undefined;

                  const isPdfLoading = pdfLoadingKey === group.key;

                  return (
                    <Card
                      key={group.key}
                      data-tour={dataTour}
                      className="border-border/80 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <CardHeader className="flex flex-col gap-2 py-3 px-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-semibold sm:text-lg">
                            {dayLabel(group.date)}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground sm:text-sm">
                            <span>
                              {totalTasks} task
                              {totalTasks === 1 ? "" : "s"}
                            </span>
                            <span>• {totalWorkers} worker entries</span>
                            <span>• {totalHours} h recorded</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-full"
                                onClick={() => openPhotos(group.date)}
                              >
                                <Images className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View photos for this day</p>
                            </TooltipContent>
                          </Tooltip>

                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isPdfLoading}
                            onClick={() =>
                              handleDownloadPdf(group.key, group.date)
                            }
                          >
                            {isPdfLoading ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Generating…
                              </>
                            ) : (
                              "PDF report"
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDayDialog(group.date)}
                          >
                            Open diary
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="px-2 pb-3 sm:px-4">
                        <div className="overflow-x-auto">
                          <Table className="table-fixed min-w-[700px] text-xs sm:text-sm">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[140px]">
                                  Location
                                </TableHead>
                                <TableHead className="w-[180px]">
                                  Works
                                </TableHead>
                                <TableHead className="w-[50px] text-center">
                                  Units
                                </TableHead>
                                <TableHead className="w-[70px] text-center">
                                  Amount
                                </TableHead>
                                <TableHead className="w-[70px] text-center">
                                  Workers
                                </TableHead>
                                <TableHead className="w-[70px] text-center">
                                  Hours
                                </TableHead>
                                <TableHead className="w-[400px]">
                                  Comments
                                </TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {group.rows.map((r, idx) => (
                                <TableRow
                                  key={r.id ?? `${group.key}-${idx}`}
                                >
                                  <TableCell className="max-w-[140px] truncate">
                                    {r.Location || "—"}
                                  </TableCell>
                                  <TableCell className="max-w-[180px] truncate">
                                    {r.Works || "—"}
                                  </TableCell>

                                  <TableCell className="text-center">
                                    {r.Units || "—"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {r.Amounts ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {r.WorkersInvolved ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {r.TimeInvolved ?? "—"}
                                  </TableCell>

                                  <TableCell className="max-w-[400px] align-top">
                                    <span className="text-xs sm:text-sm break-words whitespace-normal line-clamp-4">
                                      {r.Comments || "—"}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Dialog for editing / adding records (shared for both views) */}
        <DialogWindow
          open={dialogOpen}
          setOpen={setDialogOpen}
          date={dialogDate ?? calendarDate}
          siteId={siteId}
          onSaved={async () => {
            // reload calendar filled days
            reloadFilledDays();
            // reload list data
            if (!siteId) return;
            setLoading(true);
            const data: DiaryRow[] =
              await getSitediaryRecordsBySiteIdForExcel(siteId);
            setRows(data || []);
            setLoading(false);
          }}
        >
          <div className="grid gap-3" />
        </DialogWindow>

        {/* Photos dialog with ImageGallery */}
        <Dialog open={photosDialogOpen} onOpenChange={setPhotosDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                Photos –{" "}
                {photosDate
                  ? photosDate.toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "No date selected"}
              </DialogTitle>
            </DialogHeader>
            <ImageGallery date={photosDate} siteId={siteId} />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
