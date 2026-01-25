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
  getConfig,
} from "@/server/actions/site-diary-actions";
import { toast } from "sonner";
import { useMediaQuery } from "./Use-media-querty";
import { z } from "zod";
import defaultConfig from "./defaultConfig.json"
import GMCIRLmap from "./GMCIRLmap.json"


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


const validateRows = (rowsToValidate: any[]) => {
  const parsed = DiaryRowsSchema.safeParse(rowsToValidate);
  if (!parsed.success) {
    showZodErrorToast(parsed.error);
    return { ok: false as const, rows: null as any };
  }

  // extra numeric checks using your coercers, now with correct keys
  for (const r of rowsToValidate) {
    const key = r.id ?? r._tempId;

    const a = coerceOptionalFloat(r.Amounts);
    if (a !== undefined && Math.abs(a) > MAX_NUM) {
      toast.error(`Row ${key}: Amounts must be <= ${MAX_NUM}`);
      return { ok: false as const, rows: null as any };
    }

    const h = coerceOptionalFloat(r.TimeInvolved);
    if (h !== undefined && Math.abs(h) > MAX_NUM) {
      toast.error(`Row ${key}: Hours must be <= ${MAX_NUM}`);
      return { ok: false as const, rows: null as any };
    }

    const w = coerceOptionalInt(r.WorkersInvolved);
    if (w !== undefined && Math.abs(w) > MAX_NUM) {
      toast.error(`Row ${key}: Workers must be an integer <= ${MAX_NUM}`);
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
}: {
  date: Date | null;
  siteId: string | null;
  onSaved?: () => void;
}) {




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

  const handleAddRow = () => {

    setRows((prev) => [...prev, newEmptyRow()]);
  };

  const handleDeleteRow = async (idOrTemp: string | undefined, tempId?: string) => {
    const row = rows.find((r) => r.id === idOrTemp || r._tempId === tempId);

    if (row?.id) {
      await deleteSiteDiaryRecord({ id: row.id });

      toast.success("Record deleted!");
      onSaved?.();
    } else {
      setRows((prev) => prev.filter((r) => r._tempId !== (tempId ?? idOrTemp)));
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


    const validated = validateRows(rows);
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
      } catch (err: any) {
        toast.error(`Failed to update row ${r.id}: ${err?.message ?? "Unknown error"}`);
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
      } catch (err: any) {
        toast.error(`Failed to create rows: ${err?.message ?? "Unknown error"}`);
        return;
      }
    }


    toast.success("Records saved!");
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
          style={{ width: getCellWidthByKey(field, defaultMap) }}
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
          style={{ width: getCellWidthByKey(field, defaultMap) }}
          value={v.length >= 10 ? ymd : v}
          onChange={(e) => handleChange(rowKey, field, e.target.value)}
        />
      );
    }



























    // textInput
    if (type === "textInput") {
      return (
        <Textarea
          style={{ width: getCellWidthByKey(field, defaultMap) }}
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
          style={{ width: getCellWidthByKey(field, defaultMap) }}
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

      if (
        currentValue &&
        !options.some((opt) => opt.value === currentValue)
      ) {
        options.unshift({
          value: currentValue,
          label: currentValue,
        });
      }


      return (
        <Select
          value={currentValue}
          onValueChange={(val) => handleChange(rowKey, field, val)}
        >
          <SelectTrigger

            style={{ width: getCellWidthByKey(field, defaultMap) }}

          >
            <SelectValue placeholder={String(row[field] ?? "Select…")} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
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
                  {tableHeads.map((head) => (
                    <TableHead
                      key={head}
                      className="text-center whitespace-nowrap"
                    >
                      {getDisplayNameByKey(head)}
                    </TableHead>

                  )


                  )}

                  <TableHead className="text-center w-[150px]">Created by</TableHead>
                  <TableHead className="text-center w-[80px]">Delete</TableHead>
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
    </form>
  );
}