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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { useMediaQuery } from "../Use-media-querty";
import defaultMap from "./defaultMap.json";

import {
  getSiteDiaryRecord,
  saveSiteDiaryRecordFromWeb,
  deleteSiteDiaryRecord,
  updateSiteDiaryRecord,
} from "@/server/actions/site-diary-actions";

import {
  dropdownRender,
  textInputRender,
  floatRender,
} from "@/components/sitediary/DialogTable/CellRenders";

import {
  MAX_FREE_TEXT,
  MAX_NUM,
  coerceOptionalFloat,
  coerceOptionalInt,
  isUUID,
  showZodErrorToast,
  mapToSelectItems,
  formatDateCell,
  normalizeKey,
  buildVisibleFields,
} from "@/components/sitediary/DialogTable/Helpers";

/* ----------------------------- constants ----------------------------- */

const ADD_NEW_LOCATION = "__add_new_location__";
const ADD_NEW_WORK = "__add_new_work__";
const CUSTOM_TRIGGER_DEFAULT = "__custom__";

/* ----------------------------- map types ----------------------------- */

type FieldType = "fixed" | "dropdown" | "noRender" | "textInput" | "float" | "timePicker" | "datePicker";

type MapField = {
  Type: FieldType;
  DisplayName: string;
  DropDownOptions?: Record<string, string>;
  customSettings?: Record<string, any>;
};

type DefaultMap = Record<string, MapField>;

/* ----------------------------- validation ---------------------------- */

const DiaryRowSchema = z.object({
  comments: z.string().max(1500).optional().or(z.literal("")),
}).passthrough();

const DiaryRowsSchema = z.array(DiaryRowSchema);

/* ----------------------------- row type ----------------------------- */

type DiaryRow = {
  id?: string;
  _tempId: string;
  date: any;

  // DB fields (dynamic, from defaultMap)
  [k: string]: any;

  // dropdown free text state (per-field)
  _mode: Record<string, "select" | "manual">;
  _manual: Record<string, string>;

  createdBy: string;
  userId?: string;
};

