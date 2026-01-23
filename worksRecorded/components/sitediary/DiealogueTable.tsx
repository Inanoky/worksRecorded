// DialogTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Trash2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  getSiteDiaryRecord,
  saveSiteDiaryRecordFromWeb,
  deleteSiteDiaryRecord,
  updateSiteDiaryRecord,
} from "@/server/actions/site-diary-actions";
import { toast } from "sonner";
import { useMediaQuery } from "./Use-media-querty";
import { z } from "zod";

import defaultMap from "./defaultMap.json";

/* ----------------------------- constants ----------------------------- */

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

const MAX_FREE_TEXT = 100;
const MAX_NUM = 1_000_000_000;

/* ------------------------------ helpers ------------------------------ */

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

const showZodErrorToast = (err: z.ZodError) => {
  const first = err.errors[0];
  const path = first?.path?.length ? first.path.join(".") : "row";
  toast.error(`${path}: ${first.message}`);
};

function mapToSelectItems(dropdown?: Record<string, string>) {
  if (!dropdown) return [];
  return Object.entries(dropdown).map(([value, label]) => ({ value, label }));
}

function formatDateCell(v: any) {
  if (!v) return "No date";
  return new Date(v).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ----------------------------- validation ---------------------------- */

const DiaryRowSchema = z.object({
  amounts: z
    .union([z.coerce.number().finite(), z.literal("")])
    .optional()
    .refine(
      (v) => v === "" || v === undefined || (typeof v === "number" && Math.abs(v) <= MAX_NUM),
      { message: `Amounts must be a number <= ${MAX_NUM}` }
    ),
  workers: z
    .union([z.coerce.number().int(), z.literal("")])
    .optional()
    .refine(
      (v) =>
        v === "" ||
        v === undefined ||
        (typeof v === "number" && Math.abs(v) <= MAX_NUM && Number.isInteger(v)),
      { message: `Workers must be an integer <= ${MAX_NUM}` }
    ),
  hours: z
    .union([z.coerce.number().finite(), z.literal("")])
    .optional()
    .refine(
      (v) => v === "" || v === undefined || (typeof v === "number" && Math.abs(v) <= MAX_NUM),
      { message: `Hours must be a number <= ${MAX_NUM}` }
    ),
  comments: z.string().max(1500).optional().or(z.literal("")),

  location_mode: z.enum(["select", "manual"]).optional(),
  works_mode: z.enum(["select", "manual"]).optional(),
  location_manual: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  works_manual: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  location: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  works: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),

  units: z.any().optional(),
});

const DiaryRowsSchema = z.array(DiaryRowSchema);

/* ---------------------------- types (local) --------------------------- */

type RowKey = string;

type DiaryRow = {
  id?: string;
  _tempId: string;
  date: any;

  location: string;
  works: string;
  units: string;

  amounts: any;
  workers: any;
  hours: any;

  comments: string;
  createdBy: string;

  location_mode: "select" | "manual";
  works_mode: "select" | "manual";
  location_manual: string;
  works_manual: string;

  userId?: string;
};

type OnCellChange = (rowKey: RowKey, field: keyof DiaryRow | string, value: any) => void;

/* -------------------------- generic renders -------------------------- */

