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
  getSiteDiaryRecords, getSiteDiarySchema,  saveSiteDiaryRecordsFromWeb,
  deleteSiteDiaryRecord, updateSiteDiaryRecord
} from "@/app/siteDiaryActions";
import { toast } from "sonner";
import { useMediaQuery } from "./use-media-querty";
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"


/* ---------- helpers ---------- */
const ADDITIONAL_WORKS_OPTION = { value: "__ADDITIONAL__", label: "Additional works" };

function collectWorks(node: any, prefix = "") {
  let options: { value: string; label: string }[] = [];
  if (node.type === "Work") {
    options.push({
      value: node.code,
      label: prefix ? `${prefix} / ${node.name}` : node.name
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
      console.log("[Diary][Schema] fetched:", s);
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
    id: undefined as string | undefined,     // ← never synthesize DB id
    _tempId: crypto.randomUUID(),            // ← client-only key
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

  const handleAddRow = () => {
    console.log("[Diary][AddRow]");
    setRows(prev => [...prev, newEmptyRow()]);
  };

  const handleDeleteRow = async (idOrTemp: string | undefined, tempId?: string) => {
    const row = rows.find(r => r.id === idOrTemp || r._tempId === tempId);
    console.log("[Diary][DeleteRow] target:", { idOrTemp, tempId, row });
    if (row?.id) {
      await deleteSiteDiaryRecord({ id: row.id }); // real Prisma id (string)
      console.log("[Diary][DeleteRow] deleted from DB:", row.id);
      toast.success("Record deleted!");
      onSaved?.();
    } else {
      setRows(prev => prev.filter(r => r._tempId !== (tempId ?? idOrTemp)));
    }
  };

  const handleChange = (rowIdOrTemp: string, field: string, value: any) => {
    console.log("[Diary][Change]", { rowIdOrTemp, field, value });
    setRows(prev =>
      prev.map(r =>
        (r.id === rowIdOrTemp || r._tempId === rowIdOrTemp) ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    console.log("[Diary][Submit] raw rows:", rows);

    // Global works list + Additional works
    const allWorkOptions = [
      ...((schema?.flatMap(root => collectWorks(root))) ?? []),
      ADDITIONAL_WORKS_OPTION,
    ];
    console.log("[Diary][Submit] allWorkOptions count:", allWorkOptions.length);

    const rowsToSave = rows.map(row => {
      const locationByCode = schema?.find(n => n.code === row.location_code);
      const locationByName = schema?.find(n => n.name === row.location);
      const locationNode = locationByCode || locationByName || null;

      const worksNode = allWorkOptions.find((opt: any) => opt.value === row.works_code);

      const resolved = {
        ...row,
        location: locationNode?.name || row.location,
        works: worksNode?.label || row.works,
      };

      console.log("[Diary][MapRow]", {
        rowId: row.id ?? row._tempId,
        location_code: row.location_code,
        location_before: row.location,
        location_resolved: resolved.location,
        works_code: row.works_code,
        works_before: row.works,
        works_resolved: resolved.works,
      });

      return resolved;
    });

    const isUUID = (id: unknown) =>
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    const existingRows = rowsToSave.filter(r => isUUID(r.id));
    const newRows      = rowsToSave.filter(r => !isUUID(r.id));

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
        WorkersInvolved: r.workers !== "" && r.workers !== undefined ? Number(r.workers) : undefined,
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
      const rowsSanitized = newRows.map(({ id: _omit, _tempId: _omit2, ...rest }) => rest);
      console.log("[Diary][CreateNew] payload:", { rows: rowsSanitized, siteId });
      try {
        const res = await saveSiteDiaryRecordsFromWeb({
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

      console.log("[Diary][Effect] loaded rows:", nextRows);

      setRows(nextRows);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [date, siteId]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[300px]">Loading…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-end gap-2 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-none">
          <Button 
          type="button"
           variant="outline" 
           onClick={handleAddRow} 
            className="w-full sm:w-auto active:scale-95 active:bg-muted transition-transform"
           >

          Add task
        </Button>
         <Button 
         type="submit" 
         className="w-full sm:w-auto active:scale-95 active:bg-primary/90 transition-transform"
         >
          Save diary
          </Button>
      </div>

        {isMobile ? (
      // Mobile card view
      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {rows.map((row) => {
  const rowKey = row.id ?? row._tempId;
  const locationOptions = schema?.filter(n => n.type === "Location") || [];
  const selectedLocationNode = schema?.find(n => n.code === row.location_code) || schema?.find(n => n.name === row.location);
  const dynamicWorkOptions = selectedLocationNode ? collectWorks(selectedLocationNode) : [];

  return (
    <div key={rowKey} className="border rounded-lg p-4 space-y-3 bg-card active:bg-muted/50 transition-colors">
      <div className="flex justify-between items-center">
        <div className="font-medium">
          {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "No date"}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeleteRow(row.id, row._tempId)}
          className="active:scale-90 active:bg-destructive/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Location</Label>
          <Select
            value={row.location_code || ""}
            onValueChange={(val) => handleChange(rowKey, "location_code", val)}
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

        <Collapsible>
          <CollapsibleTrigger className="w-full flex justify-between items-center py-2">
            <Label>Work Details</Label>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div>
              <Label>Works</Label>
              <Select
                value={row.works_code || ""}
                onValueChange={(val) => handleChange(rowKey, "works_code", val)}
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
                  <SelectItem value={ADDITIONAL_WORKS_OPTION.value}>
                    {ADDITIONAL_WORKS_OPTION.label}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Units</Label>
                <Input 
                  value={row.units}
                  onChange={(e) => handleChange(rowKey, "units", e.target.value)}
                />
              </div>
              <div>
                <Label>Amounts</Label>
                <Input 
                  inputMode="decimal"
                  value={row.amounts}
                  onChange={(e) => handleChange(rowKey, "amounts", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Workers</Label>
                <Input 
                  inputMode="numeric"
                  value={row.workers}
                  onChange={(e) => handleChange(rowKey, "workers", e.target.value)}
                />
              </div>
              <div>
                <Label>Hours</Label>
                <Input 
                  inputMode="decimal"
                  value={row.hours}
                  onChange={(e) => handleChange(rowKey, "hours", e.target.value)}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div>
          <Label>Comments</Label>
          <Textarea
            value={row.comments}
            onChange={(e) => handleChange(rowKey, "comments", e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
})}
      </div>
    ) : (




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

                  console.log("[Diary][RenderRow]", {
                    rowKey,
                    location_code: row.location_code,
                    location: row.location,
                    works_code: row.works_code,
                    works: row.works,
                    dynamicWorkOptions: dynamicWorkOptions.length
                  });

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
                          onValueChange={val => handleChange(row.id ?? row._tempId, "location_code", val)}
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
                          onValueChange={val => handleChange(row.id ?? row._tempId, "works_code", val)}
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
                            {/* Always last: Additional works */}
                            <SelectItem key={ADDITIONAL_WORKS_OPTION.value} value={ADDITIONAL_WORKS_OPTION.value}>
                              {ADDITIONAL_WORKS_OPTION.label}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input className="w-full text-center" value={row.units}
                               onChange={e => handleChange(row.id ?? row._tempId, "units", e.target.value)} />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input className="w-full text-center" inputMode="decimal" value={row.amounts}
                               onChange={e => handleChange(row.id ?? row._tempId, "amounts", e.target.value)} />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input className="w-full text-center" inputMode="numeric" value={row.workers}
                               onChange={e => handleChange(row.id ?? row._tempId, "workers", e.target.value)} />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Input className="w-full text-center" inputMode="decimal" value={row.hours}
                               onChange={e => handleChange(row.id ?? row._tempId, "hours", e.target.value)} />
                      </TableCell>

                      <TableCell className="py-2">
                        <Textarea className="w/full min-h-[72px]" value={row.comments}
                                  onChange={e => handleChange(row.id ?? row._tempId, "comments", e.target.value)} />
                      </TableCell>

                      <TableCell className="text-center py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => handleDeleteRow(row.id, row._tempId)}
                          className="active:scale-90 active:bg-destructive/20 transition-transform"
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

              )}
    </form>
  );
}