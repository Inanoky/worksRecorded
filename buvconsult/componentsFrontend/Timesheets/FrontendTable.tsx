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
import { Checkbox } from "@/componentsFrontend/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/componentsFrontend/ui/pagination";
import {SelectContent, Select, SelectItem, SelectTrigger, SelectValue } from "@/componentsFrontend/ui/select";
import { useSiteSchema } from "@/componentsFrontend/provider/SiteSchemaProvider";


// --- Auto-generate columns from data ---
function getColumnsFromData(data) {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0]).map(key => ({ //So we take a first object from the data array, map agains its keys. 
    accessorKey: key, // So I guess we createa a new array (of objects) with the keys as accessorKey and heade
    header: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter for header (for display)
  }));
}

// --- Global filter ---
const defaultGlobalFilterFn = (row, columnId, filterValue) => {
  if (!filterValue) return true;
  const flatString = Object.values(row.original)
    .filter(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .join(" ")
    .toLowerCase();
  return flatString.includes(filterValue.toLowerCase());
};

export function FrontendTable({
  data = [],
  pageSize ,
  exportFileName = "table_data.xlsx",
}) {
  // Auto-generate columns from data
  const columns = React.useMemo(() => getColumnsFromData(data), [data]); // So useMemo is some kind of state shenanigans. I think it refeshes? Anyway. 

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});

  function exportToExcel() {
    const rows = table.getFilteredRowModel().rows.map(row => row.original);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, exportFileName);
  }

  const table = useReactTable({
    data, //an array of plain objects
    columns, // column definitions
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

  const {locations,works} = useSiteSchema();

  // -----------------------------------notes----------------------------------

  const headers = table.getHeaderGroups(); //Ok, so this will return and objeckt with the headers included (a separate array with its own field for each header)

  // console.dir(headers, { depth: null });


  const rows = table.getRowModel()
  // const first = rows[0]
  // console.log("First row:", first.original); //So data is in original. 

  // console.dir(rows, { depth: null });

  const cells = rows.rows[0].getVisibleCells() 

  const contents = cells[0].getValue() //So this returns the actual content of the cell.

  console.dir(contents, { depth: null });

// -----------------------------------Code -------------------------------------
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

//--------Rendering cells------------------------------------

function renderCell(cell){

   if (cell.column.id === "location") return (
   
   
                      <Select>
                      <SelectTrigger  className="w-[180px]">
                        <SelectValue placeholder={cell.getValue() } />
                      </SelectTrigger>
                      <SelectContent>

                        {/* Now here I need to get a list of available locations somewhore.  */}

                        {locations.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}                        


                      </SelectContent>

                    </Select>
                    )
 
  return flexRender(cell.column.columnDef.cell, cell.getContext());

}

  
  


  return (
    <div className="w-full overflow-x-auto">
      {/* Toolbar */}
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
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => ( //So this return a array of header objejts, and we map over each of them. 
            <TableRow key={headerGroup.id}> 
              {headerGroup.headers.map(header => (

                
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler?.()} //So this is just a sorting functionality. 
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
          {table.getRowModel().rows.length ? ( //I think getRowModel returns the actual rows of data, after all the filtering and sorting and stuff.
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map(cell => (

                 
                  <TableCell key={cell.id} className="whitespace-normal">
                    {renderCell (cell)}
                  </TableCell>

                

                 



                )
                )}
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
      {/* Pagination */}
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
    </div>
  );
}