/* ----------------------------- component ----------------------------- */

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

  const map = defaultMap as unknown as DefaultMap;

  // ordered fields that are not "noRender"
  const visibleFields = useMemo(() => buildVisibleFields(map), [map]);

  // per-field dropdown options
  const dropdownOptionsByField = useMemo(() => {
    const out: Record<string, { value: string; label: string }[]> = {};
    for (const { key, def } of visibleFields) {
      if (def.Type === "dropdown") out[key] = mapToSelectItems(def.DropDownOptions);
    }
    return out;
  }, [visibleFields]);

  const newEmptyRow = (): DiaryRow => {
    const r: DiaryRow = {
      id: undefined,
      _tempId: crypto.randomUUID(),
      date,
      createdBy: "",
      _mode: {},
      _manual: {},
    };

    // init fields from map (controlled inputs)
    for (const { key, def } of visibleFields) {
      if (def.Type === "noRender") continue;
      if (key === "Date") continue; // Date displayed from row.date
      r[key] = "";
    }

    return r;
  };

  const [rows, setRows] = useState<DiaryRow[]>([newEmptyRow()]);

  /* ----------------------------- handlers ----------------------------- */

  const handleAddRow = () => setRows((prev) => [...prev, newEmptyRow()]);

  const handleChange = (rowKey: string, field: string, value: any) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowKey || r._tempId === rowKey ? { ...r, [field]: value } : r
      )
    );
  };

  const setDropdownMode = (rowKey: string, field: string, mode: "select" | "manual") => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowKey || r._tempId === rowKey
          ? { ...r, _mode: { ...(r._mode ?? {}), [field]: mode } }
          : r
      )
    );
  };

  const setDropdownManual = (rowKey: string, field: string, v: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowKey || r._tempId === rowKey
          ? { ...r, _manual: { ...(r._manual ?? {}), [field]: v } }
          : r
      )
    );
  };

  const handleDeleteRow = async (id?: string, tempId?: string) => {
    const row = rows.find((r) => r.id === id || r._tempId === tempId);

    if (row?.id) {
      if (row.BISId || row.bisStatus) {
        toast.warning("This BIS-linked record will be deleted only from WorksRecorded and will remain in BIS.");
      }
      await deleteSiteDiaryRecord({ id: row.id });
      toast.success("Record deleted");
      onSaved?.();
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }

    setRows((prev) => prev.filter((r) => r._tempId !== tempId));
  };

  /* ----------------------------- validation ----------------------------- */

  const validateRows = (rowsToValidate: DiaryRow[]) => {
    const parsed = DiaryRowsSchema.safeParse(rowsToValidate);
    if (!parsed.success) {
      showZodErrorToast(parsed.error);
      return false;
    }

    for (const r of rowsToValidate) {
      const rowKey = r.id ?? r._tempId;

      // validate numeric fields from map
      for (const { key, def } of visibleFields) {
        if (def.Type !== "float") continue;

        const raw = r[key];
        const isInt = Boolean(def?.customSettings?.integer);

        if (isInt) {
          const n = coerceOptionalInt(raw);
          if (n !== undefined && Math.abs(n) > MAX_NUM) {
            toast.error(`Row ${rowKey}: ${key} must be <= ${MAX_NUM}`);
            return false;
          }
        } else {
          const n = coerceOptionalFloat(raw);
          if (n !== undefined && Math.abs(n) > MAX_NUM) {
            toast.error(`Row ${rowKey}: ${key} must be <= ${MAX_NUM}`);
            return false;
          }
        }
      }

      // validate dropdown free text length
      for (const { key, def } of visibleFields) {
        if (def.Type !== "dropdown") continue;
        const manual = (r._manual ?? {})[key] ?? "";
        if (manual && manual.length > MAX_FREE_TEXT) {
          toast.error(`Row ${rowKey}: ${key} too long (max ${MAX_FREE_TEXT})`);
          return false;
        }
      }
    }

    return true;
  };

  /* ----------------------------- submit ----------------------------- */

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!siteId) return;
    if (!validateRows(rows)) return;

    // resolve dropdown custom/manual into row[field]
    const resolved = rows.map((r) => {
      const out: DiaryRow = { ...r };

      for (const { key, def } of visibleFields) {
        if (def.Type !== "dropdown") continue;

        const mode = (r._mode ?? {})[key] ?? "select";
        const manual = ((r._manual ?? {})[key] ?? "").trim();

        out[key] = mode === "manual" ? manual : String(r[key] ?? "").trim();
      }

      return out;
    });

    const existing = resolved.filter((r) => isUUID(r.id));
    const created = resolved.filter((r) => !isUUID(r.id));

    // UPDATE existing (send DB field names)
    for (const r of existing) {
      const payload: any = {
        id: r.id,
        siteId,
        Date: r.date,
        Photos: [],
        userId: r.userId,
      };

      for (const { key, def } of visibleFields) {
        if (def.Type === "noRender") continue;
        if (key === "Date") continue;

        const raw = r[key];

        if (def.Type === "float") {
          const isInt = Boolean(def?.customSettings?.integer);
          if (raw === "" || raw === undefined || raw === null) payload[key] = undefined;
          else payload[key] = isInt ? Number(String(raw).trim()) : Number(String(raw).trim());
        } else if (def.Type === "textInput") {
          payload[key] = raw === "" ? undefined : raw;
        } else if (def.Type === "dropdown") {
          payload[key] = raw === "" ? undefined : raw;
        } else if (def.Type === "fixed") {
          // usually you don't update fixed, but keep it safe:
          payload[key] = raw === "" ? undefined : raw;
        }
      }

      try {
        await updateSiteDiaryRecord(payload);
      } catch (err: any) {
        toast.error(`Failed to update row ${r.id}: ${err?.message ?? "Unknown error"}`);
        return;
      }
    }

    // CREATE new
    if (created.length) {
      const sanitized = created.map((r) => {
        const out: any = {
          date: r.date,
          Photos: [],
        };

        for (const { key, def } of visibleFields) {
          if (def.Type === "noRender") continue;
          if (key === "Date") continue;

          const raw = r[key];

          if (def.Type === "float") {
            const isInt = Boolean(def?.customSettings?.integer);
            if (raw === "" || raw === undefined || raw === null) out[key] = undefined;
            else out[key] = isInt ? Number(String(raw).trim()) : Number(String(raw).trim());
          } else {
            out[key] = raw === "" ? undefined : raw;
          }
        }

        // strip ui fields
        delete out.id;
        delete out._tempId;
        delete out._mode;
        delete out._manual;
        delete out.createdBy;

        return out;
      });

      try {
        await saveSiteDiaryRecordFromWeb({ rows: sanitized, siteId });
      } catch (err: any) {
        toast.error(`Failed to create rows: ${err?.message ?? "Unknown error"}`);
        return;
      }
    }

    toast.success("Diary saved");
    onSaved?.();
  };

  /* ----------------------------- load ----------------------------- */

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    if (!date || !siteId) {
      setRows([newEmptyRow()]);
      setLoading(false);
      return;
    }

    (async () => {
      const iso = date.toISOString();
      const data = await getSiteDiaryRecord({ siteId, date: iso });
      if (cancelled) return;

      const prepared: DiaryRow[] = data.length
        ? data.map((r: any) => {
            const row: DiaryRow = {
              ...r,
              _tempId: crypto.randomUUID(),
              date: r.date ?? r.Date ?? date,
              createdBy: r.createdBy ?? "",
              _mode: {},
              _manual: {},
            };

            // ensure all visible keys exist (controlled)
            for (const { key, def } of visibleFields) {
              if (def.Type === "noRender") continue;
              if (key === "Date") continue;
              if (row[key] === undefined || row[key] === null) row[key] = "";
            }

            return row;
          })
        : [newEmptyRow()];

      setRows(prepared);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, siteId]);

  /* ----------------------------- dynamic cell render ----------------------------- */

  const renderDynamicCell = (row: DiaryRow, rowKey: string, fieldKey: string, def: MapField) => {
    const type = def.Type;

    if (type === "noRender") return null;

    if (fieldKey === "Date" && type === "fixed") {
      return <span className="text-muted-foreground">{formatDateCell(row.date)}</span>;
    }

    if (type === "fixed") {
      return <span className="text-muted-foreground">{String(row[fieldKey] ?? "")}</span>;
    }

    if (type === "dropdown") {
      const options = dropdownOptionsByField[fieldKey] ?? [];
      const mode = (row._mode ?? {})[fieldKey] ?? "select";
      const manual = (row._manual ?? {})[fieldKey] ?? "";

      const customTriggerValue =
        fieldKey === "Location" ? ADD_NEW_LOCATION : fieldKey === "Works" ? ADD_NEW_WORK : CUSTOM_TRIGGER_DEFAULT;

      return dropdownRender({
        value: String(row[fieldKey] ?? ""),
        placeholder: String(def.DisplayName ?? fieldKey),
        widthClass: "w-full",
        options,
        allowCustom: true,
        mode,
        onModeChange: (m) => setDropdownMode(rowKey, fieldKey, m),
        customValue: manual,
        onCustomChange: (v) => setDropdownManual(rowKey, fieldKey, v),
        onValueChange: (v) => handleChange(rowKey, fieldKey, v),
        customTriggerValue,
      });
    }

    if (type === "textInput") {
      return textInputRender({
        value: String(row[fieldKey] ?? ""),
        onChange: (v) => handleChange(rowKey, fieldKey, v),
      });
    }

    if (type === "float") {
      const isInt = Boolean(def?.customSettings?.integer);
      return floatRender({
        value: row[fieldKey],
        inputMode: isInt ? "numeric" : "decimal",
        onChange: (v) => handleChange(rowKey, fieldKey, v),
      });
    }

    // (ignored here because your list didn't include it; won't break)
    if (type === "timePicker") {
      const v = String(row[fieldKey] ?? "");
      return (
        <input
          type="time"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={v}
          onChange={(e) => handleChange(rowKey, fieldKey, e.target.value)}
        />
      );
    }

    if (type === "datePicker") {
      const v = String(row[fieldKey] ?? "");
      return (
        <input
          type="date"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={v}
          onChange={(e) => handleChange(rowKey, fieldKey, e.target.value)}
        />
      );
    }

    return null;
  };

  /* ----------------------------- UI ----------------------------- */

  if (loading) {
    return <div className="flex justify-center items-center min-h-[300px]">Loading…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ScrollArea className="w-full h-[45vh] sm:h-[56vh] border">
        <div className="flex justify-end gap-2 sticky top-0 z-20 bg-background p-2">
          <Button type="button" variant="outline" onClick={handleAddRow}>
            Add task
          </Button>
          <Button type="submit">Save diary</Button>
        </div>

        <div className="overflow-x-auto">
          <div className={isMobile ? "w-full" : "min-w-[1000px]"}>
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleFields.map(({ key, def }) => (
                    <TableHead key={key}>{String(def.DisplayName ?? key)}</TableHead>
                  ))}
                  <TableHead>By</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const rowKey = (row.id ?? row._tempId) as string;

                  return (
                    <TableRow key={rowKey}>
                      {visibleFields.map(({ key, def }) => (
                        <TableCell key={key}>
                          {renderDynamicCell(row, rowKey, normalizeKey(key), def)}
                        </TableCell>
                      ))}

                      <TableCell className="text-muted-foreground">{row.createdBy}</TableCell>

                      <TableCell>
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
