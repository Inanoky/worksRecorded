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
import { SiteDiaryOptionsManager } from "@/components/sitediary/SiteDiaryOptionsManager";
import { useDefaultConstructionSiteDiarySummary } from "@/flows/default-construction/frontend/useDefaultConstructionSiteDiarySummary";
import { OriginalSourceContent } from "@/components/sitediary/OriginalSourceContent";
import {
  copySiteDiaryRecordsToProject,
  copySiteDiaryRecordToDate,
  deleteSiteDiaryRecord,
  getBisCaseAvailableMaterials,
  getBisCharacterMeasures,
  getBisAvailableResponsiblePersons,
  getSiteDiaryRecordBisUrl,
  getSiteDayWeather,
  getFilledDays,
  getPossibleSiteDiaryBisApprovers,
  getSiteDiaryBisApprovalStatus,
  getSiteGalleryAttachments,
  getSiteDiaryRecordsPage,
  getSiteDiaryMediaOnlyDays,
  getSiteDiaryProjectCopyTargets,
  getSitediaryRecordsBySiteIdForExcel,
  sendSiteDiaryRecordToBis,
  syncDeletedSiteDiaryBisRecords,
  submitSiteDiaryRecordToBisApproval,
} from "@/server/actions/site-diary-actions";
import { generateSiteDiaryPdf } from "@/server/actions/pdfBuilderForFrontend";
import {
  CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  CloudSun,
  Ellipsis,
  ExternalLink,
  Filter,
  Images,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";


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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ImageGallery from "@/components/sitediary/ImageGallery";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

// 👇 NEW: full gallery view
import FullPhotoGallery from "@/components/sitediary/FullGalleryView";
import { getConfig } from "@/server/actions/site-diary-actions";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json"
import { ZtcCommentPopoverContent } from "@/flows/ztc-production/frontend/ZtcCommentPopoverContent";
import { useZtcSiteDiaryFlow } from "@/flows/ztc-production/frontend/useZtcSiteDiaryFlow";
import { getZtcDefaultTaskRates, getZtcFilterOptions, getZtcScopeSummary } from "@/flows/ztc-production/backend/actions";
import {
  buildZtcQualityDisplayStateByRowId,
  formatZtcLaborNorm,
  formatZtcMoney,
  getZtcActivePauseStartedAt,
  getZtcPauseHours,
  getZtcPauseIntervals,
  getZtcPayrollValues,
  getZtcQualityRowToneClass,
  isZtcQualityRow,
  splitZtcWorkerDisplayName,
  exportZtcPayrollToExcel,
  exportZtcProductivityToExcel,
} from "@/flows/ztc-production/lib/ztc-site-diary-utils";
import { applyZtcExcelNumberFormats, formatZtcRowsForExcel } from "@/flows/ztc-production/lib/ztc-excel-export";
import { resolveZtcRateTaskForRow } from "@/flows/ztc-production/lib/ztc-rate-resolver";
import { cleanZtcWorkName } from "@/flows/ztc-production/lib/ztc-work-name-cleanup";
import { compareSiteDiaryWorks } from "@/flows/default-construction/lib/site-diary-work-order";

import { toast } from "sonner";
import { getSiteDiaryListMessages, getToastMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const SITE_DIARY_LIST_PAGE_SIZE = 75;

type DiaryRow = {
  id?: string;
  createdAt?: string | Date;
  Date: string | Date;
  Location?: string | null;
  Works?: string | null;
  Units?: string | null;
  Amounts?: number | string | null;
  WorkersInvolved?: number | string | null;
  TimeInvolved?: number | string | null;
  pausedAt?: string | Date | null;
  pauseIntervals?: unknown;
  Comments?: string | null;
  originalUserComment?: string | null;
  originalAudioUrl?: string | null;
  Photos?: string[] | null;

  BISId?: string | null;
  bisStatus?: string | null;
  [key: string]: any;
};

type DayGroup = {
  key: string; // yyyy-mm-dd
  date: Date;
  rows: DiaryRow[];
  mediaOnly?: boolean;
  photoCount?: number;
  mediaSearchableText?: string;
};

type MediaOnlyDaySummary = Awaited<ReturnType<typeof getSiteDiaryMediaOnlyDays>>[number];
type SiteDiaryProjectCopyTarget = Awaited<ReturnType<typeof getSiteDiaryProjectCopyTargets>>[number];

type ZtcScopeSummary = NonNullable<Awaited<ReturnType<typeof getZtcScopeSummary>>>;
type ZtcFilterOptions = Awaited<ReturnType<typeof getZtcFilterOptions>>;
type ExcelExportKind = "siteDiary" | "ztcPayroll" | "ztcProductivity";

function withSelectedOption(options: string[], selected: string) {
  if (!selected || selected === "__ALL__" || options.includes(selected)) return options;
  return [selected, ...options].sort(compareSiteDiaryWorks);
}

function formatProjectCopyTargetLabel(target: SiteDiaryProjectCopyTarget) {
  const details = [target.subdirectory, target.description]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return details.length > 0
    ? `${target.name} (${details.join(" · ")})`
    : target.name;
}

function SiteDiaryListSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="rounded-md border bg-background px-3 py-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </div>

      <div className="h-[60vh] rounded-md border bg-background sm:h-[70vh]">
        <div className="space-y-3 p-2 sm:p-3">
          {[0, 1, 2].map((groupIndex) => (
            <Card key={groupIndex} className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3 sm:px-4">
                {Array.from({ length: groupIndex === 0 ? 5 : 3 }).map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid min-h-12 grid-cols-[28px_minmax(0,1.4fr)_minmax(0,1fr)_90px] items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[75%]" />
                      <Skeleton className="h-3 w-[48%]" />
                    </div>
                    <Skeleton className="h-4 w-[70%]" />
                    <Skeleton className="h-8 w-20 justify-self-end rounded-md" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function SiteDiaryListUpdatingSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-sm" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function formatZtcPauseTime(date: Date, dateLocale: string) {
  return date.toLocaleString(dateLocale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function ZtcHoursWithPausePopover({
  row,
  value,
  dateLocale,
}: {
  row: DiaryRow;
  value: React.ReactNode;
  dateLocale: string;
}) {
  const intervals = getZtcPauseIntervals(row.pauseIntervals);
  const activePauseStartedAt = getZtcActivePauseStartedAt(row);
  const pauseHours = getZtcPauseHours(row);
  const hasPause = intervals.length > 0 || Boolean(activePauseStartedAt);

  if (!hasPause) {
    return <div className="line-clamp-4">{value}</div>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="line-clamp-4 text-left font-medium text-foreground underline decoration-dotted underline-offset-2 hover:text-blue-700"
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Pauzes
            </div>
            <div className="mt-1 font-medium">
              Kopā pauzē: {pauseHours.toLocaleString(dateLocale)} st
            </div>
          </div>
          {activePauseStartedAt ? (
            <div className="rounded-md border bg-muted/30 p-2">
              <div className="text-xs text-muted-foreground">Aktīva pauze no</div>
              <div className="font-medium">
                {formatZtcPauseTime(activePauseStartedAt, dateLocale)}
              </div>
            </div>
          ) : null}
          {intervals.length ? (
            <div className="space-y-1">
              {intervals.map((interval, index) => {
                const hours = Math.max(
                  0,
                  (interval.end.getTime() - interval.start.getTime()) / 3_600_000,
                );
                return (
                  <div
                    key={`${interval.start.toISOString()}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border px-2 py-1.5 text-xs"
                  >
                    <span>
                      {formatZtcPauseTime(interval.start, dateLocale)} -{" "}
                      {formatZtcPauseTime(interval.end, dateLocale)}
                    </span>
                    <span className="font-medium">
                      {Number(hours.toFixed(2)).toLocaleString(dateLocale)} st
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type SearchableFilterSelectOption = {
  value: string;
  label: string;
};

function SearchableFilterSelect({
  value,
  onValueChange,
  options,
  allLabel,
  placeholder,
  searchPlaceholder,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableFilterSelectOption[];
  allLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("lv");
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase("lv").includes(normalizedSearch),
  );
  const selectedLabel =
    value === "__ALL__"
      ? allLabel
      : options.find((option) => option.value === value)?.label ?? value ?? placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 w-full justify-between text-left font-normal", className)}
        >
          <span className={cn("truncate", value === "__ALL__" && "text-muted-foreground")}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px] max-w-[min(90vw,30rem)] overflow-hidden p-0"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <div
          className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain p-1"
          onWheel={(event) => {
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            className="flex w-full min-w-0 items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
            onClick={() => {
              onValueChange("__ALL__");
              setOpen(false);
            }}
          >
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${value === "__ALL__" ? "opacity-100" : "opacity-0"}`} />
            <span className="min-w-0 truncate">{allLabel}</span>
          </button>
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full min-w-0 items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onValueChange(option.value);
                setOpen(false);
              }}
            >
              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${value === option.value ? "opacity-100" : "opacity-0"}`} />
              <span className="min-w-0 whitespace-normal break-words">{option.label}</span>
            </button>
          ))}
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nav atrasts
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type BisMaterialOption = {
  id: string;
  label: string;
  measurementUnit?: string | null;
  deliveredQuantity?: number;
  usedQuantity?: number;
  availableQuantity: number;
};

type GalleryAttachmentOption = {
  id: string;
  url: string;
  date?: Date | null;
  comment?: string | null;
};

type BisResponsiblePersonOption = {
  id: string;
  personId: number | null;
  fullName: string | null;
  role: string | null;
  responsiblePersonId: number | null;
  responsiblePersonType: string | null;
};

type WeatherHour = {
  hour: number;
  temperatureC: number | null;
  windSpeedMs: number | null;
  precipitationMm: number | null;
};

type BisApprover = {
  memberId: string;
  memberType: string | null;
  level: number | null;
  name: string | null;
  status: string | null;
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

function normalizeZtcSpecialLabel(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("lv")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getZtcAdditionalDetailMainWork(row: DiaryRow) {
  if (normalizeZtcSpecialLabel(row.Works_Custom_1) !== "papilddetalas") return null;
  try {
    const metadata = JSON.parse(String(row.Comments_Custom_2 ?? ""));
    return typeof metadata?.mainWork === "string" ? metadata.mainWork.trim() : null;
  } catch {
    return null;
  }
}

function ztcRowMatchesWorkFilter(row: DiaryRow, selectedWork: string) {
  if (selectedWork === "__ALL__") return true;
  const normalizedSelected = normalizeZtcSpecialLabel(selectedWork);
  if (normalizedSelected === "papilddetalas") {
    return normalizeZtcSpecialLabel(row.Works_Custom_1) === "papilddetalas";
  }
  if (normalizedSelected === "papilddarbi") {
    return (
      normalizeZtcSpecialLabel(row.Location) === "papilddarbi" ||
      normalizeZtcSpecialLabel(row.Location_Custom_1) === "papilddarbi" ||
      normalizeZtcSpecialLabel(row.Works_Custom_1) === "papilddarbi"
    );
  }
  if (cleanZtcWorkName(row.Works) === cleanZtcWorkName(selectedWork)) return true;
  return (
    cleanZtcWorkName(getZtcAdditionalDetailMainWork(row)) ===
    cleanZtcWorkName(selectedWork)
  );
}

function getDiaryRowSearchableText(row: DiaryRow) {
  return [
    row.Works,
    row.Works_Custom_1,
    row.Works_Custom_2,
    row.Location,
    row.Location_Custom_1,
    row.Location_Custom_2,
    row.createdBy,
    row.Comments,
    row.Comments_Custom_1,
    row.Comments_Custom_2,
    row.originalUserComment,
    row.Units,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function SiteDiaryCalendar({
  siteId,
  bisEnabled = true,
  organizationLanguage,
  isZtcFlow = false,
}: {
  siteId: string | null;
  bisEnabled?: boolean;
  organizationLanguage?: string | null;
  isZtcFlow?: boolean;
}) {
  const today = new Date();
  const language = normalizeOrganizationLanguage(organizationLanguage);
  const t = getSiteDiaryListMessages(language);
  const toastMessages = getToastMessages(language);
  const dateLocale = language === "lv" ? "lv-LV" : "en-GB";

  // 👇 add "gallery" to view mode
  const [viewMode, setViewMode] =
    React.useState<"calendar" | "list" | "gallery">("list");

  // Shared dialog for editing a day
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogDate, setDialogDate] = React.useState<Date | null>(null);
  const [dialogInitialRows, setDialogInitialRows] = React.useState<DiaryRow[] | null>(null);
  const [dialogRecordId, setDialogRecordId] = React.useState<string | null>(null);
  const [dialogInitialTab, setDialogInitialTab] = React.useState<"records" | "media">("records");
  const [optionsRevision, setOptionsRevision] = React.useState(0);

  // Photos dialog
  const [photosDialogOpen, setPhotosDialogOpen] = React.useState(false);
  const [photosDate, setPhotosDate] = React.useState<Date | null>(null);
  const [weatherDialogOpen, setWeatherDialogOpen] = React.useState(false);
  const [weatherDate, setWeatherDate] = React.useState<Date | null>(null);
  const [weatherLoading, setWeatherLoading] = React.useState(false);
  const [weatherError, setWeatherError] = React.useState<string | null>(null);
  const [weatherHours, setWeatherHours] = React.useState<WeatherHour[]>([]);
  const [weatherLocation, setWeatherLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
  const [calendarDate, setCalendarDate] = React.useState<Date | null>(null);
  const [filledDays, setFilledDays] = React.useState<number[]>([]);
  const weeks = getCalendarGrid(currentYear, currentMonth);
  const monthName = new Date(currentYear, currentMonth).toLocaleString(dateLocale, {
    month: "long",
  });

  // List view state
  const [rows, setRows] = React.useState<DiaryRow[]>([]);
  const [mediaOnlyDays, setMediaOnlyDays] = React.useState<MediaOnlyDaySummary[]>([]);
  const [loading, setLoading] = React.useState(Boolean(siteId));
  const [hasLoadedRowsOnce, setHasLoadedRowsOnce] = React.useState(false);
  const [showDelayedListSkeleton, setShowDelayedListSkeleton] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dateFrom, setDateFrom] = React.useState<Date | null>(null);
  const [dateTo, setDateTo] = React.useState<Date | null>(null);
  const [workFilter, setWorkFilter] = React.useState<string>("__ALL__");
  const [floorFilter, setFloorFilter] = React.useState<string>("__ALL__");
  const [elementFilter, setElementFilter] = React.useState<string>("__ALL__");
  const [workerFilter, setWorkerFilter] = React.useState<string>("__ALL__");
  const [keywordFilter, setKeywordFilter] = React.useState<string>("");
  const [ztcFilterOptions, setZtcFilterOptions] = React.useState<ZtcFilterOptions>({
    projects: [],
    elements: [],
    works: [],
    workers: [],
  });
  const [listPage, setListPage] = React.useState(1);
  const [listTotalCount, setListTotalCount] = React.useState(0);
  const [listTotalPages, setListTotalPages] = React.useState(1);
  const keywordInputRef = React.useRef<HTMLInputElement | null>(null);
  const keywordDebounceRef = React.useRef<number | null>(null);

  //----------------------Table---------------------------------------------------

  const [defaultMap, setMap] = React.useState<Record<string, any>>(defaultConfig);
  const [tableHeads, setTableHeads] = React.useState<string[]>([]);
  const [tableRows, setTableRows] = React.useState<any[]>([]);
  const [screenWidth, setScreenWidth] = React.useState<number>(150);

  const handleKeywordInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      if (keywordDebounceRef.current) {
        window.clearTimeout(keywordDebounceRef.current);
      }
      keywordDebounceRef.current = window.setTimeout(() => {
        setKeywordFilter(nextValue);
      }, 250);
    },
    [],
  );

  React.useEffect(
    () => () => {
      if (keywordDebounceRef.current) {
        window.clearTimeout(keywordDebounceRef.current);
      }
    },
    [],
  );

  //------------------------map helpers----------------------------------------------

  type ConfigMap = Record<string, any>;

  function formatValueByConfig(key: string, value: any, config: ConfigMap): string {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    const renderAs = config?.[key]?.customSettings?.renderAs;

    // Try to convert to Date
    const d = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(d.getTime())) {
      // Not a valid date → return as string
      return String(value);
    }

    // Day → dd.mm.yyyy
    if (renderAs === "Day") {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();

      return `${dd}.${mm}.${yyyy}`;
    }

    // Time → HH:mm
    if (renderAs === "Time") {
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");

      return `${hh}:${min}`;
    }

    // Default → just string
    return String(value);
  }

  function formatZtcTimeValue(value: any): string {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      return String(value);
    }

    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${min}`;
  }

  function getTypeByKey(key: string) {
    return defaultMap[key]?.Type ?? null;
  }

  function getDisplayNameByKey(key) {
    if (
      defaultMap?.otherSettings?.preferConfigDisplayNames === true &&
      defaultMap[key]?.DisplayName
    ) {
      return defaultMap[key].DisplayName;
    }

    if (Object.prototype.hasOwnProperty.call(localizedHeaderMap, key)) return localizedHeaderMap[key as keyof typeof localizedHeaderMap];
    return defaultMap[key]?.DisplayName ?? key;
  }


  const localizedHeaderMap = language === "lv" ? {
    Works: "Darbi",
    Location: "Lokācija",
    Comments: "Komentāri",
    NumberOfWorkers: "Darbinieku skaits",
    Hours: "Stundas",
    CreatedBy: "Izveidoja",
  } : {};

  function getCellWidthByKey(
    key: string,
    map: Record<string, any>,
    fallback = 200,
  ): number {
    return map?.[key]?.customSettings?.displayinSiteListWidth ?? fallback;
  }

  type TextAlign = "left" | "center" | "right";

  function getSiteListTextAlignmentByKey(
    key: string,
    map: Record<string, any>,
    fallback: TextAlign = "left",
  ): TextAlign {
    const v = map?.[key]?.customSettings?.displayinSiteListTextAlignment;
    return v === "left" || v === "center" || v === "right" ? v : fallback;
  }

  // PDF loading per day (key = yyyy-mm-dd)
  const [pdfLoadingKey, setPdfLoadingKey] = React.useState<string | null>(null);
  const [bisSendingRowId, setBisSendingRowId] = React.useState<string | null>(null);

  const [bisSentRowIds, setBisSentRowIds] = React.useState<Set<string>>(new Set());
  const [bisPickerOpen, setBisPickerOpen] = React.useState(false);
  const [selectedRowForBis, setSelectedRowForBis] = React.useState<DiaryRow | null>(null);
  const [bisMaterialOptions, setBisMaterialOptions] = React.useState<BisMaterialOption[]>([]);
  const [galleryAttachmentOptions, setGalleryAttachmentOptions] = React.useState<GalleryAttachmentOption[]>([]);
  const [selectedAttachmentUrls, setSelectedAttachmentUrls] = React.useState<string[]>([]);
  const materialQuantitiesRef = React.useRef<Record<string, string>>({});
  const [bisPickerLoading, setBisPickerLoading] = React.useState(false);
  const [attachmentGalleryOpen, setAttachmentGalleryOpen] = React.useState(false);
  const [approverDialogOpen, setApproverDialogOpen] = React.useState(false);
  const [approvalLoading, setApprovalLoading] = React.useState(false);
  const [approverOptions, setApproverOptions] = React.useState<BisApprover[]>([]);
  const [selectedApproverKeys, setSelectedApproverKeys] = React.useState<string[]>([]);
  const [approvalRow, setApprovalRow] = React.useState<DiaryRow | null>(null);
  const [bisApprovalStatusByRowId, setBisApprovalStatusByRowId] = React.useState<Record<string, string>>({});
  const [copyDialogOpen, setCopyDialogOpen] = React.useState(false);
  const [copyTargetRow, setCopyTargetRow] = React.useState<DiaryRow | null>(null);
  const [copyTargetDate, setCopyTargetDate] = React.useState<Date | null>(null);
  const [copyLoading, setCopyLoading] = React.useState(false);
  const [bisSubmitDate, setBisSubmitDate] = React.useState<Date | null>(null);
  const [bisMultipleDayJob, setBisMultipleDayJob] = React.useState(false);
  const [bisSubmitDateTo, setBisSubmitDateTo] = React.useState<Date | null>(null);
  const bisSubmitWorksRef = React.useRef("");
  const [bisSubmitAmount, setBisSubmitAmount] = React.useState<string>("1");
  const [bisInputResetKey, setBisInputResetKey] = React.useState(0);
  const [bisSubmitMeasurement, setBisSubmitMeasurement] = React.useState<string>("12");
  const [bisMeasurementOptions, setBisMeasurementOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [bisResponsiblePersonOptions, setBisResponsiblePersonOptions] = React.useState<BisResponsiblePersonOption[]>([]);
  const [selectedBisResponsiblePersonKey, setSelectedBisResponsiblePersonKey] = React.useState<string>("");
  const [recordsRefreshLoading, setRecordsRefreshLoading] = React.useState(false);
  const [bisSyncLoading, setBisSyncLoading] = React.useState(false);
  const [galleryAttachmentPage, setGalleryAttachmentPage] = React.useState(1);
  const [showBisUi, setShowBisUi] = React.useState(true);
  const [selectedRecordIds, setSelectedRecordIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = React.useState(false);
  const [projectCopyTargets, setProjectCopyTargets] = React.useState<SiteDiaryProjectCopyTarget[]>([]);
  const [projectCopyTargetId, setProjectCopyTargetId] = React.useState("");
  const [projectCopyLoading, setProjectCopyLoading] = React.useState(false);
  const [projectCopyTargetsLoading, setProjectCopyTargetsLoading] = React.useState(false);
  const [excelExportLoading, setExcelExportLoading] = React.useState<ExcelExportKind | null>(null);
  const bisUiEnabled = bisEnabled && showBisUi;
  const isZtcSite = isZtcFlow;
  React.useEffect(() => {
    if (!siteId || isZtcSite) {
      setProjectCopyTargets([]);
      setProjectCopyTargetId("");
      setProjectCopyTargetsLoading(false);
      return;
    }

    let cancelled = false;
    setProjectCopyTargetsLoading(true);

    getSiteDiaryProjectCopyTargets(siteId)
      .then((targets) => {
        if (cancelled) return;
        setProjectCopyTargets(targets);
        setProjectCopyTargetId((current) =>
          current && targets.some((target) => target.id === current) ? current : "",
        );
      })
      .catch((error: any) => {
        if (cancelled) return;
        setProjectCopyTargets([]);
        setProjectCopyTargetId("");
        toast.error(error?.message ?? toastMessages.failedLoadProjectCopyTargets);
      })
      .finally(() => {
        if (!cancelled) {
          setProjectCopyTargetsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isZtcSite, siteId, toastMessages.failedLoadProjectCopyTargets]);

  const ztcQualityDisplayStateByRowId = React.useMemo(
    () =>
      isZtcSite
        ? buildZtcQualityDisplayStateByRowId(rows)
        : new Map(),
    [isZtcSite, rows],
  );
  const ztcDatePickerProps = React.useMemo(() => {
    const year = new Date().getFullYear();
    return isZtcSite
      ? {
          captionLayout: "dropdown" as const,
          startMonth: new Date(year - 10, 0),
          endMonth: new Date(year + 5, 11),
        }
      : {};
  }, [isZtcSite]);
  const ztc = useZtcSiteDiaryFlow({
    enabled: isZtcSite,
    siteId,
    rows,
    setRows,
    setViewMode,
    setProjectFilter: setFloorFilter,
    setElementFilter,
    setWorkerFilter,
  });
  const defaultConstructionSummary = useDefaultConstructionSiteDiarySummary({
    enabled: !isZtcSite,
    siteId,
    organizationLanguage,
    refreshKey: rows,
    optionsRevision,
    locationFilter: floorFilter,
    workFilter,
    setViewMode,
    setLocationFilter: setFloorFilter,
    setWorkFilter,
  });
  const getZtcResolvedWork = React.useCallback(
    (row: DiaryRow) =>
      isZtcSite ? resolveZtcRateTaskForRow(row, ztc.defaultRates) : null,
    [isZtcSite, ztc.defaultRates],
  );
  const renderZtcWorkName = React.useCallback(
    (row: DiaryRow, fallback: string) => {
      const resolved = getZtcResolvedWork(row);
      const primary = resolved?.canonicalTask || cleanZtcWorkName(row.Works) || fallback;
      const extracted = resolved?.differs ? cleanZtcWorkName(resolved.extractedTask) : null;

      return (
        <span className="block min-w-0">
          <span className="block line-clamp-2">{primary}</span>
          {extracted ? (
            <span
              className="mt-0.5 block truncate text-[10px] font-normal leading-tight text-muted-foreground"
              title={`Bilde: ${extracted}`}
            >
              Bilde: {extracted}
            </span>
          ) : null}
        </span>
      );
    },
    [getZtcResolvedWork],
  );
  const handleZtcWorkerFilterChange = React.useCallback(
    (value: string) => {
      setWorkerFilter(value);
    },
    [],
  );
  const openZtcWorkerDetails = React.useCallback(
    (workerName: string | null | undefined) => {
      const normalizedWorker = String(workerName ?? "").trim();
      if (!normalizedWorker || normalizedWorker === "N/A") return;

      setViewMode("list");
      setWorkerFilter(normalizedWorker);
    },
    [],
  );
  const reloadFilledDays = React.useCallback(() => {
    if (!siteId) {
      setFilledDays([]);
      return;
    }
    getFilledDays({ siteId, year: currentYear, month: currentMonth, flowId: isZtcSite ? "ztc" : undefined }).then(
      setFilledDays,
    );
  }, [siteId, currentMonth, currentYear, isZtcSite]);

  const refreshRowsWithBisSync = React.useCallback(async (options?: { skipSync?: boolean }) => {
    if (!siteId) {
      setMediaOnlyDays([]);
      return [];
    }
    if (bisUiEnabled && !options?.skipSync) {
      await syncDeletedSiteDiaryBisRecords(siteId);
    }
    const commonOptions = {
      flowId: isZtcSite ? "ztc" : undefined,
      dateFrom: dateFrom ? toLocalDateKey(dateFrom) : undefined,
      dateTo: dateTo ? toLocalDateKey(dateTo) : undefined,
      workFilter,
      floorFilter,
      elementFilter: isZtcSite ? elementFilter : undefined,
      workerFilter: isZtcSite ? workerFilter : undefined,
      keyword: keywordFilter,
    };
    const canShowMediaOnlyDays =
      workFilter === "__ALL__" &&
      (!isZtcSite || elementFilter === "__ALL__") &&
      (!isZtcSite || workerFilter === "__ALL__") &&
      (!isZtcSite || floorFilter === "__ALL__");
    const [result, mediaOnlyResult] = await Promise.all([
      getSiteDiaryRecordsPage(siteId, {
        ...commonOptions,
        page: listPage,
        pageSize: SITE_DIARY_LIST_PAGE_SIZE,
      }),
      canShowMediaOnlyDays
        ? getSiteDiaryMediaOnlyDays(siteId, commonOptions)
        : Promise.resolve([]),
    ]);
    const data: DiaryRow[] = result.rows || [];
    setRows(data || []);
    setMediaOnlyDays(mediaOnlyResult);
    setListTotalCount(result.totalCount ?? 0);
    setListTotalPages(result.totalPages ?? 1);
    setBisApprovalStatusByRowId(
      Object.fromEntries(
        (data || [])
          .filter((row) => row.id)
          .map((row) => [row.id as string, row.bisStatus ?? ""]),
      ),
    );
    return data;
  }, [
    bisUiEnabled,
    dateFrom,
    dateTo,
    elementFilter,
    floorFilter,
    isZtcSite,
    keywordFilter,
    listPage,
    siteId,
    workFilter,
    workerFilter,
  ]);

  React.useEffect(() => {
    setListPage(1);
  }, [dateFrom, dateTo, workFilter, floorFilter, elementFilter, workerFilter, keywordFilter]);

  React.useEffect(() => {
    setHasLoadedRowsOnce(false);
    setShowDelayedListSkeleton(false);
  }, [siteId]);

  React.useEffect(() => {
    if (listPage > listTotalPages) {
      setListPage(Math.max(1, listTotalPages));
    }
  }, [listPage, listTotalPages]);

  React.useEffect(() => {
    if (!loading || !hasLoadedRowsOnce) {
      setShowDelayedListSkeleton(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowDelayedListSkeleton(true);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasLoadedRowsOnce, loading]);

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
        flowId: isZtcSite ? "ztc" : undefined,
      });
      if (!cancelled) setFilledDays(days);
    }
    fetchFilledDays();
    return () => {
      cancelled = true;
    };
  }, [siteId, currentMonth, currentYear, isZtcSite]);

  // Load list rows once
  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!siteId) {
        setRows([]);
        setListTotalCount(0);
        setListTotalPages(1);
        setHasLoadedRowsOnce(false);
        setShowDelayedListSkeleton(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        function getRenderableFieldsOrdered(map: Record<string, any>): string[] {
          return Object.entries(map)
            .filter(([_, cfg]) => {
              return cfg?.customSettings?.displayinSiteList === "yes";
            })
            .sort((a, b) => {
              const ao = a[1]?.customSettings?.displayinSiteListOrder;
              const bo = b[1]?.customSettings?.displayinSiteListOrder;

              const aOrder =
                typeof ao === "number" ? ao : Number.POSITIVE_INFINITY;
              const bOrder =
                typeof bo === "number" ? bo : Number.POSITIVE_INFINITY;

              if (aOrder !== bOrder) return aOrder - bOrder;

              return a[0].localeCompare(b[0]);
            })
            .map(([key]) => key.trim());
        }

        //Here we load config from database, and if no config we use default.
        const cfg = (((await getConfig(siteId)) ?? defaultConfig) as ConfigMap);
        if (cancelled) return;

        const screenWidth = cfg?.otherSettings?.displaySiteListWidth ?? 140;
        setScreenWidth(screenWidth);

        console.log("config");
        console.dir(cfg);

        setMap(cfg);

        const renderableFields = getRenderableFieldsOrdered(cfg);
        const showCreatedAtColumn =
          cfg?.otherSettings?.hideCreatedAtInSiteList !== true;
        const tableFields = showCreatedAtColumn
          ? ["createdAt", ...renderableFields]
          : renderableFields;
        console.log(`renderableFields ${renderableFields}`);

        setTableHeads(tableFields);

        //Fetching data
        const data: DiaryRow[] = await refreshRowsWithBisSync();
        setHasLoadedRowsOnce(true);

        function pickRenderableRows(
          rows: Record<string, any>[],
          renderableFields: string[],
        ) {
          return rows.map((row) => ({
            createdAt: row.createdAt ?? undefined,
            originalUserComment: row.originalUserComment ?? "",
            originalAudioUrl: row.originalAudioUrl ?? "",
            ...Object.fromEntries(
              renderableFields.map((field) => [field, row[field] ?? ""]),
            ),
          }));
        }

        //formatting data according to the config
        const formattedRows = pickRenderableRows(data, renderableFields);

        setTableRows(formattedRows);

        console.log(`formatted rows`);
        console.dir(formattedRows);

        if (cancelled) return;
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
  }, [optionsRevision, refreshRowsWithBisSync, siteId]);

  const hasFilledDays = filledDays.length > 0;
  const hasRecords = rows.length > 0;
  const GALLERY_PAGE_SIZE = 20;

  React.useEffect(() => {
    if (!isZtcSite || !siteId) {
      setZtcFilterOptions({ projects: [], elements: [], works: [], workers: [] });
      return;
    }

    let cancelled = false;
    getZtcFilterOptions({
      siteId,
      projectName: floorFilter,
      elementName: elementFilter,
      workerName: workerFilter,
      workName: workFilter,
      dateFrom: dateFrom ? toLocalDateKey(dateFrom) : null,
      dateTo: dateTo ? toLocalDateKey(dateTo) : null,
      keyword: keywordFilter,
    })
      .then((options) => {
        if (!cancelled) setZtcFilterOptions(options);
      })
      .catch((error: any) => {
        if (!cancelled) {
          toast.error(error?.message ?? "Neizdevās ielādēt filtru vērtības.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    dateFrom,
    dateTo,
    elementFilter,
    floorFilter,
    isZtcSite,
    keywordFilter,
    siteId,
    workFilter,
    workerFilter,
  ]);

  // Works filter options
  const pageWorksOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (
        isZtcSite &&
        floorFilter !== "__ALL__" &&
        String(r.Location ?? "").trim() !== floorFilter
      ) {
        return;
      }
      if (
        isZtcSite &&
        elementFilter !== "__ALL__" &&
        String(r.Location_Custom_1 ?? "").trim() !== elementFilter
      ) {
        return;
      }
      if (r.Works && String(r.Works).trim()) set.add(String(r.Works).trim());
    });
    return Array.from(set).sort(compareSiteDiaryWorks);
  }, [rows, isZtcSite, floorFilter, elementFilter]);

  const worksOptions = React.useMemo(
    () =>
      isZtcSite
        ? withSelectedOption(ztcFilterOptions.works, workFilter)
        : pageWorksOptions,
    [isZtcSite, pageWorksOptions, workFilter, ztcFilterOptions.works],
  );

  React.useEffect(() => {
    if (!isZtcSite || workFilter === "__ALL__") return;
    if (!worksOptions.includes(workFilter)) {
      setWorkFilter("__ALL__");
    }
  }, [isZtcSite, workFilter, worksOptions]);

  // Floor filter options (based on Location)
  const pageFloorOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.Location && String(r.Location).trim()) {
        set.add(String(r.Location).trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const floorOptions = React.useMemo(
    () =>
      isZtcSite
        ? withSelectedOption(ztcFilterOptions.projects, floorFilter)
        : pageFloorOptions,
    [floorFilter, isZtcSite, pageFloorOptions, ztcFilterOptions.projects],
  );

  const pageElementOptions = React.useMemo(() => {
    const set = new Set<string>();
    if (isZtcSite && elementFilter !== "__ALL__") {
      set.add(elementFilter);
    }
    rows.forEach((r) => {
      if (
        isZtcSite &&
        floorFilter !== "__ALL__" &&
        String(r.Location ?? "").trim() !== floorFilter
      ) {
        return;
      }
      if (r.Location_Custom_1 && String(r.Location_Custom_1).trim()) {
        set.add(String(r.Location_Custom_1).trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "lv"));
  }, [rows, isZtcSite, floorFilter, elementFilter]);

  const elementOptions = React.useMemo(
    () =>
      isZtcSite
        ? withSelectedOption(ztcFilterOptions.elements, elementFilter)
        : pageElementOptions,
    [elementFilter, isZtcSite, pageElementOptions, ztcFilterOptions.elements],
  );

  React.useEffect(() => {
    if (!isZtcSite || elementFilter === "__ALL__") return;
    if (!elementOptions.includes(elementFilter)) {
      setElementFilter("__ALL__");
    }
  }, [isZtcSite, elementFilter, elementOptions]);

  const pageWorkerOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.createdBy && String(r.createdBy).trim()) {
        set.add(String(r.createdBy).trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "lv"));
  }, [rows]);

  const workerOptions = React.useMemo(
    () =>
      isZtcSite
        ? withSelectedOption(ztcFilterOptions.workers, workerFilter)
        : pageWorkerOptions,
    [isZtcSite, pageWorkerOptions, workerFilter, ztcFilterOptions.workers],
  );

  // Rows after applying structured filters (date, works, floor)
  const filteredRows: DiaryRow[] = React.useMemo(() => {
    const startMs = dateFrom
      ? new Date(new Date(dateFrom).setHours(0, 0, 0, 0)).getTime()
      : null;
    const endMs = dateTo
      ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)).getTime()
      : null;

    return rows.filter((r) => {
      const d = new Date(r.Date);
      if (Number.isNaN(d.getTime())) return false;
      const t = d.getTime();
      if (startMs !== null && t < startMs) return false;
      if (endMs !== null && t > endMs) return false;

      if (workFilter !== "__ALL__" && !ztcRowMatchesWorkFilter(r, workFilter)) return false;

      if (floorFilter !== "__ALL__") {
        if (!r.Location || r.Location !== floorFilter) return false;
      }

      if (isZtcSite && elementFilter !== "__ALL__") {
        if (!r.Location_Custom_1 || r.Location_Custom_1 !== elementFilter) return false;
      }

      if (isZtcSite && workerFilter !== "__ALL__") {
        if (!r.createdBy || r.createdBy !== workerFilter) return false;
      }

      return true;
    });
  }, [rows, dateFrom, dateTo, workFilter, floorFilter, elementFilter, workerFilter, isZtcSite]);

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
    Object.values(res).forEach((group) => {
      group.rows.sort((a, b) => {
        if (isZtcSite) {
          const ztcTime = (value: unknown) => {
            const parsed = new Date(value as any).getTime();
            return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
          };
          const dateDiff = ztcTime(b.Date) - ztcTime(a.Date);
          if (dateDiff !== 0) return dateDiff;
          const customDateDiff = ztcTime(b.Date_Custom_1) - ztcTime(a.Date_Custom_1);
          if (customDateDiff !== 0) return customDateDiff;
          const createdDiff = ztcTime(b.createdAt) - ztcTime(a.createdAt);
          if (createdDiff !== 0) return createdDiff;
          return String(b.id ?? "").localeCompare(String(a.id ?? ""));
        }

        const timeA = new Date(a.createdAt ?? a.Date).getTime();
        const timeB = new Date(b.createdAt ?? b.Date).getTime();

        if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
        if (Number.isNaN(timeA)) return 1;
        if (Number.isNaN(timeB)) return -1;

        return timeB - timeA;
      });
    });
    return Object.values(res).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredRows, isZtcSite]);

  const mediaOnlyDayGroups: DayGroup[] = React.useMemo(
    () =>
      mediaOnlyDays.map((day) => ({
        key: day.key,
        date: new Date(day.date),
        rows: [],
        mediaOnly: true,
        photoCount: day.photoCount,
        mediaSearchableText: day.searchableText.toLowerCase(),
      })),
    [mediaOnlyDays],
  );

  const keywordMatchedDayGroups: DayGroup[] = React.useMemo(() => {
    const normalizedKeyword = keywordFilter.trim().toLowerCase();
    const recordGroups = !normalizedKeyword
      ? dayGroups
      : dayGroups
          .map((group) => ({
            ...group,
            rows: group.rows.filter((r) => {
              return getDiaryRowSearchableText(r).includes(normalizedKeyword);
            }),
          }))
          .filter((group) => group.rows.length > 0);

    const mediaGroups = !normalizedKeyword
      ? mediaOnlyDayGroups
      : mediaOnlyDayGroups.filter((group) =>
          group.mediaSearchableText?.includes(normalizedKeyword),
        );

    return [...recordGroups, ...mediaGroups].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }, [dayGroups, keywordFilter, mediaOnlyDayGroups]);

  const showInitialListSkeleton = loading && !hasLoadedRowsOnce && !error;
  const showUpdatingListSkeleton = loading && hasLoadedRowsOnce && showDelayedListSkeleton && !error;

  const [ztcSelectedScopeSummary, setZtcSelectedScopeSummary] =
    React.useState<ZtcScopeSummary | null>(null);
  const [ztcScopeSummaryLoading, setZtcScopeSummaryLoading] = React.useState(false);
  const [ztcScopeSummaryError, setZtcScopeSummaryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const workerName = workerFilter !== "__ALL__" ? workerFilter : null;
    const projectName = floorFilter !== "__ALL__" ? floorFilter : null;
    const elementName = elementFilter !== "__ALL__" ? elementFilter : null;
    const workName = workFilter !== "__ALL__" ? workFilter : null;

    if (
      !isZtcSite ||
      !siteId ||
      (!projectName && !elementName && !workerName)
    ) {
      setZtcSelectedScopeSummary(null);
      setZtcScopeSummaryLoading(false);
      setZtcScopeSummaryError(null);
      return;
    }

    let cancelled = false;
    setZtcScopeSummaryLoading(true);
    setZtcScopeSummaryError(null);

    getZtcScopeSummary({
      siteId,
      projectName,
      elementName,
      workerName,
      workName: workerName ? workName : null,
      dateFrom: workerName && dateFrom ? toLocalDateKey(dateFrom) : null,
      dateTo: workerName && dateTo ? toLocalDateKey(dateTo) : null,
      keyword: workerName ? keywordFilter : null,
    })
      .then((summary) => {
        if (cancelled) return;
        setZtcSelectedScopeSummary(summary);
      })
      .catch((error: any) => {
        if (cancelled) return;
        setZtcSelectedScopeSummary(null);
        setZtcScopeSummaryError(error?.message ?? "Neizdevās ielādēt kopsavilkumu.");
      })
      .finally(() => {
        if (!cancelled) {
          setZtcScopeSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    dateFrom,
    dateTo,
    elementFilter,
    floorFilter,
    isZtcSite,
    keywordFilter,
    siteId,
    workFilter,
    workerFilter,
  ]);

  const visibleRecordIds = React.useMemo(
    () =>
      keywordMatchedDayGroups.flatMap((group) =>
        group.rows
          .map((row) => row.id)
          .filter((id): id is string => Boolean(id)),
      ),
    [keywordMatchedDayGroups],
  );

  const selectedVisibleCount = React.useMemo(
    () => visibleRecordIds.filter((id) => selectedRecordIds.has(id)).length,
    [selectedRecordIds, visibleRecordIds],
  );

  const allVisibleSelected =
    visibleRecordIds.length > 0 && selectedVisibleCount === visibleRecordIds.length;

  React.useEffect(() => {
    const knownIds = new Set(rows.map((row) => row.id).filter((id): id is string => Boolean(id)));
    setSelectedRecordIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (knownIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [rows]);

  const sourcePopoverClassName =
    "w-[calc(100vw-1.5rem)] max-w-lg max-h-[70vh] overflow-y-auto break-words text-xs leading-relaxed sm:text-sm";

  const toggleRecordSelection = (recordId: string, checked: boolean) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(recordId);
      } else {
        next.delete(recordId);
      }
      return next;
    });
  };

  const handleToggleSelectAllVisible = (checked: boolean) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        visibleRecordIds.forEach((id) => next.add(id));
      } else {
        visibleRecordIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const handleToggleSelectForDay = (recordIds: string[], checked: boolean) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        recordIds.forEach((id) => next.add(id));
      } else {
        recordIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const selectRecordForProjectCopy = (row: DiaryRow) => {
    if (!row.id) {
      toast.error(toastMessages.missingSelectedRecordId);
      return;
    }

    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      next.add(row.id as string);
      return next;
    });
  };

  const handleBulkDeleteRecords = async () => {
    if (selectedRecordIds.size === 0) {
      toast.error(toastMessages.noRecordsSelected);
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedRecordIds.size} selected site diary record(s)? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      setBulkDeleteLoading(true);
      const recordIds = Array.from(selectedRecordIds);
      const results = await Promise.allSettled(
        recordIds.map((id) => deleteSiteDiaryRecord({ id, siteId, flowId: isZtcSite ? "ztc" : undefined })),
      );
      const deletedIds = recordIds.filter((_, index) => results[index].status === "fulfilled");
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setSelectedRecordIds((prev) => {
          const next = new Set(prev);
          deletedIds.forEach((id) => next.delete(id));
          return next;
        });
        setBisSentRowIds((prev) => {
          const next = new Set(prev);
          deletedIds.forEach((id) => next.delete(id));
          return next;
        });
      }

      await refreshRowsWithBisSync();
      reloadFilledDays();

      if (deletedIds.length > 0 && failedCount === 0) {
        toast.success(toastMessages.deletedRecords(deletedIds.length));
      } else if (deletedIds.length > 0) {
        toast.warning(toastMessages.deletedRecordsPartial(deletedIds.length, failedCount));
      } else {
        toast.error(toastMessages.failedDeleteSelectedRecords);
      }
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedDeleteSelectedRecords);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleCopySelectedRecordsToProject = async () => {
    if (!siteId) {
      toast.error(toastMessages.missingSiteId);
      return;
    }
    if (selectedRecordIds.size === 0) {
      toast.error(toastMessages.noRecordsSelected);
      return;
    }
    if (!projectCopyTargetId) {
      toast.error(toastMessages.selectProjectCopyTarget);
      return;
    }

    const target = projectCopyTargets.find((project) => project.id === projectCopyTargetId);
    if (!target) {
      toast.error(toastMessages.selectProjectCopyTarget);
      return;
    }

    try {
      setProjectCopyLoading(true);
      const recordIds = Array.from(selectedRecordIds);
      const result = await copySiteDiaryRecordsToProject({
        sourceSiteId: siteId,
        targetSiteId: target.id,
        recordIds,
      });

      setSelectedRecordIds((prev) => {
        const next = new Set(prev);
        recordIds.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(toastMessages.recordsCopiedToProject(result.count, target.name));
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedCopyRecordsToProject);
    } finally {
      setProjectCopyLoading(false);
    }
  };

  const clearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setWorkFilter("__ALL__");
    setFloorFilter("__ALL__");
    setElementFilter("__ALL__");
    setWorkerFilter("__ALL__");
    setKeywordFilter("");
    defaultConstructionSummary.clearSummary();
    if (keywordDebounceRef.current) {
      window.clearTimeout(keywordDebounceRef.current);
    }
    if (keywordInputRef.current) {
      keywordInputRef.current.value = "";
    }
  };

  const loadAllFilteredRowsForExport = React.useCallback(async () => {
    if (!siteId) return [];
    const allRows = await getSitediaryRecordsBySiteIdForExcel(siteId, {
      flowId: isZtcSite ? "ztc" : undefined,
      dateFrom: dateFrom ? toLocalDateKey(dateFrom) : undefined,
      dateTo: dateTo ? toLocalDateKey(dateTo) : undefined,
      workFilter,
      floorFilter,
      elementFilter: isZtcSite ? elementFilter : undefined,
      workerFilter: isZtcSite ? workerFilter : undefined,
      keyword: keywordFilter || undefined,
    }) as DiaryRow[];
    const normalizedKeyword = keywordFilter.trim().toLowerCase();
    return allRows.filter((row) => {
      if (workFilter !== "__ALL__" && !ztcRowMatchesWorkFilter(row, workFilter)) return false;
      if (floorFilter !== "__ALL__" && row.Location !== floorFilter) return false;
      if (isZtcSite && elementFilter !== "__ALL__" && row.Location_Custom_1 !== elementFilter) return false;
      if (isZtcSite && workerFilter !== "__ALL__" && row.createdBy !== workerFilter) return false;
      if (!normalizedKeyword) return true;
      return getDiaryRowSearchableText(row).includes(normalizedKeyword);
    });
  }, [
    dateFrom,
    dateTo,
    elementFilter,
    floorFilter,
    isZtcSite,
    keywordFilter,
    siteId,
    workFilter,
    workerFilter,
  ]);

  const runExcelExport = React.useCallback(
    async (kind: ExcelExportKind, exportAction: () => Promise<void>) => {
      if (excelExportLoading) return;

      try {
        setExcelExportLoading(kind);
        await exportAction();
      } catch (error: any) {
        toast.error(error?.message ?? "Neizdevās sagatavot Excel eksportu.");
      } finally {
        setExcelExportLoading(null);
      }
    },
    [excelExportLoading],
  );

  // Export all rows matching the active filters, not just the currently loaded page.
  const exportToExcel = async () => {
    await runExcelExport("siteDiary", async () => {
      const XLSX = await import("xlsx");
      const exportFilteredRows = await loadAllFilteredRowsForExport();
      const ztcDefaultRates = isZtcSite && siteId ? await getZtcDefaultTaskRates(siteId) : [];
      const exportRows = isZtcSite
        ? formatZtcRowsForExcel(exportFilteredRows, { defaultRates: ztcDefaultRates })
        : exportFilteredRows;
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      if (isZtcSite) {
        applyZtcExcelNumberFormats(XLSX, worksheet);
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Site diary records");
      XLSX.writeFile(workbook, "SiteDiaryRecords.xlsx");
    });
  };

  const exportZtcProductivity = async () => {
    await runExcelExport("ztcProductivity", async () => {
      const visibleRows = await loadAllFilteredRowsForExport();
      await exportZtcProductivityToExcel({ rows: visibleRows });
    });
  };

  const exportZtcPayroll = async () => {
    await runExcelExport("ztcPayroll", async () => {
      await exportZtcPayrollToExcel({ rows: await loadAllFilteredRowsForExport() });
    });
  };

  const openDayDialog = (date: Date) => {
    const dateKey = toLocalDateKey(date);
    const cachedRows = rows.filter((row) => {
      const rowDate = new Date(row.Date);
      return !Number.isNaN(rowDate.getTime()) && toLocalDateKey(rowDate) === dateKey;
    });
    const hasMediaOnlyDay = mediaOnlyDays.some((day) => day.key === dateKey);

    setDialogInitialRows(cachedRows.length ? cachedRows : null);
    setDialogRecordId(null);
    setDialogInitialTab(!cachedRows.length && hasMediaOnlyDay ? "media" : "records");
    setDialogDate(date);
    setCalendarDate(date);
    setDialogOpen(true);
  };

  const openRecordDialog = (row: DiaryRow, fallbackDate: Date) => {
    if (!row.id) return;
    const rowDate = new Date(row.Date);
    const date = Number.isNaN(rowDate.getTime()) ? fallbackDate : rowDate;

    setDialogInitialRows([row]);
    setDialogRecordId(row.id);
    setDialogInitialTab("records");
    setDialogDate(date);
    setCalendarDate(date);
    setDialogOpen(true);
  };

  const openPhotos = (date: Date) => {
    setPhotosDate(date);
    setPhotosDialogOpen(true);
  };

  const openWeather = async (date: Date) => {
    if (!siteId) return;
    const dayISO = toLocalDateKey(date);
    setWeatherDate(date);
    setWeatherDialogOpen(true);
    setWeatherLoading(true);
    setWeatherError(null);
    setWeatherHours([]);

    try {
      const weather = await getSiteDayWeather({ siteId, dayISO });
      setWeatherHours(Array.isArray(weather?.hours) ? weather.hours : []);
      setWeatherLocation(weather?.location ?? null);
    } catch (e: any) {
      setWeatherError(e?.message ?? "Failed to load weather.");
      setWeatherLocation(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  const dayLabel = (d: Date) =>
    d.toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });

  const renderListPagination = () => {
    if (listTotalPages <= 1 && listTotalCount <= SITE_DIARY_LIST_PAGE_SIZE) return null;
    const pageWindow = 2;
    const startPage = Math.max(1, listPage - pageWindow);
    const endPage = Math.min(listTotalPages, listPage + pageWindow);
    const pages = Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index,
    );
    const firstRecord = listTotalCount === 0 ? 0 : (listPage - 1) * SITE_DIARY_LIST_PAGE_SIZE + 1;
    const lastRecord = Math.min(listTotalCount, listPage * SITE_DIARY_LIST_PAGE_SIZE);

    return (
      <div className="flex flex-col gap-2 rounded-md border bg-background px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground sm:text-sm">
          {t.listPaginationSummary(firstRecord, lastRecord, listTotalCount)}
        </div>
        <Pagination aria-label={t.recordsPagination} className="mx-0 w-auto justify-start sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-label={t.previous}
                aria-disabled={listPage <= 1 || loading}
                className={cn(
                  "gap-1 px-2.5 sm:pl-2.5",
                  (listPage <= 1 || loading) && "pointer-events-none opacity-50",
                )}
                onClick={(event) => {
                  event.preventDefault();
                  if (listPage <= 1 || loading) return;
                  setListPage((page) => Math.max(1, page - 1));
                }}
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:block">{t.previous}</span>
              </PaginationLink>
            </PaginationItem>
            {startPage > 1 ? (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (!loading) setListPage(1);
                  }}
                >
                  1
                </PaginationLink>
              </PaginationItem>
            ) : null}
            {pages.map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={page === listPage}
                  onClick={(event) => {
                    event.preventDefault();
                    if (!loading) setListPage(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            {endPage < listTotalPages ? (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (!loading) setListPage(listTotalPages);
                  }}
                >
                  {listTotalPages}
                </PaginationLink>
              </PaginationItem>
            ) : null}
            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-label={t.next}
                aria-disabled={listPage >= listTotalPages || loading}
                className={cn(
                  "gap-1 px-2.5 sm:pr-2.5",
                  (listPage >= listTotalPages || loading) && "pointer-events-none opacity-50",
                )}
                onClick={(event) => {
                  event.preventDefault();
                  if (listPage >= listTotalPages || loading) return;
                  setListPage((page) => Math.min(listTotalPages, page + 1));
                }}
              >
                <span className="hidden sm:block">{t.next}</span>
                <ChevronRight className="size-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  // Call server action and download PDF


  const openBisPicker = async (row: DiaryRow) => {
    if (!bisUiEnabled) {
      return;
    }

    if (!row.id) {
      toast.error(toastMessages.recordCannotBeSentNoId);
      return;
    }

    if (!siteId) {
      toast.error(toastMessages.missingSiteId);
      return;
    }

    setSelectedRowForBis(row);
    setBisSubmitDate(row.Date ? new Date(row.Date) : new Date());
    setBisMultipleDayJob(false);
    setBisSubmitDateTo(null);
    bisSubmitWorksRef.current = String(row.Comments ?? "");
    setBisSubmitAmount(String(row.Amounts ?? 1));
    setBisInputResetKey((value) => value + 1);
    setBisPickerOpen(true);
    setBisPickerLoading(true);

    try {
      const [materials, attachments, measurements, responsiblePeople] = await Promise.all([
        getBisCaseAvailableMaterials(siteId),
        getSiteGalleryAttachments(siteId),
        getBisCharacterMeasures(siteId),
        getBisAvailableResponsiblePersons(siteId),
      ]);

      setBisMaterialOptions(materials);
      setGalleryAttachmentOptions(attachments);
      setGalleryAttachmentPage(1);
      setSelectedAttachmentUrls([]);
      materialQuantitiesRef.current = Object.fromEntries(materials.map((material) => [material.id, ""]));
      setBisMeasurementOptions(measurements);
      setBisResponsiblePersonOptions(responsiblePeople);
      const defaultResponsible = responsiblePeople[0];
      setSelectedBisResponsiblePersonKey(
        defaultResponsible
          ? `${defaultResponsible.responsiblePersonId}:${defaultResponsible.responsiblePersonType}`
          : "",
      );
      if (measurements.length > 0) {
        const current = measurements.find((item) => item.id === bisSubmitMeasurement);
        setBisSubmitMeasurement(current?.id ?? measurements[0]?.id ?? "12");
      }
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedLoadBisOptions);
      setBisPickerOpen(false);
    } finally {
      setBisPickerLoading(false);
    }
  };

  const toggleAttachment = (attachmentUrl: string, checked: boolean) => {
    setSelectedAttachmentUrls((prev) =>
      checked
        ? Array.from(new Set([...prev, attachmentUrl]))
        : prev.filter((url) => url !== attachmentUrl),
    );
  };

  const approverKey = React.useCallback(
    (approver: BisApprover) =>
      `${approver.memberId}:${approver.memberType ?? ""}:${approver.level ?? ""}`,
    [],
  );

  const defaultApproverKeys = React.useCallback(
    (approvers: BisApprover[]) => {
      const firstPerLevel = new Map<string, string>();
      for (const approver of approvers) {
        const levelKey = String(approver.level ?? "");
        if (!firstPerLevel.has(levelKey)) {
          firstPerLevel.set(levelKey, approverKey(approver));
        }
      }
      return Array.from(firstPerLevel.values());
    },
    [approverKey],
  );

  const normalizeApprovalStatus = React.useCallback((status: string | null | undefined) => {
    return (status ?? "").trim().toLowerCase();
  }, []);

  const isApprovedStatus = React.useCallback((status: string | null | undefined) => {
    return normalizeApprovalStatus(status) === "approved";
  }, [normalizeApprovalStatus]);

  const isApprovalPendingStatus = React.useCallback((status: string | null | undefined) => {
    const normalized = normalizeApprovalStatus(status);
    return [
      "approving",
      "submitted_to_approve",
      "submitted",
      "pending",
      "pending_approval",
      "on_approval",
      "approval_in_progress",
      "ready_for_approval",
    ].includes(normalized);
  }, [normalizeApprovalStatus]);

  const getBisStatusLabel = React.useCallback((status: string | null | undefined) => {
    const normalized = normalizeApprovalStatus(status);
    if (!normalized) return "WorksRecorded";
    if (normalized === "approved") return t.bisApproved;
    if (isApprovalPendingStatus(status)) return t.bisPending;
    if (["sent", "draft", "created"].includes(normalized)) return t.bisDraft;
    return t.bisDraft;
  }, [isApprovalPendingStatus, normalizeApprovalStatus, t]);

  const getBisStatusClassName = React.useCallback((status: string | null | undefined) => {
    const normalized = normalizeApprovalStatus(status);
    if (!normalized) return "border border-slate-200 bg-slate-50 text-slate-700";
    if (normalized === "approved") return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    if (isApprovalPendingStatus(status)) return "border border-sky-200 bg-sky-50 text-sky-700";
    if (["sent", "draft", "created"].includes(normalized)) return "border border-blue-200 bg-blue-50 text-blue-700";
    return "border border-blue-200 bg-blue-50 text-blue-700";
  }, [isApprovalPendingStatus, normalizeApprovalStatus]);

  const sortedGalleryAttachmentOptions = React.useMemo(
    () =>
      [...galleryAttachmentOptions].sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      }),
    [galleryAttachmentOptions],
  );

  const galleryTotalPages = Math.max(
    1,
    Math.ceil(sortedGalleryAttachmentOptions.length / GALLERY_PAGE_SIZE),
  );

  const pagedGalleryAttachments = React.useMemo(() => {
    const safePage = Math.min(galleryAttachmentPage, galleryTotalPages);
    const start = (safePage - 1) * GALLERY_PAGE_SIZE;
    return sortedGalleryAttachmentOptions.slice(start, start + GALLERY_PAGE_SIZE);
  }, [
    GALLERY_PAGE_SIZE,
    galleryAttachmentPage,
    galleryTotalPages,
    sortedGalleryAttachmentOptions,
  ]);

  React.useEffect(() => {
    if (galleryAttachmentPage > galleryTotalPages) {
      setGalleryAttachmentPage(galleryTotalPages);
    }
  }, [galleryAttachmentPage, galleryTotalPages]);

  const openApprovalDialog = async (row: DiaryRow) => {
    if (!row.id || !row.BISId) {
      toast.error(toastMessages.sendSiteDiaryToBisFirst);
      return;
    }

    try {
      const currentStatus = await getSiteDiaryBisApprovalStatus(row.id);
      if (currentStatus) {
        setBisApprovalStatusByRowId((prev) => ({ ...prev, [row.id as string]: currentStatus }));
      }
      if (isApprovedStatus(currentStatus) || isApprovalPendingStatus(currentStatus)) {
        return;
      }

      setApprovalRow(row);
      setApproverDialogOpen(true);
      const approvers = await getPossibleSiteDiaryBisApprovers(row.id);
      setApproverOptions(approvers);
      setSelectedApproverKeys(defaultApproverKeys(approvers));
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedLoadBisApprovers);
      setApproverDialogOpen(false);
    }
  };

  const submitApproval = async () => {
    if (!approvalRow?.id) {
      toast.error(toastMessages.noRecordSelectedForApproval);
      return;
    }

    const selectedApprovers = approverOptions.filter((approver) =>
      selectedApproverKeys.includes(approverKey(approver)),
    );

    if (selectedApprovers.length === 0) {
      toast.error(toastMessages.selectAtLeastOneApprover);
      return;
    }

    try {
      setApprovalLoading(true);
      const result = await submitSiteDiaryRecordToBisApproval(
        approvalRow.id,
        selectedApprovers.map((approver) => ({
          memberId: approver.memberId,
          memberType: approver.memberType,
          level: approver.level,
        })),
      );
      setBisApprovalStatusByRowId((prev) => ({ ...prev, [approvalRow.id as string]: result.status }));
      await refreshRowsWithBisSync({ skipSync: true });
      toast.success(toastMessages.siteDiarySubmittedForApproval);
      setApproverDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedSubmitApproval);
    } finally {
      setApprovalLoading(false);
    }
  };

  const openCopyDialog = (row: DiaryRow) => {
    setCopyTargetRow(row);
    setCopyTargetDate(row.Date ? new Date(row.Date) : new Date());
    setCopyDialogOpen(true);
  };

  const handleCopyRecord = async () => {
    if (!copyTargetRow?.id || !copyTargetDate) {
      toast.error(toastMessages.selectRecordAndTargetDate);
      return;
    }

    try {
      setCopyLoading(true);
      await copySiteDiaryRecordToDate(
        copyTargetRow.id,
        copyTargetDate.toISOString(),
        siteId,
        { flowId: isZtcSite ? "ztc" : undefined },
      );
      if (!siteId) return;
      await refreshRowsWithBisSync();
      reloadFilledDays();
      toast.success(toastMessages.recordCopiedLocally);
      setCopyDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedCopyRecord);
    } finally {
      setCopyLoading(false);
    }
  };

  const handleDeleteRecord = async (row: DiaryRow) => {
    if (!row.id) return;
    const confirmed = window.confirm("Delete this site diary record? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteSiteDiaryRecord({ id: row.id, siteId, flowId: isZtcSite ? "ztc" : undefined });
      await refreshRowsWithBisSync({ skipSync: true });
      reloadFilledDays();
      toast.success(toastMessages.recordDeleted);
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedDeleteRecord);
    }
  };

  const handleSyncBisRecords = async () => {
    if (!siteId) {
      toast.error(toastMessages.missingSiteId);
      return;
    }

    try {
      setBisSyncLoading(true);
      const result = await syncDeletedSiteDiaryBisRecords(siteId);
      await refreshRowsWithBisSync({ skipSync: true });

      if (result.cleared > 0) {
        setBisSentRowIds((prev) => {
          const next = new Set(prev);
          result.clearedRecordIds.forEach((id) => next.delete(id));
          return next;
        });
        setBisApprovalStatusByRowId((prev) => {
          const next = { ...prev };
          result.clearedRecordIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });
        toast.success(toastMessages.bisLinksRemoved(result.cleared));
      } else {
        toast.success(toastMessages.bisSyncNoDeletedRecords);
      }
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedSyncBisRecords);
    } finally {
      setBisSyncLoading(false);
    }
  };

  const handleRefreshRecords = async () => {
    if (!siteId) {
      toast.error(toastMessages.missingSiteId);
      return;
    }

    try {
      setRecordsRefreshLoading(true);
      setError(null);
      await refreshRowsWithBisSync({ skipSync: true });
      reloadFilledDays();
    } catch (e: any) {
      const message = e?.message ?? "Failed to refresh site diary records";
      setError(message);
      toast.error(message);
    } finally {
      setRecordsRefreshLoading(false);
    }
  };

  const handleSendRowToBis = async () => {
    if (!selectedRowForBis?.id) {
      toast.error(toastMessages.missingSelectedRecordId);
      return;
    }

    const selectedMaterials = bisMaterialOptions
      .map((material) => {
        const available = Number(material.availableQuantity ?? 0);
        const requested = Number.parseFloat(materialQuantitiesRef.current[material.id] ?? "");
        const normalizedRequested = Number.isFinite(requested) ? requested : 0;
        return {
          constructionMaterialId: material.id,
          quantity: Math.max(0, Math.min(normalizedRequested, available)),
        };
      })
      .filter((material) => material.quantity > 0);

    const selectedResponsiblePerson = bisResponsiblePersonOptions.find(
      (item) =>
        `${item.responsiblePersonId}:${item.responsiblePersonType}` === selectedBisResponsiblePersonKey,
    );
    if (!selectedResponsiblePerson?.responsiblePersonId || !selectedResponsiblePerson?.responsiblePersonType) {
      toast.error(toastMessages.selectResponsiblePerson);
      return;
    }

    if (bisMultipleDayJob) {
      if (!bisSubmitDateTo) {
        toast.error(t.pickBisEventDateTo);
        return;
      }
      if (bisSubmitDate) {
        const start = new Date(bisSubmitDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(bisSubmitDateTo);
        end.setHours(0, 0, 0, 0);
        if (end <= start) {
          toast.error(t.bisEventDateToMustBeAfterStart);
          return;
        }
      }
    }

    try {
      setBisSendingRowId(selectedRowForBis.id);

      const parsedAmount = Number(bisSubmitAmount);
      await sendSiteDiaryRecordToBis(selectedRowForBis.id, {
        materials: selectedMaterials,
        attachments: selectedAttachmentUrls.map((url) => ({ url })),
        eventDate: bisSubmitDate ? toLocalDateKey(bisSubmitDate) : undefined,
        eventDateTo:
          bisMultipleDayJob && bisSubmitDateTo ? toLocalDateKey(bisSubmitDateTo) : undefined,
        worksDescription: bisSubmitWorksRef.current,
        amount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
        measurement: bisSubmitMeasurement,
        responsiblePersonId: selectedResponsiblePerson.responsiblePersonId,
        responsiblePersonType: selectedResponsiblePerson.responsiblePersonType,
      });

      const bisStatus = selectedRowForBis.id ? bisApprovalStatusByRowId[selectedRowForBis.id] : null;
      if (selectedRowForBis.id && !bisStatus) {
        setBisApprovalStatusByRowId((prev) => ({ ...prev, [selectedRowForBis.id as string]: "draft" }));
      }
      setBisSentRowIds((prev) => new Set(prev).add(selectedRowForBis.id as string));
      await refreshRowsWithBisSync();
      setBisPickerOpen(false);
      toast.success(toastMessages.siteDiarySentToBis);
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedSendSiteDiaryToBis);
    } finally {
      setBisSendingRowId(null);
    }
  };

  const handleOpenRecordInBis = async (row: DiaryRow) => {
    if (!row?.id || !row.BISId) {
      toast.error(toastMessages.recordNotSentToBisYet);
      return;
    }

    try {
      const url = await getSiteDiaryRecordBisUrl(row.id);
      if (!url) {
        toast.error(toastMessages.bisUrlUnavailable);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? toastMessages.failedOpenRecordInBis);
    }
  };
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
      <div
        className="w-full mx-auto px-2 sm:px-4 py-4"
        style={{ maxWidth: `${screenWidth}rem` }}
      >
        <Tabs
          value={viewMode}
          onValueChange={(v) =>
            setViewMode(v as "calendar" | "list" | "gallery")
          }
        >
          {/* Header with toggle */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                {isZtcSite ? t.productionJournalTitle : t.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.subtitle}
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <TabsList className="self-start sm:self-end">
                <TabsTrigger value="list">{t.tabList}</TabsTrigger>
                <TabsTrigger value="calendar">{t.tabCalendar}</TabsTrigger>
                <TabsTrigger value="gallery">{t.tabGallery}</TabsTrigger>
              </TabsList>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                {!isZtcSite ? (
                  <button
                    type="button"
                    onClick={() => window.open("https://wa.me/37127445304", "_blank")}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-green-100 bg-white px-3 py-1.5 text-sm font-medium text-green-600 shadow-sm transition hover:bg-green-50 hover:text-green-700"
                    data-tour="calendar"
                  >
                    <WhatsAppIcon />
                    <span className="hidden sm:inline">
                      {t.recordViaWhatsApp}
                    </span>
                    <span className="sm:hidden">{t.recordViaWhatsAppShort}</span>
                  </button>
                ) : null}

                <Button
                  variant="outline"
                  onClick={exportToExcel}
                  disabled={Boolean(excelExportLoading)}
                >
                  {excelExportLoading === "siteDiary" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t.exportToExcel}
                </Button>
                {!isZtcSite && siteId ? (
                  <SiteDiaryOptionsManager
                    siteId={siteId}
                    organizationLanguage={organizationLanguage}
                    onSaved={() => setOptionsRevision((revision) => revision + 1)}
                  />
                ) : null}
                {isZtcSite ? (
                  <>
                    <Button variant="outline" onClick={ztc.openRateDialog}>
                      Darbu likmes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportZtcPayroll}
                      disabled={Boolean(excelExportLoading)}
                    >
                      {excelExportLoading === "ztcPayroll" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Algu Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportZtcProductivity}
                      disabled={Boolean(excelExportLoading)}
                    >
                      {excelExportLoading === "ztcProductivity" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Produktivitāte
                    </Button>
                  </>
                ) : null}
                {bisUiEnabled ? (
                  <Button variant="outline" onClick={handleSyncBisRecords} disabled={bisSyncLoading}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", bisSyncLoading ? "animate-spin" : "")} />
                    {bisSyncLoading ? t.refreshing : t.refreshBisSync}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleRefreshRecords} disabled={recordsRefreshLoading}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", recordsRefreshLoading ? "animate-spin" : "")} />
                    {recordsRefreshLoading ? t.refreshing : t.refreshRecords}
                  </Button>
                )}
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
              {t.daysOfWeek.map((day) => (
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
            {/* {t.filters} */}
            <Card className="mb-4 border-muted bg-muted/30">
              <CardContent className="px-3 py-3 sm:px-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    {t.filters}
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
                            ? dateFrom.toLocaleDateString(dateLocale, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                            : t.fromDate}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom || undefined}
                          onSelect={(d) => setDateFrom(d ?? null)}
                          initialFocus
                          {...ztcDatePickerProps}
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
                            ? dateTo.toLocaleDateString(dateLocale, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                            : t.toDate}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo || undefined}
                          onSelect={(d) => setDateTo(d ?? null)}
                          initialFocus
                          {...ztcDatePickerProps}
                        />
                      </PopoverContent>
                    </Popover>

                    {isZtcSite ? (
                      <>
                        <SearchableFilterSelect
                          value={floorFilter}
                          onValueChange={(value) => {
                            setFloorFilter(value);
                            setElementFilter("__ALL__");
                          }}
                          options={floorOptions.map((value) => ({ value, label: value }))}
                          allLabel="Visi projekti"
                          placeholder="Projekts"
                          searchPlaceholder="Meklēt projektu..."
                          className="sm:w-[190px]"
                        />

                        <SearchableFilterSelect
                          value={elementFilter}
                          onValueChange={setElementFilter}
                          options={elementOptions.map((value) => ({ value, label: value }))}
                          allLabel="Visi elementi"
                          placeholder="Elements"
                          searchPlaceholder="Meklēt elementu..."
                          className="sm:w-[170px]"
                        />

                        <SearchableFilterSelect
                          value={workerFilter}
                          onValueChange={handleZtcWorkerFilterChange}
                          options={workerOptions.map((value) => ({ value, label: value }))}
                          allLabel="Visi darbinieki"
                          placeholder="Darbinieks"
                          searchPlaceholder="Meklēt darbinieku..."
                          className="sm:w-[170px]"
                        />

                        <SearchableFilterSelect
                          value={workFilter}
                          onValueChange={setWorkFilter}
                          options={worksOptions.map((value) => ({ value, label: value }))}
                          allLabel="Visi darbi"
                          placeholder="Darbi"
                          searchPlaceholder="Meklēt darbu..."
                          className="sm:w-[190px]"
                        />
                      </>
                    ) : (
                      <>
                        {/* Works filter */}
                        <Select
                          value={workFilter}
                          onValueChange={(val) => setWorkFilter(val)}
                        >
                          <SelectTrigger className="h-9 w-full text-sm sm:w-[220px]">
                            <SelectValue placeholder={t.filterByWorks} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ALL__">{t.allWorks}</SelectItem>
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
                            <SelectValue placeholder={t.filterByFloorLocation} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ALL__">
                              {t.allFloorsLocations}
                            </SelectItem>
                            {floorOptions.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}

                    <div className="relative w-full sm:w-[240px]">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        ref={keywordInputRef}
                        onChange={handleKeywordInputChange}
                        placeholder={t.keywordSearchPlaceholder}
                        className="h-9 pl-8"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {keywordMatchedDayGroups.length > 0 ? (
                      <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs sm:text-sm">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={(checked) =>
                            handleToggleSelectAllVisible(checked === true)
                          }
                          aria-label="Select all visible records"
                        />
                        <span className="text-muted-foreground">
                          {selectedVisibleCount}/{visibleRecordIds.length}
                        </span>
                      </div>
                    ) : null}
                    {bisEnabled ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showBisUi}
                        onClick={() => setShowBisUi((prev) => !prev)}
                        className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs sm:text-sm"
                      >
                        <span className="text-muted-foreground">BIS</span>
                        <span
                          className={cn(
                            "relative inline-flex h-5 w-9 rounded-full transition-colors",
                            showBisUi ? "bg-blue-200" : "bg-slate-300",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                              showBisUi ? "translate-x-4" : "translate-x-0.5",
                            )}
                          />
                        </span>
                      </button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={clearFilters}
                    >
                      {t.clearFilters}
                    </Button>
                    {loading && (
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t.loading}
                      </div>
                    )}
                  </div>
                  {selectedRecordIds.size > 0 ? (
                    <div className="mt-3 flex flex-col gap-2 border-t pt-3 lg:flex-row lg:items-center lg:justify-between">
                      {!isZtcSite && projectCopyTargets.length > 0 ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Select
                            value={projectCopyTargetId}
                            onValueChange={setProjectCopyTargetId}
                            disabled={projectCopyLoading}
                          >
                            <SelectTrigger className="h-9 w-full sm:w-[320px]">
                              <SelectValue placeholder={t.selectTargetProject} />
                            </SelectTrigger>
                            <SelectContent>
                              {projectCopyTargets.map((target) => (
                                <SelectItem key={target.id} value={target.id}>
                                  {formatProjectCopyTargetLabel(target)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            disabled={projectCopyLoading || !projectCopyTargetId}
                            onClick={handleCopySelectedRecordsToProject}
                          >
                            {projectCopyLoading ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                {t.copyingToProject}
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1 h-3.5 w-3.5" />
                                {t.copyToProject} ({selectedRecordIds.size})
                              </>
                            )}
                          </Button>
                        </div>
                      ) : projectCopyTargetsLoading ? (
                        <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {t.loadingProjects}
                        </div>
                      ) : (
                        <div />
                      )}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full sm:w-auto"
                          disabled={bulkDeleteLoading}
                          onClick={handleBulkDeleteRecords}
                        >
                          {bulkDeleteLoading ? (
                            <>
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              {t.deletingSelected}
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {t.deleteSelected} ({selectedRecordIds.size})
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}
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

            {defaultConstructionSummary.panel}

            {ztcScopeSummaryLoading ? (
              <div className="mb-4 rounded-md border bg-background px-3 py-3 text-sm text-muted-foreground shadow-sm sm:px-4">
                Ielādē kopsavilkumu...
              </div>
            ) : null}

            {ztcScopeSummaryError ? (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm text-destructive shadow-sm sm:px-4">
                {ztcScopeSummaryError}
              </div>
            ) : null}

            {ztcSelectedScopeSummary ? (
              <div className="mb-4 rounded-md border bg-background px-3 py-3 shadow-sm sm:px-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">
                      Kopa atlasitajam
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {ztcSelectedScopeSummary.project ? (
                        <span className="rounded-md bg-muted px-2 py-1">
                          Projekts: {ztcSelectedScopeSummary.project}
                        </span>
                      ) : null}
                      {ztcSelectedScopeSummary.element ? (
                        <span className="rounded-md bg-muted px-2 py-1">
                          Elements: {ztcSelectedScopeSummary.element}
                        </span>
                      ) : null}
                      {ztcSelectedScopeSummary.worker ? (
                        <span className="rounded-md bg-muted px-2 py-1">
                          Darbinieks: {ztcSelectedScopeSummary.worker}
                        </span>
                      ) : null}
                      <span className="rounded-md bg-muted px-2 py-1">
                        {ztcSelectedScopeSummary.worker
                          ? ztcSelectedScopeSummary.filtered
                            ? "Pēc filtriem"
                            : "Visi ieraksti"
                          : "Viss periods"}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "grid gap-2 text-sm",
                      ztcSelectedScopeSummary.worker &&
                        ztcSelectedScopeSummary.elementM2 != null &&
                        ztcSelectedScopeSummary.laborNormTotal?.actual != null &&
                        ztcSelectedScopeSummary.productivity
                        ? "grid-cols-1 sm:grid-cols-7 sm:min-w-[1120px]"
                        : ztcSelectedScopeSummary.worker &&
                            ztcSelectedScopeSummary.laborNormTotal?.actual != null &&
                            ztcSelectedScopeSummary.productivity
                          ? "grid-cols-1 sm:grid-cols-5 sm:min-w-[860px]"
                        : ztcSelectedScopeSummary.worker && ztcSelectedScopeSummary.productivity
                          ? "grid-cols-1 sm:grid-cols-4 sm:min-w-[700px]"
                        : ztcSelectedScopeSummary.elementM2 != null &&
                        ztcSelectedScopeSummary.laborNormTotal?.actual != null &&
                        ztcSelectedScopeSummary.costPerM2 != null &&
                        !ztcSelectedScopeSummary.worker
                        ? "grid-cols-1 sm:grid-cols-6 sm:min-w-[980px]"
                        : ztcSelectedScopeSummary.elementM2 != null &&
                            ztcSelectedScopeSummary.laborNormTotal?.actual != null &&
                            !ztcSelectedScopeSummary.worker
                          ? "grid-cols-1 sm:grid-cols-5 sm:min-w-[820px]"
                        : ztcSelectedScopeSummary.elementM2 != null && ztcSelectedScopeSummary.laborNormTotal?.actual != null
                        ? "grid-cols-1 sm:grid-cols-4 sm:min-w-[620px]"
                        : ztcSelectedScopeSummary.elementM2 != null &&
                            ztcSelectedScopeSummary.costPerM2 != null &&
                            !ztcSelectedScopeSummary.worker
                          ? "grid-cols-1 sm:grid-cols-5 sm:min-w-[820px]"
                          : ztcSelectedScopeSummary.elementM2 != null || ztcSelectedScopeSummary.laborNormTotal?.actual != null
                          ? "grid-cols-1 sm:grid-cols-3 sm:min-w-[460px]"
                          : "grid-cols-1 sm:grid-cols-2 sm:min-w-[320px]",
                    )}
                  >
                    {ztcSelectedScopeSummary.elementM2 != null ? (
                      <div className="rounded-md border bg-muted/30 px-3 py-2">
                        <div className="text-xs text-muted-foreground">Elementa laukums</div>
                        <div className="text-lg font-semibold tabular-nums">
                          {ztcSelectedScopeSummary.elementM2.toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          m²
                        </div>
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "rounded-md border bg-muted/30 px-3 py-2",
                        ztcSelectedScopeSummary.laborNormTotal?.hoursDifference != null &&
                          ztcSelectedScopeSummary.laborNormTotal.hoursDifference > 0
                          ? "border-red-200 bg-red-50"
                          : ztcSelectedScopeSummary.laborNormTotal?.hoursDifference != null &&
                              ztcSelectedScopeSummary.laborNormTotal.hoursDifference <= 0
                            ? "border-emerald-200 bg-emerald-50"
                            : "",
                      )}
                    >
                      <div className="text-xs text-muted-foreground">
                        Tehniskās stundas
                      </div>
                      <div className="text-lg font-semibold tabular-nums">
                        {(ztcSelectedScopeSummary.technicalHours ?? ztcSelectedScopeSummary.laborNormTotal?.hours ?? ztcSelectedScopeSummary.hours).toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          st
                      </div>
                      {ztcSelectedScopeSummary.laborNormTotal?.plannedHours != null ? (
                        <div className="text-xs text-muted-foreground">
                          Plāns{" "}
                          {ztcSelectedScopeSummary.laborNormTotal.plannedHours.toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          st
                        </div>
                      ) : null}
                    </div>
                    {ztcSelectedScopeSummary.laborNormTotal?.actual != null ? (
                      <div
                        className={cn(
                          "rounded-md border bg-muted/30 px-3 py-2",
                          ztcSelectedScopeSummary.laborNormTotal?.difference != null &&
                            ztcSelectedScopeSummary.laborNormTotal.difference > 0
                            ? "border-red-200 bg-red-50"
                            : ztcSelectedScopeSummary.laborNormTotal?.difference != null &&
                                ztcSelectedScopeSummary.laborNormTotal.difference <= 0
                              ? "border-emerald-200 bg-emerald-50"
                              : "",
                        )}
                      >
                        <div className="text-xs text-muted-foreground">Faktiskā izstrāde uz m²</div>
                        <div className="text-lg font-semibold tabular-nums">
                          {formatZtcLaborNorm(ztcSelectedScopeSummary.laborNormTotal.actual, dateLocale)} st/m²
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ztcSelectedScopeSummary.laborNormTotal?.planned != null
                            ? `Plāns ${formatZtcLaborNorm(ztcSelectedScopeSummary.laborNormTotal.planned, dateLocale)} st/m²`
                            : "st/m²"}
                        </div>
                      </div>
                    ) : null}
                    {ztcSelectedScopeSummary.worker && ztcSelectedScopeSummary.productivity ? (
                      <div className="rounded-md border bg-muted/30 px-3 py-2">
                        <div className="text-xs text-muted-foreground">Produktīvais / kopējais laiks</div>
                        <div className="text-lg font-semibold tabular-nums">
                          {ztcSelectedScopeSummary.productivity.productiveHours.toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          /{" "}
                          {ztcSelectedScopeSummary.productivity.totalWorkedHours.toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          st
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Neuzskaitīts{" "}
                          {ztcSelectedScopeSummary.productivity.unaccountedHours.toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          st · Pauze{" "}
                          {ztcSelectedScopeSummary.productivity.pausedHours.toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          st
                        </div>
                      </div>
                    ) : null}
                    {!ztcSelectedScopeSummary.worker ? (
                      <div className="rounded-md border bg-muted/30 px-3 py-2">
                        <div className="text-xs text-muted-foreground">Kopējās stundas</div>
                        <div className="text-lg font-semibold tabular-nums">
                          {ztcSelectedScopeSummary.hours.toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          st
                        </div>
                      </div>
                    ) : null}
                    {ztcSelectedScopeSummary.worker ? (
                      <div className="rounded-md border bg-muted/30 px-3 py-2">
                        <div className="text-xs text-muted-foreground">Kopējās nostrādātās stundas</div>
                        <div className="text-lg font-semibold tabular-nums">
                          {(ztcSelectedScopeSummary.productivity?.totalWorkedHours ?? ztcSelectedScopeSummary.hours).toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          st
                        </div>
                      </div>
                    ) : null}
                    <div className="rounded-md border bg-muted/30 px-3 py-2">
                      <div className="text-xs text-muted-foreground">
                        {ztcSelectedScopeSummary.worker ? "Kopējās izmaksas" : "Kopējās elementa izmaksas"}
                      </div>
                      <div className="text-lg font-semibold tabular-nums">
                        {formatZtcMoney(ztcSelectedScopeSummary.money)} €
                      </div>
                    </div>
                    {!ztcSelectedScopeSummary.worker && ztcSelectedScopeSummary.costPerM2 != null ? (
                      <div className="rounded-md border bg-muted/30 px-3 py-2">
                        <div className="text-xs text-muted-foreground">Izmaksas uz m²</div>
                        <div className="text-lg font-semibold tabular-nums">
                          {formatZtcMoney(ztcSelectedScopeSummary.costPerM2)} €/m²
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {ztcSelectedScopeSummary.laborNormRows.length ? (
                  <div className="mt-3 overflow-x-auto rounded-md border">
                    <div className="min-w-[850px]">
                      <div className="grid grid-cols-[minmax(0,1fr)_95px_90px_90px_100px_110px_90px] bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                      <div>Darbs</div>
                      <div className="text-right">Daudzums</div>
                      <div className="text-right">Plāna st.</div>
                      <div className="text-right">Fakt. st.</div>
                      <div className="text-right">Plāns</div>
                      <div className="text-right">Fakts</div>
                      <div className="text-right">Starpība</div>
                    </div>
                    {ztcSelectedScopeSummary.laborNormRows.map((row) => (
                      <div
                        key={row.task}
                        className="grid grid-cols-[minmax(0,1fr)_95px_90px_90px_100px_110px_90px] border-t px-3 py-2 text-sm"
                      >
                        <div className="truncate pr-2">{row.task}</div>
                        <div className="text-right tabular-nums">
                          {row.amount.toLocaleString(dateLocale, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}{" "}
                          m²
                        </div>
                        <div className="text-right tabular-nums">
                          {row.plannedHours != null
                            ? row.plannedHours.toLocaleString(dateLocale, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </div>
                        <div
                          className={cn(
                            "text-right tabular-nums",
                            row.hoursDifference != null && row.hoursDifference > 0
                              ? "text-red-600"
                              : row.hoursDifference != null && row.hoursDifference <= 0
                                ? "text-emerald-700"
                                : "",
                          )}
                        >
                          {row.hours.toLocaleString(dateLocale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-right tabular-nums">
                          {formatZtcLaborNorm(row.planned, dateLocale)}
                        </div>
                        <div className="text-right tabular-nums">
                          {formatZtcLaborNorm(row.actual, dateLocale)}
                        </div>
                        <div
                          className={cn(
                            "text-right tabular-nums",
                            row.difference != null && row.difference > 0
                              ? "text-red-600"
                              : row.difference != null && row.difference < 0
                                ? "text-emerald-700"
                                : "",
                          )}
                        >
                          {formatZtcLaborNorm(row.difference, dateLocale)}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                ) : null}
                {ztcSelectedScopeSummary.relatedAdditionalRows.length ? (
                  <div className="mt-3 overflow-x-auto rounded-md border">
                    <div className="min-w-[720px]">
                      <div className="grid grid-cols-[120px_minmax(0,1fr)_95px_80px_90px] bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                        <div>Tips</div>
                        <div>Darbs</div>
                        <div className="text-right">Daudz.</div>
                        <div className="text-right">Stundas</div>
                        <div className="text-right">Summa</div>
                      </div>
                      {ztcSelectedScopeSummary.relatedAdditionalRows.map((row) => (
                        <div
                          key={`${row.type}-${row.task}-${row.unit}`}
                          className="grid grid-cols-[120px_minmax(0,1fr)_95px_80px_90px] border-t px-3 py-2 text-sm"
                        >
                          <div className="truncate pr-2 font-medium">{row.type}</div>
                          <div className="truncate pr-2">{row.task}</div>
                          <div className="text-right tabular-nums">
                            {row.amount.toLocaleString(dateLocale, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{" "}
                            {row.unit}
                          </div>
                          <div className="text-right tabular-nums">
                            {row.hours.toLocaleString(dateLocale, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-right tabular-nums">{formatZtcMoney(row.sum)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showInitialListSkeleton ? (
              <SiteDiaryListSkeleton label={t.loadingRecords} />
            ) : (
              <>
                <div className="mb-3">{renderListPagination()}</div>

                {showUpdatingListSkeleton ? (
                  <div className="mb-3">
                    <SiteDiaryListUpdatingSkeleton label={t.updatingRecords} />
                  </div>
                ) : null}

                {!loading && keywordMatchedDayGroups.length === 0 && !error && (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      {t.noRecords}
                    </CardContent>
                  </Card>
                )}

                {/* List of days */}
                <ScrollArea className="h-[60vh] rounded-md border bg-background sm:h-[70vh]">
                  <div className="space-y-3 p-2 sm:p-3">
                    {keywordMatchedDayGroups.map((group) => {
                      const totalTasks = group.rows.length;
                      const isMediaOnlyGroup = group.mediaOnly === true;
                      const totalHours = group.rows.reduce((sum, r) => {
                        const workers = Number(r.WorkersInvolved ?? 0);
                        const hours = Number(r.TimeInvolved ?? 0);
                        return sum + workers * hours;
                      }, 0);
                      const totalWorkers = group.rows.reduce(
                        (sum, r) => sum + Number(r.WorkersInvolved ?? 0),
                        0,
                      );
                      const ztcDayPayrollSum = group.rows.reduce(
                        (sum, r) => sum + getZtcPayrollValues(r).sum,
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
                              {totalTasks} {totalTasks === 1 ? t.taskSingular : t.taskPlural}
                            </span>
                            {isMediaOnlyGroup ? (
                              <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">
                                {t.photosOnly}
                              </Badge>
                            ) : null}
                            {isMediaOnlyGroup && group.photoCount ? (
                              <span>
                                {group.photoCount} {t.photosCount}
                              </span>
                            ) : null}
                            {isZtcSite ? (
                              <span>
                                Dienas summa: {formatZtcMoney(ztcDayPayrollSum)}
                              </span>
                            ) : null}
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
                              <p>{t.viewPhotosForDay}</p>
                            </TooltipContent>
                          </Tooltip>

                          {!isZtcSite ? (
                            <>
                              {!isMediaOnlyGroup ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="rounded-full"
                                        onClick={() => openWeather(group.date)}
                                      >
                                        <CloudSun className="h-5 w-5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {t.viewWeatherForDay}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={isPdfLoading}
                                    onClick={() => handleDownloadPdf(group.key, group.date)}
                                  >
                                    {isPdfLoading ? (
                                      <>
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        {t.generating}
                                      </>
                                    ) : (
                                      t.pdfReport
                                    )}
                                  </Button>
                                </>
                              ) : null}
                            </>
                          ) : null}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDayDialog(group.date)}
                          >
                            {t.openDiary}
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="px-2 pb-3 sm:px-4">
                        {isMediaOnlyGroup ? (
                          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                            {t.photosOnlyEmptyRows}
                          </div>
                        ) : null}

                        {/* MOBILE: stacked record cards */}
                        <div className={cn("space-y-2 lg:hidden", isMediaOnlyGroup && "hidden")}>
                          {group.rows.map((r, idx) => (
                            <div
                              key={r.id ?? `${group.key}-${idx}`}
                              className={cn(
                                "rounded-md border bg-muted/40 p-2 text-[11px]",
                                isZtcSite
                                  ? r.id
                                    ? ztcQualityDisplayStateByRowId.get(r.id)?.toneClass ?? ""
                                    : getZtcQualityRowToneClass(r)
                                  : "",
                              )}
                            >
                              {r.id ? (
                                <div className="mb-2 flex justify-end">
                                  <Checkbox
                                    checked={selectedRecordIds.has(r.id)}
                                    onCheckedChange={(checked) =>
                                      toggleRecordSelection(r.id as string, checked === true)
                                    }
                                    aria-label={`Select record ${r.id}`}
                                  />
                                </div>
                              ) : null}
                              <div className="flex flex-wrap items-baseline justify-between gap-1">
                                {isZtcSite && r.Location ? (
                                  <button
                                    type="button"
                                    className="font-medium underline-offset-2 hover:text-blue-700 hover:underline"
                                    onClick={() => ztc.openProjectDetails(r.Location)}
                                  >
                                    {r.Location}
                                  </button>
                                ) : (
                                  r.Location ? (
                                    <button
                                      type="button"
                                      className="font-medium underline-offset-2 hover:text-blue-700 hover:underline"
                                      onClick={() =>
                                        defaultConstructionSummary.openLocationSummary(r.Location)
                                      }
                                    >
                                      {r.Location}
                                    </button>
                                  ) : (
                                    <span className="font-medium">{t.noLocation}</span>
                                  )
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  {r.Units && r.Amounts != null
                                    ? `${r.Amounts} ${r.Units}`
                                    : r.Units || r.Amounts || ""}
                                </span>
                              </div>
                              {isZtcSite && r.Location_Custom_1 ? (
                                <button
                                  type="button"
                                  className="mt-1 block text-left text-[10px] font-medium text-blue-700 underline-offset-2 hover:underline"
                                  onClick={() => ztc.openElementDetails(r.Location_Custom_1, r.Location)}
                                >
                                  Elements: {r.Location_Custom_1}
                                </button>
                              ) : null}

                              <div className="mt-1 text-[11px]">
                                {isZtcSite ? (
                                  <button
                                    type="button"
                                    className="block text-left font-semibold underline-offset-2 hover:text-blue-700 hover:underline"
                                    onClick={() => ztc.openRowImages(r)}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      {renderZtcWorkName(r, t.noWorksRecorded)}
                                      {r.id &&
                                      ztcQualityDisplayStateByRowId.get(r.id)
                                        ?.hasResolvedDefect ? (
                                        <span
                                          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold leading-none text-white"
                                          title="Iepriekš konstatēts defekts, kas vēlāk novērsts un pieņemts"
                                          aria-label="Iepriekš konstatēts un novērsts defekts"
                                        >
                                          !
                                        </span>
                                      ) : null}
                                    </span>
                                  </button>
                                ) : (
                                  r.Works ? (
                                    <button
                                      type="button"
                                      className="block text-left font-semibold underline-offset-2 hover:text-blue-700 hover:underline"
                                      onClick={() =>
                                        defaultConstructionSummary.openWorkSummary(r.Works)
                                      }
                                    >
                                      {r.Works}
                                    </button>
                                  ) : (
                                    <div className="font-semibold">{t.noWorksRecorded}</div>
                                  )
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                                {isZtcSite && r.createdBy ? (
                                  <span>
                                    Darbinieks:{" "}
                                    <button
                                      type="button"
                                      className="font-medium text-foreground underline-offset-2 hover:text-blue-700 hover:underline"
                                      onClick={() => openZtcWorkerDetails(r.createdBy)}
                                    >
                                      {r.createdBy}
                                    </button>
                                  </span>
                                ) : !isZtcSite ? (
                                <span>
                                  {t.workers}:{" "}
                                  <span className="font-medium text-foreground">
                                    {r.WorkersInvolved ?? "—"}
                                  </span>
                                </span>
                                ) : null}
                                <span>
                                  {t.hours}:{" "}
                                  <span className="font-medium text-foreground">
                                    {isZtcSite ? (
                                      <ZtcHoursWithPausePopover
                                        row={r}
                                        value={r.TimeInvolved ?? "—"}
                                        dateLocale={dateLocale}
                                      />
                                    ) : (
                                      r.TimeInvolved ?? "—"
                                    )}
                                  </span>
                                </span>
                                {(() => {
                                  const laborNorm = getZtcPayrollValues(r).laborNorm;
                                  if (laborNorm.planned == null && laborNorm.actual == null) return null;
                                  return (
                                    <span>
                                      Norma:{" "}
                                      <span className="font-medium text-foreground">
                                        {formatZtcLaborNorm(laborNorm.planned, dateLocale)} /{" "}
                                        {formatZtcLaborNorm(laborNorm.actual, dateLocale)}
                                      </span>
                                    </span>
                                  );
                                })()}
                              </div>

                              {isZtcSite ? (
                                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                                  <label className="space-y-1">
                                    <span>Likme</span>
                                    {ztc.renderPayrollInput(r, "rate", r.Location_Custom_2, "w-full")}
                                  </label>
                                  <label className="space-y-1">
                                    <span>Koef.</span>
                                    {ztc.renderPayrollInput(r, "coefficient", r.Works_Custom_2, "w-full")}
                                  </label>
                                  <label className="space-y-1">
                                    <span>Sarežģītība</span>
                                    {ztc.renderPayrollInput(r, "complexity", r.WorkersInvolved, "w-full")}
                                  </label>
                                  <div className="space-y-1">
                                    <span>Summa</span>
                                    <div className="flex h-8 items-center justify-end rounded-md border bg-background px-2 font-medium text-foreground">
                                      {formatZtcMoney(getZtcPayrollValues(r).sum)}
                                    </div>
                                  </div>
                                  {r.id && ztc.payrollDirtyRowIds.has(r.id) ? (
                                      <Button
                                      size="sm"
                                      className="col-span-2 h-8"
                                      disabled={ztc.payrollSavingRowId === r.id}
                                      onClick={() => ztc.savePayrollDraft(r)}
                                    >
                                      {ztc.payrollSavingRowId === r.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        "Saglabāt"
                                      )}
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="mt-1">
                                {r.Comments || r.originalAudioUrl ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        className="block w-full text-left"
                                      >
                                        <span className="line-clamp-2 overflow-hidden whitespace-pre-wrap break-words text-[11px] leading-snug text-foreground hover:text-blue-700">
                                          {r.Comments || "Balss ziņa"}
                                        </span>
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[calc(100vw-2rem)] max-w-2xl">
                                      <ZtcCommentPopoverContent row={r} />
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <p className="line-clamp-2 overflow-hidden whitespace-pre-wrap break-words text-[11px] leading-snug text-foreground">
                                    {t.noComments}
                                  </p>
                                )}
                              </div>

                              {bisUiEnabled ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {(() => {
                                    const approvalStatus = r.id ? bisApprovalStatusByRowId[r.id] : null;
                                    const isPendingApproval = isApprovalPendingStatus(approvalStatus);
                                    const isApproved = isApprovedStatus(approvalStatus);
                                    const isSent = Boolean(r.BISId) || (r.id ? bisSentRowIds.has(r.id) : false);

                                    return (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className={cn(
                                            "h-7 text-[10px]",
                                            isSent
                                              ? "cursor-not-allowed border border-border bg-muted text-muted-foreground hover:bg-muted"
                                              : "bg-green-600 text-white hover:bg-green-700",
                                          )}
                                          disabled={!r.id || bisSendingRowId === r.id || isSent}
                                          onClick={() => openBisPicker(r)}
                                        >
                                          {isSent ? t.sentToBis : bisSendingRowId === r.id ? (
                                            <>
                                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                              {t.sending}
                                            </>
                                          ) : t.sendToBis}
                                        </Button>

                                        {isSent ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className={cn(
                                              "h-7 text-[10px]",
                                              isApproved
                                                ? "bg-green-600 text-white hover:bg-green-600"
                                                : isPendingApproval
                                                  ? "cursor-not-allowed border border-border bg-muted text-muted-foreground hover:bg-muted"
                                                  : "bg-blue-600 text-white hover:bg-blue-700",
                                            )}
                                            disabled={!r.id || isPendingApproval || isApproved}
                                            onClick={() => openApprovalDialog(r)}
                                          >
                                            {isApproved ? t.approved : isPendingApproval ? t.sentForApproval : t.sendForApproval}
                                          </Button>
                                        ) : null}
                                      </>
                                    );
                                  })()}

                                  <Badge className={cn("h-7 rounded-full px-3 text-[10px] font-medium", getBisStatusClassName(r.id ? bisApprovalStatusByRowId[r.id] ?? r.bisStatus : r.bisStatus))}>
                                    {getBisStatusLabel(r.id ? bisApprovalStatusByRowId[r.id] ?? r.bisStatus : r.bisStatus)}
                                  </Badge>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="outline" className="h-7 px-2">
                                        <Ellipsis className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => openRecordDialog(r, group.date)}
                                      >
                                        {t.edit}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openCopyDialog(r)} disabled={!r.id}>
                                        {t.copyToDate}
                                      </DropdownMenuItem>
                                      {!isZtcSite ? (
                                        <DropdownMenuItem
                                          onClick={() => selectRecordForProjectCopy(r)}
                                          disabled={!r.id}
                                        >
                                          {t.copyToProject}
                                        </DropdownMenuItem>
                                      ) : null}
                                      <DropdownMenuItem onClick={() => handleDeleteRecord(r)} disabled={!r.id}>
                                        Delete
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleOpenRecordInBis(r)} disabled={!r.BISId}>
                                        <ExternalLink className="mr-2 h-3 w-3" />
                                        {t.openInBis}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              ) : (
                                <div className="mt-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 text-[10px]"
                                    disabled={!r.id}
                                    onClick={() => openCopyDialog(r)}
                                  >
                                    <Copy className="mr-1 h-3 w-3" />
                                    {t.copyToDate}
                                  </Button>
                                </div>
                              )}

                              {r.originalUserComment || r.originalAudioUrl ? (
                                <div className="mt-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        className="font-bold text-blue-600 hover:text-blue-800"
                                      >
                                        ?
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className={sourcePopoverClassName}>
                                      <OriginalSourceContent
                                        originalUserComment={r.originalUserComment}
                                        originalAudioUrl={r.originalAudioUrl}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        {/* DESKTOP: table view */}
                        <div className={cn("hidden overflow-x-auto lg:block", isMediaOnlyGroup && "lg:hidden")}>
                          {(() => {
                            const dayRecordIds = group.rows
                              .map((r) => r.id)
                              .filter((id): id is string => Boolean(id));
                            const selectedDayCount = dayRecordIds.filter((id) =>
                              selectedRecordIds.has(id),
                            ).length;
                            const allDaySelected =
                              dayRecordIds.length > 0 && selectedDayCount === dayRecordIds.length;

                            if (isZtcSite) {
                              return (
                                <Table className="table-fixed min-w-[1320px] text-sm">
                                  <TableHeader className="sticky top-0 z-10 bg-background">
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="text-center" style={{ width: 44 }}>
                                        <Checkbox
                                          checked={allDaySelected}
                                          onCheckedChange={(checked) =>
                                            handleToggleSelectForDay(dayRecordIds, checked === true)
                                          }
                                          aria-label={`Select all records for ${dayLabel(group.date)}`}
                                        />
                                      </TableHead>
                                      <TableHead style={{ width: 235 }}>Projekts / elements</TableHead>
                                      <TableHead style={{ width: 175 }}>Darbi</TableHead>
                                      <TableHead style={{ width: 105 }}>Darbinieks</TableHead>
                                      <TableHead style={{ width: 105 }}>Sākums / beigas</TableHead>
                                      <TableHead className="text-right" style={{ width: 76 }}>Daudz. / mērv.</TableHead>
                                      <TableHead className="text-right" style={{ width: 96 }}>Laika norma</TableHead>
                                      <TableHead className="px-2 text-right text-[11px]" style={{ width: 68 }}>Likme</TableHead>
                                      <TableHead className="px-2 text-right text-[11px]" style={{ width: 72 }}>Koef.</TableHead>
                                      <TableHead className="px-2 text-right text-[11px]" style={{ width: 92 }}>Sarežģītība</TableHead>
                                      <TableHead className="text-right" style={{ width: 82 }}>Summa</TableHead>
                                      <TableHead className="text-center" style={{ width: 72 }}>Saglabāt</TableHead>
                                      <TableHead style={{ width: 270 }}>Komentāri</TableHead>
                                      {bisUiEnabled ? (
                                        <TableHead className="text-center" style={{ width: 122 }}>BIS</TableHead>
                                      ) : null}
                                      {bisUiEnabled ? (
                                        <TableHead className="text-center" style={{ width: 118 }}>{t.status}</TableHead>
                                      ) : null}
                                      <TableHead className="text-center" style={{ width: 72 }}>{t.action}</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.rows.map((row, i) => {
                                      const payroll = getZtcPayrollValues(row);
                                      const workerName = splitZtcWorkerDisplayName(row.createdBy);
                                      const payrollDirty = row.id ? ztc.payrollDirtyRowIds.has(row.id) : false;
                                      const payrollSaving = row.id ? ztc.payrollSavingRowId === row.id : false;
                                      const startTime = formatZtcTimeValue(row.Date) || "—";
                                      const endTime = formatZtcTimeValue(row.Date_Custom_2) || "—";
                                      const amount = row.Amounts === null || row.Amounts === undefined || row.Amounts === ""
                                        ? "—"
                                        : String(row.Amounts);
                                      const unit = row.Units || "m2";
                                      const approvalStatus = row.id ? bisApprovalStatusByRowId[row.id] : null;
                                      const isPendingApproval = isApprovalPendingStatus(approvalStatus);
                                      const isApproved = isApprovedStatus(approvalStatus);
                                      const isSent = Boolean(row.BISId) || (row.id ? bisSentRowIds.has(row.id) : false);

                                      return (
                                        <TableRow
                                          key={row.id ?? `${group.key}-${i}`}
                                          className={cn(
                                            "align-top hover:bg-muted/30",
                                            isZtcSite
                                              ? row.id
                                                ? ztcQualityDisplayStateByRowId.get(row.id)?.toneClass ?? ""
                                                : getZtcQualityRowToneClass(row)
                                              : "",
                                          )}
                                        >
                                          <TableCell className="px-2 py-3 text-center" style={{ width: 44 }}>
                                            {row.id ? (
                                              <Checkbox
                                                checked={selectedRecordIds.has(row.id)}
                                                onCheckedChange={(checked) =>
                                                  toggleRecordSelection(row.id as string, checked === true)
                                                }
                                                aria-label={`Select record ${row.id}`}
                                              />
                                            ) : null}
                                          </TableCell>
                                          <TableCell className="px-3 py-3" style={{ width: 235 }}>
                                            <div className="space-y-1 leading-snug">
                                              <div className="line-clamp-2">
                                                <span className="text-[11px] font-medium text-muted-foreground">Projekts: </span>
                                                {row.Location ? (
                                                  <button
                                                    type="button"
                                                    className="font-medium text-foreground underline-offset-2 hover:text-blue-700 hover:underline"
                                                    onClick={() => ztc.openProjectDetails(row.Location)}
                                                  >
                                                    {row.Location}
                                                  </button>
                                                ) : (
                                                  <span className="font-medium text-foreground">—</span>
                                                )}
                                              </div>
                                              <div className="line-clamp-1">
                                                <span className="text-[11px] font-medium text-muted-foreground">Elements: </span>
                                                {row.Location_Custom_1 ? (
                                                  <button
                                                    type="button"
                                                    className="font-medium text-foreground underline-offset-2 hover:text-blue-700 hover:underline"
                                                    onClick={() => ztc.openElementDetails(row.Location_Custom_1, row.Location)}
                                                  >
                                                    {row.Location_Custom_1}
                                                  </button>
                                                ) : (
                                                  <span>—</span>
                                                )}
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="px-3 py-3" style={{ width: 175 }}>
                                            <div className="flex items-start gap-1">
                                              <button
                                                type="button"
                                                className="min-w-0 whitespace-normal break-words text-left leading-snug underline-offset-2 hover:text-blue-700 hover:underline"
                                                onClick={() => ztc.openRowImages(row)}
                                              >
                                                {renderZtcWorkName(row, "—")}
                                              </button>
                                              {row.id &&
                                              ztcQualityDisplayStateByRowId.get(row.id)
                                                ?.hasResolvedDefect ? (
                                                <span
                                                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold leading-none text-white"
                                                  title="Iepriekš konstatēts defekts, kas vēlāk novērsts un pieņemts"
                                                  aria-label="Iepriekš konstatēts un novērsts defekts"
                                                >
                                                  !
                                                </span>
                                              ) : null}
                                            </div>
                                          </TableCell>
                                          <TableCell className="px-3 py-3" style={{ width: 105 }}>
                                            <button
                                              type="button"
                                              className="block text-left leading-snug underline-offset-2 hover:text-blue-700 hover:underline"
                                              onClick={() => openZtcWorkerDetails(row.createdBy)}
                                            >
                                              <div className="font-medium">{workerName.name}</div>
                                              {workerName.surname ? (
                                                <div>{workerName.surname}</div>
                                              ) : null}
                                            </button>
                                          </TableCell>
                                          <TableCell className="px-3 py-3" style={{ width: 105 }}>
                                            <div className="space-y-1 leading-tight">
                                              <div><span className="text-muted-foreground">Sākums: </span>{startTime}</div>
                                              <div><span className="text-muted-foreground">Beigas: </span>{endTime}</div>
                                              <div className="text-[11px] font-medium text-muted-foreground">
                                                <ZtcHoursWithPausePopover
                                                  row={row}
                                                  value={`${row.TimeInvolved ?? "—"} st`}
                                                  dateLocale={dateLocale}
                                                />
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="px-3 py-3 text-right" style={{ width: 76 }}>
                                            <div className="font-medium tabular-nums">{amount}</div>
                                            <div className="text-[11px] text-muted-foreground">{unit}</div>
                                          </TableCell>
                                          <TableCell className="px-3 py-3 text-right" style={{ width: 96 }}>
                                            <div className="font-medium tabular-nums">
                                              {formatZtcLaborNorm(payroll.laborNorm.actual, dateLocale)}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                              Plāns {formatZtcLaborNorm(payroll.laborNorm.planned, dateLocale)}
                                            </div>
                                          </TableCell>
                                          <TableCell className="px-1.5 py-2 text-right" style={{ width: 68 }}>
                                            {ztc.renderPayrollInput(row, "rate", row.Location_Custom_2, "w-full")}
                                          </TableCell>
                                          <TableCell className="px-1.5 py-2 text-right" style={{ width: 72 }}>
                                            {ztc.renderPayrollInput(row, "coefficient", row.Works_Custom_2, "w-full")}
                                          </TableCell>
                                          <TableCell className="px-1.5 py-2 text-right" style={{ width: 92 }}>
                                            {ztc.renderPayrollInput(row, "complexity", row.WorkersInvolved, "w-full")}
                                          </TableCell>
                                          <TableCell className="px-3 py-3 text-right font-semibold tabular-nums" style={{ width: 82 }}>
                                            {formatZtcMoney(payroll.sum)}
                                          </TableCell>
                                          <TableCell className="px-2 py-2 text-center" style={{ width: 72 }}>
                                            {payrollDirty ? (
                                              <Button
                                                size="sm"
                                                className="h-8 px-3"
                                                disabled={!row.id || payrollSaving}
                                                onClick={() => ztc.savePayrollDraft(row)}
                                              >
                                                {payrollSaving ? (
                                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                  "Saglabāt"
                                                )}
                                              </Button>
                                            ) : null}
                                          </TableCell>
                                          <TableCell className="px-3 py-3" style={{ width: 270 }}>
                                            {row.Comments || row.originalAudioUrl ? (
                                              <Popover>
                                                <PopoverTrigger asChild>
                                                  <button
                                                    type="button"
                                                    className="block w-full overflow-hidden text-left leading-snug line-clamp-2 whitespace-normal break-words hover:text-blue-700"
                                                  >
                                                    {row.Comments || "Balss ziņa"}
                                                  </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[calc(100vw-2rem)] max-w-2xl">
                                                  <ZtcCommentPopoverContent row={row} />
                                                </PopoverContent>
                                              </Popover>
                                            ) : (
                                              <span className="text-muted-foreground">—</span>
                                            )}
                                          </TableCell>
                                          {bisUiEnabled ? (
                                            <TableCell className="px-3 py-3 text-center" style={{ width: 122 }}>
                                              {!isSent ? (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-8 bg-green-600 text-white hover:bg-green-700"
                                                  disabled={!row.id || bisSendingRowId === row.id}
                                                  onClick={() => openBisPicker(row)}
                                                >
                                                  {bisSendingRowId === row.id ? (
                                                    <>
                                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                      {t.sending}
                                                    </>
                                                  ) : (
                                                    t.sendToBis
                                                  )}
                                                </Button>
                                              ) : (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className={cn(
                                                    "h-8",
                                                    isApproved
                                                      ? "bg-green-600 text-white hover:bg-green-600"
                                                      : isPendingApproval
                                                        ? "cursor-not-allowed border border-border bg-muted text-muted-foreground hover:bg-muted"
                                                        : "bg-blue-600 text-white hover:bg-blue-700",
                                                  )}
                                                  disabled={!row.id || isPendingApproval || isApproved}
                                                  onClick={() => openApprovalDialog(row)}
                                                >
                                                  {isApproved ? (
                                                    <>
                                                      <ShieldCheck className="mr-1 h-3 w-3" />
                                                      {t.approved}
                                                    </>
                                                  ) : isPendingApproval ? (
                                                    t.sentForApproval
                                                  ) : (
                                                    t.sendForApproval
                                                  )}
                                                </Button>
                                              )}
                                            </TableCell>
                                          ) : null}
                                          {bisUiEnabled ? (
                                            <TableCell className="px-3 py-3 text-center" style={{ width: 118 }}>
                                              <Badge
                                                className={cn(
                                                  "inline-flex items-center justify-center rounded-full px-3 py-1 font-medium capitalize",
                                                  getBisStatusClassName(row.id ? bisApprovalStatusByRowId[row.id] ?? row.bisStatus : row.bisStatus),
                                                )}
                                              >
                                                {getBisStatusLabel(row.id ? bisApprovalStatusByRowId[row.id] ?? row.bisStatus : row.bisStatus)}
                                              </Badge>
                                            </TableCell>
                                          ) : null}
                                          <TableCell className="px-3 py-3 text-center" style={{ width: 72 }}>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!row.id}>
                                                  <Ellipsis className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                  onClick={() => openRecordDialog(row, group.date)}
                                                >
                                                  {t.edit}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openCopyDialog(row)} disabled={!row.id}>
                                                  {t.copyToDate}
                                                </DropdownMenuItem>
                                                {!isZtcSite ? (
                                                  <DropdownMenuItem
                                                    onClick={() => selectRecordForProjectCopy(row)}
                                                    disabled={!row.id}
                                                  >
                                                    {t.copyToProject}
                                                  </DropdownMenuItem>
                                                ) : null}
                                                <DropdownMenuItem onClick={() => handleDeleteRecord(row)} disabled={!row.id}>
                                                  Delete
                                                </DropdownMenuItem>
                                                {bisUiEnabled ? (
                                                  <DropdownMenuItem onClick={() => handleOpenRecordInBis(row)} disabled={!row.BISId}>
                                                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                                    {t.openInBis}
                                                  </DropdownMenuItem>
                                                ) : null}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              );
                            }

                            const formattedGroupRows = group.rows.map((r) => ({
                              id: r.id ?? undefined,
                              originalUserComment: r.originalUserComment ?? "",
                              originalAudioUrl: r.originalAudioUrl ?? "",
                              ...Object.fromEntries(
                                tableHeads.map((f) => [
                                  f,
                                  r[f as keyof DiaryRow] ?? "",
                                ]),
                              ),
                            }));

                            return (
                              <Table className={`table-fixed ${isZtcSite ? "min-w-[1180px]" : "min-w-[760px]"} text-xs sm:text-sm`}>
                                {/* HEADER */}
                                <TableHeader>
                                  <TableRow>
                                    <TableHead
                                      className="text-center"
                                      style={{ width: 52 }}
                                    >
                                      <Checkbox
                                        checked={allDaySelected}
                                        onCheckedChange={(checked) =>
                                          handleToggleSelectForDay(dayRecordIds, checked === true)
                                        }
                                        aria-label={`Select all records for ${dayLabel(group.date)}`}
                                      />
                                    </TableHead>
                                    {tableHeads.map((head) => {
                                      if (head === "createdAt") {
                                        return (
                                          <TableHead
                                            key={head}
                                            className="text-left"
                                            style={{ width: 120 }}
                                          >
                                            {t.time}
                                          </TableHead>
                                        );
                                      }

                                      const align = getSiteListTextAlignmentByKey(
                                        head,
                                        defaultMap,
                                      );

                                      return (
                                        <React.Fragment key={head}>
                                          <TableHead
                                            className={`text-${align}`}
                                            style={{
                                              width: getCellWidthByKey(head, defaultMap),
                                            }}
                                          >
                                            {getDisplayNameByKey(head)}
                                          </TableHead>
                                          {isZtcSite && head === "TimeInvolved" ? (
                                            <>
                                              <TableHead className="text-right" style={{ width: 90 }}>Likme</TableHead>
                                              <TableHead className="text-right" style={{ width: 105 }}>Koeficients</TableHead>
                                              <TableHead className="text-right" style={{ width: 105 }}>Sarežģītība</TableHead>
                                              <TableHead className="text-right" style={{ width: 95 }}>Summa</TableHead>
                                            </>
                                          ) : null}
                                        </React.Fragment>
                                      );
                                    })}

                                    {bisUiEnabled ? (
                                      <TableHead
                                        className="text-center"
                                        style={{ width: 140 }}
                                      >
                                        BIS
                                      </TableHead>
                                    ) : null}
                                    {bisUiEnabled ? (
                                      <TableHead
                                        className="text-center"
                                        style={{ width: 140 }}
                                      >
                                        {t.status}
                                      </TableHead>
                                    ) : null}

                                    <TableHead
                                      className="text-center"
                                      style={{ width: 100 }}
                                    >
                                      {t.action}
                                    </TableHead>

                                    <TableHead
                                      className="text-center"
                                      style={{ width: 60 }}
                                    >
                                      {t.source}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>

                                {/* BODY */}
                                <TableBody>
                                  {formattedGroupRows.map((row, i) => (
                                    <TableRow key={row.id ?? `${group.key}-${i}`}>
                                      <TableCell
                                        className="align-top px-3 py-3 text-center"
                                        style={{ width: 52 }}
                                      >
                                        {row.id ? (
                                          <Checkbox
                                            checked={selectedRecordIds.has(row.id)}
                                            onCheckedChange={(checked) =>
                                              toggleRecordSelection(row.id as string, checked === true)
                                            }
                                            aria-label={`Select record ${row.id}`}
                                          />
                                        ) : null}
                                      </TableCell>
                                      {tableHeads.map((field) => {
                                        if (field === "createdAt") {
                                          return (
                                            <TableCell
                                              key={field}
                                              className="align-top px-3 py-3 whitespace-normal break-words text-left"
                                              style={{ width: 120 }}
                                            >
                                              {row[field] ? (
                                                <div className="line-clamp-4">
                                                  {new Date(row[field]).toLocaleTimeString(dateLocale, {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: false,
                                                  })}
                                                </div>
                                              ) : (
                                                "—"
                                              )}
                                            </TableCell>
                                          );
                                        }

                                        const align =
                                          getSiteListTextAlignmentByKey(
                                            field,
                                            defaultMap,
                                          );
                                        const originalRow = group.rows[i] ?? row;
                                        const payroll = getZtcPayrollValues(originalRow);

                                        return (
                                          <React.Fragment key={field}>
                                          <TableCell
                                            className={`align-top px-3 py-3 whitespace-normal break-words text-${align}`}
                                            style={{
                                              width: getCellWidthByKey(
                                                field,
                                                defaultMap,
                                              ),
                                            }}
                                          >
                                            {row[field] === null ||
                                              row[field] === undefined ||
                                              row[field] === "" ? (
                                              "—"
                                            ) : (
                                              isZtcSite && field === "TimeInvolved" ? (
                                                <ZtcHoursWithPausePopover
                                                  row={originalRow}
                                                  value={formatValueByConfig(
                                                    field,
                                                    row[field],
                                                    defaultMap,
                                                  )}
                                                  dateLocale={dateLocale}
                                                />
                                              ) : !isZtcSite &&
                                                (field === "Location" || field === "Works") ? (
                                                <button
                                                  type="button"
                                                  className="line-clamp-4 text-left underline-offset-2 hover:text-blue-700 hover:underline"
                                                  onClick={() =>
                                                    field === "Location"
                                                      ? defaultConstructionSummary.openLocationSummary(
                                                          String(row[field]),
                                                        )
                                                      : defaultConstructionSummary.openWorkSummary(
                                                          String(row[field]),
                                                        )
                                                  }
                                                >
                                                  {formatValueByConfig(
                                                    field,
                                                    row[field],
                                                    defaultMap,
                                                  )}
                                                </button>
                                              ) : (
                                                <div className="line-clamp-4">
                                                  {formatValueByConfig(
                                                    field,
                                                    row[field],
                                                    defaultMap,
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </TableCell>
                                          {isZtcSite && field === "TimeInvolved" ? (
                                            <>
                                              <TableCell className="align-top px-2 py-2 text-right" style={{ width: 90 }}>
                                                {ztc.renderPayrollInput(originalRow, "rate", originalRow.Location_Custom_2)}
                                              </TableCell>
                                              <TableCell className="align-top px-2 py-2 text-right" style={{ width: 105 }}>
                                                {ztc.renderPayrollInput(originalRow, "coefficient", originalRow.Works_Custom_2)}
                                              </TableCell>
                                              <TableCell className="align-top px-2 py-2 text-right" style={{ width: 95 }}>
                                                {ztc.renderPayrollInput(originalRow, "complexity", originalRow.WorkersInvolved)}
                                              </TableCell>
                                              <TableCell className="align-top px-3 py-3 text-right font-medium" style={{ width: 95 }}>
                                                {formatZtcMoney(payroll.sum)}
                                              </TableCell>
                                            </>
                                          ) : null}
                                          </React.Fragment>
                                        );
                                      })}

                                      {bisUiEnabled ? (
                                        <TableCell
                                          className="align-middle px-3 py-3 text-center"
                                          style={{ width: 140 }}
                                        >
                                          {(() => {
                                            const originalRow = group.rows[i] ?? row;
                                            const approvalStatus = row.id ? bisApprovalStatusByRowId[row.id] : null;
                                            const isPendingApproval = isApprovalPendingStatus(approvalStatus);
                                            const isApproved = isApprovedStatus(approvalStatus);
                                            const isSent = Boolean(group.rows[i]?.BISId) || (row.id ? bisSentRowIds.has(row.id) : false);

                                            if (!isSent) {
                                              return (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-8 bg-green-600 text-white hover:bg-green-700"
                                                  disabled={!row.id || bisSendingRowId === row.id}
                                                  onClick={() => openBisPicker(originalRow)}
                                                >
                                                  {bisSendingRowId === row.id ? (
                                                    <>
                                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                      {t.sending}
                                                    </>
                                                  ) : (
                                                    t.sendToBis
                                                  )}
                                                </Button>
                                              );
                                            }

                                            return (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className={cn(
                                                  "h-8",
                                                  isApproved
                                                    ? "bg-green-600 text-white hover:bg-green-600"
                                                    : isPendingApproval
                                                      ? "cursor-not-allowed border border-border bg-muted text-muted-foreground hover:bg-muted"
                                                      : "bg-blue-600 text-white hover:bg-blue-700",
                                                )}
                                                disabled={!row.id || isPendingApproval || isApproved}
                                                onClick={() => openApprovalDialog(originalRow)}
                                              >
                                                {isApproved ? (
                                                  <>
                                                    <ShieldCheck className="mr-1 h-3 w-3" />
                                                    {t.approved}
                                                  </>
                                                ) : isPendingApproval ? (
                                                  t.sentForApproval
                                                ) : (
                                                  t.sendForApproval
                                                )}
                                              </Button>
                                            );
                                          })()}
                                        </TableCell>
                                      ) : null}

                                      {bisUiEnabled ? (
                                        <TableCell
                                          className="align-middle px-3 py-3 text-center"
                                          style={{ width: 140 }}
                                        >
                                          <Badge
                                            className={cn(
                                              "inline-flex items-center justify-center rounded-full px-3 py-1 font-medium capitalize",
                                              getBisStatusClassName(
                                                row.id
                                                  ? bisApprovalStatusByRowId[row.id] ?? group.rows[i]?.bisStatus
                                                  : group.rows[i]?.bisStatus,
                                              ),
                                            )}
                                          >
                                            {getBisStatusLabel(
                                              row.id
                                                ? bisApprovalStatusByRowId[row.id] ?? group.rows[i]?.bisStatus
                                                : group.rows[i]?.bisStatus,
                                            )}
                                          </Badge>
                                        </TableCell>
                                      ) : null}

                                      <TableCell
                                        className="align-top px-3 py-3 text-center"
                                        style={{ width: 100 }}
                                      >
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!row.id}>
                                              <Ellipsis className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() =>
                                                openRecordDialog(group.rows[i] ?? row, group.date)
                                              }
                                            >
                                              {t.edit}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => openCopyDialog(group.rows[i] ?? row)}
                                              disabled={!row.id}
                                            >
                                              {t.copyToDate}
                                            </DropdownMenuItem>
                                            {!isZtcSite ? (
                                              <DropdownMenuItem
                                                onClick={() => selectRecordForProjectCopy(group.rows[i] ?? row)}
                                                disabled={!row.id}
                                              >
                                                {t.copyToProject}
                                              </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem
                                              onClick={() => handleDeleteRecord(group.rows[i] ?? row)}
                                              disabled={!row.id}
                                            >
                                              Delete
                                            </DropdownMenuItem>
                                            {bisUiEnabled ? (
                                              <DropdownMenuItem
                                                onClick={() => handleOpenRecordInBis(group.rows[i] ?? row)}
                                                disabled={!group.rows[i]?.BISId}
                                              >
                                                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                                {t.openInBis}
                                              </DropdownMenuItem>
                                            ) : null}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>

                                      <TableCell
                                        className="align-top px-3 py-3 text-center"
                                        style={{ width: 60 }}
                                      >
                                        {row.originalUserComment || row.originalAudioUrl ? (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <button
                                                type="button"
                                                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-600 text-sm font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                                              >
                                                ?
                                              </button>
                                            </PopoverTrigger>
                                            <PopoverContent className={sourcePopoverClassName}>
                                              <OriginalSourceContent
                                                originalUserComment={row.originalUserComment}
                                                originalAudioUrl={row.originalAudioUrl}
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        ) : (
                                          "—"
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="mt-3">{renderListPagination()}</div>
              </>
            )}
          </TabsContent>

          {/* GALLERY VIEW */}
          <TabsContent value="gallery" className="mt-0">
            <FullPhotoGallery siteId={siteId ?? ""} />
          </TabsContent>
        </Tabs>

        {/* Dialog for editing / adding records (shared for both views) */}
        <DialogWindow
          key={optionsRevision}
          open={dialogOpen}
          setOpen={setDialogOpen}
          date={dialogDate ?? calendarDate}
          siteId={siteId}
          organizationLanguage={organizationLanguage}
          isZtcFlow={isZtcSite}
          initialRows={dialogInitialRows}
          initialConfig={defaultMap}
          initialRates={isZtcSite ? ztc.defaultRates : null}
          focusedRecordId={dialogRecordId}
          initialTab={dialogInitialTab}
          onSaved={async () => {
            reloadFilledDays();

            if (!siteId) return;
            setLoading(true);
            try {
              const refreshedRows = await refreshRowsWithBisSync();
              const activeDialogDate = dialogDate ?? calendarDate;
              if (activeDialogDate) {
                const dateKey = toLocalDateKey(activeDialogDate);
                const refreshedDayRows = refreshedRows.filter((row) => {
                  const rowDate = new Date(row.Date);
                  return !Number.isNaN(rowDate.getTime()) && toLocalDateKey(rowDate) === dateKey;
                });
                setDialogInitialRows((currentRows) => {
                  if (dialogRecordId) {
                    const refreshedRecord = refreshedDayRows.find(
                      (row) => row.id === dialogRecordId,
                    );
                    return refreshedRecord ? [refreshedRecord] : null;
                  }
                  if (!refreshedDayRows.length) return null;
                  if (!currentRows?.length) return refreshedDayRows;

                  const refreshedById = new Map(
                    refreshedDayRows
                      .filter((row) => row.id)
                      .map((row) => [String(row.id), row]),
                  );
                  const currentIds = new Set(
                    currentRows
                      .filter((row) => row.id)
                      .map((row) => String(row.id)),
                  );
                  return [
                    ...currentRows.flatMap((row) => {
                      if (!row.id) return [row];
                      const refreshedRow = refreshedById.get(String(row.id));
                      return refreshedRow ? [refreshedRow] : [];
                    }),
                    ...refreshedDayRows.filter(
                      (row) => row.id && !currentIds.has(String(row.id)),
                    ),
                  ];
                });
              }
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="grid gap-3" />
        </DialogWindow>

        {bisUiEnabled ? (
          <Dialog open={bisPickerOpen} onOpenChange={setBisPickerOpen}>
            <DialogContent className="w-[99vw] max-w-[99vw] sm:max-w-[96vw] lg:max-w-[92vw] xl:max-w-[88vw] 2xl:max-w-[84vw] max-h-[96vh] overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle>{t.selectBisMaterialsDialogTitle}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t.selectBisMaterialsDialogDescription}
                </DialogDescription>
              </DialogHeader>

              {bisPickerLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading options...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    Selected attachments: {selectedAttachmentUrls.length} (optional)
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-md border p-4 lg:col-span-2">
                      <h3 className="mb-3 text-sm font-semibold">{t.performedWorkDetails}</h3>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="flex flex-col gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-foreground">{t.bisEventDate}</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                                  {bisSubmitDate
                                    ? bisSubmitDate.toLocaleDateString(dateLocale)
                                    : t.pickBisEventDate}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={bisSubmitDate || undefined}
                                  onSelect={(value) => {
                                    setBisSubmitDate(value ?? null);
                                    if (value && bisSubmitDateTo) {
                                      const start = new Date(value);
                                      start.setHours(0, 0, 0, 0);
                                      const end = new Date(bisSubmitDateTo);
                                      end.setHours(0, 0, 0, 0);
                                      if (end <= start) {
                                        setBisSubmitDateTo(null);
                                      }
                                    }
                                  }}
                                  className="bg-green-50/40"
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="bis-multiple-day-job"
                              checked={bisMultipleDayJob}
                              onCheckedChange={(checked) => {
                                const enabled = checked === true;
                                setBisMultipleDayJob(enabled);
                                if (!enabled) {
                                  setBisSubmitDateTo(null);
                                }
                              }}
                            />
                            <label
                              htmlFor="bis-multiple-day-job"
                              className="cursor-pointer text-xs font-medium text-foreground"
                            >
                              {t.multipleDayJob}
                            </label>
                          </div>
                          <div className="space-y-1">
                            <label
                              className={cn(
                                "text-xs font-medium",
                                bisMultipleDayJob ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {t.bisEventDateTo}
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={!bisMultipleDayJob}
                                  className="w-full justify-start text-left font-normal disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                                  {bisSubmitDateTo
                                    ? bisSubmitDateTo.toLocaleDateString(dateLocale)
                                    : t.pickBisEventDateTo}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={bisSubmitDateTo || undefined}
                                  onSelect={(value) => setBisSubmitDateTo(value ?? null)}
                                  disabled={(date) => {
                                    if (!bisMultipleDayJob) return true;
                                    if (!bisSubmitDate) return false;
                                    const start = new Date(bisSubmitDate);
                                    start.setHours(0, 0, 0, 0);
                                    const candidate = new Date(date);
                                    candidate.setHours(0, 0, 0, 0);
                                    return candidate <= start;
                                  }}
                                  className="bg-green-50/40"
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground">{t.worksDescription}</label>
                          <Textarea
                            key={`works-${bisInputResetKey}`}
                            defaultValue={bisSubmitWorksRef.current}
                            onChange={(event) => {
                              const truncatedValue = event.target.value.slice(0, 200);
                              if (event.target.value !== truncatedValue) {
                                event.target.value = truncatedValue;
                              }
                              bisSubmitWorksRef.current = truncatedValue;
                            }}
                            placeholder="Describe works sent to BIS"
                            rows={3}
                            maxLength={200}
                            className="min-h-[84px]"
                          />
                          <p className="text-[11px] text-muted-foreground">{t.worksDescriptionLimit}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground">
                            Amount {selectedRowForBis?.Units ? `(${selectedRowForBis.Units})` : ""}
                          </label>
                          <Input
                            key={`amount-${bisInputResetKey}`}
                            type="text"
                            inputMode="decimal"
                            value={bisSubmitAmount}
                            onChange={(event) => {
                              setBisSubmitAmount(event.target.value);
                            }}
                            placeholder="Enter amount"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground">{t.bisMeasurementUnit}</label>
                          <Select value={bisSubmitMeasurement} onValueChange={setBisSubmitMeasurement}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select measurement" />
                            </SelectTrigger>
                            <SelectContent>
                              {bisMeasurementOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 xl:col-span-2">
                          <label className="text-xs font-medium text-foreground">Responsible person</label>
                          <Select
                            value={selectedBisResponsiblePersonKey}
                            onValueChange={setSelectedBisResponsiblePersonKey}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select responsible person" />
                            </SelectTrigger>
                            <SelectContent>
                              {bisResponsiblePersonOptions.map((person) => {
                                const key = `${person.responsiblePersonId}:${person.responsiblePersonType}`;
                                const roleLabel = person.role ? ` (${person.role})` : "";
                                return (
                                  <SelectItem key={key} value={key}>
                                    {(person.fullName || `Person #${person.personId ?? "?"}`) + roleLabel}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border p-4">
                      <h3 className="mb-2 text-sm font-semibold">{t.attachments}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t.attachmentsOptionalHelp}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => setAttachmentGalleryOpen(true)}
                      >
                        {t.addManageAttachments}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">{t.materialsFromCurrentBisCase}</h3>
                    <div className="max-h-[52vh] overflow-y-auto rounded-md border">
                      {bisMaterialOptions.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">{t.noBisMaterialsAvailable}</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">{t.material}</th>
                              <th className="px-3 py-2 text-left font-medium">{t.unit}</th>
                              <th className="px-3 py-2 text-right font-medium">{t.total}</th>
                              <th className="px-3 py-2 text-right font-medium">{t.used}</th>
                              <th className="px-3 py-2 text-right font-medium">{t.available}</th>
                              <th className="px-3 py-2 text-right font-medium">{t.sendQty}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bisMaterialOptions.map((material) => (
                              <tr key={material.id} className="border-t">
                                <td className="px-3 py-2 align-top">
                                  <div className="font-medium">{material.label}</div>
                                </td>
                                <td className="px-3 py-2">{material.measurementUnit || "—"}</td>
                                <td className="px-3 py-2 text-right">{material.deliveredQuantity ?? "—"}</td>
                                <td className="px-3 py-2 text-right">{material.usedQuantity ?? "—"}</td>
                                <td className="px-3 py-2 text-right font-semibold">
                                  {material.availableQuantity} {material.measurementUnit || ""}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    className="ml-auto w-28"
                                    defaultValue={materialQuantitiesRef.current[material.id] ?? ""}
                                    onChange={(e) => {
                                      const rawValue = e.target.value.replace(",", ".");
                                      if (!/^\d*\.?\d*$/.test(rawValue)) return;
                                      materialQuantitiesRef.current[material.id] = rawValue;
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{t.selectedGalleryAttachments}</h3>
                    </div>

                    {selectedAttachmentUrls.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t.noAttachmentsSelected}</p>
                    ) : (
                      <div className="max-h-56 overflow-y-auto rounded-md border p-2">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                          {selectedAttachmentUrls.map((url) => (
                            <div key={url} className="relative overflow-hidden rounded border">
                              <img src={url} alt="Selected attachment" className="h-24 w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => toggleAttachment(url, false)}
                                className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white"
                              >
                                {t.remove}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setBisPickerOpen(false)}>
                      {t.cancel}
                    </Button>
                    <Button
                      onClick={handleSendRowToBis}
                      disabled={
                        Boolean(selectedRowForBis?.id && bisSendingRowId === selectedRowForBis.id) ||
                        (Number.parseFloat(bisSubmitAmount || "") || 0) <= 0 ||
                        (bisMultipleDayJob && !bisSubmitDateTo)
                      }
                    >
                      {selectedRowForBis?.id && bisSendingRowId === selectedRowForBis.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t.sending}
                        </>
                      ) : (
                        t.sendToBis
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        ) : null}

        <Dialog
          open={approverDialogOpen}
          onOpenChange={(open) => {
            setApproverDialogOpen(open);
            if (!open) {
              setApprovalRow(null);
              setApproverOptions([]);
              setSelectedApproverKeys([]);
            }
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{t.sendSiteDiaryForApprovalTitle}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t.sendSiteDiaryForApprovalDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {approverOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No BIS approvers returned for this record.</p>
              ) : (
                approverOptions.map((approver) => {
                  const key = approverKey(approver);
                  const checked = selectedApproverKeys.includes(key);
                  return (
                    <label key={key} className="flex items-start gap-3 rounded-lg border p-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setSelectedApproverKeys((current) =>
                            value ? [...current, key] : current.filter((item) => item !== key),
                          )
                        }
                      />
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{approver.name || "Unnamed approver"}</p>
                        <p className="text-xs text-muted-foreground">
                          Member ID: {approver.memberId} • Level: {approver.level ?? "—"}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproverDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitApproval} disabled={approvalLoading || selectedApproverKeys.length === 0}>
                {approvalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.sending}
                  </>
                ) : (
                  t.sendForApproval
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Copy record to another date</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                This creates a local copy only. If the original was sent to BIS, copied record must be sent again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <label className="text-sm font-medium">{t.targetDate}</label>
              <Calendar
                mode="single"
                selected={copyTargetDate || undefined}
                onSelect={(value) => setCopyTargetDate(value ?? null)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCopyRecord} disabled={!copyTargetDate || copyLoading}>
                {copyLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Copying...
                  </>
                ) : (
                  "Copy record"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={attachmentGalleryOpen} onOpenChange={setAttachmentGalleryOpen}>
          <DialogContent className="w-[98vw] max-w-[98vw] lg:max-w-7xl max-h-[94vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.selectAttachmentsFromGalleryTitle}</DialogTitle>
              <DialogDescription className="sr-only">
                Select photos from the project gallery as BIS attachments.
              </DialogDescription>
            </DialogHeader>

            {galleryAttachmentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noGalleryPhotos}</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {pagedGalleryAttachments.map((attachment) => {
                    const checked = selectedAttachmentUrls.includes(attachment.url);
                    return (
                      <label
                        key={attachment.id}
                        className={cn(
                          "cursor-pointer overflow-hidden rounded-md border",
                          checked ? "ring-2 ring-green-600" : "",
                        )}
                      >
                        <div className="relative">
                          <img
                            src={attachment.url}
                            alt={attachment.comment || "Gallery photo"}
                            className="h-40 w-full object-cover"
                          />
                          <div className="absolute left-2 top-2 rounded bg-black/70 p-1">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleAttachment(attachment.url, Boolean(value))
                              }
                            />
                          </div>
                        </div>
                        <div className="p-2 text-[11px] text-muted-foreground">
                          {attachment.date
                            ? new Date(attachment.date).toLocaleDateString(dateLocale)
                            : ""}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between rounded border bg-muted/20 px-3 py-2 text-xs">
                  <span>
                    Page {galleryAttachmentPage} of {galleryTotalPages} • {sortedGalleryAttachmentOptions.length} photos
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={galleryAttachmentPage <= 1}
                      onClick={() => setGalleryAttachmentPage((prev) => Math.max(1, prev - 1))}
                    >
                      {t.previous}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={galleryAttachmentPage >= galleryTotalPages}
                      onClick={() =>
                        setGalleryAttachmentPage((prev) => Math.min(galleryTotalPages, prev + 1))
                      }
                    >
                      {t.next}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" onClick={() => setAttachmentGalleryOpen(false)}>
                {t.done}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {ztc.dialogs}

        {/* Photos dialog with ImageGallery */}
        <Dialog open={photosDialogOpen} onOpenChange={setPhotosDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[90vw] lg:max-w-[1200px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                Photos & audio –{" "}
                {photosDate
                  ? photosDate.toLocaleDateString(dateLocale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                  : t.noDateSelected}
              </DialogTitle>
              <DialogDescription className="sr-only">
                View photos and audio connected with this site diary day.
              </DialogDescription>
            </DialogHeader>
            <ImageGallery
              date={photosDate}
              siteId={siteId}
              className="h-[70vh]"
              organizationLanguage={organizationLanguage}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={weatherDialogOpen} onOpenChange={setWeatherDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {t.weatherFor}{" "}
                {weatherDate
                  ? weatherDate.toLocaleDateString(dateLocale, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                  : t.noDateSelected}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Weather details for the selected site diary day.
              </DialogDescription>
            </DialogHeader>

            {weatherLoading ? (
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.weatherLoading}
              </div>
            ) : weatherError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                {weatherError}
              </div>
            ) : weatherHours.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {t.weatherNoDataForDay}
              </div>
            ) : (
              <div className="space-y-3">
                {weatherLocation ? (
                  <p className="text-xs text-muted-foreground">
                    Lat: {weatherLocation.latitude.toFixed(6)} • Lon: {weatherLocation.longitude.toFixed(6)}
                  </p>
                ) : null}

                <div className="rounded-md border p-3">
                  <p className="mb-2 text-sm font-medium">{t.weather} • {t.weatherTemperature} / {t.weatherWind}</p>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={weatherHours.map((h) => ({
                          hourLabel: `${String(h.hour).padStart(2, "0")}:00`,
                          temperatureC: h.temperatureC,
                          windSpeedMs: h.windSpeedMs,
                        }))}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hourLabel" tick={{ fontSize: 11 }} interval={2} />
                        <YAxis yAxisId="temp" tick={{ fontSize: 11 }} width={35} />
                        <YAxis yAxisId="wind" orientation="right" tick={{ fontSize: 11 }} width={35} />
                        <RechartsTooltip />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="temperatureC"
                          name={t.weatherTemperature}
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                        <Line
                          yAxisId="wind"
                          type="monotone"
                          dataKey="windSpeedMs"
                          name={t.weatherWind}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.weatherHour}</TableHead>
                        <TableHead>{t.weatherTemperature}</TableHead>
                        <TableHead>{t.weatherWind}</TableHead>
                        <TableHead>{t.weatherPrecipitation}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weatherHours.map((h) => (
                        <TableRow key={h.hour}>
                          <TableCell>{String(h.hour).padStart(2, "0")}:00</TableCell>
                          <TableCell>{h.temperatureC ?? "—"}</TableCell>
                          <TableCell>{h.windSpeedMs ?? "—"}</TableCell>
                          <TableCell>{h.precipitationMm ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
