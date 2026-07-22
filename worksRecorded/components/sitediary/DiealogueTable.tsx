// DialogTable.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getSiteDiaryRecord,
  getSiteDiarySchema,
  saveSiteDiaryRecordFromWeb,
  deleteSiteDiaryRecord,
  updateSiteDiaryRecord,
  getConfig,
} from "@/server/actions/site-diary-actions";
import { toast } from "sonner";
import { useMediaQuery } from "./Use-media-querty";
import { z } from "zod";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json"
import { getSiteDiaryDialogMessages, getToastMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

type SearchableWorksSelectProps = {
  value: string;
  options: Array<{ value: string; label: string }>;
  width: string | number;
  selectLabel: string;
  searchLabel: string;
  noOptionsLabel: string;
  onChange: (value: string) => void;
};

function SearchableWorksSelect({
  value,
  options,
  width,
  selectLabel,
  searchLabel,
  noOptionsLabel,
  onChange,
}: SearchableWorksSelectProps) {
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
          className="min-w-0 justify-between font-normal"
          style={{ width }}
        >
          <span className="truncate text-left">{value || selectLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[min(90vw,32rem)] overflow-hidden p-0"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchLabel}
            className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <div
          className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain"
          onWheel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.scrollTop += event.deltaY;
          }}
        >
          <div className="p-1">
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
                <Check
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    value === option.label ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="min-w-0 whitespace-normal break-words">
                  {option.label}
                </span>
              </button>
            ))}
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {noOptionsLabel}
              </p>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}


//--------Loading config------------


/* ---------- helpers ---------- */
const ADDITIONAL_WORKS_OPTION = {
  value: "__ADDITIONAL__",
  label: "Additional works",
};
const CLIENT_DELAY_OPTION = {
  value: "__clientDelay__",
  label: "Client Delay (hindrance)",
};
const INTERNAL_DELAY_OPTION = { value: "__internalDelay__", label: "Internal Delay" };
const NOTE_OPTION = { value: "__note__", label: "Note" };
const OTHER_OPTION = { value: "__other__", label: "Other Works" }



const ADD_NEW_LOCATION = "__add_new_location__";
const ADD_NEW_WORK = "__add_new_work__";

export const allowedUnits = [
  "m",
  "m2",
  "m3",
  "tn",
  "kg",
  "pcs",
  "package",
  "project",
  "hour",
  "set",
  "minute",
  "lifts",
] as const;

// ------------------------------------Validation------------------------------------------------

const MAX_FREE_TEXT = 100;
const MAX_NUM = 1_000_000_000;

const coerceOptionalFloat = (v: unknown) => {
  if (v === "" || v === undefined || v === null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
};

const coerceOptionalInt = (v: unknown) => {
  if (v === "" || v === undefined || v === null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : undefined;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
};

const isUUID = (id: unknown) =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

const showZodErrorToast = (err: z.ZodError, toastMessages: ReturnType<typeof getToastMessages>) => {
  const first = err.errors[0];
  const path = first?.path?.length ? first.path.join(".") : "row";
  toast.error(toastMessages.validationError(path, first.message));
};

/**
 * VALIDATION RULES (as requested):
 * - location/work can be empty (no selection OR manual input blank is ok)
 * - location/work free text allowed up to 100 chars (only validate length if provided)
 * - units: NO VALIDATION (only pass through whatever string is there)
 * - amounts/hours: floats, <= 1B, empty ok
 * - workers: int, <= 1B, empty ok
 */
const DiaryRowSchema = z.object({


  id: z.string().uuid().optional(),          // DB id (only if real UUID)
  _tempId: z.string().optional(),            // UI id (always present for new rows)
  // numbers in your table are strings while editing, so allow "" and coerce
  Amounts: z
    .union([z.coerce.number().finite(), z.literal("")])
    .optional()
    .refine(
      (v) => v === "" || v === undefined || (typeof v === "number" && Math.abs(v) <= MAX_NUM),
      { message: `Amounts must be a number <= ${MAX_NUM}` }
    ),

  WorkersInvolved: z
    .union([z.coerce.number().int(), z.literal("")])
    .optional()
    .refine(
      (v) =>
        v === "" ||
        v === undefined ||
        (typeof v === "number" && Math.abs(v) <= MAX_NUM && Number.isInteger(v)),
      { message: `Workers must be an integer <= ${MAX_NUM}` }
    ),

  TimeInvolved: z
    .union([z.coerce.number().finite(), z.literal("")])
    .optional()
    .refine(
      (v) => v === "" || v === undefined || (typeof v === "number" && Math.abs(v) <= MAX_NUM),
      { message: `Hours must be a number <= ${MAX_NUM}` }
    ),

  Comments: z.string().max(1500).optional().or(z.literal("")),
  Comments_Custom_1: z.string().max(1500).optional().or(z.literal("")),
  Comments_Custom_2: z.string().max(1500).optional().or(z.literal("")),

  // allow any strings but cap length if provided
  Location: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  Location_Custom_1: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  Location_Custom_2: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),



  Works: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  Works_Custom_1: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  Works_Custom_2: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),




  // units: no validation
  Units: z.any().optional(),

  // Date is fixed in UI but still part of payload/state
  Date: z.any().optional(),
  Date_Custom_1: z.any().optional(),
  Date_Custom_2: z.any().optional(),
});

