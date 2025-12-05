"use client";
import * as React from "react";
import * as XLSX from "xlsx";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useRouter } from "next/navigation";
import { deleteDocuments } from "@/server/actions/documents-actions";
import { toast } from "sonner";
import { DocumentsEditDialog } from "@/components/documents/DocumentsEditDialaog";

/* ---- Global search ---- */
const globalFilterFn = (row, _columnId, filterValue) => {
  if (!filterValue) return true;
  const flat = Object.values(row.original)
    .filter(v => ["string", "number", "boolean"].includes(typeof v))
    .join(" ")
    .toLowerCase();
  return flat.includes(String(filterValue).toLowerCase());
};

/* ---- Row actions ---- */
function RowActions({ siteId, id, item, onDelete, onEdit }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(id, siteId)} className="cursor-pointer text-red-600">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DocumentsDataTable({ data, siteId }) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});
  const [editItem, setEditItem] = React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const router = useRouter();

  function exportToExcel() {
    const rows = table.getFilteredRowModel().rows.map(r => r.original);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Documents");
    XLSX.writeFile(wb, "documents.xlsx");
  }

  async function handleDeleteItem(id, siteId) {
    try {
      await deleteDocuments(id, siteId);
      toast.success("Document deleted");
      router.refresh();
    } catch {
      toast.error("Delete failed");
    }
  }

  function handleEdit(item) {
    setEditItem(item);
    setEditOpen(true);
  }

  async function handleBulkDelete(siteId) {
    const ids = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected documents?`)) return;
    try {
      await Promise.all(ids.map(id => deleteDocuments(id, siteId)));
      toast.success(`Deleted ${ids.length} documents`);
      setRowSelection({});
      router.refresh();
    } catch {
      toast.error("Bulk delete failed");
    }
  }

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={v => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      { accessorKey: "documentName", header: "Name", cell: i => i.getValue() || "" },
      { accessorKey: "documentType", header: "Type", cell: i => i.getValue() || "" },
      { accessorKey: "description", header: "Description", cell: i => i.getValue() || "" },
      {
        accessorKey: "url",
        header: "URL",
        cell: i =>
          i.getValue() ? (
            <a href={i.getValue()} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              Open
            </a>
          ) : (
            ""
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: info => (
          <RowActions
            siteId={siteId}
            id={info.row.original.id}
            item={info.row.original}
            onDelete={handleDeleteItem}
            onEdit={handleEdit}
          />
        ),
        enableSorting: false,
        enableFiltering: false,
      },
    ],
    []
  );

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
    initialState: { pagination: { pageSize: 20 } },
  });

  /* ----- Pagination UI builder ----- */
  function renderPagination() {
    const pageCount = table.getPageCount();
    const current = table.getState().pagination.pageIndex;
    const max = 7;
    let start = 0;
    let end = Math.min(pageCount, max);

    if (pageCount > max) {
      if (current > Math.floor(max / 2)) {
        start = Math.max(0, Math.min(current - Math.floor(max / 2), pageCount - max));
        end = start + max;
      }
    }

    const items = Array.from({ length: end - start }, (_, i) => {
      const idx = start + i;
      return (
        <PaginationItem key={idx}>
          <PaginationLink isActive={current === idx} onClick={() => table.setPageIndex(idx)}>
            {idx + 1}
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

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3">
        <Input
          placeholder="Search documents…"
          value={globalFilter ?? ""}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" onClick={() => handleBulkDelete(siteId)} className="w-full sm:w-auto">
              Delete ({selectedCount})
            </Button>
          )}
          <Button variant="outline" onClick={exportToExcel} className="w-full sm:w-auto">
            Export
          </Button>
        </div>
      </div>

      {/* ---- Mobile (cards) ---- */}
      <div className="grid gap-2 sm:hidden">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map(row => {
            const o = row.original;
            return (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={row.getIsSelected()}
                      onCheckedChange={v => row.toggleSelected(!!v)}
                      aria-label="Select row"
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium leading-tight">{o.documentName || "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.documentType || "—"}</div>
                    </div>
                  </div>
                  <RowActions siteId={siteId} id={o.id} item={o} onDelete={handleDeleteItem} onEdit={handleEdit} />
                </div>

                {o.description ? (
                  <div className="mt-2 text-sm leading-snug line-clamp-3">{o.description}</div>
                ) : null}

                <div className="mt-2 flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">URL</div>
                  {o.url ? (
                    <a href={o.url} target="_blank" rel="noopener noreferrer" className="underline">
                      Open
                    </a>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No documents found.</div>
        )}
      </div>

      {/* ---- Desktop table ---- */}
      <div className="hidden overflow-x-auto sm:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler?.()}
                    className="cursor-pointer select-none whitespace-nowrap"
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
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="whitespace-normal">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex justify-center sm:justify-end">
        <Pagination>
          <PaginationContent className="flex-wrap">
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

      {/* Edit dialog */}
      {editItem && <DocumentsEditDialog item={editItem} open={editOpen} onOpenChange={setEditOpen} />}
    </div>
  );
}
