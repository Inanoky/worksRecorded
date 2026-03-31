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
  copySiteDiaryRecordToDate,
  getBisCaseAvailableMaterials,
  getBisCharacterMeasures,
  getSiteDiaryRecordBisUrl,
  getFilledDays,
  getPossibleSiteDiaryBisApprovers,
  getSiteDiaryBisApprovalStatus,
  getSiteGalleryAttachments,
  getSitediaryRecordsBySiteIdForExcel,
  sendSiteDiaryRecordToBis,
  syncDeletedSiteDiaryBisRecords,
  submitSiteDiaryRecordToBisApproval,
} from "@/server/actions/site-diary-actions";
import { generateSiteDiaryPdf } from "@/server/actions/pdfBuilderForFrontend";
import * as XLSX from "xlsx";
import {
  CalendarIcon,
  Copy,
  Ellipsis,
  ExternalLink,
  Filter,
  Images,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import TourRunner from "@/components/joyride/TourRunner";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

// 👇 NEW: full gallery view
import FullPhotoGallery from "@/components/sitediary/FullGalleryView";
import { getConfig } from "@/server/actions/site-diary-actions";
import defaultConfig from "./defaultConfig.json";
import { toast } from "sonner";

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
  createdAt?: string | Date;
  Date: string | Date;
  Location?: string | null;
  Works?: string | null;
  Units?: string | null;
  Amounts?: number | string | null;
  WorkersInvolved?: number | string | null;
  TimeInvolved?: number | string | null;
  Comments?: string | null;
  originalUserComment?: string | null;

  BISId?: string | null;
  bisStatus?: string | null;
  [key: string]: any;
};

type DayGroup = {
  key: string; // yyyy-mm-dd
  date: Date;
  rows: DiaryRow[];
};

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