// dropdownRender covers: Location, Works, Units (same behavior: select + optional manual)
function dropdownRender(args: {
  rowKey: RowKey;
  value: string;
  placeholder: string;
  widthClass?: string; // e.g. "w-[160px]" or "w-full"
  options: { value: string; label: string }[];
  allowCustom?: boolean;
  customValue?: string;
  mode?: "select" | "manual"; // if allowCustom
  onModeChange?: (mode: "select" | "manual") => void; // if allowCustom
  onCustomChange?: (v: string) => void; // if allowCustom
  onValueChange: (v: string) => void;
  customTriggerValue?: string; // value used for "custom..." option item
  customLabel?: string; // text for custom option
  customPlaceholder?: string; // placeholder for custom input
  customWidthClass?: string; // input width in manual mode
}) {
  const {
    value,
    placeholder,
    widthClass = "w-full",
    options,
    allowCustom = false,
    mode = "select",
    onModeChange,
    customValue = "",
    onCustomChange,
    onValueChange,
    customTriggerValue = "__custom__",
    customLabel = "+ Custom…",
    customPlaceholder = "Type…",
    customWidthClass = "w-[180px]",
  } = args;

  if (allowCustom && mode === "manual") {
    return (
      <div className="flex gap-2">
        <Input
          className={customWidthClass}
          placeholder={customPlaceholder}
          maxLength={MAX_FREE_TEXT}
          value={customValue || value || ""}
          onChange={(e) => onCustomChange?.(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onModeChange?.("select");
            onCustomChange?.("");
          }}
        >
          Use list
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value || ""}
      onValueChange={(val) => {
        if (allowCustom && val === customTriggerValue) {
          onModeChange?.("manual");
          onValueChange("");
          return;
        }
        onModeChange?.("select");
        onValueChange(val);
      }}
    >
      <SelectTrigger className={widthClass}>
        <SelectValue placeholder={value || placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
        {allowCustom && <SelectItem value={customTriggerValue}>{customLabel}</SelectItem>}
      </SelectContent>
    </Select>
  );
}

// textInputRender covers: comments (textarea auto-grow)
function textInputRender(args: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { value, onChange } = args;
  return (
    <Textarea
      rows={1}
      className="w-full max-w-full min-h-0 resize-y overflow-x-hidden overflow-y-hidden break-words whitespace-pre-wrap"
      value={value ?? ""}
      onInput={(e) => {
        const t = e.currentTarget;
        t.style.height = "auto";
        t.style.height = `${t.scrollHeight}px`;
      }}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// floatRender covers: amounts, hours, workers (workers can still use inputMode numeric)
function floatRender(args: {
  value: any;
  onChange: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const { value, onChange, inputMode = "decimal" } = args;
  return (
    <Input
      className="w-full text-center"
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/* ------------------------------ component ---------------------------- */

export function DialogTable({
  date,
  siteId,
  onSaved,
}: {
  date: Date | null;
  siteId: string | null;
  onSaved?: () => void;
}) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [loading, setLoading] = useState(true);

  const locationOptions = useMemo(
    () => mapToSelectItems((defaultMap as any)?.Location?.DropDownOptions),
    []
  );
  const workOptions = useMemo(
    () => mapToSelectItems((defaultMap as any)?.Works?.DropDownOptions),
    []
  );

  const newEmptyRow = (): DiaryRow => ({
    id: undefined,
    _tempId: crypto.randomUUID(),
    date,

    location: "",
    works: "",
    units: "",

    amounts: "",
    workers: "",
    hours: "",

    comments: "",
    createdBy: "",

    location_mode: "select",
    works_mode: "select",
    location_manual: "",
    works_manual: "",

    userId: undefined,
  });

  const [rows, setRows] = useState<DiaryRow[]>([newEmptyRow()]);

  const handleAddRow = () => setRows((prev) => [...prev, newEmptyRow()]);

  const handleDeleteRow = async (idOrTemp: string | undefined, tempId?: string) => {
    const row = rows.find((r) => r.id === idOrTemp || r._tempId === tempId);

    if (row?.id) {
      await deleteSiteDiaryRecord({ id: row.id });
      toast.success("Record deleted!");
      onSaved?.();
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }

    setRows((prev) => prev.filter((r) => r._tempId !== (tempId ?? idOrTemp)));
  };

  const handleChange: OnCellChange = (rowIdOrTemp, field, value) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowIdOrTemp || r._tempId === rowIdOrTemp ? { ...r, [field]: value } : r
      )
    );
  };

  const validateRows = (rowsToValidate: DiaryRow[]) => {
    const parsed = DiaryRowsSchema.safeParse(rowsToValidate);
    if (!parsed.success) {
      showZodErrorToast(parsed.error);
      return { ok: false as const, rows: null as any };
    }

    for (const r of rowsToValidate) {
      const key = r.id ?? r._tempId;

      const a = coerceOptionalFloat(r.amounts);
      if (a !== undefined && Math.abs(a) > MAX_NUM) {
        toast.error(`Row ${key}: Amounts must be <= ${MAX_NUM}`);
        return { ok: false as const, rows: null as any };
      }

      const h = coerceOptionalFloat(r.hours);
      if (h !== undefined && Math.abs(h) > MAX_NUM) {
        toast.error(`Row ${key}: Hours must be <= ${MAX_NUM}`);
        return { ok: false as const, rows: null as any };
      }

      const w = coerceOptionalInt(r.workers);
      if (w !== undefined && Math.abs(w) > MAX_NUM) {
        toast.error(`Row ${key}: Workers must be <= ${MAX_NUM}`);
        return { ok: false as const, rows: null as any };
      }
    }

    return { ok: true as const, rows: parsed.data };
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!siteId) return;

    const validated = validateRows(rows);
    if (!validated.ok) return;

    const rowsToSave = rows.map((row) => {
      const resolvedLocation =
        row.location_mode === "manual"
          ? String(row.location_manual ?? "").trim()
          : String(row.location ?? "").trim();

      const resolvedWorks =
        row.works_mode === "manual"
          ? String(row.works_manual ?? "").trim()
          : String(row.works ?? "").trim();

      return { ...row, location: resolvedLocation, works: resolvedWorks };
    });

    const existingRows = rowsToSave.filter((r) => isUUID(r.id));
    const newRows = rowsToSave.filter((r) => !isUUID(r.id));

    for (const r of existingRows) {
      const payload = {
        id: r.id,
        Date: r.date,
        Location: r.location || undefined,
        Works: r.works || undefined,
        Comments: r.comments,
        Units: r.units || undefined,
        Amounts: r.amounts !== "" && r.amounts !== undefined ? Number(r.amounts) : undefined,
        WorkersInvolved:
          r.workers !== "" && r.workers !== undefined ? Number(r.workers) : undefined,
        TimeInvolved: r.hours !== "" && r.hours !== undefined ? Number(r.hours) : undefined,
        Photos: [],
        userId: (r as any).userId,
        siteId,
      };

      try {
        await updateSiteDiaryRecord(payload);
      } catch (err: any) {
        toast.error(`Failed to update row ${r.id}: ${err?.message ?? "Unknown error"}`);
        return;
      }
    }

    if (newRows.length) {
      const rowsSanitized = newRows.map(
        ({
          id: _omit,
          _tempId: _omit2,
          location_mode: _omit3,
          works_mode: _omit4,
          location_manual: _omit5,
          works_manual: _omit6,
          ...rest
        }) => ({
          ...rest,
          location: (rest as any).location || undefined,
          works: (rest as any).works || undefined,
          units: (rest as any).units || undefined,
          amounts:
            (rest as any).amounts !== "" && (rest as any).amounts !== undefined
              ? Number((rest as any).amounts)
              : undefined,
          workers:
            (rest as any).workers !== "" && (rest as any).workers !== undefined
              ? Number((rest as any).workers)
              : undefined,
          hours:
            (rest as any).hours !== "" && (rest as any).hours !== undefined
              ? Number((rest as any).hours)
              : undefined,
        })
      );

      try {
        await saveSiteDiaryRecordFromWeb({ rows: rowsSanitized, siteId });
      } catch (err: any) {
        toast.error(`Failed to create rows: ${err?.message ?? "Unknown error"}`);
        return;
      }
    }

    toast.success("Records saved!");
    onSaved?.();
  };

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
      const loadedRows = await getSiteDiaryRecord({ siteId, date: isoDate });

      if (cancelled) return;

      const nextRows = loadedRows.length
        ? loadedRows.map((row: any) => ({
            ...row,
            _tempId: crypto.randomUUID(),
            location_mode: "select",
            works_mode: "select",
            location_manual: "",
            works_manual: "",
            units: row.units ?? "",
            amounts: row.amounts ?? "",
            workers: row.workers ?? "",
            hours: row.hours ?? "",
            comments: row.comments ?? "",
          }))
        : [newEmptyRow()];

      setRows(nextRows);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, siteId]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[300px]">Loading…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ScrollArea className="w-full h-[45vh] sm:h-[56vh] rounded-none border">
        <div className="flex flex-col sm:flex-row justify-end gap-2 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-none">
          <Button type="button" variant="outline" onClick={handleAddRow} className="w-full sm:w-auto">
            Add task
          </Button>
          <Button type="submit" className="w-full sm:w-auto">
            Save diary
          </Button>
        </div>

        <div className="overflow-x-auto">
          <div className={isMobile ? "w-full" : "min-w-[1000px]"}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Works</TableHead>
                  <TableHead className="text-center w-[110px]">Units</TableHead>
                  <TableHead className="text-center w-[120px]">Amounts</TableHead>
                  <TableHead className="text-center w-[120px]">Workers</TableHead>
                  <TableHead className="text-center w-[110px]">Hours</TableHead>
                  <TableHead className="text-center min-w-[480px]">Comments</TableHead>
                  <TableHead className="text-center w-[150px]">Created by</TableHead>
                  <TableHead className="text-center w-[80px]">Delete</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const rowKey: RowKey = (row.id ?? row._tempId) as string;

                  return (
                    <TableRow key={rowKey} className="align-top">
                      <TableCell className="py-3 text-muted-foreground">
                        {formatDateCell(row.date)}
                      </TableCell>

                      <TableCell className="py-2">
                        {dropdownRender({
                          rowKey,
                          value: row.location,
                          placeholder: "Select location",
                          widthClass: "w-[160px]",
                          options: locationOptions,
                          allowCustom: true,
                          mode: row.location_mode,
                          onModeChange: (m) => handleChange(rowKey, "location_mode", m),
                          customValue: row.location_manual,
                          onCustomChange: (v) => handleChange(rowKey, "location_manual", v),
                          onValueChange: (v) => handleChange(rowKey, "location", v),
                          customTriggerValue: ADD_NEW_LOCATION,
                          customLabel: "+ Custom location…",
                          customPlaceholder: "Type location…",
                          customWidthClass: "w-[160px]",
                        })}
                      </TableCell>

                      <TableCell className="py-2">
                        {dropdownRender({
                          rowKey,
                          value: row.works,
                          placeholder: "Select work",
                          widthClass: "w-[180px]",
                          options: workOptions,
                          allowCustom: true,
                          mode: row.works_mode,
                          onModeChange: (m) => handleChange(rowKey, "works_mode", m),
                          customValue: row.works_manual,
                          onCustomChange: (v) => handleChange(rowKey, "works_manual", v),
                          onValueChange: (v) => handleChange(rowKey, "works", v),
                          customTriggerValue: ADD_NEW_WORK,
                          customLabel: "+ Custom work…",
                          customPlaceholder: "Type work…",
                          customWidthClass: "w-[180px]",
                        })}
                      </TableCell>

                      <TableCell className="text-center py-2">
                        {dropdownRender({
                          rowKey,
                          value: row.units,
                          placeholder: "Select unit",
                          widthClass: "w-full",
                          options: allowedUnits.map((u) => ({ value: u, label: u })),
                          allowCustom: false,
                          onValueChange: (v) => handleChange(rowKey, "units", v),
                        })}
                      </TableCell>

                      <TableCell className="text-center py-2">
                        {floatRender({
                          value: row.amounts,
                          inputMode: "decimal",
                          onChange: (v) => handleChange(rowKey, "amounts", v),
                        })}
                      </TableCell>

                      <TableCell className="text-center py-2">
                        {floatRender({
                          value: row.workers,
                          inputMode: "numeric",
                          onChange: (v) => handleChange(rowKey, "workers", v),
                        })}
                      </TableCell>

                      <TableCell className="text-center py-2">
                        {floatRender({
                          value: row.hours,
                          inputMode: "decimal",
                          onChange: (v) => handleChange(rowKey, "hours", v),
                        })}
                      </TableCell>

                      <TableCell className="text-center py-2">
                        {textInputRender({
                          value: row.comments ?? "",
                          onChange: (v) => handleChange(rowKey, "comments", v),
                        })}
                      </TableCell>

                      <TableCell className="text-center py-2 text-muted-foreground">
                        {row.createdBy}
                      </TableCell>

                      <TableCell className="text-center py-2">
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </form>
  );
}
