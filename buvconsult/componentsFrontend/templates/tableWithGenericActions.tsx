// components/templates/GenericTemplateTable.tsx
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
import { Button } from "@/componentsFrontend/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentsFrontend/ui/table";
import { Input } from "@/componentsFrontend/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/componentsFrontend/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/componentsFrontend/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/componentsFrontend/ui/dialog";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { genericTableAction } from "@/app/actions/GenericActions";

function getColumnsFromData(data: any[]) {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0])
    .filter((key) => key !== "id") // 👈 hide Prisma PK
    .map((key) => ({
      accessorKey: key,
      header: key === "displayId" ? "ID" : key.charAt(0).toUpperCase() + key.slice(1),
    }));
}

const globalFilterFn = (row: any, _columnId: any, filterValue: string) => {
  if (!filterValue) return true;
  const flat = Object.values(row.original)
    .filter((v) => ["string", "number", "boolean"].includes(typeof v))
    .join(" ")
    .toLowerCase();
  return flat.includes((filterValue ?? "").toLowerCase());
};

type Props = {
  data: any[];
  pageSize: number;
  tableName: string;         // e.g. "projectdiaryrecord" OR "ProjectDiaryRecord"
  siteId: string;            // required
  displayActions?: boolean;  // default true
  editableFields?: number[]; // 1-based column indices allowed to edit (UI keys)
  exportFileName?: string;   // optional; default "table_data.xlsx"
  pkField?: string;          // default "id"
  fieldMap?: Record<string, string>; // UI key -> DB field name (e.g. { record: "Record" })
};

export function GenericTemplateTable({
  data,
  pageSize,
  tableName,
  siteId,
  displayActions = true,
  editableFields = [],
  exportFileName = "table_data.xlsx",
  pkField = "id",
  fieldMap = {},
}: Props) {
  const baseColumns = React.useMemo(() => getColumnsFromData(data), [data]);
  const columnKeys = React.useMemo(() => baseColumns.map((c: any) => c.accessorKey), [baseColumns]);

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});
  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<any | null>(null);
  const [editDraft, setEditDraft] = React.useState<Record<string, any>>({});
  const router = useRouter();

  function exportToExcel() {
    const rows = table.getFilteredRowModel().rows.map((r) => r.original);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, exportFileName);
  }

  // Compute UI editable keys from indices
  const clientEditableUi = React.useMemo(
    () => (editableFields.map((i) => columnKeys[i - 1]).filter(Boolean) as string[]),
    [editableFields, columnKeys]
  );

  // Map UI editable keys to DB field names using fieldMap
  const clientEditableDb = React.useMemo(
    () => clientEditableUi.map((k) => fieldMap[k] ?? k),
    [clientEditableUi, fieldMap]
  );

  // Map editDraft (UI keys) -> DB keys for submission
  const mappedChanges = React.useMemo(() => {
    const entries = Object.entries(editDraft).map(([k, v]) => [fieldMap[k] ?? k, v]);
    return Object.fromEntries(entries);
  }, [editDraft, fieldMap]);

  function RowActions({ row }: { row: any }) {
    const original = row.original;
    const pk = original?.[pkField];

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Row actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setEditRow(original);
              const draft: Record<string, any> = {};
              clientEditableUi.forEach((key) => (draft[key] = original[key]));
              setEditDraft(draft);
              setEditOpen(true);
            }}
            disabled={clientEditableUi.length === 0}
          >
            Edit
          </DropdownMenuItem>

          {/* Delete via server action */}
          <form action={genericTableAction}>
            <input type="hidden" name="op" value="delete" />
            <input type="hidden" name="table" value={tableName} />
            <input type="hidden" name="id" value={String(pk)} />
            <input type="hidden" name="siteId" value={String(siteId)} />
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full text-red-600">Delete</button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const columns = React.useMemo(() => {
    const cols = [...baseColumns];
    if (displayActions) {
      cols.push({
        id: "__actions__",
        header: "Actions",
        cell: ({ row }: any) => <RowActions row={row} />,
        enableSorting: false,
        enableHiding: false,
      });
    }
    return cols;
  }, [baseColumns, displayActions, clientEditableUi, pkField, tableName, siteId]);

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
    globalFilterFn,
    initialState: { pagination: { pageSize } },
  });

  async function handleBulkDelete() {
    const ids = table.getFilteredSelectedRowModel().rows
      .map((r) => r.original?.[pkField])
      .filter(Boolean);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected rows?`)) return;

    for (const id of ids) {
      const fd = new FormData();
      fd.set("op", "delete");
      fd.set("table", tableName);
      fd.set("id", String(id));
      fd.set("siteId", String(siteId));
      const res = await genericTableAction(fd);
      if (!res.ok) {
        alert(`Failed to delete ${id}: ${res.error}`);
        return;
      }
    }
    setRowSelection({});
    router.refresh();
  }

  function renderPagination() {
    const pageCount = table.getPageCount();
    const current = table.getState().pagination.pageIndex;
    const max = 10;
    let start = 0;
    let end = Math.min(pageCount, max);
    if (pageCount > max && current > Math.floor(max / 2)) {
      start = Math.max(0, Math.min(current - Math.floor(max / 2), pageCount - max));
      end = start + max;
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
        </PaginationItem>
      );
    }
    return items;
  }

  const visibleColumnsLen = table.getAllLeafColumns().length;

  return (
    <div className="w-full overflow-x-auto">
      {/* Toolbar */}
      <div className="flex items-center py-4 gap-2">
        <Input
          placeholder="Search..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <Button variant="destructive" onClick={handleBulkDelete}>
            Delete Selected
          </Button>
        )}
        <Button variant="outline" onClick={exportToExcel}>
          Export to Excel
        </Button>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler?.()}
                  className={`cursor-pointer select-none whitespace-nowrap ${h.column.id === "__actions__" ? "text-right" : ""}`}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getIsSorted() === "asc" && " 🔼"}
                  {h.column.getIsSorted() === "desc" && " 🔽"}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={`whitespace-normal ${cell.column.id === "__actions__" ? "text-right" : ""}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumnsLen} className="text-center">
                No data found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex justify-end mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} />
            </PaginationItem>
            {renderPagination()}
            <PaginationItem>
              <PaginationNext onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Edit Dialog */}
      {editRow && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit row: {String(editRow?.[pkField])}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {clientEditableUi.map((key) => {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <div key={key} className="grid gap-1">
                    <label className="text-sm font-medium">{label}</label>
                    <Input
                      value={editDraft[key] ?? ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, [key]: e.target.value }))}
                    />
                  </div>
                );
              })}
            </div>

            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>

              {/* Save via generic action */}
              <form
                action={genericTableAction}
                onSubmit={() => {
                  setEditOpen(false);
                  setEditRow(null);
                  setEditDraft({});
                }}
              >
                <input type="hidden" name="op" value="edit" />
                <input type="hidden" name="table" value={tableName} />
                <input type="hidden" name="id" value={String(editRow?.[pkField])} />
                <input type="hidden" name="siteId" value={String(siteId)} />
                <input type="hidden" name="changes" value={JSON.stringify(mappedChanges)} />
                <input type="hidden" name="clientEditable" value={JSON.stringify(clientEditableDb)} />
                <Button type="submit">Save</Button>
              </form>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
