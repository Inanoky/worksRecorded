"use client";

import React, { useEffect, useState } from "react";
import {
  Table, TableBody, TableHead, TableHeader, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  getSiteDiaryRecord, getSiteDiarySchema, saveSiteDiaryRecordFromWeb,
  deleteSiteDiaryRecord, updateSiteDiaryRecord
} from "@/server/actions/site-diary-actions";
import { toast } from "sonner";
import { useMediaQuery } from "./Use-media-querty";
import { z } from "zod";

/* ---------- helpers ---------- */
const ADDITIONAL_WORKS_OPTION = { value: "__ADDITIONAL__", label: "Additional works" };
const CLIENT_DELAY_OPTION     = { value: "__clientDelay__", label: "Client Delay (hindrance)" };
const INTERNAL_DELAY_OPTION   = { value: "__internalDelay__", label: "Internal Delay" };
const NOTE_OPTION             = { value: "__note__", label: "Note" };

const allowedUnits = [
  "m", "m2", "m3", "tn", "kg",
  "pcs", "package", "project",
  "hour", "set", "minute", "lifts",
] as const;

const DiaryRowSchema = z.object({
  amounts: z.union([z.string(), z.number()]).optional().refine(
    (val) => val === "" || !isNaN(Number(val)),
    { message: "Amounts must be a number" }
  ),
  workers: z.union([z.string(), z.number()]).optional().refine(
    (val) => val === "" || Number.isInteger(Number(val)),
    { message: "Workers must be an integer" }
  ),
  hours: z.union([z.string(), z.number()]).optional().refine(
    (val) => val === "" || !isNaN(Number(val)),
    { message: "Hours must be a number" }
  ),
  comments: z.string().max(1500, "Comments must be 1500 characters or fewer").optional(),
  units: z.enum(allowedUnits).optional(),
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
        collectWorks(child, node.type === "Work" ? (prefix ? `${prefix} / ${node.name}` : node.name) : prefix)
      );
    }
  }
  return options;
}