export default function SiteDiaryCalendar({
  siteId,
  bisEnabled = true,
}: {
  siteId: string | null;
  bisEnabled?: boolean;
}) {
  const today = new Date();

  // 👇 add "gallery" to view mode
  const [viewMode, setViewMode] =
    React.useState<"calendar" | "list" | "gallery">("list");

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
  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", {
    month: "long",
  });

  // List view state
  const [rows, setRows] = React.useState<DiaryRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dateFrom, setDateFrom] = React.useState<Date | null>(null);
  const [dateTo, setDateTo] = React.useState<Date | null>(null);
  const [workFilter, setWorkFilter] = React.useState<string>("__ALL__");
  const [floorFilter, setFloorFilter] = React.useState<string>("__ALL__");

  //----------------------Table---------------------------------------------------

  const [defaultMap, setMap] = React.useState<Record<string, any>>(defaultConfig);
  const [tableHeads, setTableHeads] = React.useState<string[]>([]);
  const [tableRows, setTableRows] = React.useState<any[]>([]);
  const [screenWidth, setScreenWidth] = React.useState<number>(150);

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

  function getTypeByKey(key: string) {
    return defaultMap[key]?.Type ?? null;
  }

  function getDisplayNameByKey(key) {
    return defaultMap[key]?.DisplayName ?? key;
  }

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
  const [materialQuantities, setMaterialQuantities] = React.useState<Record<string, string>>({});
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
  const [bisSubmitWorks, setBisSubmitWorks] = React.useState("");
  const [bisSubmitAmount, setBisSubmitAmount] = React.useState<string>("1");
  const [bisSubmitMeasurement, setBisSubmitMeasurement] = React.useState<string>("12");
  const [bisMeasurementOptions, setBisMeasurementOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [bisSyncLoading, setBisSyncLoading] = React.useState(false);
  const [galleryAttachmentPage, setGalleryAttachmentPage] = React.useState(1);
  const [showBisUi, setShowBisUi] = React.useState(true);
  const bisUiEnabled = bisEnabled && showBisUi;

  const reloadFilledDays = React.useCallback(() => {
    if (!siteId) {
      setFilledDays([]);
      return;
    }
    getFilledDays({ siteId, year: currentYear, month: currentMonth }).then(
      setFilledDays,
    );
  }, [siteId, currentMonth, currentYear]);

  const refreshRowsWithBisSync = React.useCallback(async (options?: { skipSync?: boolean }) => {
    if (!siteId) return [];
    if (bisUiEnabled && !options?.skipSync) {
      await syncDeletedSiteDiaryBisRecords(siteId);
    }
    const data: DiaryRow[] = await getSitediaryRecordsBySiteIdForExcel(siteId);
    setRows(data || []);
    setBisApprovalStatusByRowId(
      Object.fromEntries(
        (data || [])
          .filter((row) => row.id)
          .map((row) => [row.id as string, row.bisStatus ?? ""]),
      ),
    );
    return data;
  }, [bisUiEnabled, siteId]);

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
        const cfg = (await getConfig(siteId)) ?? defaultConfig;
        if (cancelled) return;

        const screenWidth = cfg?.otherSettings?.displaySiteListWidth ?? 140;
        setScreenWidth(screenWidth);

        console.log("config");
        console.dir(cfg);

        setMap(cfg);

        const renderableFields = getRenderableFieldsOrdered(cfg);
        const tableFields = ["createdAt", ...renderableFields];
        console.log(`renderableFields ${renderableFields}`);

        setTableHeads(tableFields);

        //Fetching data
        const data: DiaryRow[] = await refreshRowsWithBisSync();

        function pickRenderableRows(
          rows: Record<string, any>[],
          renderableFields: string[],
        ) {
          return rows.map((row) => ({
            createdAt: row.createdAt ?? undefined,
            originalUserComment: row.originalUserComment ?? "",
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
  }, [refreshRowsWithBisSync, siteId]);

  const hasFilledDays = filledDays.length > 0;
  const hasRecords = rows.length > 0;
  const GALLERY_PAGE_SIZE = 20;

  // Works filter options
  const worksOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.Works && String(r.Works).trim()) set.add(String(r.Works).trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Floor filter options (based on Location)
  const floorOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.Location && String(r.Location).trim()) {
        set.add(String(r.Location).trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Rows after applying all filters (date, works, floor)
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
    Object.values(res).forEach((group) => {
      group.rows.sort((a, b) => {
        const timeA = new Date(a.createdAt ?? a.Date).getTime();
        const timeB = new Date(b.createdAt ?? b.Date).getTime();

        if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
        if (Number.isNaN(timeA)) return 1;
        if (Number.isNaN(timeB)) return -1;

        return timeB - timeA;
      });
    });
    return Object.values(res).sort((a, b) => b.date.getTime() - a.date.getTime());
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


  const openBisPicker = async (row: DiaryRow) => {
    if (!bisUiEnabled) {
      return;
    }

    if (!row.id) {
      toast.error("This record cannot be sent because it has no id.");
      return;
    }

    if (!siteId) {
      toast.error("Missing site id.");
      return;
    }

    setSelectedRowForBis(row);
    setBisSubmitDate(row.Date ? new Date(row.Date) : new Date());
    setBisSubmitWorks(String(row.Works ?? ""));
    setBisSubmitAmount(String(row.Amounts ?? 1));
    setBisPickerOpen(true);
    setBisPickerLoading(true);

    try {
      const [materials, attachments, measurements] = await Promise.all([
        getBisCaseAvailableMaterials(siteId),
        getSiteGalleryAttachments(siteId),
        getBisCharacterMeasures(siteId),
      ]);

      setBisMaterialOptions(materials);
      setGalleryAttachmentOptions(attachments);
      setGalleryAttachmentPage(1);
      setSelectedAttachmentUrls([]);
      setMaterialQuantities(
        Object.fromEntries(materials.map((material) => [material.id, ""])),
      );
      setBisMeasurementOptions(measurements);
      if (measurements.length > 0) {
        const current = measurements.find((item) => item.id === bisSubmitMeasurement);
        setBisSubmitMeasurement(current?.id ?? measurements[0]?.id ?? "12");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load BIS material or attachment options.");
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
    if (normalized === "approved") return "BIS approved";
    if (isApprovalPendingStatus(status)) return "BIS pending";
    if (["sent", "draft", "created"].includes(normalized)) return "BIS draft";
    return "BIS draft";
  }, [isApprovalPendingStatus, normalizeApprovalStatus]);

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
      toast.error("Send this site diary record to BIS first.");
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
      toast.error(e?.message ?? "Failed to load BIS approvers.");
      setApproverDialogOpen(false);
    }
  };

  const submitApproval = async () => {
    if (!approvalRow?.id) {
      toast.error("No record selected for approval.");
      return;
    }

    const selectedApprovers = approverOptions.filter((approver) =>
      selectedApproverKeys.includes(approverKey(approver)),
    );

    if (selectedApprovers.length === 0) {
      toast.error("Select at least one approver.");
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
      toast.success("Site diary record submitted for BIS approval.");
      setApproverDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit approval.");
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
      toast.error("Select a record and target date.");
      return;
    }

    try {
      setCopyLoading(true);
      await copySiteDiaryRecordToDate(copyTargetRow.id, copyTargetDate.toISOString());
      if (!siteId) return;
      await refreshRowsWithBisSync();
      reloadFilledDays();
      toast.success("Record copied locally. Submit it to BIS again if needed.");
      setCopyDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to copy record.");
    } finally {
      setCopyLoading(false);
    }
  };

  const handleSyncBisRecords = async () => {
    if (!siteId) {
      toast.error("Missing site id.");
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
        toast.success(`${result.cleared} BIS link(s) were removed because records were deleted in BIS.`);
      } else {
        toast.success("BIS sync completed. No deleted BIS records found.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to sync BIS records.");
    } finally {
      setBisSyncLoading(false);
    }
  };

  const handleSendRowToBis = async () => {
    if (!selectedRowForBis?.id) {
      toast.error("Missing selected record id.");
      return;
    }

    const selectedMaterials = bisMaterialOptions
      .map((material) => {
        const available = Number(material.availableQuantity ?? 0);
        const requested = Number.parseFloat(materialQuantities[material.id] ?? "");
        const normalizedRequested = Number.isFinite(requested) ? requested : 0;
        return {
          constructionMaterialId: material.id,
          quantity: Math.max(0, Math.min(normalizedRequested, available)),
        };
      })
      .filter((material) => material.quantity > 0);

    if (selectedMaterials.length === 0) {
      toast.error("Please select at least one material.");
      return;
    }

    try {
      setBisSendingRowId(selectedRowForBis.id);

      const parsedAmount = Number(bisSubmitAmount);
      await sendSiteDiaryRecordToBis(selectedRowForBis.id, {
        materials: selectedMaterials,
        attachments: selectedAttachmentUrls.map((url) => ({ url })),
        eventDate: bisSubmitDate ? bisSubmitDate.toISOString() : undefined,
        worksDescription: bisSubmitWorks,
        amount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
        measurement: bisSubmitMeasurement,
      });

      const bisStatus = selectedRowForBis.id ? bisApprovalStatusByRowId[selectedRowForBis.id] : null;
      if (selectedRowForBis.id && !bisStatus) {
        setBisApprovalStatusByRowId((prev) => ({ ...prev, [selectedRowForBis.id as string]: "draft" }));
      }
      setBisSentRowIds((prev) => new Set(prev).add(selectedRowForBis.id as string));
      await refreshRowsWithBisSync();
      setBisPickerOpen(false);
      toast.success("Site diary record sent to BIS.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send site diary record to BIS.");
    } finally {
      setBisSendingRowId(null);
    }
  };

  const handleOpenRecordInBis = async (row: DiaryRow) => {
    if (!row?.id || !row.BISId) {
      toast.error("This record has not been sent to BIS yet.");
      return;
    }

    try {
      const url = await getSiteDiaryRecordBisUrl(row.id);
      if (!url) {
        toast.error("BIS URL is not available for this record.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open record in BIS.");
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
                Site Diary
              </h2>
              <p className="text-sm text-muted-foreground">
                Switch between calendar, list and gallery views.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <TabsList className="self-start sm:self-end">
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
              </TabsList>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => window.open("https://wa.me/13135131153", "_blank")}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-green-100 bg-white px-3 py-1.5 text-sm font-medium text-green-600 shadow-sm transition hover:bg-green-50 hover:text-green-700"
                  data-tour="calendar"
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
                {bisUiEnabled ? (
                  <Button variant="outline" onClick={handleSyncBisRecords} disabled={bisSyncLoading}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", bisSyncLoading ? "animate-spin" : "")} />
                    {bisSyncLoading ? "Refreshing..." : "Refresh BIS sync"}
                  </Button>
                ) : null}
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
                    {bisEnabled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => setShowBisUi((prev) => !prev)}
                      >
                        BIS {showBisUi ? "On" : "Off"}
                      </Button>
                    ) : null}
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
                  const totalHours = group.rows.reduce((sum, r) => {
                    const workers = Number(r.WorkersInvolved ?? 0);
                    const hours = Number(r.TimeInvolved ?? 0);
                    return sum + workers * hours;
                  }, 0);
                  const totalWorkers = group.rows.reduce(
                    (sum, r) => sum + Number(r.WorkersInvolved ?? 0),
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
                              {totalTasks} task{totalTasks === 1 ? "" : "s"}
                            </span>
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
                            onClick={() => handleDownloadPdf(group.key, group.date)}
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
                        {/* MOBILE: stacked record cards */}
                        <div className="space-y-2 sm:hidden">
                          {group.rows.map((r, idx) => (
                            <div
                              key={r.id ?? `${group.key}-${idx}`}
                              className="rounded-md border bg-muted/40 p-2 text-[11px]"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-1">
                                <span className="font-medium">
                                  {r.Location || "No location"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {r.Units && r.Amounts != null
                                    ? `${r.Amounts} ${r.Units}`
                                    : r.Units || r.Amounts || ""}
                                </span>
                              </div>

                              <div className="mt-1 text-[11px]">
                                <div className="font-semibold">
                                  {r.Works || "No works recorded"}
                                </div>
                              </div>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                                <span>
                                  Workers:{" "}
                                  <span className="font-medium text-foreground">
                                    {r.WorkersInvolved ?? "—"}
                                  </span>
                                </span>
                                <span>
                                  Hours:{" "}
                                  <span className="font-medium text-foreground">
                                    {r.TimeInvolved ?? "—"}
                                  </span>
                                </span>
                              </div>

                              <div className="mt-1">
                                <p className="line-clamp-4 whitespace-pre-wrap text-[11px] leading-snug text-foreground">
                                  {r.Comments || "No comments"}
                                </p>
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
                                          {isSent ? "Sent to BIS" : bisSendingRowId === r.id ? (
                                            <>
                                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                              Sending...
                                            </>
                                          ) : "Send to BIS"}
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
                                            {isApproved ? "Approved" : isPendingApproval ? "Sent for approval" : "Send for approval"}
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
                                      <DropdownMenuItem onClick={() => openCopyDialog(r)} disabled={!r.id}>
                                        <Copy className="mr-2 h-3 w-3" />
                                        Copy to date
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleOpenRecordInBis(r)} disabled={!r.BISId}>
                                        <ExternalLink className="mr-2 h-3 w-3" />
                                        Open in BIS
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
                                    Copy to date
                                  </Button>
                                </div>
                              )}

                              {r.originalUserComment ? (
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
                                    <PopoverContent className="max-w-sm whitespace-pre-wrap break-words text-sm">
                                      {r.originalUserComment}
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        {/* DESKTOP: table view */}
                        <div className="hidden sm:block overflow-x-auto">
                          {(() => {
                            const formattedGroupRows = group.rows.map((r) => ({
                              id: r.id ?? undefined,
                              originalUserComment: r.originalUserComment ?? "",
                              ...Object.fromEntries(
                                tableHeads.map((f) => [
                                  f,
                                  r[f as keyof DiaryRow] ?? "",
                                ]),
                              ),
                            }));

                            return (
                              <Table className="table-fixed min-w-[760px] text-xs sm:text-sm">
                                {/* HEADER */}
                                <TableHeader>
                                  <TableRow>
                                    {tableHeads.map((head) => {
                                      if (head === "createdAt") {
                                        return (
                                          <TableHead
                                            key={head}
                                            className="text-left"
                                            style={{ width: 120 }}
                                          >
                                            Time
                                          </TableHead>
                                        );
                                      }

                                      const align = getSiteListTextAlignmentByKey(
                                        head,
                                        defaultMap,
                                      );

                                      return (
                                        <TableHead
                                          key={head}
                                          className={`text-${align}`}
                                          style={{
                                            width: getCellWidthByKey(head, defaultMap),
                                          }}
                                        >
                                          {getDisplayNameByKey(head)}
                                        </TableHead>
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
                                    <TableHead
                                      className="text-center"
                                      style={{ width: 140 }}
                                    >
                                      Status
                                    </TableHead>

                                    <TableHead
                                      className="text-center"
                                      style={{ width: 100 }}
                                    >
                                      Action
                                    </TableHead>

                                    <TableHead
                                      className="text-center"
                                      style={{ width: 60 }}
                                    >
                                      Source
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>

                                {/* BODY */}
                                <TableBody>
                                  {formattedGroupRows.map((row, i) => (
                                    <TableRow key={row.id ?? `${group.key}-${i}`}>
                                      {tableHeads.map((field) => {
                                        if (field === "createdAt") {
                                          return (
                                            <TableCell
                                              key={field}
                                              className="align-top px-3 py-2 whitespace-normal break-words text-left"
                                              style={{ width: 120 }}
                                            >
                                              {row[field] ? (
                                                <div className="line-clamp-4">
                                                  {new Date(row[field]).toLocaleTimeString("en-GB", {
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

                                        return (
                                          <TableCell
                                            key={field}
                                            className={`align-top px-3 py-2 whitespace-normal break-words text-${align}`}
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
                                              <div className="line-clamp-4">
                                                {formatValueByConfig(
                                                  field,
                                                  row[field],
                                                  defaultMap,
                                                )}
                                              </div>
                                            )}
                                          </TableCell>
                                        );
                                      })}

{bisUiEnabled ? (
                                      <TableCell
                                        className="align-top px-3 py-2 text-center"
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
                                                    Sending...
                                                  </>
                                                ) : (
                                                  "Send to BIS"
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
                                                  Approved
                                                </>
                                              ) : isPendingApproval ? (
                                                "Sent for approval"
                                              ) : (
                                                "Send for approval"
                                              )}
                                            </Button>
                                          );
                                        })()}
                                      </TableCell>
                                      ) : null}

                                      <TableCell
                                        className="align-top px-3 py-2 text-center"
                                        style={{ width: 140 }}
                                      >
                                        <Badge
                                          className={cn(
                                            "rounded-full px-3 py-1 font-medium capitalize",
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

                                      <TableCell
                                        className="align-top px-3 py-2 text-center"
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
                                              onClick={() => openCopyDialog(group.rows[i] ?? row)}
                                              disabled={!row.id}
                                            >
                                              <Copy className="mr-2 h-3.5 w-3.5" />
                                              Copy
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => handleOpenRecordInBis(group.rows[i] ?? row)}
                                              disabled={!group.rows[i]?.BISId}
                                            >
                                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                              Open in BIS
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>

                                      <TableCell
                                        className="align-top px-3 py-2 text-center"
                                        style={{ width: 60 }}
                                      >
                                        {row.originalUserComment ? (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <button
  type="button"
  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-600 text-sm font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-800"
>
  ?
</button>
                                            </PopoverTrigger>
                                            <PopoverContent className="max-w-sm whitespace-pre-wrap break-words text-sm">
                                              {row.originalUserComment}
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
          </TabsContent>

          {/* GALLERY VIEW */}
          <TabsContent value="gallery" className="mt-0">
            <FullPhotoGallery siteId={siteId ?? ""} />
          </TabsContent>
        </Tabs>

        {/* Dialog for editing / adding records (shared for both views) */}
        <DialogWindow
          open={dialogOpen}
          setOpen={setDialogOpen}
          date={dialogDate ?? calendarDate}
          siteId={siteId}
          onSaved={async () => {
            reloadFilledDays();

            if (!siteId) return;
            setLoading(true);
            await refreshRowsWithBisSync();
            setLoading(false);
          }}
        >
          <div className="grid gap-3" />
        </DialogWindow>

        {bisUiEnabled ? (
        <Dialog open={bisPickerOpen} onOpenChange={setBisPickerOpen}>
          <DialogContent className="w-[99vw] max-w-[99vw] sm:max-w-[96vw] lg:max-w-[92vw] xl:max-w-[88vw] 2xl:max-w-[84vw] max-h-[96vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle>Select BIS materials and attachments</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Select approved materials, adjust diary data to send, and optionally attach gallery images.
              </p>
            </DialogHeader>

            {bisPickerLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading options...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Selected materials: {Object.values(materialQuantities).filter((qty) => (Number.parseFloat(qty || "") || 0) > 0).length} • Selected attachments: {selectedAttachmentUrls.length} (optional)
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-md border p-4 lg:col-span-2">
                    <h3 className="mb-3 text-sm font-semibold">Performed work details</h3>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">BIS event date</label>
                    <Input
                      type="date"
                      value={bisSubmitDate ? bisSubmitDate.toISOString().slice(0, 10) : ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setBisSubmitDate(value ? new Date(`${value}T00:00:00`) : null);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Works description</label>
                    <Input
                      value={bisSubmitWorks}
                      onChange={(event) => setBisSubmitWorks(event.target.value)}
                      placeholder="Describe works sent to BIS"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Amount {selectedRowForBis?.Units ? `(${selectedRowForBis.Units})` : ""}
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={bisSubmitAmount}
                      onChange={(event) => setBisSubmitAmount(event.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">BIS measurement unit</label>
                    <Select value={bisSubmitMeasurement} onValueChange={setBisSubmitMeasurement}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select measurement" />
                      </SelectTrigger>
                      <SelectContent>
                        {bisMeasurementOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name} ({option.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                    </div>
                  </div>
                  <div className="rounded-md border p-4">
                    <h3 className="mb-2 text-sm font-semibold">Attachments</h3>
                    <p className="text-xs text-muted-foreground">
                      Attachments are optional. Add them only if you want photo evidence in BIS.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => setAttachmentGalleryOpen(true)}
                    >
                      Add / manage attachments
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Materials from current BIS case</h3>
                  <div className="max-h-[52vh] overflow-y-auto rounded-md border">
                    {bisMaterialOptions.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">No BIS materials available in this case.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Material</th>
                            <th className="px-3 py-2 text-left font-medium">Unit</th>
                            <th className="px-3 py-2 text-right font-medium">Total</th>
                            <th className="px-3 py-2 text-right font-medium">Used</th>
                            <th className="px-3 py-2 text-right font-medium">Available</th>
                            <th className="px-3 py-2 text-right font-medium">Send qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bisMaterialOptions.map((material) => (
                            <tr key={material.id} className="border-t">
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium">{material.label}</div>
                                <div className="text-xs text-muted-foreground">ID: {material.id}</div>
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
                                  value={materialQuantities[material.id] ?? ""}
                                  onChange={(e) => {
                                    const rawValue = e.target.value.replace(",", ".");
                                    if (!/^\d*\.?\d*$/.test(rawValue)) return;
                                    setMaterialQuantities((prev) => ({
                                      ...prev,
                                      [material.id]: rawValue,
                                    }));
                                  }}
                                  onBlur={() => {
                                    setMaterialQuantities((prev) => {
                                      const rawValue = prev[material.id] ?? "";
                                      const parsed = Number.parseFloat(rawValue);
                                      if (!Number.isFinite(parsed)) {
                                        return { ...prev, [material.id]: "" };
                                      }
                                      const clamped = Math.max(
                                        0,
                                        Math.min(parsed, Number(material.availableQuantity)),
                                      );
                                      return { ...prev, [material.id]: String(clamped) };
                                    });
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
                    <h3 className="text-sm font-semibold">Selected gallery attachments</h3>
                  </div>

                  {selectedAttachmentUrls.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No attachments selected. This is optional.</p>
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
                            Remove
                          </button>
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBisPickerOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendRowToBis}
                    disabled={
                      Boolean(selectedRowForBis?.id && bisSendingRowId === selectedRowForBis.id) ||
                      Object.values(materialQuantities).every((qty) => (Number.parseFloat(qty || "") || 0) <= 0)
                    }
                  >
                    {selectedRowForBis?.id && bisSendingRowId === selectedRowForBis.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send to BIS"
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
              <DialogTitle>Send site diary record for approval</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Select one or more approvers before submitting this BIS record for approval.
              </p>
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
                    Sending...
                  </>
                ) : (
                  "Send for approval"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Copy record to another date</DialogTitle>
              <p className="text-sm text-muted-foreground">
                This creates a local copy only. If the original was sent to BIS, copied record must be sent again.
              </p>
            </DialogHeader>

            <div className="space-y-3">
              <label className="text-sm font-medium">Target date</label>
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
              <DialogTitle>Select attachments from gallery</DialogTitle>
            </DialogHeader>

            {galleryAttachmentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gallery photos available for this site.</p>
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
                          ? new Date(attachment.date).toLocaleDateString("en-GB")
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
                      Previous
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
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" onClick={() => setAttachmentGalleryOpen(false)}>
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Photos dialog with ImageGallery */}
        <Dialog open={photosDialogOpen} onOpenChange={setPhotosDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[90vw] lg:max-w-[1200px] max-h-[90vh]">
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
            <ImageGallery
              date={photosDate}
              siteId={siteId}
              className="h-[70vh]"
            />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
