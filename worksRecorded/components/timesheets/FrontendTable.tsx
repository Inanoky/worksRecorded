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
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock3, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSiteSchema } from "../providers/SiteSchemaProvider";
import { Textarea } from "@/components/ui/textarea";
import { deleteTimeRecord, updateTimeRecord } from "@/server/actions/timesheets-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { getTimesheetsUiMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

type TableRecord = {
  id: string;
  date?: string;
  clockIn?: string;
  clockOut?: string;
  timeWorked?: number | string;
  location?: string;
  works?: string;
  workerName?: string;
  workerRole?: string;
};

type Worker = {
  id: string;
  name?: string;
  surname?: string;
};

function getColumnsFromData(data: TableRecord[], t: ReturnType<typeof getTimesheetsUiMessages>) {
  if (!data || data.length === 0) return [];

  const preferredOrder = [
    "date",
    "workerName",
    "workerRole",
    "clockIn",
    "clockOut",
    "timeWorked",
    "location",
    "works",
  ];

  return preferredOrder
    .filter((key) => key in (data[0] ?? {}))
    .map((key) => ({
      accessorKey: key,
      header:
        key === "clockIn"
          ? t.clockIn
          : key === "clockOut"
            ? t.clockOut
            : key === "timeWorked"
              ? t.hours
              : key === "workerName"
                ? t.worker
              : key === "workerRole"
                  ? t.role
                  : key === "date"
                    ? t.date
                    : key === "location"
                      ? t.location
                      : key === "works"
                        ? t.works
                  : key.charAt(0).toUpperCase() + key.slice(1),
    }));
}

