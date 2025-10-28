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
  RowSelectionState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
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
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteInvoice, bulkSetIsInvoice } from "@/server/actions/invoices-actions";
import { InvoiceEditDialog } from "@/components/invoices/InvoiceEditDialog";

// ⬇️ NEW: dialog components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

// Row actions for edit/delete
function RowActions({ siteId, id, onDelete, invoice, onEdit }) {
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
        <DropdownMenuItem onClick={() => onEdit(invoice)}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(id)} className="cursor-pointer text-red-600">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Health badge (string in DB → numeric thresholds)
function HealthBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <Badge variant="outline">-</Badge>;

  const n = parseFloat(value);
  if (isNaN(n)) return <Badge variant="outline">{value}</Badge>;

  let colorClass = "bg-red-100 text-red-700 border-red-200";
  if (n > 80) colorClass = "bg-green-100 text-green-700 border-green-200";
  else if (n >= 60) colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200";

  return (
    <Badge variant="outline" className={colorClass}>
      {n.toFixed(0)}
    </Badge>
  );
}

export function InvoicesDataTable({ data, siteId }) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const router = useRouter();

  const [editInvoice, setEditInvoice] = React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);

  async function handleDeleteInvoice(id) {
    try {
      await deleteInvoice(id);
      toast.success("Invoice deleted");
      router.refresh();
    } catch {
      toast.error("Delete failed");
    }
  }

  function handleEdit(invoice) {
    setEditInvoice(invoice);
    setEditOpen(true);
  }


  function handleEditOpenChange(v: boolean) {
  setEditOpen(v);
  if (!v) setEditInvoice(null);
}

  async function handleBulkDelete() {
    const ids = table.getSelectedRowModel().rows.map((row) => row.original.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected items?`)) return;
    try {
      await Promise.all(ids.map(deleteInvoice));
      toast.success("Invoices deleted");
      setRowSelection({});
      router.refresh();
    } catch {
      toast.error("Bulk delete failed");
    }
  }

  async function handleBulkIsInvoice(value) {
    const ids = table.getSelectedRowModel().rows.map((row) => row.original.id);
    if (ids.length === 0) return;
    try {
      await bulkSetIsInvoice(ids, value);
      toast.success(`Invoices marked as isInvoice=${value}`);
      setRowSelection({});
      router.refresh();
    } catch {
      toast.error("Bulk update failed");
    }
  }

  function exportToExcel() {
    const rows = table.getFilteredRowModel().rows.map(row => row.original);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, "invoices.xlsx");
  }

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "invoiceDate",
        header: "Invoice Date",
        cell: ({ row }) =>
    row.original.invoiceDate
      ? new Date(row.original.invoiceDate).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "No date",
      },
      {
        accessorKey: "paymentDate",
        header: "Payment Date",
         cell: ({ row }) =>
    row.original.paymentDate
      ? new Date(row.original.paymentDate).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "No date",
      },
      {
        accessorKey: "invoiceNumber",
        header: "Invoice #",
        cell: info => (
          <InvoiceHoverPreview url={info.row.original.url} label={info.row.original.invoiceNumber || "Invoice"} />
        ),
      },
      {
        accessorKey: "sellerName",
        header: "Seller",
        cell: info => info.getValue() || "",
      },
      {
        accessorKey: "invoiceTotalSumNoVat",
        header: "Total excl. VAT",
        cell: info => {
          const value = info.getValue();
          return typeof value === "number"
            ? value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "";
        },
      },
      {
        accessorKey: "isCreditDebitProformaOrAdvanced",
        header: "Type",
        cell: info => (
          <Badge variant="outline" className="capitalize">
            {info.getValue() || "-"}
          </Badge>
        ),
      },
      {
        accessorKey: "isInvoice",
        header: "Is Invoice",
        cell: info => (
          <Badge variant={info.getValue() ? "default" : "outline"}>
            {info.getValue() ? "Yes" : "No"}
          </Badge>
        ),
      },
      // --- Health column with dialog on click ---
      {
        accessorKey: "health",
        header: "Health",
        sortingFn: (a, b, colId) => {
          const av = parseFloat(a.getValue(colId) ?? "NaN");
          const bv = parseFloat(b.getValue(colId) ?? "NaN");
          const an = Number.isFinite(av) ? av : -Infinity;
          const bn = Number.isFinite(bv) ? bv : -Infinity;
          return an === bn ? 0 : an < bn ? -1 : 1;
        },
        cell: ({ row, getValue }) => {
          const health = (getValue() as string | null) ?? null;
          const summary = (row.original?.auditSummary as string | null) ?? null;
          const inv = row.original;

          return (
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="cursor-pointer">
                  <HealthBadge value={health} />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Audit summary</DialogTitle>
                  <DialogDescription>
                    {`Invoice ${inv?.invoiceNumber ?? ""}`.trim()} • Health {health ?? "-"}
                  </DialogDescription>
                </DialogHeader>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {summary && summary.trim().length > 0 ? summary : "No audit summary available."}
                </div>
              </DialogContent>
            </Dialog>
          );
        },
      },
      {
        accessorKey: "uploadedAt",
        header: "Uploaded At",
        cell: info =>
          info.getValue()
            ? new Date(info.getValue()).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
            : "",
      },
      {
        id: "actions",
        header: "Actions",
        cell: info => (
          <RowActions
            siteId={siteId}
            id={info.row.original.id}
            invoice={info.row.original}
            onDelete={handleDeleteInvoice}
            onEdit={handleEdit}
          />
        ),
        enableSorting: false,
        enableFiltering: false,
      },
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
    initialState: { pagination: { pageSize: 10 } },
  });

  function renderPagination() {
    const pageCount = table.getPageCount();
    const current = table.getState().pagination.pageIndex;
    const maxPages = 10;
    let start = 0;
    let end = Math.min(pageCount, maxPages);

    if (pageCount > maxPages) {
      const half = Math.floor(maxPages / 2);
      if (current > half) {
        start = Math.max(0, Math.min(current - half, pageCount - maxPages));
        end = start + maxPages;
      }
    }

    const items = [];
    for (let pageIdx = start; pageIdx < end; pageIdx++) {
      items.push(
        <PaginationItem key={pageIdx}>
          <PaginationLink
            isActive={table.getState().pagination.pageIndex === pageIdx}
            onClick={() => table.setPageIndex(pageIdx)}
          >
            {pageIdx + 1}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (end < pageCount) {
      items.push(
        <PaginationItem key="ellipsis">
          <span className="px-2 select-none text-muted-foreground">…</span>
        </PaginationItem>
      );
    }

    if (start > 0) {
      items.unshift(
        <PaginationItem key="start-ellipsis">
          <span className="px-2 select-none text-muted-foreground">…</span>
        </PaginationItem>
      );
    }

    return items;
  }

  const filteredRows = table.getFilteredRowModel().rows;
  const subtotalNoVat = filteredRows.reduce(
    (sum, row) => sum + (Number(row.original.invoiceTotalSumNoVat) || 0),
    0
  );

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center py-4 gap-4">
        <Input
          placeholder="Search invoices..."
          value={globalFilter ?? ""}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button className="ml-2" variant="outline" onClick={exportToExcel}>
          Export to Excel
        </Button>
        {table.getSelectedRowModel().rows.length > 0 && (
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete selected
            </Button>
              <Button variant="default" onClick={() => handleBulkIsInvoice(true)}>
                Mark as Invoice
              </Button>
              <Button variant="outline" onClick={() => handleBulkIsInvoice(false)}>
                Mark as Not Invoice
              </Button>
          </div>
        )}
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
              <TableRow key={row.id}>
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
                No invoices found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex justify-end mt-2 pr-2">
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

      {editInvoice && (
        <InvoiceEditDialog
          key={editInvoice.id}
          invoice={editInvoice}
          open={editOpen}
          onOpenChange={handleEditOpenChange}
        />
      )}
    </div>
  );
}
