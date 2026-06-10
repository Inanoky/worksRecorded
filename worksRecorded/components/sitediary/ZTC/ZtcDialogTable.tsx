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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createZtcSiteDiaryRecords,
  deleteZtcSiteDiaryRecord,
  getZtcDialogPrefetchData,
  updateZtcSiteDiaryRecord,
} from "@/components/sitediary/ZTC/actions";
import { getSiteDiaryDialogMessages, getToastMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";
import defaultConfig from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { useMediaQuery } from "@/components/sitediary/Use-media-querty";

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
};

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
  const worksByElement = new Map<string, Map<string, string>>();
  const amountsByElementWork = new Map<string, Map<string, number>>();

  for (const row of sourceRows) {
    const metadata = parseZtcDrawingMetadata(row.Comments_Custom_2);
    for (const element of metadata?.elements ?? []) {
      const elementName = normalizeOption(element.elementName);
      if (!elementName) continue;

      const elementKey = elementName.toLowerCase();
      elements.set(elementKey, elementName);

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
      row.Location !== "Papilddarbi" &&
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
  const [rows, setRows] = useState<any[]>([]);
  const [tableHeads, setTableHeads] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, any>>(defaultConfig);

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

  const getDropdownOptions = (field: string, row: any) => {
    if (field === "Location_Custom_1") {
      if (drawingIndex.elements.length) {
        return drawingIndex.elements.map((label) => ({ value: label, label }));
      }
    }

    if (field === "Works" && row.Location !== "Papilddarbi") {
      if (isZtcQualityRow(row)) {
        return [{ value: ZTC_QUALITY_WORK_LABEL, label: ZTC_QUALITY_WORK_LABEL }];
      }

      const workOptions = getElementWorkOptions(row.Location_Custom_1);
      if (workOptions.length) {
        return workOptions.map((label) => ({ value: label, label }));
      }
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
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowKey && row._tempId !== rowKey) return row;

        const next = { ...row, [field]: value };

        if (field === "Location_Custom_1") {
          if (isZtcQualityRow(next)) return next;

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

        if (field === "Works" && next.Location !== "Papilddarbi") {
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
      const isAdditionalWork = row.Location === "Papilddarbi";
      const isQualityWork = isZtcQualityRow(row);
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

      if (!isAdditionalWork && !isQualityWork) {
        const workOptions = getElementWorkOptions(row.Location_Custom_1);
        if (workOptions.length && !workOptions.some((option) => option === row.Works)) {
          validationErrors.push(`${label}: darbs neatbilst izvēlētajam elementam.`);
        }
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
        Units: "m2",
        Amounts: normalizeNumber(dbRow.Amounts),
        TimeInvolved: normalizeNumber(dbRow.TimeInvolved),
        WorkersInvolved: normalizeNumber(dbRow.WorkersInvolved),
      };
    };

    const existingRows = rowsToSave.filter((row) => isUUID(row.id));
    const newRows = rowsToSave.filter((row) => !isUUID(row.id));

    try {
      for (const row of existingRows) {
        await updateZtcSiteDiaryRecord({
          ...stripUiFields(row),
          siteId,
        });
      }

      if (newRows.length) {
        await createZtcSiteDiaryRecords({
          rows: newRows.map((row) => {
            const { id, ...rest } = stripUiFields(row);
            return rest;
          }),
          siteId,
        });
      }

      invalidateCurrentPrefetchCache();
      toast.success(toastMessages.diarySaved(existingRows.length, newRows.length));
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message ?? toastMessages.somethingWentWrong);
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
      return (
        <span className="inline-flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-medium text-muted-foreground">
          m2
        </span>
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
        <Select
          value={currentValue}
          onValueChange={(value) => handleChange(rowKey, field, value)}
        >
          <SelectTrigger className="justify-between" style={{ width, minWidth: width }}>
            <SelectValue placeholder={t.select} />
          </SelectTrigger>
          <SelectContent>
            {mergedOptions.map((option) => (
              <SelectItem key={option.value} value={option.label}>
                {field === "Units" ? t.unitLabels[option.label] ?? option.label : option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      setFieldMap(config);
      setTableHeads(renderableFields);
      setRows(
        data.rows.length
          ? data.rows.map((row: any) => ({
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
    <form onSubmit={handleSubmit} className={className}>
      <div className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b bg-background/95 pb-3 backdrop-blur">
        <Button type="button" variant="outline" onClick={() => setRows((prev) => [...prev, newEmptyRow()])}>
          {t.addRow || "Pievienot"}
        </Button>
        <Button type="submit">{t.save || "Saglabāt"}</Button>
      </div>

      <ScrollArea className="w-full rounded-md border bg-background">
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