const defaultGlobalFilterFn = (row: { original: Record<string, unknown> }, _columnId: string, filterValue: string) => {
  if (!filterValue) return true;
  const flatString = Object.values(row.original)
    .filter((v) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .join(" ")
    .toLowerCase();
  return flatString.includes(filterValue.toLowerCase());
};

const RowSchema = z.object({
  workerId: z.string().min(1, "Please select a worker."),
  date: z.date({ message: "Please select a valid date." }),
  clockIn: z.string().min(1, "Clock-in time is required."),
  clockOut: z.string().optional(),
  location: z.string().optional(),
  works: z.string().max(100, "Work notes must be 100 characters or fewer.").optional(),
});

type FrontendTableProps = {
  data?: TableRecord[];
  workers?: Worker[];
  siteId: string;
  pageSize: number;
  exportFileName?: string;
  organizationLanguage?: string | null;
};

type EditDraft = {
  id: string;
  workerId: string;
  date: Date | undefined;
  clockIn: string;
  clockOut: string;
  location: string;
  works: string;
};

function parseDisplayDate(value?: string) {
  if (!value) return undefined;
  const parts = value.split(".").map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 3) return undefined;
  const [day, month, year] = parts.map((part) => Number(part));
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDateTimeString(date: Date | undefined, time: string) {
  if (!date || !time) return undefined;
  const [hours = "0", minutes = "0", seconds = "0"] = time.split(":");
  const parsed = new Date(date);
  parsed.setHours(Number(hours), Number(minutes), Number(seconds), 0);
  return parsed.toISOString();
}

function getInitialDraft(record: TableRecord, workers: Worker[]): EditDraft {
  const matchingWorker = workers.find(
    (worker) => `${worker.name ?? ""} ${worker.surname ?? ""}`.trim() === (record.workerName ?? "").trim(),
  );

  return {
    id: record.id,
    workerId: matchingWorker?.id ?? workers[0]?.id ?? "",
    date: parseDisplayDate(record.date),
    clockIn: record.clockIn ?? "",
    clockOut: record.clockOut ?? "",
    location: record.location ?? "",
    works: record.works ?? "",
  };
}

export function FrontendTable({
  data = [],
  workers = [],
  siteId,
  pageSize,
  exportFileName = "table_data.xlsx",
  organizationLanguage,
}: FrontendTableProps) {
  const t = getTimesheetsUiMessages(normalizeOrganizationLanguage(organizationLanguage));
  const columns = React.useMemo(() => getColumnsFromData(data, t), [data, t]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [localData, setLocalData] = React.useState<TableRecord[]>(data);
  const [editDraft, setEditDraft] = React.useState<EditDraft | null>(null);
  const [recordToDelete, setRecordToDelete] = React.useState<TableRecord | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const router = useRouter();
  const { locations } = useSiteSchema();

  React.useEffect(() => {
    setLocalData(data);
  }, [data]);

  const table = useReactTable({
    data: localData,
    columns,
    state: { globalFilter },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: defaultGlobalFilterFn,
    initialState: { pagination: { pageSize } },
  });

  function exportToExcel() {
    const rows = table.getFilteredRowModel().rows.map((row) => row.original);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, exportFileName);
  }

  async function handleSave() {
    if (!editDraft) return;

    const parsed = RowSchema.safeParse(editDraft);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please correct the form.");
      return;
    }

    setIsSaving(true);
    try {
      const selectedWorker = workers.find((worker) => worker.id === editDraft.workerId);
      const clockIn = toDateTimeString(editDraft.date, editDraft.clockIn);
      const clockOut = editDraft.clockOut ? toDateTimeString(editDraft.date, editDraft.clockOut) : undefined;

      const result = await updateTimeRecord({
        id: editDraft.id,
        siteId,
        workerId: editDraft.workerId,
        date: editDraft.date?.toISOString(),
        clockIn,
        clockOut,
        location: editDraft.location,
        works: editDraft.works,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to update time record.");
        return;
      }

      setLocalData((prev) =>
        prev.map((row) =>
          row.id === editDraft.id
            ? {
                ...row,
                date: editDraft.date ? format(editDraft.date, "dd.MM.yyyy") : row.date,
                clockIn: editDraft.clockIn,
                clockOut: editDraft.clockOut,
                location: editDraft.location,
                works: editDraft.works,
                workerName: `${selectedWorker?.name ?? ""} ${selectedWorker?.surname ?? ""}`.trim(),
                timeWorked:
                  editDraft.clockIn && editDraft.clockOut
                    ? Math.round(
                        ((new Date(`1970-01-01T${editDraft.clockOut}`).getTime() -
                          new Date(`1970-01-01T${editDraft.clockIn}`).getTime()) /
                          3_600_000) *
                          100,
                      ) / 100
                    : "",
              }
            : row,
        ),
      );

      toast.success("Time record updated.");
      setEditDraft(null);
      router.refresh();
    } catch {
      toast.error("Failed to update time record.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!recordToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteTimeRecord(recordToDelete.id, siteId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete time record.");
        return;
      }

      setLocalData((prev) => prev.filter((row) => row.id !== recordToDelete.id));
      toast.success("Time record deleted.");
      setRecordToDelete(null);
      router.refresh();
    } catch {
      toast.error("Failed to delete time record.");
    } finally {
      setIsDeleting(false);
    }
  }

  function renderPagination() {
    const pageCount = table.getPageCount();
    const current = table.getState().pagination.pageIndex;
    const maxPages = 10;
    let start = 0;
    let end = Math.min(pageCount, maxPages);

    if (pageCount > maxPages && current > Math.floor(maxPages / 2)) {
      start = Math.max(0, Math.min(current - Math.floor(maxPages / 2), pageCount - maxPages));
      end = start + maxPages;
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
    if (cell.column.id === "workerRole" && cell.getValue()) {
      return <Badge variant="outline">{cell.getValue()}</Badge>;
    }

    if (cell.column.id === "timeWorked" && cell.getValue()) {
      return <span className="font-medium">{cell.getValue()} h</span>;
    }

    if (cell.column.id === "location" && cell.getValue()) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{cell.getValue()}</span>
        </div>
      );
    }

    return flexRender(cell.column.columnDef.cell, cell.getContext());
  }

  return (
    <>
      <div className="space-y-4">
        <div className="w-full overflow-hidden rounded-md border border-muted/60 bg-background">
          <div className="flex flex-col gap-2 border-b bg-muted/40 px-3 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-1 flex-col gap-2 md:flex-row md:items-center">
              <Input
                placeholder={t.searchDetailed}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-9 max-w-md text-sm"
              />
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={exportToExcel}>
                {t.exportToExcel}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t.rowActionsHint}</p>
          </div>

          <div className="border-b px-3 py-2 text-xs text-muted-foreground">
            {table.getFilteredRowModel().rows.length} of {localData.length} {t.resultsSummary}
          </div>

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
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && " 🔼"}
                        {header.column.getIsSorted() === "desc" && " 🔽"}
                      </TableHead>
                    ))}
                    <TableHead className="whitespace-nowrap text-xs font-medium"> {t.actions}</TableHead>
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.original.id} className="hover:bg-muted/40">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="max-w-[280px] whitespace-normal break-words text-xs align-top"
                        >
                          {renderCell(cell)}
                        </TableCell>
                      ))}
                      <TableCell className="w-12 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel> {t.actions}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditDraft(getInitialDraft(row.original, workers))}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRecordToDelete(row.original)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t.delete}
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
                      {t.noData}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end border-t bg-background px-3 py-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    {t.previous}
                  </PaginationPrevious>
                </PaginationItem>
                {renderPagination()}
                <PaginationItem>
                  <PaginationNext onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    {t.next}
                  </PaginationNext>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      <Dialog open={!!editDraft} onOpenChange={(open) => !open && setEditDraft(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.editTimeRecord}</DialogTitle>
            <DialogDescription>{t.editTimeRecordDescription}</DialogDescription>
          </DialogHeader>

          {editDraft && (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">{t.worker}</label>
                <Select
                  value={editDraft.workerId}
                  onValueChange={(value) => setEditDraft((prev) => (prev ? { ...prev, workerId: value } : prev))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectWorker} />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name} {worker.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.date}</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      <span>{editDraft.date ? format(editDraft.date, "dd.MM.yyyy") : t.selectDate}</span>
                      <CalendarIcon className="h-4 w-4 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editDraft.date}
                      captionLayout="dropdown"
                      onSelect={(value) => {
                        setEditDraft((prev) => (prev ? { ...prev, date: value } : prev));
                        setCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.location}</label>
                <Select
                  value={editDraft.location || "__none__"}
                  onValueChange={(value) =>
                    setEditDraft((prev) => (prev ? { ...prev, location: value === "__none__" ? "" : value } : prev))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectLocation} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No location</SelectItem>
                    {locations.map((location: string) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock3 className="h-4 w-4" /> {t.clockIn}
                </label>
                <Input
                  type="time"
                  step="1"
                  value={editDraft.clockIn}
                  onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, clockIn: e.target.value } : prev))}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock3 className="h-4 w-4" /> {t.clockOut}
                </label>
                <Input
                  type="time"
                  step="1"
                  value={editDraft.clockOut}
                  onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, clockOut: e.target.value } : prev))}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">{t.workNotes}</label>
                <Textarea
                  rows={5}
                  placeholder={t.workNotesPlaceholder}
                  value={editDraft.works}
                  maxLength={100}
                  onChange={(e) =>
                    setEditDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            works: e.target.value.slice(0, 100),
                          }
                        : prev,
                    )
                  }
                />
                <p className="text-right text-xs text-muted-foreground">{editDraft.works.length}/100</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDraft(null)} disabled={isSaving}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "..." : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTimeRecord}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteTimeRecordDescription} {recordToDelete?.workerName || t.thisWorker}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}> {t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "..." : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
