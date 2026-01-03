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
import { Trash2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  getSiteDiaryRecord,
  getSiteDiarySchema,
  saveSiteDiaryRecordFromWeb,
  deleteSiteDiaryRecord,
  updateSiteDiaryRecord,
} from "@/server/actions/site-diary-actions";
import { toast } from "sonner";
import { useMediaQuery } from "./Use-media-querty";
import { z } from "zod";

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
const OTHER_OPTION = { value: "__other__", label: "Other Works"  }



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

/**
 * VALIDATION RULES (as requested):
 * - location/work can be empty (no selection OR manual input blank is ok)
 * - location/work free text allowed up to 100 chars (only validate length if provided)
 * - units: NO VALIDATION (only pass through whatever string is there)
 * - amounts/hours: floats, <= 1B, empty ok
 * - workers: int, <= 1B, empty ok
 */
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

  // soft validation (length only)
  location_mode: z.enum(["select", "manual"]).optional(),
  works_mode: z.enum(["select", "manual"]).optional(),
  location_manual: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  works_manual: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  location: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),
  works: z.string().max(MAX_FREE_TEXT).optional().or(z.literal("")),

  // units: no validation at all
  units: z.any().optional(),
});

const DiaryRowsSchema = z.array(DiaryRowSchema);

function collectWorks(node: any, prefix = "") {
  let options: { value: string; label: string }[] = [];
  if (node.type === "Work") {
    options.push({
      value: node.code,
      label: prefix ? `${prefix} / ${node.name}` : node.name,
    });
  }
  if (node.children) {
    for (const child of node.children) {
      options = options.concat(
        collectWorks(
          child,
          node.type === "Work"
            ? prefix
              ? `${prefix} / ${node.name}`
              : node.name
            : prefix
        )
      );
    }
  }
  return options;
}

export function useSiteSchema(siteId: string | null) {
  const [schema, setSchema] = useState<any[] | null>(null);
  useEffect(() => {
    if (!siteId) {
      setSchema(null);
      return;
    }
    getSiteDiarySchema({ siteId }).then((s) => {
      console.log("[Diary][Schema] fetched:", s);
      setSchema(s);
    });
  }, [siteId]);
  return schema;
}

