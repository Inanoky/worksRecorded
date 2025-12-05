"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSiteSchema } from "../providers/SiteSchemaProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ChevronDownIcon, MoreHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { editTimeRecord } from "@/server/actions/timesheets-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubmitButton } from "@/components/dashboard/SubmitButtons";
import { useProject } from "../providers/ProjectProvider";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { z } from "zod";
import { toast } from "sonner";

function getColumnsFromData(data: any[]) {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0])
    .filter((k) => k !== "id")
    .map((key) => ({
      accessorKey: key,
      header: key.charAt(0).toUpperCase() + key.slice(1),
    }));
}

const defaultGlobalFilterFn = (row: any, _columnId: string, filterValue: string) => {
  if (!filterValue) return true;
  const flatString = Object.values(row.original)
    .filter(
      (v) =>
        typeof v === "string" || typeof v === "number" || typeof v === "boolean",
    )
    .join(" ")
    .toLowerCase();
  return flatString.includes(filterValue.toLowerCase());
};

type FrontendTableProps = {
  data?: any[];
  workers?: any[];
  pageSize: number;
  exportFileName?: string;
};

export function FrontendTable({
  data = [],
  workers = [],
  pageSize,
  exportFileName = "table_data.xlsx",
}: FrontendTableProps) {
  const columns = React.useMemo(() => getColumnsFromData(data), [data]);

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});
  const [anyChanges, setAnyChanges] = React.useState(false);
  const [editRowId, setEditRowId] = React.useState<string | null>(null);
  const [rowsToSave, setRowsToSave] = React.useState<any[]>([]);
  const { projectId: siteId } = useProject();
  const [result, action] = useActionState(editTimeRecord, undefined);
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(undefined);

  const router = useRouter();
  const patch = editRowId ? rowsToSave[Object.keys(rowsToSave)[0]] : undefined;

  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  const ZodRowSchema = z.object({
    works: z.string().max(200, "Comments must be 200 characters or fewer").optional(),
  });

  React.useEffect(() => {
    if (result?.success) {
      setAnyChanges(false);
      setRowsToSave({});
      setEditRowId(null);
    }
  }, [result]);

  React.useEffect(() => {
    function onDocPointerDown(e: MouseEvent | PointerEvent | TouchEvent) {
      const root = wrapperRef.current;
      if (!root) return;

      const target = e.target as Element | null;
      if (!target) return;

      const clickedInside = root.contains(target);
      const inRadixPortal =
        target.closest("[data-radix-portal]") ||
        target.closest("[data-radix-popper-content]") ||
        target.closest("[data-radix-popper-content-wrapper]");

      if (!clickedInside && !inRadixPortal) {
        const dirty = anyChanges;
        if (dirty && !window.confirm("You have unsaved changes. Discard them?")) {
          return;
        }

        setRowsToSave({});
        setEditRowId(null);
        setAnyChanges(false);
      }
    }

    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [anyChanges, editRowId, rowsToSave]);

  function handleChange(rowId: string, field: string, value: any) {
    setRowsToSave((prev: any) => {
      const row = prev[rowId] ?? {};
      return { ...prev, [rowId]: { ...row, [field]: value } };
    });
  }

  function exportToExcel() {
    const rows = table.getFilteredRowModel().rows.map((row) => row.original);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, exportFileName);
  }

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, rowSelection },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: defaultGlobalFilterFn,
    initialState: { pagination: { pageSize } },
  });

  const { locations, works } = useSiteSchema();

  function renderPagination() {
    const pageCount = table.getPageCount();
    const current = table.getState().pagination.pageIndex;
    const maxPages = 10;
    let start = 0;
    let end = Math.min(pageCount, maxPages);

    if (pageCount > maxPages) {
      if (current > Math.floor(maxPages / 2)) {
        start = Math.max(
          0,
          Math.min(current - Math.floor(maxPages / 2), pageCount - maxPages),
        );
        end = start + maxPages;
      }
    }
    const items = Array.from({ length: end - start }, (_, i) => {
      const pageIdx = start + i;
      return (
        <PaginationItem key={pageIdx}>
          <PaginationLink
            isActive={table.getState().pagination.pageIndex === pageIdx}
            onClick={() => table.setPageIndex(pageIdx)}
          >
            {pageIdx + 1}
          </PaginationLink>
        </PaginationItem>
      );
    });

    if (end < pageCount) {
      items.push(
        <PaginationItem key="ellipsis">
          <span className="px-2 select-none text-muted-foreground">…</span>
        </PaginationItem>,
      );
    }
    return items;
  }

  function renderCell(cell: any) {
    if (editRowId === cell.row.id) {
      if (cell.column.id === "works")
        return (
          <Textarea
            placeholder={cell.getValue()}
            className="resize-none text-sm"
            onChange={(e) => {
              setAnyChanges(true);
              handleChange(cell.row.original.id, "works", e.currentTarget.value);
            }}
          />
        );

      if (cell.column.id === "clockIn" || cell.column.id === "clockOut")
        return (
          <Input
            type="time"
            step="1"
            defaultValue={cell.getValue()}
            onChange={(e) => {
              setAnyChanges(true);
              handleChange(cell.row.original.id, cell.column.id, e.currentTarget.value);
            }}
            className="bg-background"
          />
        );

      if (cell.column.id === "location") {
        const rowId = cell.row.original.id;
        const current = String(
          rowsToSave[rowId]?.location ?? cell.getValue() ?? "",
        );

        return (
          <Select
            defaultValue={current}
            onValueChange={(v) => {
              setAnyChanges(true);
              handleChange(cell.row.original.id, "location", v);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={cell.getValue()} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc: string) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      if (cell.column.id === "date")
        return (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="date"
                className="w-48 justify-between font-normal"
              >
                <span>
                  {date
                    ? date
                        .toLocaleDateString("lv-LV", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                        .replace(/\.$/, "")
                    : cell.getValue()}
                </span>
                <CalendarIcon className="h-4 w-4 opacity-70" />
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
                  handleChange(cell.row.original.id, "date", d);
                }}
              />
            </PopoverContent>
          </Popover>
        );

      if (cell.column.id === "workerName") {
        return (
          <Select
            onValueChange={(v) => {
              setAnyChanges(true);
              handleChange(cell.row.original.id, "workerId", v);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={cell.getValue()} />
            </SelectTrigger>
            <SelectContent>
              {workers.map((worker: any) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name} {worker.surname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    }

    return flexRender(cell.column.columnDef.cell, cell.getContext());
  }

  return (
    <form
      action={async (fd) => {
        fd.set("id", Object.keys(rowsToSave)[0] ?? "");
        fd.set("siteId", siteId);

        if (patch?.works) {
          const parsed = ZodRowSchema.safeParse({ works: patch?.works });
          if (!parsed.success) {
            toast.error(parsed.error.errors[0].message);
            return;
          }
        }

        if (patch?.works != null) fd.set("works", String(patch.works));
        if (patch?.location != null) fd.set("location", String(patch.location));
        if (patch?.clockIn != null) fd.set("clockIn", String(patch.clockIn));
        if (patch?.clockOut != null) fd.set("clockOut", String(patch.clockOut));
        if (patch?.date != null) fd.set("date", String(patch.date));
        if (patch?.workerId != null) fd.set("workerId", String(patch.workerId));

        action(fd);
      }}
    >
      <div
        ref={wrapperRef}
        className="w-full overflow-hidden rounded-md border border-muted/60 bg-background"
      >
        {/* Toolbar */}
        <div className="flex flex-col gap-2 border-b bg-muted/40 px-3 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-1 items-center gap-2">
            <Input
              placeholder="Search records..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-8 max-w-sm text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={exportToExcel}
            >
              Export to Excel
            </Button>
          </div>

          {anyChanges && (
            <div className="flex justify-end">
              <SubmitButton text="Save changes" className="h-8 px-3 text-xs" />
            </div>
          )}
        </div>

        {/* Info row */}
        <div className="border-b px-3 py-2 text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {data.length} results
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler?.()}
                      className="cursor-pointer select-none whitespace-nowrap text-xs font-medium"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() === "asc" && " 🔼"}
                      {header.column.getIsSorted() === "desc" && " 🔽"}
                    </TableHead>
                  ))}
                  <TableHead className="whitespace-nowrap text-xs font-medium">
                    Edit
                  </TableHead>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="whitespace-normal break-words text-xs align-top"
                      >
                        {renderCell(cell)}
                      </TableCell>
                    ))}
                    <TableCell className="w-12 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditRowId(row.id)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No data found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex justify-end border-t bg-background px-3 py-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                />
              </PaginationItem>
              {renderPagination()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </form>
  );
}