const DiaryRowsSchema = z.array(DiaryRowSchema);


const validateRows = (rowsToValidate: any[], toastMessages: ReturnType<typeof getToastMessages>) => {
  const parsed = DiaryRowsSchema.safeParse(rowsToValidate);
  if (!parsed.success) {
    showZodErrorToast(parsed.error, toastMessages);
    return { ok: false as const, rows: null as any };
  }

  // extra numeric checks using your coercers, now with correct keys
  for (const r of rowsToValidate) {
    const key = r.id ?? r._tempId;

    const a = coerceOptionalFloat(r.Amounts);
    if (a !== undefined && Math.abs(a) > MAX_NUM) {
      toast.error(toastMessages.rowAmountsMax(String(key), MAX_NUM));
      return { ok: false as const, rows: null as any };
    }

    const h = coerceOptionalFloat(r.TimeInvolved);
    if (h !== undefined && Math.abs(h) > MAX_NUM) {
      toast.error(toastMessages.rowHoursMax(String(key), MAX_NUM));
      return { ok: false as const, rows: null as any };
    }

    const w = coerceOptionalInt(r.WorkersInvolved);
    if (w !== undefined && Math.abs(w) > MAX_NUM) {
      toast.error(toastMessages.rowWorkersMax(String(key), MAX_NUM));
      return { ok: false as const, rows: null as any };
    }
  }

  return { ok: true as const, rows: parsed.data };
};




