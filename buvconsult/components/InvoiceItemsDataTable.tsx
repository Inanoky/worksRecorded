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
  RowSelectionState
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { InvoiceHoverPreview } from "@/components/ui/InvoiceHoverPreview";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { useRouter } from "next/navigation";
import {deleteInvoiceItem, getProjectNameBySiteId} from "@/app/actions/actions";
import { toast } from "sonner";
import { InvoiceItemEditDialog } from "@/components/InvoiceItemEditDialog";
import {useProject} from "@/components/provider/ProjectProvider";

// --- Global Filter Function ---
const globalFilterFn = (row, columnId, filterValue) => {
  if (!filterValue) return true;
  const flatString = [
    ...Object.values(row.original), // top-level fields
    ...(row.original.invoice ? Object.values(row.original.invoice) : [])
  ]
    .filter(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .join(" ")
    .toLowerCase();
  return flatString.includes(filterValue.toLowerCase());
};

// Row actions for edit/delete
function RowActions({ siteId, id, item, onDelete, onEdit }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(id)} className="cursor-pointer text-red-600">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InvoiceItemsDataTable({ data, siteId }) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});
  const router = useRouter();
  const [editItem, setEditItem] = React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);


  function exportToExcel() {
    // get only the currently filtered rows
    const rows = table.getFilteredRowModel().rows.map(row => row.original);
    const data = rows.map(row => ({
      ...row,
      ...(row.invoice || {}),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice Items");
    XLSX.writeFile(workbook, "invoice_items.xlsx");
  }

  async function handleDeleteItem(id) {
    try {
      await deleteInvoiceItem(id);
      toast.success("Invoice item deleted");
      router.refresh();
    } catch (e) {
      toast.error("Delete failed");
    }
  }

  function handleEdit(item) {
    setEditItem(item);
    setEditOpen(true);
  }

  // BULK DELETE HANDLER
  async function handleBulkDelete() {
    const ids = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected items?`)) return;
    try {
      await Promise.all(ids.map(id => deleteInvoiceItem(id)));
      toast.success(`Deleted ${ids.length} items`);
      setRowSelection({}); // clear selection
      router.refresh();
    } catch (e) {
      toast.error("Bulk delete failed");
    }
  }

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false
      },
      {
        accessorKey: "invoice.invoiceDate",
        header: "Date",
         cell: ({ row }) =>
    row.original.invoice?.invoiceDate
      ? new Date(row.original.invoice.invoiceDate).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "No date",
      },
      {
        header: "Invoice#",
        cell: info => {
          const invoice = info.row.original.invoice;
          return invoice?.url
            ? <InvoiceHoverPreview url={invoice.url} label={invoice.invoiceNumber || "Invoice"} />
            : invoice?.invoiceNumber || "";
        }
      },
      {
        accessorKey: "sellerName",
        header: "Seller",
        cell: info => info.row.original.invoice?.sellerName || ""
      },
      { accessorKey: "item", header: "Item", cell: info => info.getValue() || "" },
      { accessorKey: "quantity", header: "Qty", cell: info => info.getValue() || "" },
      { accessorKey: "unitOfMeasure", header: "Unit", cell: info => info.getValue() || "" },
      { accessorKey: "pricePerUnitOfMeasure", header: "Unit Price", cell: info => info.getValue() || "" },
      { accessorKey: "sum", header: "Sum", cell: info => info.getValue() || "" },
      { accessorKey: "currency", header: "Currency", cell: info => info.getValue() || "" },
      { accessorKey: "category", header: "Category", cell: info => info.getValue() || "" },
      {
        accessorKey: "isInvoice",
        header: "Is Invoice",
        cell: info =>
          info.getValue()
            ? <Badge variant="default">Yes</Badge>
            : <Badge variant="outline">No</Badge>
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
        enableFiltering: false
      }
    ],
    [siteId]
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
    initialState: { pagination: { pageSize: 20 } }
  });

  // --- Pagination logic as before (with ellipsis, etc.) ---
  function renderPagination() {
    const pageCount = table.getPageCount();
    const current = table.getState().pagination.pageIndex;
    const maxPages = 10;
    let start = 0;
    let end = Math.min(pageCount, maxPages);

    if (pageCount > maxPages) {
      if (current > Math.floor(maxPages / 2)) {
        start = Math.max(0, Math.min(current - Math.floor(maxPages / 2), pageCount - maxPages));
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
        </PaginationItem>
      );
    }
    return items;
  }

  // --- Subtotal calculation (filtered rows only) ---
  const filteredRows = table.getFilteredRowModel().rows;
  const subtotalQty = filteredRows.reduce((sum, row) => sum + (parseFloat(row.original.quantity) || 0), 0);
  const subtotalUnitPrice = filteredRows.reduce((sum, row) => sum + (parseFloat(row.original.pricePerUnitOfMeasure) || 0), 0);
  const subtotalSum = filteredRows.reduce((sum, row) => sum + (parseFloat(row.original.sum) || 0), 0);

  return (
    <div className="w-full overflow-x-auto">

      {/* Bulk Delete Button */}
      <div className="flex items-center py-4">
        <Input
          placeholder="Search invoice items..."
          value={globalFilter ?? ""}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <Button
            variant="destructive"
            className="ml-4"
            onClick={handleBulkDelete}
          >
            Delete Selected
          </Button>
        )}
        <Button className="ml-2" variant="outline" onClick={exportToExcel}>
          Export to Excel
        </Button>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler?.()}
                  className="cursor-pointer select-none whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === "asc" && " 🔼"}
                  {header.column.getIsSorted() === "desc" && " 🔽"}
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
                No invoice items found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {/* Subtotal row */}
        <tfoot>
          <TableRow className="font-semibold">
            {/* select */}<TableCell />
            {/* date */}<TableCell />
            {/* Invoice# */}<TableCell />
            {/* Seller */}<TableCell />
            {/* Item */}<TableCell style={{textAlign:'right'}}>Totals:</TableCell>
            {/* UnitOfMeasure */}<TableCell />
            {/* Currency */}<TableCell />

            {/* Category */}<TableCell />
                      {/* Sum */}<TableCell>{subtotalSum.toLocaleString("en-US", {maximumFractionDigits:2})}</TableCell>

            {/* Is Invoice */}<TableCell />
            {/* Actions */}<TableCell />
          </TableRow>
        </tfoot>
      </Table>
      {/* Pagination always bottom right */}
      <div className="flex justify-end mt-4">
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
      {/* Edit Dialog */}
      {editItem && (
        <InvoiceItemEditDialog
          item={editItem}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </div>
  );
}
