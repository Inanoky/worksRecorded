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
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area";
import {
  getSiteDiaryRecords, getSiteDiarySchema, saveSiteDiaryRecords,
  deleteSiteDiaryRecord, updateSiteDiaryRecord
} from "@/app/siteDiaryActions";
import { toast } from "sonner";

/* ---------- helpers ---------- */
function collectWorks(node: any, prefix = "") {
  let options: { value: string; label: string }[] = [];
  if (node.type === "Work") {
    options.push({ value: node.code, label: prefix ? `${prefix} / ${node.name}` : node.name });
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
    getSiteDiarySchema({ siteId }).then(setSchema);
  }, [siteId]);
  return schema;
}

/* ---------- component ---------- */
export function DialogTable({ date, siteId, onSaved }: {
  date: Date | null;
  siteId: string | null;
  onSaved?: () => void;
}) {
  const schema = useSiteSchema(siteId);
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<any[]>([
    {
      id: Date.now(),
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
    },
  ]);

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        id: Date.now(),
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
      },
    ]);
  };

  const handleDeleteRow = async (id: any) => {
    const row = rows.find(r => r.id === id);
    if (row && typeof id === "string" && id.length > 10) {
      await deleteSiteDiaryRecord({ id });
      toast.success("Record deleted!");
      onSaved?.();
    } else {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const handleChange = (id: any, field: string, value: any) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const rowsToSave = rows.map(row => {
      const locationNode = schema?.find(n => n.code === row.location_code);
      const selectedLocation = schema?.find(n => n.code === row.location_code);
      const dynamicWorkOptions = selectedLocation ? collectWorks(selectedLocation) : [];
      const worksNode = dynamicWorkOptions.find((opt: any) => opt.value === row.works_code);
      return {
        ...row,
        location: locationNode?.name || row.location,
        works: worksNode?.label || row.works,
      };
    });

    const newRows = rowsToSave.filter(r => !r.id);
    const existingRows = rowsToSave.filter(r => !!r.id);

    for (const r of existingRows) {
      await updateSiteDiaryRecord({
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
      });
    }

    if (newRows.length) {
      await saveSiteDiaryRecords({
        rows: newRows,
        userId: "your-user-id", // TODO: real user id
        siteId,
      });
    }

    toast.success("Records saved!");
    onSaved?.();
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!date || !siteId) {
      setRows([]);
      setLoading(false);
      return;
    }

    (async () => {
      const isoDate = typeof date === "string" ? date : date.toISOString();
      const loadedRows = await getSiteDiaryRecords({ siteId, date: isoDate });
      if (cancelled) return;

      setRows(
        loadedRows.length
          ? loadedRows.map((row: any) => ({
              ...row,
              id: row.id || Date.now() + Math.random(),
              location_code: "",
              works_code: "",
            }))
          : [{
              id: Date.now(),
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
            }]
      );
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [date, siteId]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[300px]">Loading…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Top actions (sticky) */}
      <div className="flex justify-end gap-2 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-none">
        <Button type="button" variant="outline" onClick={handleAddRow}>
          Add task
        </Button>
        <Button type="submit">Save diary</Button>
      </div>

      {/* Just ScrollArea (no Card) */}
      <ScrollArea className="h-[25vh] rounded-none border">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
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

                  return (
                    <TableRow key={row.id} className="align-top">
                      <TableCell className="py-3 text-muted-foreground">
                        {row.date
                          ? new Date(row.date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
                          : "No date"}
                      </TableCell>

                      <TableCell className="py-2">
                        <Select
                          value={row.location_code || ""}
                          onValueChange={val => handleChange(row.id, "location_code", val)}
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
                          onValueChange={val => handleChange(row.id, "works_code", val)}
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
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input className="w-full text-center" value={row.units}
                               onChange={e => handleChange(row.id, "units", e.target.value)} />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input className="w-full text-center" inputMode="decimal" value={row.amounts}
                               onChange={e => handleChange(row.id, "amounts", e.target.value)} />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input className="w-full text-center" inputMode="numeric" value={row.workers}
                               onChange={e => handleChange(row.id, "workers", e.target.value)} />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input className="w-full text-center" inputMode="decimal" value={row.hours}
                               onChange={e => handleChange(row.id, "hours", e.target.value)} />
                      </TableCell>

                      <TableCell className="py-2">
                        <Textarea className="w-full min-h-[72px]" value={row.comments}
                                  onChange={e => handleChange(row.id, "comments", e.target.value)} />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Button variant="ghost" size="icon" type="button" onClick={() => handleDeleteRow(row.id)}>
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
