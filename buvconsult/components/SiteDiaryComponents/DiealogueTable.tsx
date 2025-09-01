"use client";

import React, { useEffect, useState } from "react";
import {
  Table, TableBody, TableHead, TableHeader, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Trash2, AlertCircle, ChevronDown } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  getSiteDiaryRecords, getSiteDiarySchema,
  saveSiteDiaryRecordsFromWeb, deleteSiteDiaryRecord, updateSiteDiaryRecord
} from "@/app/actions/siteDiaryActions";
import { toast } from "sonner";
import { useMediaQuery } from "./use-media-querty";
import { Label } from "@/components/ui/label";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { z } from "zod";

/* ---------- helpers ---------- */
const ADDITIONAL_WORKS_OPTION = { value: "__ADDITIONAL__", label: "Additional works" };
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
  comments: z.string().max(200, "Comments must be 200 characters or fewer").optional(),
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
        collectWorks(
          child,
          node.type === "Work" ? (prefix ? `${prefix} / ${node.name}` : node.name) : prefix
        )
      );
    }
  }
  return options;
}

export function useSiteSchema(siteId: string | null) {
  const [schema, setSchema] = useState<any[] | null>(null);
  useEffect(() => {
    if (!siteId) { setSchema(null); return; }
    getSiteDiarySchema({ siteId }).then((s) => {
      setSchema(s);
    });
  }, [siteId]);
  return schema;
}

/* ---------- component ---------- */
export function DialogTable({ date, siteId, onSaved }: {
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

  const handleAddRow = () => setRows(prev => [...prev, newEmptyRow()]);

  const handleDeleteRow = async (idOrTemp: string | undefined, tempId?: string) => {
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
    setRows(prev =>
      prev.map(r =>
        (r.id === rowIdOrTemp || r._tempId === rowIdOrTemp) ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // ✅ Validate before saving
    const parsed = DiaryRowsSchema.safeParse(rows);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    // ... your save logic here (same as before, using parsed.data instead of rows)

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
      const loadedRows = await getSiteDiaryRecords({ siteId, date: isoDate });
      if (cancelled) return;

      const nextRows =
        loadedRows.length
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
    return <div className="flex justify-center items-center min-h-[300px]">Loading…</div>;
  }

  if (!loading && !schema) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Alert
          variant="destructive"
          className="max-w-md w-full flex items-center justify-center gap-2 p-4 whitespace-nowrap"
        >
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="font-semibold">Error:</span>
          <span>
            Please upload project schema in the&nbsp;
            <Link
              href={`/dashboard/sites/${siteId}/settings`}
              className="underline font-medium text-red-700 hover:text-red-900"
            >
              Settings
            </Link>
            &nbsp;menu.
          </span>
        </Alert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-end gap-2 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-none">
        <Button type="button" variant="outline" onClick={handleAddRow}>
          Add task
        </Button>
        <Button type="submit">Save diary</Button>
      </div>

      <ScrollArea className="h-[25vh] sm:h-[35vh] rounded-none border">
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
                  <TableHead className="text-center w-[80px]">Delete</TableHead>
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
                      <TableCell>{row.date ? new Date(row.date).toLocaleDateString("en-GB") : "No date"}</TableCell>

                      <TableCell>
                        <Select
                          value={row.location_code || ""}
                          onValueChange={(val) => handleChange(rowKey, "location_code", val)}
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

                      <TableCell>
                        <Select
                          value={row.works_code || ""}
                          onValueChange={(val) => handleChange(rowKey, "works_code", val)}
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
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
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

                      <TableCell>
                        <Input className="w-full text-center" inputMode="decimal"
                               value={row.amounts}
                               onChange={(e) => handleChange(rowKey, "amounts", e.target.value)} />
                      </TableCell>

                      <TableCell>
                        <Input className="w-full text-center" inputMode="numeric"
                               value={row.workers}
                               onChange={(e) => handleChange(rowKey, "workers", e.target.value)} />
                      </TableCell>

                      <TableCell>
                        <Input className="w-full text-center" inputMode="decimal"
                               value={row.hours}
                               onChange={(e) => handleChange(rowKey, "hours", e.target.value)} />
                      </TableCell>

                      <TableCell>
                        <Textarea className="w/full min-h-[72px]"
                                  value={row.comments}
                                  onChange={(e) => handleChange(rowKey, "comments", e.target.value)} />
                      </TableCell>

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
