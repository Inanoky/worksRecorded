"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteZtcSiteDiaryRecord,
  getZtcDialogPrefetchData,
  saveZtcSiteDiaryDialogRows,
  type ZtcProjectTaskRates,
} from "@/flows/ztc-production/backend/actions";
import { getSiteDiaryDialogMessages, getToastMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";
import defaultConfig from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { useMediaQuery } from "@/components/sitediary/Use-media-querty";
import { ZTC_ALL_PROJECTS_RATE_NAME } from "@/flows/ztc-production/lib/ztc-rate-constants";
import { ZTC_RATE_UNITS } from "@/flows/ztc-production/lib/ztc-rate-units";

type ZtcDrawingMetadata = {
  type: "ztc_drawing_context";
  elements?: Array<{
    elementName?: string | null;
    totalAreaM2?: number | null;
    works?: Array<{
      name?: string | null;
      amountM2?: number | null;
    }>;
  }>;
};

type ZtcDialogTableProps = {
  className?: string;
  date: Date | null;
  siteId: string | null;
  onSaved?: () => void;
  organizationLanguage?: string | null;
};

type ZtcDialogPrefetchCacheEntry = {
  config: Record<string, any>;
  rows: any[];
  rates?: ZtcProjectTaskRates[];
};

type ZtcSelectOption = {
  value: string;
  label: string;
};

function SearchableZtcSelect({
  value,
  options,
  placeholder,
  width,
  onChange,
}: {
  value: string;
  options: ZtcSelectOption[];
  placeholder: string;
  width: string | number;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("lv");
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase("lv").includes(normalizedSearch),
  );

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
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-0 justify-between font-normal"
          style={{ width, minWidth: width }}
        >
          <span className="truncate text-left">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[min(90vw,34rem)] overflow-hidden p-0"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Meklēt..."
            className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <div className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain p-1">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full min-w-0 items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onChange(option.label);
                setOpen(false);
              }}
            >
              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${value === option.label ? "opacity-100" : "opacity-0"}`} />
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

const ztcDialogPrefetchCache = new Map<string, ZtcDialogPrefetchCacheEntry>();

const HIDDEN_FIELDS_TO_KEEP = [
  "Date_Custom_1",
  "Comments_Custom_1",
  "Comments_Custom_2",
  "Works_Custom_1",
  "Works_Custom_2",
  "Location_Custom_2",
  "originalUserComment",
];

function parseZtcDrawingMetadata(value: unknown): ZtcDrawingMetadata | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as ZtcDrawingMetadata;
    if (parsed?.type !== "ztc_drawing_context" || !Array.isArray(parsed.elements)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeOption(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeZtcWorkName(value: unknown) {
  const trimmed = normalizeOption(value);
  if (!trimmed) return "";

  return trimmed
    .replace(/^T\s*\d+(?=\s|[-/]|$)/i, "TL")
    .replace(/^T(?!L)(?=\s|[-/]|$)/i, "TL");
}

const ZTC_QUALITY_WORK_LABEL = "Kvalitātes kontrole";

function isZtcQualityRow(row: any) {
  return (
    normalizeOption(row?.Works) === ZTC_QUALITY_WORK_LABEL ||
    String(row?.Comments_Custom_2 ?? "").includes('"type":"ztc_quality_check"') ||
    String(row?.Comments_Custom_1 ?? "").startsWith("__ZTC_QA_PENDING__")
  );
}

function splitDrawingWorkList(value: unknown) {
  return String(value ?? "")
    .split(";")
    .map((part) => normalizeZtcWorkName(part))
    .filter(Boolean);
}

function isUUID(id: unknown) {
  return (
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  );
}

function normalizeDate(value: unknown) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(String(value));
}

function normalizeNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const ZTC_FIELD_MAX_LENGTHS: Record<string, number> = {
  Location: 180,
  Location_Custom_1: 80,
  Works: 180,
  Amounts: 12,
  TimeInvolved: 8,
  Comments: 600,
};

const ZTC_FIELD_LABELS: Record<string, string> = {
  Location: "projekts",
  Location_Custom_1: "elements",
  Works: "darbs",
  Amounts: "daudzums",
  TimeInvolved: "stundas",
  Comments: "komentāri",
};

function hasAnyRowValue(row: any) {
  return [
    "Date",
    "Date_Custom_1",
    "Date_Custom_2",
    "Location",
    "Location_Custom_1",
    "Works",
    "Amounts",
    "TimeInvolved",
    "Comments",
  ].some((field) => normalizeOption(row[field]));
}

function isCompletedZtcDiaryRow(row: any) {
  return Boolean(
    normalizeOption(row.Date) &&
      normalizeOption(row.Date_Custom_2) &&
      normalizeOption(row.Works),
  );
}

function normalizeSpecialLabel(value: unknown) {
  return normalizeOption(value)
    .toLocaleLowerCase("lv")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeUnitKey(value: unknown) {
  return normalizeOption(value).toLocaleLowerCase("lv").replace(/\.$/, "");
}

function isZtcAdditionalDetailsRow(row: any) {
  return normalizeSpecialLabel(row?.Works_Custom_1) === "papilddetalas";
}

function isZtcAdditionalWorkRow(row: any) {
  return (
    normalizeSpecialLabel(row?.Location) === "papilddarbi" ||
    normalizeSpecialLabel(row?.Works_Custom_1) === "papilddarbi"
  );
}

function getZtcSpecialCategory(row: any): "additionalDetails" | "additionalWorks" | null {
  if (isZtcAdditionalDetailsRow(row)) return "additionalDetails";
  if (isZtcAdditionalWorkRow(row)) return "additionalWorks";
  return null;
}

function isValidDateValue(value: unknown) {
  if (!value) return false;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return !Number.isNaN(parsed.getTime());
}

function validateZtcFieldLengths(row: any, label: string) {
  return Object.entries(ZTC_FIELD_MAX_LENGTHS)
    .filter(([field, maxLength]) => String(row[field] ?? "").trim().length > maxLength)
    .map(([field, maxLength]) => `${label}: lauks "${ZTC_FIELD_LABELS[field] ?? field}" nedrīkst pārsniegt ${maxLength} zīmes.`);
}

function getRenderableFieldsOrdered(map: Record<string, any>) {
  return Object.entries(map)
    .filter(([_, cfg]) => Boolean(cfg?.Type) && cfg?.Type !== "noRender")
    .sort((a, b) => {
      const ao = a[1]?.customSettings?.order;
      const bo = b[1]?.customSettings?.order;
      const aOrder = typeof ao === "number" ? ao : Number.POSITIVE_INFINITY;
      const bOrder = typeof bo === "number" ? bo : Number.POSITIVE_INFINITY;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a[0].localeCompare(b[0]);
    })
    .map(([key]) => key.trim());
}

function toDateCacheKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getZtcDialogCacheKey(siteId: string, date: Date) {
  return `${siteId}:${toDateCacheKey(date)}`;
}

function getAdjacentDates(date: Date) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return [previous, next];
}

function buildZtcDrawingIndex(sourceRows: any[]) {
  const elements = new Map<string, string>();
  const elementAreas = new Map<string, number>();
  const worksByElement = new Map<string, Map<string, string>>();
  const amountsByElementWork = new Map<string, Map<string, number>>();

  for (const row of sourceRows) {
    const metadata = parseZtcDrawingMetadata(row.Comments_Custom_2);
    for (const element of metadata?.elements ?? []) {
      const elementName = normalizeOption(element.elementName);
      if (!elementName) continue;

      const elementKey = elementName.toLowerCase();
      elements.set(elementKey, elementName);
      if (element.totalAreaM2 != null && Number.isFinite(Number(element.totalAreaM2))) {
        elementAreas.set(elementKey, Number(element.totalAreaM2));
      }

      const workMap = worksByElement.get(elementKey) ?? new Map<string, string>();
      const amountMap = amountsByElementWork.get(elementKey) ?? new Map<string, number>();

      for (const work of element.works ?? []) {
        const workName = normalizeZtcWorkName(work.name);
        if (!workName) continue;

        const workKey = workName.toLowerCase();
        workMap.set(workKey, workName);

        const amount = work.amountM2 ?? element.totalAreaM2;
        if (amount != null && Number.isFinite(Number(amount))) {
          amountMap.set(workKey, Number(amount));
        }
      }

      worksByElement.set(elementKey, workMap);
      amountsByElementWork.set(elementKey, amountMap);
    }

    const rowElement = normalizeOption(row.Location_Custom_1);
    const rowWorks = splitDrawingWorkList(row.Works_Custom_1);
    if (
      rowElement &&
      !isZtcAdditionalDetailsRow(row) &&
      !isZtcAdditionalWorkRow(row) &&
      !isZtcQualityRow(row) &&
      rowWorks.length
    ) {
      const elementKey = rowElement.toLowerCase();
      elements.set(elementKey, rowElement);

      const workMap = worksByElement.get(elementKey) ?? new Map<string, string>();
      const amountMap = amountsByElementWork.get(elementKey) ?? new Map<string, number>();
      const amount = normalizeNumber(row.Amounts);

      for (const workName of rowWorks) {
        const workKey = workName.toLowerCase();
        workMap.set(workKey, workName);
        if (amount != null) amountMap.set(workKey, amount);
      }

      worksByElement.set(elementKey, workMap);
      amountsByElementWork.set(elementKey, amountMap);
    }
  }

  return {
    elements: [...elements.values()],
    elementAreas,
    worksByElement,
    amountsByElementWork,
  };
}

export function ZtcDialogTable({
  className,
  date,
  siteId,
  onSaved,
  organizationLanguage,
}: ZtcDialogTableProps) {
  const language = normalizeOrganizationLanguage(organizationLanguage);
  const t = getSiteDiaryDialogMessages(language);
  const toastMessages = getToastMessages("lv");
  const isMobile = useMediaQuery("(max-width: 640px)");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [tableHeads, setTableHeads] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, any>>(defaultConfig);
  const [defaultRates, setDefaultRates] = useState<ZtcProjectTaskRates[]>([]);
  const [dirtyRowKeys, setDirtyRowKeys] = useState<Set<string>>(new Set());

  const newEmptyRow = () => ({
    id: undefined as string | undefined,
    _tempId: crypto.randomUUID(),
    Date: date,
    Date_Custom_1: "",
    Date_Custom_2: "",
    Location: "",
    Location_Custom_1: "",
    Location_Custom_2: "",
    Works: "",
    Works_Custom_1: "",
    Works_Custom_2: "",
    Units: "m2",
    Amounts: "",
    WorkersInvolved: "",
    TimeInvolved: "",
    Comments: "",
    Comments_Custom_1: "",
    Comments_Custom_2: "",
    originalUserComment: "",
    createdBy: "",
  });

  const drawingIndex = useMemo(() => buildZtcDrawingIndex(rows), [rows]);

  const getElementWorkOptions = (elementName: string) => {
    const normalizedElement = normalizeOption(elementName).toLowerCase();
    if (!normalizedElement) return [];

    return [...(drawingIndex.worksByElement.get(normalizedElement)?.values() ?? [])];
  };

  const getWorkAmountM2 = (elementName: string, workName: string) => {
    const normalizedElement = normalizeOption(elementName).toLowerCase();
    const normalizedWork = normalizeZtcWorkName(workName).toLowerCase();
    if (!normalizedElement || !normalizedWork) return null;

    return drawingIndex.amountsByElementWork.get(normalizedElement)?.get(normalizedWork) ?? null;
  };

  const getElementAreaM2 = (elementName: string) => {
    const normalizedElement = normalizeOption(elementName).toLowerCase();
    if (!normalizedElement) return null;

    return drawingIndex.elementAreas.get(normalizedElement) ?? null;
  };

  const getSpecialRateOptions = (
    row: any,
    category: "additionalDetails" | "additionalWorks",
  ) => {
    const normalizedProject = normalizeOption(row.Location).toLowerCase();
    const allProject = defaultRates.find(
      (project) =>
        normalizeOption(project.projectName).toLowerCase() ===
        ZTC_ALL_PROJECTS_RATE_NAME.toLowerCase(),
    );
    const project = defaultRates.find(
      (candidate) =>
        normalizeOption(candidate.projectName).toLowerCase() === normalizedProject,
    );
    const seen = new Set<string>();
    return [...(allProject?.[category] ?? []), ...(project?.[category] ?? [])]
      .map((entry) => normalizeZtcWorkName(entry.task))
      .filter((task) => {
        const key = task.toLowerCase();
        if (!task || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const getSpecialRateEntry = (
    row: any,
    category: "additionalDetails" | "additionalWorks",
    task: string,
  ) => {
    const normalizedProject = normalizeOption(row.Location).toLowerCase();
    const normalizedTask = normalizeZtcWorkName(task).toLowerCase();
    const allProject = defaultRates.find(
      (project) =>
        normalizeOption(project.projectName).toLowerCase() ===
        ZTC_ALL_PROJECTS_RATE_NAME.toLowerCase(),
    );
    const project = defaultRates.find(
      (candidate) =>
        normalizeOption(candidate.projectName).toLowerCase() === normalizedProject,
    );
    return [project, allProject]
      .filter(Boolean)
      .flatMap((rateProject) => rateProject?.[category] ?? [])
      .find((entry) => normalizeZtcWorkName(entry.task).toLowerCase() === normalizedTask);
  };

  const getUnitOptions = (row: any) => {
    const configuredOptions = Object.values(fieldMap.Units?.DropDownOptions ?? {})
      .map((label) => String(label))
      .filter(Boolean);
    const fallbackOptions = getZtcSpecialCategory(row)
      ? ZTC_RATE_UNITS.map((unit) => String(unit))
      : ["m2"];
    const currentUnit = normalizeOption(row.Units);
    return Array.from(new Set([...configuredOptions, ...fallbackOptions, currentUnit].filter(Boolean)))
      .map((label) => ({ value: label, label }));
  };

  const getDropdownOptions = (field: string, row: any) => {
    if (field === "Location_Custom_1") {
      if (drawingIndex.elements.length) {
        return drawingIndex.elements.map((label) => ({ value: label, label }));
      }
    }

    if (field === "Works") {
      const specialCategory = getZtcSpecialCategory(row);
      if (specialCategory) {
        const rateOptions = getSpecialRateOptions(row, specialCategory);
        if (rateOptions.length) {
          return rateOptions.map((label) => ({ value: label, label }));
        }
      }

      if (isZtcQualityRow(row)) {
        return [{ value: ZTC_QUALITY_WORK_LABEL, label: ZTC_QUALITY_WORK_LABEL }];
      }

      const workOptions = getElementWorkOptions(row.Location_Custom_1);
      if (workOptions.length) {
        return workOptions.map((label) => ({ value: label, label }));
      }
    }

    if (field === "Units") {
      return getUnitOptions(row);
    }

    const optionsObj = fieldMap[field]?.DropDownOptions ?? {};
    return Object.entries(optionsObj).map(([value, label]) => ({
      value,
      label: String(label),
    }));
  };

  const invalidateCurrentPrefetchCache = () => {
    if (!siteId || !date) return;
    ztcDialogPrefetchCache.delete(getZtcDialogCacheKey(siteId, date));
  };

  const handleChange = (rowKey: string, field: string, value: any) => {
    setDirtyRowKeys((prev) => new Set(prev).add(rowKey));
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowKey && row._tempId !== rowKey) return row;

        const next = { ...row, [field]: value };

        if (field === "Location_Custom_1") {
          if (isZtcQualityRow(next) || getZtcSpecialCategory(next)) return next;

          const workOptions = getElementWorkOptions(value);
          if (!workOptions.some((option) => option === next.Works)) {
            next.Works = "";
            next.Amounts = "";
          } else {
            const amountM2 = getWorkAmountM2(value, next.Works);
            if (amountM2 != null) next.Amounts = String(amountM2);
          }
          if (workOptions.length) next.Units = "m2";
        }

        if (field === "Works") {
          const specialCategory = getZtcSpecialCategory(next);
          if (specialCategory) {
            const rate = getSpecialRateEntry(next, specialCategory, value);
            if (rate?.rate) next.Location_Custom_2 = rate.rate;
            if (specialCategory === "additionalDetails") {
              next.Units = rate?.unit ?? next.Units ?? "gab";
            } else {
              const isElementRelatedAdditionalWork =
                rate?.relatesToElement === true &&
                normalizeOption(next.Location) &&
                normalizeSpecialLabel(next.Location) !== "papilddarbi" &&
                normalizeOption(next.Location_Custom_1);
              const unit = isElementRelatedAdditionalWork
                ? rate?.unit ?? next.Units ?? "st"
                : "st";
              next.Units = unit;
              const unitKey = normalizeUnitKey(unit);
              if (isElementRelatedAdditionalWork && unitKey === "m2") {
                const amountM2 = getElementAreaM2(next.Location_Custom_1);
                next.Amounts = amountM2 != null ? String(amountM2) : "";
              } else if (unitKey === "st") {
                next.Amounts = normalizeOption(next.TimeInvolved);
              } else {
                next.Amounts = "";
              }
            }
            return next;
          }

          if (isZtcQualityRow(next)) return next;

          const amountM2 = getWorkAmountM2(next.Location_Custom_1, value);
          next.Units = "m2";
          if (amountM2 != null) next.Amounts = String(amountM2);
        }

        return next;
      }),
    );
  };

  const handleDeleteRow = async (row: any) => {
    const confirmed = window.confirm("Dzēst šo žurnāla ierakstu? Šo darbību nevarēs atsaukt.");
    if (!confirmed) return;

    if (row.id) {
      if (!siteId) return;
      await deleteZtcSiteDiaryRecord({ siteId, id: row.id });
      invalidateCurrentPrefetchCache();
      toast.success(toastMessages.diaryRowDeleted);
      onSaved?.();
      return;
    }

    setRows((prev) => prev.filter((item) => item._tempId !== row._tempId));
    toast.success(toastMessages.unsavedRowRemoved);
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!siteId) return;

    const validationErrors: string[] = [];
    const rowsToSave = rows.filter(hasAnyRowValue);

    rowsToSave.forEach((row, index) => {
      const label = `Rinda ${index + 1}`;
      const isAdditionalWork = isZtcAdditionalWorkRow(row);
      const amount = normalizeNumber(row.Amounts);
      const hours = normalizeNumber(row.TimeInvolved);
      const start = normalizeDate(row.Date);
      const end = normalizeDate(row.Date_Custom_2);

      validationErrors.push(...validateZtcFieldLengths(row, label));

      if (!normalizeOption(row.Location)) {
        validationErrors.push(`${label}: norādiet projektu.`);
      }

      if (!isAdditionalWork && !normalizeOption(row.Location_Custom_1)) {
        validationErrors.push(`${label}: norādiet elementu.`);
      }

      if (!normalizeOption(row.Works)) {
        validationErrors.push(`${label}: norādiet darbu.`);
      }

      if (row.Date && !isValidDateValue(row.Date)) {
        validationErrors.push(`${label}: sākuma laiks nav derīgs.`);
      }

      if (row.Date_Custom_2 && !isValidDateValue(row.Date_Custom_2)) {
        validationErrors.push(`${label}: beigu laiks nav derīgs.`);
      }

      if (start && end && end.getTime() < start.getTime()) {
        validationErrors.push(`${label}: beigu laiks nevar būt pirms sākuma laika.`);
      }

      if (row.Amounts !== "" && row.Amounts != null && (amount == null || amount < 0)) {
        validationErrors.push(`${label}: daudzumam jābūt pozitīvam skaitlim.`);
      }

      if (row.TimeInvolved !== "" && row.TimeInvolved != null && (hours == null || hours < 0)) {
        validationErrors.push(`${label}: stundām jābūt pozitīvam skaitlim.`);
      }

    });

    if (!rowsToSave.length) {
      validationErrors.push("Pievienojiet vismaz vienu aizpildītu ierakstu.");
    }

    if (validationErrors.length) {
      toast.error(validationErrors.slice(0, 4).join("\n"));
      return;
    }

    const stripUiFields = (row: any) => {
      const { _tempId, createdBy, ...dbRow } = row;
      return {
        ...dbRow,
        Date_Custom_1: normalizeDate(dbRow.Date_Custom_1),
        Date_Custom_2: normalizeDate(dbRow.Date_Custom_2),
        Units: getZtcSpecialCategory(dbRow) ? dbRow.Units : "m2",
        Amounts: normalizeNumber(dbRow.Amounts),
        TimeInvolved: normalizeNumber(dbRow.TimeInvolved),
        WorkersInvolved: normalizeNumber(dbRow.WorkersInvolved),
      };
    };

    const existingRows = rowsToSave.filter((row) => isUUID(row.id) && dirtyRowKeys.has(row.id));
    const newRows = rowsToSave.filter((row) => !isUUID(row.id));

    if (!existingRows.length && !newRows.length) {
      toast.success("Nav jaunu izmaiņu, ko saglabāt.");
      return;
    }

    try {
      setSaving(true);
      await saveZtcSiteDiaryDialogRows({
        existingRows: existingRows.map((row) => ({
          ...stripUiFields(row),
          id: row.id,
        })),
        newRows: newRows.map((row) => {
          const { id, ...rest } = stripUiFields(row);
          return rest;
        }),
        siteId,
      });

      invalidateCurrentPrefetchCache();
      toast.success(toastMessages.diarySaved(existingRows.length, newRows.length));
      setDirtyRowKeys(new Set());
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message ?? toastMessages.somethingWentWrong);
    } finally {
      setSaving(false);
    }
  };

  const getDisplayName = (field: string) => fieldMap[field]?.DisplayName ?? field;
  const getCellWidth = (field: string, fallback = 180) =>
    fieldMap[field]?.customSettings?.cellWidth ?? fallback;

  const getControlWidth = (field: string) => {
    const configured = getCellWidth(field);
    if (field === "Location") return Math.max(configured, 260);
    if (field === "Location_Custom_1") return Math.max(configured, 180);
    if (field === "Works") return Math.max(configured, 300);
    if (field === "Comments") return Math.max(configured, 340);
    if (field === "originalUserComment") return Math.max(configured, 340);
    return configured;
  };

  const renderCell = (field: string, row: any) => {
    const rowKey = row.id ?? row._tempId;
    const type = fieldMap[field]?.Type;
    const width = isMobile ? "100%" : getControlWidth(field);

    if (field === "Units") {
      if (getZtcSpecialCategory(row)) {
        const currentValue = String(row[field] ?? "");
        const options = getUnitOptions(row);
        return (
          <SearchableZtcSelect
            value={currentValue}
            options={options}
            placeholder={t.select}
            width={width}
            onChange={(value) => handleChange(rowKey, field, value)}
          />
        );
      }

      return (
        <span className="inline-flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-medium text-muted-foreground">
          m2
        </span>
      );
    }

    if (field === "Works" && getZtcSpecialCategory(row)) {
      const options = getDropdownOptions(field, row);
      const listId = `ztc-special-works-${rowKey}`;
      return (
        <div style={{ width, minWidth: width }}>
          <Input
            list={listId}
            className="h-9"
            maxLength={ZTC_FIELD_MAX_LENGTHS[field] ?? 180}
            value={String(row[field] ?? "")}
            onChange={(event) => handleChange(rowKey, field, event.target.value)}
          />
          <datalist id={listId}>
            {options.map((option) => (
              <option key={option.value} value={option.label} />
            ))}
          </datalist>
        </div>
      );
    }

    if (type === "fixed") {
      const renderAs = fieldMap[field]?.customSettings?.renderAs;
      const value = row[field];
      if (!value) return <span className="text-sm text-muted-foreground" />;
      if (renderAs === "Time") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return (
            <span className="text-sm text-muted-foreground">
              {String(parsed.getHours()).padStart(2, "0")}:
              {String(parsed.getMinutes()).padStart(2, "0")}
            </span>
          );
        }
      }

      return <span className="text-sm text-muted-foreground">{String(value)}</span>;
    }

    if (type === "dropdown") {
      const currentValue = String(row[field] ?? "");
      const options = getDropdownOptions(field, row);
      const optionValues = new Set(options.map((option) => option.label));
      const mergedOptions =
        currentValue && !optionValues.has(currentValue)
          ? [{ value: currentValue, label: currentValue }, ...options]
          : options;

      return (
        <SearchableZtcSelect
          value={currentValue}
          options={mergedOptions.map((option) => ({
            value: option.value,
            label: field === "Units" ? t.unitLabels[option.label] ?? option.label : option.label,
          }))}
          placeholder={t.select}
          width={width}
          onChange={(value) => handleChange(rowKey, field, value)}
        />
      );
    }

    if (type === "numberInput" || type === "float") {
      return (
        <Input
          inputMode="decimal"
          className="h-9"
          maxLength={ZTC_FIELD_MAX_LENGTHS[field] ?? 16}
          style={{ width, minWidth: width }}
          value={String(row[field] ?? "")}
          onChange={(event) => handleChange(rowKey, field, event.target.value)}
        />
      );
    }

    if (type === "textInput") {
      return (
        <Textarea
          rows={1}
          className="min-h-14 resize-y leading-snug"
          maxLength={ZTC_FIELD_MAX_LENGTHS[field] ?? 240}
          style={{ width, minWidth: width }}
          value={String(row[field] ?? "")}
          onChange={(event) => handleChange(rowKey, field, event.target.value)}
        />
      );
    }

    return <span>{String(row[field] ?? "")}</span>;
  };

  useEffect(() => {
    let cancelled = false;

    const applyPrefetchData = (data: ZtcDialogPrefetchCacheEntry) => {
      const config = (data.config ?? defaultConfig) as Record<string, any>;
      const renderableFields = getRenderableFieldsOrdered(config);
      const fieldsToKeep = Array.from(new Set([...renderableFields, ...HIDDEN_FIELDS_TO_KEEP]));
      const completedRows = data.rows.filter(isCompletedZtcDiaryRow);

      setDirtyRowKeys(new Set());
      setFieldMap(config);
      setDefaultRates(data.rates ?? []);
      setTableHeads(renderableFields);
      setRows(
        completedRows.length
          ? completedRows.map((row: any) => ({
              id: row.id ?? undefined,
              _tempId: crypto.randomUUID(),
              createdBy: row.createdBy ?? "",
              ...Object.fromEntries(fieldsToKeep.map((field) => [field, row[field] ?? ""])),
            }))
          : [newEmptyRow()],
      );
    };

    const prefetchAdjacentDates = (activeDate: Date, activeSiteId: string) => {
      for (const adjacentDate of getAdjacentDates(activeDate)) {
        const adjacentKey = getZtcDialogCacheKey(activeSiteId, adjacentDate);
        if (ztcDialogPrefetchCache.has(adjacentKey)) continue;

        void getZtcDialogPrefetchData({
          siteId: activeSiteId,
          date: adjacentDate.toISOString(),
        })
          .then((data) => {
            ztcDialogPrefetchCache.set(adjacentKey, {
              config: ((data.config ?? defaultConfig) as Record<string, any>),
              rows: data.rows,
              rates: data.rates,
            });
          })
          .catch(() => {
            // Best-effort prefetch only; visible load path handles user errors.
          });
      }
    };

    async function loadRows() {
      setLoading(true);

      if (!date || !siteId) {
        setRows([newEmptyRow()]);
        setDefaultRates([]);
        setLoading(false);
        return;
      }

      const cacheKey = getZtcDialogCacheKey(siteId, date);
      const cachedData = ztcDialogPrefetchCache.get(cacheKey);
      if (cachedData) {
        applyPrefetchData(cachedData);
        setLoading(false);
        prefetchAdjacentDates(date, siteId);
        return;
      }

      try {
        const data = await getZtcDialogPrefetchData({
          siteId,
          date: date.toISOString(),
        });

        if (cancelled) return;

        const cacheEntry = {
          config: ((data.config ?? defaultConfig) as Record<string, any>),
          rows: data.rows,
          rates: data.rates,
        };
        ztcDialogPrefetchCache.set(cacheKey, cacheEntry);
        applyPrefetchData(cacheEntry);
        prefetchAdjacentDates(date, siteId);
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error?.message ?? toastMessages.somethingWentWrong);
          setRows([newEmptyRow()]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRows();

    return () => {
      cancelled = true;
    };
  }, [date, siteId]);

  if (loading) return <div className="p-4">{t.loading}</div>;

  return (
    <form onSubmit={handleSubmit} className={`${className ?? ""} flex min-h-0 flex-1 flex-col`}>
      <div className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b bg-background/95 pb-3 backdrop-blur">
        <Button type="button" variant="outline" disabled={saving} onClick={() => setRows((prev) => [...prev, newEmptyRow()])}>
          Pievienot
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t.save || "Saglabāt"}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100dvh-13rem)] min-h-[280px] w-full rounded-md border bg-background sm:h-[calc(100dvh-17rem)]">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              {tableHeads.map((field) => (
                <TableHead key={field} className="h-10 whitespace-nowrap text-xs font-semibold uppercase tracking-normal text-muted-foreground" style={{ width: getControlWidth(field), minWidth: getControlWidth(field) }}>
                  {getDisplayName(field)}
                </TableHead>
              ))}
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const rowKey = row.id ?? row._tempId;

              return (
                <TableRow key={rowKey}>
                  {tableHeads.map((field) => (
                    <TableCell key={field} className="align-top py-2" style={{ width: getControlWidth(field), minWidth: getControlWidth(field) }}>{renderCell(field, row)}</TableCell>
                  ))}
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={saving}
                      onClick={() => handleDeleteRow(row)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </form>
  );
}