export function useSiteSchema(siteId: string | null) {
  const [schema, setSchema] = useState<any[] | null>(null);
  useEffect(() => {
    if (!siteId) { setSchema(null); return; }
    getSiteDiarySchema({ siteId }).then((s) => setSchema(s));
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
  });

  const [rows, setRows] = useState<any[]>([newEmptyRow()]);

  const handleAddRow = () => setRows((p) => [...p, newEmptyRow()]);

  const handleDeleteRow = async (idOrTemp?: string, tempId?: string) => {
    const row = rows.find(r => r.id === idOrTemp || r._tempId === tempId);
    if (row?.id) {
      await deleteSiteDiaryRecord({ id: row.id });
      toast.success("Record deleted!");
      onSaved?.();
    } else {
      setRows(prev => prev.filter(r => r._tempId !== (tempId ?? idOrTemp)));
    }
  };

  const handleChange = (rowIdOrTemp: string, field: string, value: any) => {
    setRows(prev => prev.map(r => (r.id === rowIdOrTemp || r._tempId === rowIdOrTemp) ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const parsed = DiaryRowsSchema.safeParse(rows);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    const allWorkOptions = [
      ...((schema?.flatMap(root => collectWorks(root))) ?? []),
      ADDITIONAL_WORKS_OPTION,
      CLIENT_DELAY_OPTION,
      INTERNAL_DELAY_OPTION,
      NOTE_OPTION,
    ];

    const rowsToSave = rows.map(row => {
      const locationByCode = schema?.find(n => n.code === row.location_code);
      const locationByName = schema?.find(n => n.name === row.location);
      const locationNode = locationByCode || locationByName || null;
      const worksNode = allWorkOptions.find((opt: any) => opt.value === row.works_code);

      return {
        ...row,
        location: locationNode?.name || row.location,
        works: worksNode?.label || row.works,
      };
    });

    const isUUID = (id: unknown) =>
      typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    const existingRows = rowsToSave.filter(r => isUUID(r.id));
    const newRows = rowsToSave.filter(r => !isUUID(r.id));

    for (const r of existingRows) {
      const payload = {
        id: r.id,
        Date: r.date,
        Location: r.location,
        Works: r.works,
        Comments: r.comments,
        Units: r.units,
        Amounts: r.amounts !== "" && r.amounts !== undefined ? Number(r.amounts) : undefined,
        WorkersInvolved: r.workers !== "" && r.workers !== undefined ? Number(r.workers) : undefined,
        TimeInvolved: r.hours !== "" && r.hours !== undefined ? Number(r.hours) : undefined,
        Photos: [],
        userId: r.userId,
        siteId,
      };
      try { await updateSiteDiaryRecord(payload); } catch {}
    }

    if (newRows.length) {
      const rowsSanitized = newRows.map(({ id: _1, _tempId: _2, ...rest }) => rest);
      try { await saveSiteDiaryRecordFromWeb({ rows: rowsSanitized, siteId }); } catch {}
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
          }))
        : [newEmptyRow()];

      setRows(nextRows);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [date, siteId]);

  if (loading) {
    return <div className="flex min-h-[300px] items-center justify-center">Loading…</div>;
  }

  /* ---------------- RENDER ---------------- */

  const TopBar = (
    <div className="sticky top-0 z-20 flex flex-col gap-2 bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:flex-row sm:items-center sm:justify-end">
      <Button type="button" variant="outline" onClick={handleAddRow} className="w-full sm:w-auto">
        Add task
      </Button>
      <Button type="submit" className="w-full sm:w-auto">
        Save diary
      </Button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {TopBar}

      {/* ===== MOBILE: editable cards ===== */}
      <div className="grid gap-3 sm:hidden">
        {rows.map((row) => {
          const locationOptions = schema?.filter(n => n.type === "Location") || [];
          const selectedLocationNode =
            schema?.find(n => n.code === row.location_code) ||
            schema?.find(n => n.name === row.location);
          const dynamicWorkOptions = selectedLocationNode ? collectWorks(selectedLocationNode) : [];
          const rowKey = row.id ?? row._tempId;

          return (
            <div key={rowKey} className="rounded-lg border p-3">
              <div className="mb-2 text-xs text-muted-foreground">
                {row.date
                  ? new Date(row.date).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
                  : "No date"}
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* Location */}
                <div>
                  <div className="mb-1 text-xs font-medium">Location</div>
                  <Select
                    value={row.location_code || ""}
                    onValueChange={val => handleChange(rowKey, "location_code", val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={row.location || "Select location"} />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((loc: any) => (
                        <SelectItem key={loc.code} value={loc.code}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Works */}
                <div>
                  <div className="mb-1 text-xs font-medium">Works</div>
                  <Select
                    value={row.works_code || ""}
                    onValueChange={val => handleChange(rowKey, "works_code", val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={row.works || "Select work"} />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicWorkOptions.map((opt: any) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={ADDITIONAL_WORKS_OPTION.value}>{ADDITIONAL_WORKS_OPTION.label}</SelectItem>
                      <SelectItem value={CLIENT_DELAY_OPTION.value}>{CLIENT_DELAY_OPTION.label}</SelectItem>
                      <SelectItem value={INTERNAL_DELAY_OPTION.value}>{INTERNAL_DELAY_OPTION.label}</SelectItem>
                      <SelectItem value={NOTE_OPTION.value}>{NOTE_OPTION.label}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Units / Amounts / Workers / Hours */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-xs font-medium">Units</div>
                    <Select value={row.units || ""} onValueChange={(v) => handleChange(rowKey, "units", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Units" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedUnits.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium">Amounts</div>
                    <Input inputMode="decimal" value={row.amounts}
                      onChange={(e) => handleChange(rowKey, "amounts", e.target.value)} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium">Workers</div>
                    <Input inputMode="numeric" value={row.workers}
                      onChange={(e) => handleChange(rowKey, "workers", e.target.value)} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium">Hours</div>
                    <Input inputMode="decimal" value={row.hours}
                      onChange={(e) => handleChange(rowKey, "hours", e.target.value)} />
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <div className="mb-1 text-xs font-medium">Comments</div>
                  <Textarea
                    rows={1}
                    className="w-full resize-y overflow-x-hidden"
                    value={row.comments ?? ""}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = `${t.scrollHeight}px`;
                    }}
                    onChange={(e) => handleChange(rowKey, "comments", e.target.value)}
                  />
                </div>

                {/* Delete */}
                <div className="flex justify-end">
                  <Button variant="ghost" size="icon" type="button" onClick={() => handleDeleteRow(row.id, row._tempId)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== DESKTOP: table ===== */}
      <ScrollArea className="hidden h-[35vh] rounded-none border sm:block">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Works</TableHead>
                  <TableHead className="w-[110px] text-center">Units</TableHead>
                  <TableHead className="w-[120px] text-center">Amounts</TableHead>
                  <TableHead className="w-[120px] text-center">Workers</TableHead>
                  <TableHead className="w-[110px] text-center">Hours</TableHead>
                  <TableHead className="min-w-[480px] text-center">Comments</TableHead>
                  <TableHead className="w-[80px] text-center">Delete</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const locationOptions = schema?.filter(n => n.type === "Location") || [];
                  const selectedLocationNode =
                    schema?.find(n => n.code === row.location_code) ||
                    schema?.find(n => n.name === row.location);
                  const dynamicWorkOptions = selectedLocationNode ? collectWorks(selectedLocationNode) : [];
                  const rowKey = row.id ?? row._tempId;

                  return (
                    <TableRow key={rowKey} className="align-top">
                      <TableCell className="py-3 text-muted-foreground">
                        {row.date
                          ? new Date(row.date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
                          : "No date"}
                      </TableCell>

                      <TableCell className="py-2">
                        <Select
                          value={row.location_code || ""}
                          onValueChange={val => handleChange(rowKey, "location_code", val)}
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
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="py-2">
                        <Select
                          value={row.works_code || ""}
                          onValueChange={val => handleChange(rowKey, "works_code", val)}
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
                            <SelectItem value={ADDITIONAL_WORKS_OPTION.value}>{ADDITIONAL_WORKS_OPTION.label}</SelectItem>
                            <SelectItem value={CLIENT_DELAY_OPTION.value}>{CLIENT_DELAY_OPTION.label}</SelectItem>
                            <SelectItem value={INTERNAL_DELAY_OPTION.value}>{INTERNAL_DELAY_OPTION.label}</SelectItem>
                            <SelectItem value={NOTE_OPTION.value}>{NOTE_OPTION.label}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="py-2 text-center">
                        <Select value={row.units || ""} onValueChange={(v) => handleChange(rowKey, "units", v)}>
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

                      <TableCell className="py-2 text-center">
                        <Input className="w-full text-center" inputMode="decimal" value={row.amounts}
                               onChange={e => handleChange(rowKey, "amounts", e.target.value)} />
                      </TableCell>

                      <TableCell className="py-2 text-center">
                        <Input className="w-full text-center" inputMode="numeric" value={row.workers}
                               onChange={e => handleChange(rowKey, "workers", e.target.value)} />
                      </TableCell>

                      <TableCell className="py-2 text-center">
                        <Input className="w-full text-center" inputMode="decimal" value={row.hours}
                               onChange={e => handleChange(rowKey, "hours", e.target.value)} />
                      </TableCell>

                      <TableCell className="py-2 text-center">
                        <Textarea
                          rows={1}
                          className="w-full min-h-0 max-w-full resize-y overflow-x-hidden"
                          value={row.comments ?? ""}
                          onInput={(e) => {
                            const t = e.currentTarget;
                            t.style.height = "auto";
                            t.style.height = `${t.scrollHeight}px`;
                          }}
                          onChange={(e) => handleChange(rowKey, "comments", e.target.value)}
                        />
                      </TableCell>

                      <TableCell className="py-2 text-center">
                        <Button variant="ghost" size="icon" type="button" onClick={() => handleDeleteRow(row.id, row._tempId)}>
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
