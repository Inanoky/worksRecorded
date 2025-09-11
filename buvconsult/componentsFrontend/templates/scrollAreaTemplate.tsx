"use client";
import * as React from "react";
import * as XLSX from "xlsx";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/componentsFrontend/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentsFrontend/ui/table";
import { Input } from "@/componentsFrontend/ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Trash2 } from "lucide-react";

// --- Helper to generate columns with optional labels and visibleColumns
function getColumnsFromData(
  data: any[],
  columnLabels: string[] | null = null,
  visibleColumns: number[] | null = null
) {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  // visibleColumns: array of 1-based indices (e.g. [1,3])
  const indices = visibleColumns && visibleColumns.length
    ? visibleColumns.map(i => i - 1).filter(i => i >= 0 && i < keys.length)
    : keys.map((_, i) => i);

  return indices.map(i => ({
    accessorKey: keys[i],
    header: columnLabels?.[i] ?? keys[i].charAt(0).toUpperCase() + keys[i].slice(1),
  }));
}

// --- Simple string search filter
const defaultGlobalFilterFn = (row: any, columnId: string, filterValue: string) => {
  if (!filterValue) return true;
  const flatString = Object.values(row.original)
    .filter(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .join(" ")
    .toLowerCase();
  return flatString.includes(filterValue.toLowerCase());
};

export function ScrollTable({
  data = [],
  pageSize = 20,
  exportFileName = "table_data.xlsx",
  visibleColumns = null,    // e.g. [1,2,4] - 1-based indices
  columnLabels = null,      // e.g. ["ID", "First Name", ...]
  toolbar = true,
  tableName = "",
  onDeleteRow = (id: string) => {}, // callback (row id)
}: {
  data: any[],
  pageSize?: number,
  exportFileName?: string,
  visibleColumns?: number[] | null,
  columnLabels?: string[] | null,
  toolbar?: boolean,
  tableName?: string,
  onDeleteRow?: (id: string) => void,
}) {
  // Memoized columns with delete column at the end
  const columns = React.useMemo(() => {
    const base = getColumnsFromData(data, columnLabels, visibleColumns);
    return [
      ...base,
      {
        id: "delete",
        header: "",
        cell: ({ row }: any) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteRow(row.original.id)}
            className="text-red-500 hover:bg-red-100"
            title="Delete row"
            type="button"
          >
            <Trash2 size={18} />
          </Button>
        ),
        enableSorting: false,
        enableHiding: false,
      }
    ];
  }, [data, columnLabels, visibleColumns, onDeleteRow]);

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});

  function exportToExcel() {
    // Exclude the last "delete" column from export
    const exportCols = columns.slice(0, -1).map(col => col.accessorKey);
    const rows = table.getFilteredRowModel().rows.map(row =>
      exportCols.reduce((acc, key) => ({ ...acc, [key]: row.original[key] }), {})
    );
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
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: defaultGlobalFilterFn,
    initialState: { pagination: { pageSize } },
  });

  return (
    <ScrollArea className="h-60 w-full">
      <div className="w-full h-full overflow-x-auto">
        {/* Optional Table Name */}
        {tableName && (
          <div className="text-xl font-semibold mb-2 px-2 pt-2">{tableName}</div>
        )}
        {/* Toolbar */}
        {toolbar && (
          <div className="flex items-center py-4">
            <Input
              placeholder="Search..."
              value={globalFilter ?? ""}
              onChange={e => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
            <Button className="ml-2" variant="outline" onClick={exportToExcel}>
              Export to Excel
            </Button>
          </div>
        )}
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
                  No data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}
