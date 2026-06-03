"use client";

import React, { useEffect, useState } from "react";
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
  deleteSiteDiaryRecord,
  getConfig,
  getSiteDiaryRecord,
  saveSiteDiaryRecordFromWeb,
  updateSiteDiaryRecord,
} from "@/server/actions/site-diary-actions";
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
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getRenderableFieldsOrdered(map: Record<string, any>) {
  return Object.entries(map)
    .filter(([_, cfg]) => cfg?.Type !== "noRender")
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

export function ZtcDialogTable({
  className,
  date,
  siteId,
  onSaved,
  organizationLanguage,
}: ZtcDialogTableProps) {
  const language = normalizeOrganizationLanguage(organizationLanguage);
  const t = getSiteDiaryDialogMessages(language);
  const toastMessages = getToastMessages(language);
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

  const getElementsFromRows = (sourceRows: any[]) => {
    const elements = new Map<string, string>();

    for (const row of sourceRows) {
      const metadata = parseZtcDrawingMetadata(row.Comments_Custom_2);
      for (const element of metadata?.elements ?? []) {
        const elementName = normalizeOption(element.elementName);
        if (elementName) elements.set(elementName.toLowerCase(), elementName);
      }

      const rowElement = normalizeOption(row.Location_Custom_1);
      if (rowElement && row.Location !== "Papilddarbi") {
        elements.set(rowElement.toLowerCase(), rowElement);
      }
    }

    return [...elements.values()];
  };

  const getElementWorkOptions = (sourceRows: any[], elementName: string) => {
    const normalizedElement = normalizeOption(elementName).toLowerCase();
    if (!normalizedElement) return [];

    const works = new Map<string, string>();
    for (const row of sourceRows) {
      const metadata = parseZtcDrawingMetadata(row.Comments_Custom_2);
      for (const element of metadata?.elements ?? []) {
        if (normalizeOption(element.elementName).toLowerCase() !== normalizedElement) continue;
        for (const work of element.works ?? []) {
          const workName = normalizeOption(work.name);
          if (workName) works.set(workName.toLowerCase(), workName);
        }
      }
    }

    return [...works.values()];
  };

  const getWorkAmountM2 = (sourceRows: any[], elementName: string, workName: string) => {
    const normalizedElement = normalizeOption(elementName).toLowerCase();
    const normalizedWork = normalizeOption(workName).toLowerCase();
    if (!normalizedElement || !normalizedWork) return null;

    for (const row of sourceRows) {
      const metadata = parseZtcDrawingMetadata(row.Comments_Custom_2);
      for (const element of metadata?.elements ?? []) {
        if (normalizeOption(element.elementName).toLowerCase() !== normalizedElement) continue;
        const work = (element.works ?? []).find(
          (item) => normalizeOption(item.name).toLowerCase() === normalizedWork,
        );
        const amount = work?.amountM2 ?? element.totalAreaM2;
        if (amount != null && Number.isFinite(Number(amount))) {
          return Number(amount);
        }
      }
    }

    return null;
  };

  const getDropdownOptions = (field: string, row: any) => {
    if (field === "Location_Custom_1") {
      const elementOptions = getElementsFromRows(rows);
      if (elementOptions.length) {
        return elementOptions.map((label) => ({ value: label, label }));
      }
    }

    if (field === "Works" && row.Location !== "Papilddarbi") {
      const workOptions = getElementWorkOptions(rows, row.Location_Custom_1);
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

  const handleChange = (rowKey: string, field: string, value: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowKey && row._tempId !== rowKey) return row;

        const next = { ...row, [field]: value };

        if (field === "Location_Custom_1") {
          const workOptions = getElementWorkOptions(prev, value);
          if (!workOptions.some((option) => option === next.Works)) {
            next.Works = "";
            next.Amounts = "";
          } else {
            const amountM2 = getWorkAmountM2(prev, value, next.Works);
            if (amountM2 != null) next.Amounts = String(amountM2);
          }
          if (workOptions.length) next.Units = "m2";
        }

        if (field === "Works" && next.Location !== "Papilddarbi") {
          const amountM2 = getWorkAmountM2(prev, next.Location_Custom_1, value);
          next.Units = "m2";
          if (amountM2 != null) next.Amounts = String(amountM2);
        }

        return next;
      }),
    );
  };

  const handleDeleteRow = async (row: any) => {
    const confirmed = window.confirm("Delete this diary row? This action cannot be undone.");
    if (!confirmed) return;

    if (row.id) {
      await deleteSiteDiaryRecord({ id: row.id });
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

    const existingRows = rows.filter((row) => isUUID(row.id));
    const newRows = rows.filter((row) => !isUUID(row.id));

    try {
      for (const row of existingRows) {
        await updateSiteDiaryRecord({
          ...stripUiFields(row),
          siteId,
        });
      }

      if (newRows.length) {
        await saveSiteDiaryRecordFromWeb({
          rows: newRows.map((row) => {
            const { id, ...rest } = stripUiFields(row);
            return rest;
          }),
          siteId,
        });
      }

      toast.success(toastMessages.diarySaved(existingRows.length, newRows.length));
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message ?? toastMessages.somethingWentWrong);
    }
  };

  const getDisplayName = (field: string) => fieldMap[field]?.DisplayName ?? field;
  const getCellWidth = (field: string, fallback = 180) =>
    fieldMap[field]?.customSettings?.cellWidth ?? fallback;

  const renderCell = (field: string, row: any) => {
    const rowKey = row.id ?? row._tempId;
    const type = fieldMap[field]?.Type;
    const width = isMobile ? "100%" : getCellWidth(field);

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
          <SelectTrigger style={{ width }}>
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
          style={{ width }}
          value={String(row[field] ?? "")}
          onChange={(event) => handleChange(rowKey, field, event.target.value)}
        />
      );
    }

    if (type === "textInput") {
      return (
        <Textarea
          rows={1}
          style={{ width }}
          value={String(row[field] ?? "")}
          onChange={(event) => handleChange(rowKey, field, event.target.value)}
        />
      );
    }

    return <span>{String(row[field] ?? "")}</span>;
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);

      if (!date || !siteId) {
        setRows([newEmptyRow()]);
        setLoading(false);
        return;
      }

      const config = ((await getConfig(siteId)) ?? defaultConfig) as Record<string, any>;
      const renderableFields = getRenderableFieldsOrdered(config);
      const fieldsToKeep = Array.from(new Set([...renderableFields, ...HIDDEN_FIELDS_TO_KEEP]));
      const loadedRows = await getSiteDiaryRecord({
        siteId,
        date: date.toISOString(),
      });

      if (cancelled) return;

      setFieldMap(config);
      setTableHeads(renderableFields);
      setRows(
        loadedRows.length
          ? loadedRows.map((row: any) => ({
              id: row.id ?? undefined,
              _tempId: crypto.randomUUID(),
              createdBy: row.createdBy ?? "",
              ...Object.fromEntries(fieldsToKeep.map((field) => [field, row[field] ?? ""])),
            }))
          : [newEmptyRow()],
      );
      setLoading(false);
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
          {t.addRow}
        </Button>
        <Button type="submit">{t.save}</Button>
      </div>

      <ScrollArea className="w-full rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              {tableHeads.map((field) => (
                <TableHead key={field} className="h-10 whitespace-nowrap text-xs font-semibold uppercase tracking-normal text-muted-foreground" style={{ width: getCellWidth(field) }}>
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
                    <TableCell key={field} className="align-top py-2">{renderCell(field, row)}</TableCell>
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
