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

const DiaryRowSchema = z.object({
  amounts: z.coerce.number().finite().optional().or(z.literal("")),
  workers: z.coerce.number().int().optional().or(z.literal("")),
  hours: z.coerce.number().finite().optional().or(z.literal("")),
  comments: z.string().max(1500).optional().or(z.literal("")),
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    console.log("[Diary][Submit] raw rows:", rows);

    const parsed = DiaryRowsSchema.safeParse(rows);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    // Manual required checks
    for (const r of rows) {
      const key = r.id ?? r._tempId;

      if (r.location_mode === "manual") {
        const v = String(r.location_manual ?? "").trim();
        if (!v) {
          toast.error("Please type a location for manual entry.");
          console.log("[Diary][Submit] missing location_manual:", key);
          return;
        }
      } else {
        if (!String(r.location_code ?? "").trim() && !String(r.location ?? "").trim()) {
          toast.error("Please select a location.");
          console.log("[Diary][Submit] missing location selection:", key);
          return;
        }
      }

      if (r.works_mode === "manual") {
        const v = String(r.works_manual ?? "").trim();
        if (!v) {
          toast.error("Please type a work for manual entry.");
          console.log("[Diary][Submit] missing works_manual:", key);
          return;
        }
      } else {
        if (!String(r.works_code ?? "").trim() && !String(r.works ?? "").trim()) {
          toast.error("Please select a work.");
          console.log("[Diary][Submit] missing works selection:", key);
          return;
        }
      }
    }

    const allWorkOptions = [
      ...((schema?.flatMap((root) => collectWorks(root))) ?? []),
      ADDITIONAL_WORKS_OPTION,
      CLIENT_DELAY_OPTION,
      INTERNAL_DELAY_OPTION,
      NOTE_OPTION,
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
          : locationNode?.name || row.location;

      const resolvedWorks =
        row.works_mode === "manual"
          ? String(row.works_manual ?? "").trim()
          : worksNode?.label || row.works;

      const resolved = {
        ...row,
        location: resolvedLocation,
        works: resolvedWorks,
      };

      console.log("[Diary][MapRow]", {
        rowId: row.id ?? row._tempId,
        location_mode: row.location_mode,
        location_code: row.location_code,
        location_manual: row.location_manual,
        location_before: row.location,
        location_resolved: resolved.location,
        works_mode: row.works_mode,
        works_code: row.works_code,
        works_manual: row.works_manual,
        works_before: row.works,
        works_resolved: resolved.works,
      });

      return resolved;
    });

    const isUUID = (id: unknown) =>
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      );

    const existingRows = rowsToSave.filter((r) => isUUID(r.id));
    const newRows = rowsToSave.filter((r) => !isUUID(r.id));

    console.log("[Diary][Submit] split:", {
      existingCount: existingRows.length,
      newCount: newRows.length,
      existingRows,
      newRowsSample: newRows.slice(0, 3),
    });

    for (const r of existingRows) {
      const payload = {
        id: r.id,
        Date: r.date,
        Location: r.location,
        Works: r.works,
        Comments: r.comments,
        Units: r.units,
        Amounts: r.amounts !== "" && r.amounts !== undefined ? Number(r.amounts) : undefined,
        WorkersInvolved:
          r.workers !== "" && r.workers !== undefined ? Number(r.workers) : undefined,
        TimeInvolved: r.hours !== "" && r.hours !== undefined ? Number(r.hours) : undefined,
        Photos: [],
        userId: r.userId,
        siteId,
      };
      console.log("[Diary][UpdateExisting] payload:", payload);

      try {
        const res = await updateSiteDiaryRecord(payload);
        console.log("[Diary][UpdateExisting] result:", res);
      } catch (err) {
        console.error("[Diary][UpdateExisting] ERROR for id:", r.id, err);
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
        }) => rest
      );

      console.log("[Diary][CreateNew] payload:", { rows: rowsSanitized, siteId });
      try {
        const res = await saveSiteDiaryRecordFromWeb({
          rows: rowsSanitized,
          siteId,
        });
        console.log("[Diary][CreateNew] result:", res);
      } catch (err) {
        console.error("[Diary][CreateNew] ERROR:", err);
      }
    }

    toast.success("Records saved!");
    onSaved?.();
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!date || !siteId) {
      console.log("[Diary][Effect] missing date/siteId", { date, siteId });
      setRows([newEmptyRow()]);
      setLoading(false);
      return;
    }

    (async () => {
      const isoDate = typeof date === "string" ? date : date.toISOString();
      console.log("[Diary][Effect] loading rows for:", { siteId, isoDate });
      const loadedRows = await getSiteDiaryRecord({ siteId, date: isoDate });
      console.log(`this are loaded rows ${loadedRows}`);

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
          }))
        : [newEmptyRow()];

      console.log("[Diary][Effect] loaded rows:", nextRows);

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

                  console.log("[Diary][RenderRow]", {
                    rowKey,
                    location_mode: row.location_mode,
                    location_code: row.location_code,
                    location_manual: row.location_manual,
                    location: row.location,
                    works_mode: row.works_mode,
                    works_code: row.works_code,
                    works_manual: row.works_manual,
                    works: row.works,
                    dynamicWorkOptions: dynamicWorkOptions.length,
                  });

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
