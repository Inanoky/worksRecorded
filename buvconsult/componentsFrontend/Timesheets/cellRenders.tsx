"use client";
import * as React from "react";
import { flexRender } from "@tanstack/react-table";
import { Input } from "@/componentsFrontend/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/componentsFrontend/ui/select";
import { Textarea } from "@/componentsFrontend/ui/textarea";
import { Button } from "@/componentsFrontend/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/componentsFrontend/ui/popover";
import { Calendar } from "@/componentsFrontend/ui/calendar";
import { ChevronDownIcon } from "lucide-react";

export type WorkerOpt = { id: string; name: string; surname: string };

export type RenderCellCtx<T extends { [k: string]: any }> = {
  editRowId: string | null;
  rowsToSave: Record<string, Partial<T>>;
  setAnyChanges: (v: boolean) => void;
  handleChange: (rowId: string, field: keyof T & string, value: any) => void;

  // optional UI state you want to share
  date: Date | undefined;
  open: boolean;
  setDate: (d: Date | undefined) => void;
  setOpen: (b: boolean) => void;

  // domain options (inject whatever your app needs)
  locations?: string[];
  workers?: WorkerOpt[];
};

export type RenderCellFn<T extends { [k: string]: any }> = (
  cell: any,
  ctx: RenderCellCtx<T>
) => React.ReactNode;

/** Default renderer that reproduces your current behavior. */
export const defaultRenderCell = <T extends { [k: string]: any }>(
  cell: any,
  ctx: RenderCellCtx<T>
) => {
  const { editRowId, setAnyChanges, handleChange, locations = [], workers = [], open, setOpen, date, setDate } = ctx;

  if (editRowId === cell.row.id) {
    // works textarea
    if (cell.column.id === "works") {
      return (
        <Textarea
          placeholder={cell.getValue()}
          className="text-pretty field-sizing-fixed"
          onChange={(e) => {
            setAnyChanges(true);
            handleChange(cell.row.original.id, "works" as any, e.currentTarget.value);
          }}
        />
      );
    }

    // time inputs
    if (cell.column.id === "clockIn" || cell.column.id === "clockOut") {
      const field = cell.column.id as "clockIn" | "clockOut";
      return (
        <Input
          type="time"
          step="1"
          defaultValue={cell.getValue()}
          onChange={(e) => {
            setAnyChanges(true);
            handleChange(cell.row.original.id, field as any, e.currentTarget.value);
          }}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      );
    }

    // location select
    if (cell.column.id === "location") {
      return (
        <Select
          onValueChange={(v) => {
            setAnyChanges(true);
            handleChange(cell.row.original.id, "location" as any, v);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={cell.getValue()} />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // date popover
    if (cell.column.id === "date") {
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" id="date" className="w-48 justify-between font-normal">
              {date
                ? date
                    .toLocaleDateString("lv-LV", { day: "2-digit", month: "2-digit", year: "numeric" })
                    .replace(/\.$/, "")
                : cell.getValue()}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={(d) => {
                setDate(d);
                setOpen(false);
                setAnyChanges(true);
                handleChange(cell.row.original.id, "date" as any, d);
              }}
            />
          </PopoverContent>
        </Popover>
      );
    }

    // worker select (writes workerId)
    if (cell.column.id === "workerName") {
      return (
        <Select
          onValueChange={(v) => {
            setAnyChanges(true);
            handleChange(cell.row.original.id, "workerId" as any, v);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={cell.getValue()} />
          </SelectTrigger>
          <SelectContent>
            {(workers ?? []).map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name} {w.surname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  }

  // default read-mode
  return flexRender(cell.column.columnDef.cell, cell.getContext());
};
