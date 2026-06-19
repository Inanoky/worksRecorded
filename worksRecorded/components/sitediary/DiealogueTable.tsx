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
import { Check, ChevronsUpDown, Pencil, Search, Trash2, X } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getSiteDiaryRecord,
  getSiteDiarySchema,
  saveSiteDiaryRecordFromWeb,
  deleteSiteDiaryRecord,
  updateSiteDiaryRecord,
  getConfig,
  updateSiteDiaryDropdownOptions,
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
  manageLabel?: string;
  onChange: (value: string) => void;
  onManage?: () => void;
};

function SearchableWorksSelect({
  value,
  options,
  width,
  selectLabel,
  searchLabel,
  noOptionsLabel,
  manageLabel,
  onChange,
  onManage,
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
            {onManage ? (
              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setOpen(false);
                  onManage();
                }}
              >
                ⚙ {manageLabel}
              </button>
            ) : null}
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
const MANAGE_DROPDOWN_OPTIONS = "__manage_dropdown_options__";

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
const MAX_MANAGE_OPTION_LENGTH = 200;

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
}: {
  date: Date | null;
  siteId: string | null;
  onSaved?: () => void;
  organizationLanguage?: string | null;
}) {
  const language = normalizeOrganizationLanguage(organizationLanguage);
  const t = getSiteDiaryDialogMessages(language);
  const toastMessages = getToastMessages(language);




  //---------------------------------------State---------------------------------------
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [loading, setLoading] = useState(true);
  const [tableHeads, setTableHeads] = useState<string[]>([]);
  const [defaultMap, setMap] = useState<Record<string, any>>(defaultConfig);

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
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [manageField, setManageField] = useState<string | null>(null);
  const [manageOptions, setManageOptions] = useState<string[]>([]);
  const [manageSearch, setManageSearch] = useState("");
  const [newManageOption, setNewManageOption] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const isManageableDropdownField = (field: string) =>
    field.startsWith("Location") || field.startsWith("Works");

  const openManageDialog = (field: string, currentOptions: string[]) => {
    setManageField(field);
    setManageOptions(currentOptions);
    setManageSearch("");
    setNewManageOption("");
    setEditingIndex(null);
    setEditingValue("");
    setManageDialogOpen(true);
  };

  const appendManageOption = () => {
    const value = newManageOption.trim();
    if (!value) {
      toast.error(t.optionCannotBeEmpty);
      return;
    }
    if (manageOptions.some((option) => option.toLowerCase() === value.toLowerCase())) {
      toast.error(t.optionAlreadyExists);
      return;
    }
    if (value.length > MAX_MANAGE_OPTION_LENGTH) {
      toast.error(t.optionMaxLength(MAX_MANAGE_OPTION_LENGTH));
      return;
    }
    setManageOptions((prev) => [...prev, value]);
    setNewManageOption("");
  };

  const removeManageOption = (index: number) => {
    setManageOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
  };

  const saveEditedManageOption = () => {
    if (editingIndex == null) return;
    const value = editingValue.trim();
    if (!value) {
      toast.error(t.optionCannotBeEmpty);
      return;
    }
    if (
      manageOptions.some(
        (option, optionIndex) =>
          optionIndex !== editingIndex && option.toLowerCase() === value.toLowerCase(),
      )
    ) {
      toast.error(t.optionAlreadyExists);
      return;
    }
    if (value.length > MAX_MANAGE_OPTION_LENGTH) {
      toast.error(t.optionMaxLength(MAX_MANAGE_OPTION_LENGTH));
      return;
    }
    setManageOptions((prev) =>
      prev.map((option, optionIndex) => (optionIndex === editingIndex ? value : option)),
    );
    setEditingIndex(null);
    setEditingValue("");
  };

  const saveManagedDropdownOptions = async () => {
    if (!siteId || !manageField) return;
    const normalized = Array.from(new Set(manageOptions.map((item) => item.trim()).filter(Boolean)));
    if (!normalized.length) {
      toast.error(t.atLeastOneOptionRequired);
      return;
    }
    if (normalized.some((item) => item.length > MAX_MANAGE_OPTION_LENGTH)) {
      toast.error(t.eachOptionMaxLength(MAX_MANAGE_OPTION_LENGTH));
      return;
    }
    try {
      await updateSiteDiaryDropdownOptions({
        siteId,
        fieldKey: manageField,
        options: normalized,
      });
      setMap((prev) => ({
        ...prev,
        [manageField]: {
          ...(prev?.[manageField] ?? {}),
          DropDownOptions: Object.fromEntries(normalized.map((option) => [option, option])),
        },
      }));
      setManageDialogOpen(false);
      toast.success(t.dropdownOptionsUpdated);
    } catch (error: any) {
      toast.error(error?.message ?? t.failedUpdateDropdownOptions);
    }
  };

  const handleAddRow = () => {

    setRows((prev) => [...prev, newEmptyRow()]);
  };

  const handleDeleteRow = async (idOrTemp: string | undefined, tempId?: string) => {
    const row = rows.find((r) => r.id === idOrTemp || r._tempId === tempId);
    const confirmed = window.confirm("Delete this diary row? This action cannot be undone.");
    if (!confirmed) return;

    if (row?.id) {
      await deleteSiteDiaryRecord({ id: row.id });

      toast.success(toastMessages.diaryRowDeleted);
      onSaved?.();
    } else {
      setRows((prev) => prev.filter((r) => r._tempId !== (tempId ?? idOrTemp)));
      toast.success(toastMessages.unsavedRowRemoved);
    }
  };

  const handleChange = (rowIdOrTemp: string, field: string, value: any) => {

    setRows((prev) =>
      prev.map((r) =>
        r.id === rowIdOrTemp || r._tempId === rowIdOrTemp ? { ...r, [field]: value } : r
      )
    );
  };

  //-------------------------------------------------------------Hanlde Submit----------------------------------------------

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();


    const validated = validateRows(rows, toastMessages);
    if (!validated.ok) return;

    const cleanRows = validated.rows; // <-- use this

    console.dir(cleanRows);




    const existingRows = cleanRows.filter((r) => isUUID(r.id));

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
    onSaved?.();
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
          type="time"
          style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}
          value={dateTimeToHHmm(row[field])}
          onChange={(e) => {
            const dt = hhmmToDateTime(e.target.value, row.Date);
            handleChange(rowKey, field, dt); // ✅ Date in state
          }}
        />
      );
    }

    // calendarPicker (YYYY-MM-DD)
    if (type === "calendarPicker") {
      const v = String(row[field] ?? "");
      const ymd = v ? v.slice(0, 10) : ""; // supports ISO strings too

      return (
        <Input
          type="date"
          style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}
          value={v.length >= 10 ? ymd : v}
          onChange={(e) => handleChange(rowKey, field, e.target.value)}
        />
      );
    }



























    // textInput
    if (type === "textInput") {
      return (
        <Textarea
          style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}
          rows={1}
          value={String(row[field] ?? "")}
          onChange={(e) => handleChange(rowKey, field, e.target.value)}
        />
      );
    }

    // float (you can also add integer logic via customSettings)
    if (type === "float") {
      return (
        <Input
          inputMode="decimal"
          style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}
          value={String(row[field] ?? "")}
          onChange={(e) => handleChange(rowKey, field, e.target.value)}
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
      const optionsList = options.map((opt) => opt.label);

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
            manageLabel={t.manageOptions}
            onChange={(value) => handleChange(rowKey, field, value)}
            onManage={
              isManageableDropdownField(field)
                ? () => openManageDialog(field, optionsList)
                : undefined
            }
          />
        );
      }


      return (
        <Select
          value={currentValue}
          onValueChange={(val) => {
            if (val === MANAGE_DROPDOWN_OPTIONS) {
              openManageDialog(field, optionsList);
              return;
            }
            handleChange(rowKey, field, val);
          }}
        >
          <SelectTrigger

            style={{ width: isMobile ? "100%" : getCellWidthByKey(field, defaultMap) }}

          >
            <SelectValue placeholder={String(row[field] ?? t.select)} />
          </SelectTrigger>
          <SelectContent>
            {isManageableDropdownField(field) ? (
              <SelectItem value={MANAGE_DROPDOWN_OPTIONS}>⚙ {t.manageOptions}</SelectItem>
            ) : null}
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
    console.log("rows state changed:", rows);
    console.log("tableheades ", tableHeads)
    
  }, [rows]);

  //Downloadinf map 


  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!date || !siteId) {
      setRows([newEmptyRow()]);
      setLoading(false);
      return;
    }

    (async () => {
      const isoDate = typeof date === "string" ? date : date.toISOString();
      const config = await getConfig(siteId);
      setMap(config ?? defaultConfig);




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

   
      const cfg = (await getConfig(siteId)) ?? defaultConfig;
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
        loadedRows,
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
        : [newEmptyRow()];

      console.dir(formattedRows)
      setRows(nextRows);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [date, siteId]);

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
        <Button
          type="button"
          variant="outline"
          onClick={handleAddRow}
          className="w-full sm:w-auto"
        >
          {t.addTask}
        </Button>
        <Button type="submit" className="w-full sm:w-auto">
          {t.saveDiary}
        </Button>
      </div>

      {isMobile ? (
        <ScrollArea className="w-full h-[48vh] rounded-md border p-2">
          <div className="space-y-3 pr-1">
            {rows.map((row, rowIndex) => (
              <div
                key={row.id ?? row._tempId}
                className="rounded-lg border bg-card p-3 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t.task} #{rowIndex + 1}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => handleDeleteRow(row.id, row._tempId)}
                    aria-label={`${t.deleteTaskAria} ${rowIndex + 1}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
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
        <ScrollArea className="w-full h-[56vh] rounded-none border">
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
                    <TableHead className="text-center w-[80px]">{t.delete}</TableHead>
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

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="flex h-[75vh] max-h-[75vh] w-[96vw] max-w-[860px] sm:max-w-[860px] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{manageField?.startsWith("Location") ? t.manageLocationsTitle : t.manageWorksTitle}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              value={manageSearch}
              onChange={(event) => setManageSearch(event.target.value)}
              placeholder={t.searchOption}
            />
          </div>
          <div className="flex gap-2">
            <Input
              value={newManageOption}
              onChange={(event) => setNewManageOption(event.target.value)}
              maxLength={MAX_MANAGE_OPTION_LENGTH}
              placeholder={t.addNewOption}
            />
            <Button type="button" variant="outline" onClick={appendManageOption}>
              {t.add}
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 pr-6">
            <div className="space-y-2">
              {manageOptions
                .map((option, index) => ({ option, index }))
                .filter(({ option }) => option.toLowerCase().includes(manageSearch.trim().toLowerCase()))
                .map(({ option, index }) => (
                  <div
                    key={`${option}-${index}`}
                    className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-2"
                  >
                    <div className="min-w-0 overflow-hidden">
                      {editingIndex === index ? (
                        <Input
                          value={editingValue}
                          onChange={(event) => setEditingValue(event.target.value)}
                          maxLength={MAX_MANAGE_OPTION_LENGTH}
                          className="h-8 min-w-0 w-full"
                        />
                      ) : (
                        <p className="block max-w-full truncate text-sm" title={option}>
                          {option}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {editingIndex === index ? (
                        <>
                          <Button type="button" size="icon" variant="ghost" onClick={saveEditedManageOption} aria-label={t.saveOption}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => { setEditingIndex(null); setEditingValue(""); }}
                            aria-label={t.cancelEditingOption}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => { setEditingIndex(index); setEditingValue(option); }}
                          aria-label={t.editOption}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeManageOption(index)} aria-label={t.deleteOption}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              {manageOptions.filter((option) => option.toLowerCase().includes(manageSearch.trim().toLowerCase())).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t.noOptionsFound}</p>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setManageDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button type="button" onClick={saveManagedDropdownOptions}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