/* ---------- component ---------- */
export function DialogTable({
  date,
  siteId,
  onSaved,
  organizationLanguage,
  initialRows,
  initialConfig,
  focusedRecordId,
}: {
  date: Date | null;
  siteId: string | null;
  onSaved?: () => void | Promise<void>;
  organizationLanguage?: string | null;
  initialRows?: Record<string, any>[] | null;
  initialConfig?: Record<string, any> | null;
  focusedRecordId?: string | null;
}) {
  const language = normalizeOrganizationLanguage(organizationLanguage);
  const t = getSiteDiaryDialogMessages(language);
  const toastMessages = getToastMessages(language);




  //---------------------------------------State---------------------------------------
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(new Set());
  const [tableHeads, setTableHeads] = useState<string[]>([]);
  const [defaultMap, setMap] = useState<Record<string, any>>(defaultConfig);
  const hasClientEditsRef = React.useRef(false);
  const uncontrolledFieldRefs = React.useRef(
    new Map<string, HTMLInputElement | HTMLTextAreaElement>(),
  );

  const newEmptyRow = () => ({
    id: undefined as string | undefined,
    _tempId: crypto.randomUUID(),
    Date: date,
    Location: "",
    Location_code: "",
    Works: "",
    Works_code: "",
    Units: "",
    Amounts: "",
    WorkersInvolved: "",
    TimeInvolved: "",
    Comments: "",
    CreatedBy: "",

    // Manual entry support
    Location_mode: "select" as "select" | "manual",
    Location_custom_1_mode: "select" as "select" | "manual",
    Location_custom_2_mode: "select" as "select" | "manual",
    Works_mode: "select" as "select" | "manual",
    Works_custom_1_mode: "select" as "select" | "manual",
    Works_custom_2_mode: "select" as "select" | "manual",
    Location_manual: "",
    Works_manual: "",
  });

  const [rows, setRows] = useState<any[]>([newEmptyRow()]);

  const handleAddRow = () => {
    hasClientEditsRef.current = true;
    setRows((prev) => [...prev, newEmptyRow()]);
  };

  const handleDeleteRow = async (idOrTemp: string | undefined, tempId?: string) => {
    const row = rows.find((r) => r.id === idOrTemp || r._tempId === tempId);
    const confirmed = window.confirm("Delete this diary row? This action cannot be undone.");
    if (!confirmed) return;
    hasClientEditsRef.current = true;

    if (row?.id) {
      await deleteSiteDiaryRecord({ id: row.id });
      setDirtyRowIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });

      toast.success(toastMessages.diaryRowDeleted);
      await onSaved?.();
    } else {
      setRows((prev) => prev.filter((r) => r._tempId !== (tempId ?? idOrTemp)));
      toast.success(toastMessages.unsavedRowRemoved);
    }
  };

  const markRowDirty = (rowIdOrTemp: string) => {
    hasClientEditsRef.current = true;
    const existingRowId = rows.find(
      (row) => row.id === rowIdOrTemp || row._tempId === rowIdOrTemp,
    )?.id;

    if (existingRowId) {
      setDirtyRowIds((current) => {
        if (current.has(existingRowId)) return current;
        return new Set(current).add(existingRowId);
      });
    }
  };

  const handleChange = (rowIdOrTemp: string, field: string, value: any) => {
    markRowDirty(rowIdOrTemp);

    setRows((prev) =>
      prev.map((r) =>
        r.id === rowIdOrTemp || r._tempId === rowIdOrTemp ? { ...r, [field]: value } : r
      )
    );
  };

  const getUncontrolledFieldKey = (rowKey: string, field: string) =>
    `${rowKey}:${field}`;

  const setUncontrolledFieldRef = (
    rowKey: string,
    field: string,
    element: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    const key = getUncontrolledFieldKey(rowKey, field);
    if (element) uncontrolledFieldRefs.current.set(key, element);
    else uncontrolledFieldRefs.current.delete(key);
  };

  const getRowsWithUncontrolledValues = () =>
    rows.map((row) => {
      const rowKey = String(row.id ?? row._tempId);
      const nextRow = { ...row };

      for (const field of tableHeads) {
        const type = getTypeByKey(field);
        if (!["timePicker", "calendarPicker", "textInput", "float"].includes(type)) {
          continue;
        }

        const element = uncontrolledFieldRefs.current.get(
          getUncontrolledFieldKey(rowKey, field),
        );
        if (!element) continue;

        if (type === "timePicker") {
          if (!element.value) {
            nextRow[field] = null;
            continue;
          }
          const [hours, minutes] = element.value.split(":").map(Number);
          const baseDate = new Date(row.Date ?? date ?? new Date());
          if (!Number.isNaN(baseDate.getTime())) {
            baseDate.setHours(hours, minutes, 0, 0);
            nextRow[field] = baseDate;
          }
          continue;
        }

        nextRow[field] = element.value;
      }

      return nextRow;
    });

  //-------------------------------------------------------------Hanlde Submit----------------------------------------------

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSaving) return;


    const validated = validateRows(getRowsWithUncontrolledValues(), toastMessages);
    if (!validated.ok) return;

    setIsSaving(true);

    try {
    const cleanRows = validated.rows; // <-- use this

    console.dir(cleanRows);




    const existingRows = cleanRows.filter(
      (r) => isUUID(r.id) && dirtyRowIds.has(r.id),
    );

    console.log(`existing rows ${existingRows}`)

    const newRows = cleanRows.filter((r) => !isUUID(r.id));



    //This we need to strip any UI only fields 
    const stripUiFields = (r: any) => {
      const {
        _tempId,

        Location_code,
        Works_code,

        Location_mode,
        Works_mode,
        Location_manual,
        Works_manual,

        Location_custom_1_mode,
        Location_custom_2_mode,
        Works_custom_1_mode,
        Works_custom_2_mode,

        ...db
      } = r;

      return db;
    };


    let updatedCount = 0;
    let createdCount = 0;

    // Here we actually update existing rows 
    for (const r of existingRows) {


      const dbRow = stripUiFields(r);

      //Converting "" into datetime

      dbRow.Date_Custom_1 = normalizeDate(dbRow.Date_Custom_1);
      dbRow.Date_Custom_2 = normalizeDate(dbRow.Date_Custom_2);

      const payload = {
        //So here we will only save original dbRows + siteId

        ...dbRow,
        
        siteId,
      };

      try {

        await updateSiteDiaryRecord(payload);
        updatedCount += 1;
        setDirtyRowIds((current) => {
          const next = new Set(current);
          next.delete(String(r.id));
          return next;
        });
      } catch (err: any) {
        toast.error(toastMessages.updateDiaryRowFailed(String(r.id), err?.message ?? toastMessages.somethingWentWrong));
        return;
      }
    }
    //for create we also need to strip of id
    const stripUiFieldsForCreate = (r: any) => {
      const { id, ...rest } = stripUiFields(r);
      return rest;
    };
    // Here we create new rows
    if (newRows.length) {

      //same, strip UI only fields 


      const rowsToCreate = newRows.map(stripUiFieldsForCreate).map((r) => ({
            ...r,
            Date_Custom_1: normalizeDate(r.Date_Custom_1),
            Date_Custom_2: normalizeDate(r.Date_Custom_2),
          }));


      try {
        console.dir(rowsToCreate)
        await saveSiteDiaryRecordFromWeb({
          rows: rowsToCreate,
          siteId,
        });
        createdCount = rowsToCreate.length;
      } catch (err: any) {
        toast.error(toastMessages.createDiaryRowsFailed(err?.message ?? toastMessages.somethingWentWrong));
        return;
      }
    }

    toast.success(toastMessages.diarySaved(updatedCount, createdCount));
    await onSaved?.();
    } finally {
      setIsSaving(false);
    }
  };


  const normalizeDate = (v: any) => {
  if (!v) return null;
  return v instanceof Date ? v : new Date(v);
};



  //------------------------map helpers----------------------------------------------

  function getTypeByKey(key: string) {
    return defaultMap[key]?.Type ?? null;
  }


  function getDisplayNameByKey(key) {
    if (key === "Units" && normalizeOrganizationLanguage(organizationLanguage) === "lv") {
      return "Vienības";
    }

    return defaultMap[key]?.DisplayName ?? key;
  }

  function getCellWidthByKey(
    key: string,
    map: Record<string, any>,
    fallback = 200 // default if not defined
  ): number {
    return (
      map?.[key]?.customSettings?.cellWidth ??
      fallback
    );
  }


  //----------------------cell renders-----------------------------------------------------

  function cellRender(args: {
    field: string;
    row: any;
    rowKey: string;
  }) {
    const { field, row, rowKey } = args;
    const type = getTypeByKey(field);

    // fixed / default
    if (type === "fixed") {
      const value = row[field];
      const renderAs = defaultMap?.[field]?.customSettings?.renderAs ?? "String";

      let display = "";

      if (value !== null && value !== undefined && value !== "") {
        if (renderAs === "Day" || renderAs === "Time") {
          const d = new Date(value);

          if (!isNaN(d.getTime())) {
            if (renderAs === "Day") {
              const day = String(d.getDate()).padStart(2, "0");
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const year = d.getFullYear();
              display = `${day}.${month}.${year}`;
            } else {
              const h = String(d.getHours()).padStart(2, "0");
              const m = String(d.getMinutes()).padStart(2, "0");
              display = `${h}:${m}`;
            }
          } else {
            // if it's not a valid date, just show as string
            display = String(value);
          }
        } else {
          display = String(value);
        }
      }

      return <span className="text-sm text-muted-foreground select-none">{display}</span>;
    }




    if (type === "timePicker") {


      function dateTimeToHHmm(value: any): string {
        if (!value) return "";
        const d = value instanceof Date ? value : new Date(value);
        if (isNaN(d.getTime())) return "";
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }

      function hhmmToDateTime(
        hhmm: string,
        baseDate?: string | Date
      ): Date | null {
        if (!hhmm) return null;

        const [h, m] = hhmm.split(":").map(Number);

        const base = baseDate
          ? new Date(baseDate)
          : new Date();

        if (isNaN(base.getTime())) return null;

        base.setHours(h, m, 0, 0);

        return base; // ✅ Date object
      }





      return (
        <Input
          ref={(element) => setUncontrolledFieldRef(rowKey, field, element)}
          type="time"
          style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}
          defaultValue={dateTimeToHHmm(row[field])}
          onChange={() => markRowDirty(rowKey)}
        />
      );
    }

    // calendarPicker (YYYY-MM-DD)
    if (type === "calendarPicker") {
      const v = String(row[field] ?? "");
      const ymd = v ? v.slice(0, 10) : ""; // supports ISO strings too

      return (
        <Input
          ref={(element) => setUncontrolledFieldRef(rowKey, field, element)}
          type="date"
          style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}
          defaultValue={v.length >= 10 ? ymd : v}
          onChange={() => markRowDirty(rowKey)}
        />
      );
    }



























    // textInput
    if (type === "textInput") {
      return (
        <Textarea
          ref={(element) => setUncontrolledFieldRef(rowKey, field, element)}
          style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}
          rows={1}
          defaultValue={String(row[field] ?? "")}
          onChange={() => markRowDirty(rowKey)}
        />
      );
    }

    // float (you can also add integer logic via customSettings)
    if (type === "float") {
      return (
        <Input
          ref={(element) => setUncontrolledFieldRef(rowKey, field, element)}
          inputMode="decimal"
          style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}
          defaultValue={String(row[field] ?? "")}
          onChange={() => markRowDirty(rowKey)}
        />
      );
    }

    // dropdown
    if (type === "dropdown") {




      const optionsObj = defaultMap[field]?.DropDownOptions ?? {};

      let options = Object.entries(optionsObj).map(([value, label]) => ({
        value,
        label: String(label),
      }));

      const currentValue = String(row[field] ?? "");
      const getDropdownOptionLabel = (label: string) =>
        field === "Units" ? (t.unitLabels[label] ?? label) : label;

      if (
        currentValue &&
        !options.some((opt) => opt.label  === currentValue)
      ) {
        options.unshift({
          value: currentValue,
          label: currentValue,
        });
      }

      if (field === "Works") {
        return (
          <SearchableWorksSelect
            value={currentValue}
            options={options}
            width={isMobile ? "100%" : getCellWidthByKey(field, defaultMap)}
            selectLabel={t.select}
            searchLabel={t.searchOption}
            noOptionsLabel={t.noOptionsFound}
            onChange={(value) => handleChange(rowKey, field, value)}
          />
        );
      }


      return (
        <Select
          value={currentValue}
          onValueChange={(val) => handleChange(rowKey, field, val)}
        >
          <SelectTrigger

            style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}

          >
            <SelectValue placeholder={String(row[field] ?? t.select)} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.label}>
                {getDropdownOptionLabel(opt.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // fallback
    return <span>{String(row[field] ?? "")}</span>;
  }




  useEffect(() => {
    let cancelled = false;

    if (!date || !siteId) {
      setRows([newEmptyRow()]);
      setLoading(false);
      return;
    }

    const cachedRows = initialRows?.length
      ? focusedRecordId
        ? initialRows.filter((row) => row.id === focusedRecordId)
        : initialRows
      : null;
    const cachedConfig = (initialConfig ?? defaultConfig) as Record<string, any>;
    hasClientEditsRef.current = false;

    if (cachedRows) {
      const renderableFields = Object.entries(cachedConfig)
        .filter(([_, cfg]) => cfg?.Type !== "noRender")
        .sort((a, b) => {
          const aOrder = typeof a[1]?.customSettings?.order === "number"
            ? a[1].customSettings.order
            : Number.POSITIVE_INFINITY;
          const bOrder = typeof b[1]?.customSettings?.order === "number"
            ? b[1].customSettings.order
            : Number.POSITIVE_INFINITY;
          return aOrder !== bOrder ? aOrder - bOrder : a[0].localeCompare(b[0]);
        })
        .map(([key]) => key.trim());
      const editableRows = cachedRows.map((row) => ({
        id: row.id ?? undefined,
        createdBy: row.createdBy ?? undefined,
        ...Object.fromEntries(
          renderableFields.map((field) => [field, row[field] ?? ""]),
        ),
        _tempId: crypto.randomUUID(),
        Location_code: "",
        Works_code: "",
        Location_mode: "select",
        Works_mode: "select",
        Location_manual: "",
        Works_manual: "",
      }));

      setMap(cachedConfig);
      setTableHeads(renderableFields);
      setRows(editableRows);
      setDirtyRowIds(new Set());
      setLoading(false);
    } else {
      setLoading(true);
    }

    (async () => {
      const isoDate = typeof date === "string" ? date : date.toISOString();
      const config = (initialConfig ?? (await getConfig(siteId)) ?? defaultConfig) as Record<string, any>;
      setMap(config);




      //Rhis is funciton will map out noRender fields. 

      function getRenderableFieldsOrdered(map: Record<string, any>): string[] {
        return Object.entries(map)
          .filter(([_, cfg]) => cfg?.Type !== "noRender")
          .sort((a, b) => {
            const ao = a[1]?.customSettings?.order;
            const bo = b[1]?.customSettings?.order;

            const aOrder = typeof ao === "number" ? ao : Number.POSITIVE_INFINITY;
            const bOrder = typeof bo === "number" ? bo : Number.POSITIVE_INFINITY;

            // primary sort: order asc
            if (aOrder !== bOrder) return aOrder - bOrder;

            // tie-breaker: stable deterministic (key name)
            return a[0].localeCompare(b[0]);
          })
          .map(([key]) => key.trim());
      }


      //Here we load config from database, and if no config we use default. 

   
      const cfg = config;
          if (cancelled) return;

          setMap(cfg);

          const renderableFields = getRenderableFieldsOrdered(cfg);

      console.log(`renderable fields`)
      console.dir(renderableFields)








      console.log(config)



      setTableHeads(renderableFields)









      //Load rows 
      const loadedRows = await getSiteDiaryRecord({ siteId, date: isoDate });
      console.log("Loaded rows:");
      console.dir(loadedRows);

      //Filter out rows we don't need according to map. But let's keep id Row also. 

      function pickRenderableRows(
        rows: Record<string, any>[],
        renderableFields: string[]
      ) {
        return rows.map((row) => ({
          id: row.id ?? undefined, // keep DB id even if not renderable
          createdBy: row.createdBy ?? undefined,

          ...Object.fromEntries(
            renderableFields.map((field) => [field, row[field] ?? ""])
          ),
        }));
      }


      //So this will only leave rows which are not marked as noRender. 



      const formattedRows = pickRenderableRows(
        focusedRecordId
          ? loadedRows.filter((row) => row.id === focusedRecordId)
          : loadedRows,
        renderableFields
      );

      console.log("Formatted rows ");
      console.dir(formattedRows);

      //This function returns corrected table name :







      if (cancelled) return;

      //This mess I just hate. It just needs to be same as fucking data.



      const nextRows = formattedRows.length
        ? formattedRows.map((row: any) => ({
          ...row,
          _tempId: crypto.randomUUID(),
          Location_code: "",
          Works_code: "",
          Location_mode: "select",
          Works_mode: "select",
          Location_manual: "",
          Works_manual: "",

          //Database rows


        }))
        : focusedRecordId
          ? []
          : [newEmptyRow()];

      console.dir(formattedRows)
      if (!hasClientEditsRef.current) {
        if (cachedRows) {
          setRows((currentRows) => {
            const serverRowsById = new Map(
              nextRows
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
                const refreshedRow = serverRowsById.get(String(row.id));
                return refreshedRow ? [refreshedRow] : [];
              }),
              ...nextRows.filter((row) => row.id && !currentIds.has(String(row.id))),
            ];
          });
        } else {
          setRows(nextRows);
        }
        setDirtyRowIds(new Set());
      }

      setLoading(false);
    })().catch((error: any) => {
      if (cancelled || cachedRows) return;
      toast.error(error?.message ?? toastMessages.somethingWentWrong);
      setRows([newEmptyRow()]);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [date, focusedRecordId, initialConfig, initialRows, siteId]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[300px]">{t.loading}</div>;
  }

  const mobileFieldGroups = tableHeads.reduce<string[][]>((groups, field, index) => {
    const groupIndex = Math.floor(index / 2);
    if (!groups[groupIndex]) groups[groupIndex] = [];
    groups[groupIndex].push(field);
    return groups;
  }, []);



  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-end gap-2 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-md border">
        {!focusedRecordId ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddRow}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {t.addTask}
          </Button>
        ) : null}
        <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.saving}
            </>
          ) : (
            t.saveDiary
          )}
        </Button>
      </div>

      {isMobile ? (
        <ScrollArea
          className={
            focusedRecordId
              ? "w-full max-h-[60vh] rounded-md border p-2"
              : "w-full h-[48vh] rounded-md border p-2"
          }
        >
          <div className="space-y-3 pr-1">
            {rows.map((row, rowIndex) => (
              <div
                key={row.id ?? row._tempId}
                className="rounded-lg border bg-card p-3 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t.task} #{rowIndex + 1}</p>
                  {!focusedRecordId ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => handleDeleteRow(row.id, row._tempId)}
                      aria-label={`${t.deleteTaskAria} ${rowIndex + 1}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  ) : null}
                </div>

                {mobileFieldGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="grid grid-cols-1 gap-2">
                    {group.map((field) => (
                      <div key={field} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {getDisplayNameByKey(field)}
                        </p>
                        {cellRender({ field, row, rowKey: row.id ?? row._tempId })}
                      </div>
                    ))}
                  </div>
                ))}

                <div className="rounded-md bg-muted/40 px-2 py-1">
                  <p className="text-xs text-muted-foreground">
                    {t.createdBy}: {row.createdBy ?? "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      ) : (
        <ScrollArea
          className={
            focusedRecordId
              ? "w-full max-h-[56vh] rounded-none border"
              : "w-full h-[56vh] rounded-none border"
          }
        >
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    {tableHeads.map((head) => (
                      <TableHead
                        key={head}
                        className="text-center whitespace-nowrap"
                      >
                        {getDisplayNameByKey(head)}
                      </TableHead>

                    )


                    )}

                    <TableHead className="text-center w-[150px]">{t.createdBy}</TableHead>
                    {!focusedRecordId ? (
                      <TableHead className="text-center w-[80px]">{t.delete}</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id ?? row._tempId}>
                      {tableHeads.map((field) => (
                        <TableCell key={field} className="text-center">


                          {cellRender({ field, row, rowKey: row.id ?? row._tempId })}



                        </TableCell>
                      ))}

                      <TableCell className="text-center">{row.createdBy ?? ""}</TableCell>

                      {!focusedRecordId ? (
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => handleDeleteRow(row.id, row._tempId)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      )}

    </form>
  );
}