/* ---------- component ---------- */
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
  const schema = useSiteSchema(siteId);
  const [loading, setLoading] = useState(true);

  const newEmptyRow = () => ({
    id: undefined as string | undefined,
    _tempId: crypto.randomUUID(),
    date,
    location: "",
    location_code: "",
    works: "",
    works_code: "",
    units: "",
    amounts: "",
    workers: "",
    hours: "",
    comments: "",
    createdBy: "",

    // Manual entry support
    location_mode: "select" as "select" | "manual",
    works_mode: "select" as "select" | "manual",
    location_manual: "",
    works_manual: "",
  });

  const [rows, setRows] = useState<any[]>([newEmptyRow()]);

  const handleAddRow = () => {
    console.log("[Diary][AddRow]");
    setRows((prev) => [...prev, newEmptyRow()]);
  };

  const handleDeleteRow = async (idOrTemp: string | undefined, tempId?: string) => {
    const row = rows.find((r) => r.id === idOrTemp || r._tempId === tempId);
    console.log("[Diary][DeleteRow] target:", { idOrTemp, tempId, row });
    if (row?.id) {
      await deleteSiteDiaryRecord({ id: row.id });
      console.log("[Diary][DeleteRow] deleted from DB:", row.id);
      toast.success("Record deleted!");
      onSaved?.();
    } else {
      setRows((prev) => prev.filter((r) => r._tempId !== (tempId ?? idOrTemp)));
    }
  };

  const handleChange = (rowIdOrTemp: string, field: string, value: any) => {
    console.log("[Diary][Change]", { rowIdOrTemp, field, value });
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowIdOrTemp || r._tempId === rowIdOrTemp ? { ...r, [field]: value } : r
      )
    );
  };

  const validateRows = (rowsToValidate: any[]) => {
    const parsed = DiaryRowsSchema.safeParse(rowsToValidate);
    if (!parsed.success) {
      showZodErrorToast(parsed.error);
      return { ok: false as const, rows: null as any };
    }

    // Extra clear numeric reason toasts (in case zod msg is too generic)
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
    console.log("[Diary][Submit] raw rows:", rows);

    const validated = validateRows(rows);
    if (!validated.ok) return;

    const allWorkOptions = [
      ...((schema?.flatMap((root) => collectWorks(root))) ?? []),
      ADDITIONAL_WORKS_OPTION,
      CLIENT_DELAY_OPTION,
      INTERNAL_DELAY_OPTION,
      NOTE_OPTION,
      OTHER_OPTION,
    ];
    console.log("[Diary][Submit] allWorkOptions count:", allWorkOptions.length);

    const rowsToSave = rows.map((row) => {
      const locationByCode = schema?.find((n) => n.code === row.location_code);
      const locationByName = schema?.find((n) => n.name === row.location);
      const locationNode = locationByCode || locationByName || null;

      const worksNode = allWorkOptions.find((opt: any) => opt.value === row.works_code);

      const resolvedLocation =
        row.location_mode === "manual"
          ? String(row.location_manual ?? "").trim()
          : locationNode?.name || String(row.location ?? "").trim();

      const resolvedWorks =
        row.works_mode === "manual"
          ? String(row.works_manual ?? "").trim()
          : worksNode?.label || String(row.works ?? "").trim();

      return {
        ...row,
        location: resolvedLocation,
        works: resolvedWorks,
      };
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
        Units: r.units || undefined, // no validation
        Amounts: r.amounts !== "" && r.amounts !== undefined ? Number(r.amounts) : undefined,
        WorkersInvolved:
          r.workers !== "" && r.workers !== undefined ? Number(r.workers) : undefined,
        TimeInvolved: r.hours !== "" && r.hours !== undefined ? Number(r.hours) : undefined,
        Photos: [],
        userId: r.userId,
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
          location_code: _omit3,
          works_code: _omit4,
          location_mode: _omit5,
          works_mode: _omit6,
          location_manual: _omit7,
          works_manual: _omit8,
          ...rest
        }) => ({
          ...rest,
          location: rest.location || undefined,
          works: rest.works || undefined,
          units: rest.units || undefined, // no validation
          amounts:
            rest.amounts !== "" && rest.amounts !== undefined ? Number(rest.amounts) : undefined,
          workers:
            rest.workers !== "" && rest.workers !== undefined ? Number(rest.workers) : undefined,
          hours: rest.hours !== "" && rest.hours !== undefined ? Number(rest.hours) : undefined,
        })
      );

      try {
        await saveSiteDiaryRecordFromWeb({
          rows: rowsSanitized,
          siteId,
        });
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
            location_code: "",
            works_code: "",
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
  }, [date, siteId]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[300px]">Loading…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ScrollArea className="w-full h-[45vh] sm:h-[56vh] rounded-none border">
        <div className="flex flex-col sm:flex-row justify-end gap-2 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-none">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddRow}
            className="w-full sm:w-auto"
          >
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
                  const locationOptions = schema?.filter((n) => n.type === "Location") || [];
                  const selectedLocationNode =
                    schema?.find((n) => n.code === row.location_code) ||
                    schema?.find((n) => n.name === row.location);
                  const dynamicWorkOptions = selectedLocationNode
                    ? collectWorks(selectedLocationNode)
                    : [];

                  const rowKey = row.id ?? row._tempId;

                  return (
                    <TableRow key={rowKey} className="align-top">
                      <TableCell className="py-3 text-muted-foreground">
                        {row.date
                          ? new Date(row.date).toLocaleDateString("en-GB", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "No date"}
                      </TableCell>

                      {/* Location */}
                      <TableCell className="py-2">
                        {row.location_mode === "manual" ? (
                          <div className="flex gap-2">
                            <Input
                              className="w-[160px]"
                              placeholder="Type location…"
                              maxLength={MAX_FREE_TEXT}
                              value={row.location_manual || row.location || ""}
                              onChange={(e) =>
                                handleChange(rowKey, "location_manual", e.target.value)
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                handleChange(rowKey, "location_mode", "select");
                                handleChange(rowKey, "location_manual", "");
                              }}
                            >
                              Use list
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={row.location_code || ""}
                            onValueChange={(val) => {
                              if (val === ADD_NEW_LOCATION) {
                                handleChange(rowKey, "location_mode", "manual");
                                handleChange(rowKey, "location_code", "");
                                return;
                              }
                              handleChange(rowKey, "location_mode", "select");
                              handleChange(rowKey, "location_code", val);
                            }}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder={row.location || "Select location"} />
                            </SelectTrigger>
                            <SelectContent>
                              {locationOptions.map((loc: any) => (
                                <SelectItem key={loc.code} value={loc.code}>
                                  {loc.name}
                                </SelectItem>
                              ))}
                              <SelectItem value={ADD_NEW_LOCATION}>+ Add new location…</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>

                      {/* Works */}
                      <TableCell className="py-2">
                        {row.works_mode === "manual" ? (
                          <div className="flex gap-2">
                            <Input
                              className="w-[180px]"
                              placeholder="Type work…"
                              maxLength={MAX_FREE_TEXT}
                              value={row.works_manual || row.works || ""}
                              onChange={(e) =>
                                handleChange(rowKey, "works_manual", e.target.value)
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                handleChange(rowKey, "works_mode", "select");
                                handleChange(rowKey, "works_manual", "");
                              }}
                            >
                              Use list
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={row.works_code || ""}
                            onValueChange={(val) => {
                              if (val === ADD_NEW_WORK) {
                                handleChange(rowKey, "works_mode", "manual");
                                handleChange(rowKey, "works_code", "");
                                return;
                              }
                              handleChange(rowKey, "works_mode", "select");
                              handleChange(rowKey, "works_code", val);
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder={row.works || "Select work"} />
                            </SelectTrigger>
                            <SelectContent>
                              {dynamicWorkOptions.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}

                              <SelectItem value={ADDITIONAL_WORKS_OPTION.value}>
                                {ADDITIONAL_WORKS_OPTION.label}
                              </SelectItem>
                              <SelectItem value={CLIENT_DELAY_OPTION.value}>
                                {CLIENT_DELAY_OPTION.label}
                              </SelectItem>
                              <SelectItem value={INTERNAL_DELAY_OPTION.value}>
                                {INTERNAL_DELAY_OPTION.label}
                              </SelectItem>
                              <SelectItem value={NOTE_OPTION.value}>{NOTE_OPTION.label}</SelectItem>
                          <SelectItem value={OTHER_OPTION.value}>{OTHER_OPTION.label}</SelectItem>
                              <SelectItem value={ADD_NEW_WORK}>+ Add new work…</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>

                      {/* Units */}
                      <TableCell className="text-center py-2">
                        <Select
                          value={row.units || ""}
                          onValueChange={(val) => handleChange(rowKey, "units", val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {allowedUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input
                          className="w-full text-center"
                          inputMode="decimal"
                          value={row.amounts}
                          onChange={(e) => handleChange(rowKey, "amounts", e.target.value)}
                        />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input
                          className="w-full text-center"
                          inputMode="numeric"
                          value={row.workers}
                          onChange={(e) => handleChange(rowKey, "workers", e.target.value)}
                        />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input
                          className="w-full text-center"
                          inputMode="decimal"
                          value={row.hours}
                          onChange={(e) => handleChange(rowKey, "hours", e.target.value)}
                        />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Textarea
                          rows={1}
                          className="w-full max-w-full min-h-0 resize-y overflow-x-hidden overflow-y-hidden break-words whitespace-pre-wrap"
                          value={row.comments ?? ""}
                          onInput={(e) => {
                            const t = e.currentTarget;
                            t.style.height = "auto";
                            t.style.height = `${t.scrollHeight}px`;
                          }}
                          onChange={(e) => handleChange(rowKey, "comments", e.target.value)}
                        />
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
