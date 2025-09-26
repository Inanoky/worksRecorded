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
import { useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/componentsFrontend/ui/popover";
import { Calendar } from "@/componentsFrontend/ui/calendar";
import { Calendar as CalendarIcon, ChevronDownIcon, MoreHorizontal } from "lucide-react"
import { format } from "date-fns"
import { Textarea } from "@/componentsFrontend/ui/textarea";
import { editTimeRecord } from "@/app/actions/clockinActions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/componentsFrontend/ui/dropdown-menu";
import { SubmitButton } from "@/app/components/dashboard/SubmitButtons";
import { useProject } from "../provider/ProjectProvider";
import { useRouter } from "next/navigation";
import { resourceLimits } from "worker_threads";
import { useActionState } from "react";
import { z } from "zod";
import { toast } from "sonner";




// --- Auto-generate columns from data ---
function getColumnsFromData(data) {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0])
  .filter(k => k !== "id")   
  .map(key => ({ //So we take a first object from the data array, map agains its keys. 
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
  workers = [],
  pageSize ,
  exportFileName = "table_data.xlsx",
}) {
  // Auto-generate columns from data
  const columns = React.useMemo(() => getColumnsFromData(data), [data]); // So useMemo is some kind of state shenanigans. I think it refeshes? Anyway. 

//-----------------------------------State----------------------------------




  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});
  const [anyChanges, setAnyChanges] = React.useState(false);
  const [editRowId, setEditRowId] = React.useState<string | null>(null);
  const [rowsToSave, setRowsToSave] = React.useState<any[]>([])
  const { projectId: siteId } = useProject();
  const [result, action] = useActionState(editTimeRecord, undefined)

  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(undefined)

  
const [submitting, setSubmitting] = useState(false);
   const router = useRouter();
   const patch = editRowId ? rowsToSave[Object.keys(rowsToSave)[0]] : undefined;



  // console.log(anyChanges, "Any changes")
  // console.log("Edit row ID:", editRowId)
  console.log("Rows to save:", rowsToSave)  


  const wrapperRef = React.useRef<HTMLDivElement | null>(null); //So this is a wrapper so we can track clicks outside of it.


  //---------------------------Zod------------------------------

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
















  //So this is a click outside handler.
  React.useEffect(() => {
  function onDocPointerDown(e: MouseEvent | PointerEvent | TouchEvent) {
    const root = wrapperRef.current;
    if (!root) return;

    const target = e.target as Element | null;
    if (!target) return;

    const clickedInside = root.contains(target);

    // 👇 Ignore clicks inside Radix/shadcn portals (Select/Popover/Dropdown, etc.)
    const inRadixPortal =
      target.closest("[data-radix-portal]") ||
      target.closest("[data-radix-popper-content]") ||
      target.closest("[data-radix-popper-content-wrapper]");

    if (!clickedInside && !inRadixPortal) {

       // determine if there are unsaved changes
       const dirty =  anyChanges 

          if (dirty && !window.confirm("You have unsaved changes. Discard them?")) {
        return; // keep edits
      }




      // clear your state here
      setRowsToSave({});   // or [] if you're using an array
      setEditRowId(null);
      setAnyChanges(false);
    }
  }

  // pointerdown feels faster than click
  document.addEventListener("pointerdown", onDocPointerDown);
  return () => document.removeEventListener("pointerdown", onDocPointerDown);
}, [anyChanges, editRowId, rowsToSave]);
 


  


  function handleChange(rowId: string, field: string, value: any) {
  setRowsToSave(prev => {
    const row = prev[rowId] ?? {}; //So it there is already a row with changes, we get it, otherwise we create an empty object.
    return { ...prev, [rowId]: { ...row, [field]: value } }; // So this is a state update? 
  });




  }

const handleSubmit = async (e?: React.FormEvent) => {


  

  e?.preventDefault();
  console.log("[SUBMIT] fired. rowsToSave =", rowsToSave);

  const entries = Object.entries(rowsToSave);
  if (entries.length === 0) {
    console.warn("[SUBMIT] Nothing to save — rowsToSave is empty.");
    return;
  }

  const [id, patch] = entries[0] as [string, Record<string, unknown>];
  const payload = { id, ...patch, siteId } as {
    id: string;
    workerId?: string;
    date?: Date | string;
    clockIn?: string;
    clockOut?: string;
    location?: string;
    works?: string;
    siteId: string;
   
  };

  console.log("[SUBMIT] payload =>", payload);

  try {
    // const res = await editTimeRecord(payload);
    // console.log("[SUBMIT] editTimeRecord result =>", res);
    // // reset local state
    // setRowsToSave({});
    // setEditRowId(null);
    // setAnyChanges(false);
  } catch (err) {
    // console.error("[SUBMIT] editTimeRecord threw:", err);
  }

 
  router.refresh()
};






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
    state: { globalFilter, rowSelection, },
    
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

  // const headers = table.getHeaderGroups(); //Ok, so this will return and objeckt with the headers included (a separate array with its own field for each header)

  // // console.dir(headers, { depth: null });


  // const rows = table.getRowModel()
  // // const first = rows[0]
  // console.log("First row:", first.original); //So data is in original. 

  // console.dir(rows, { depth: null });

  // const cells = rows.rows[0].getVisibleCells() 

  // const contents = cells[0].getValue() //So this returns the actual content of the cell.

  // console.dir(contents, { depth: null });

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

  
  


  if (editRowId === cell.row.id) {

 


   if(cell.column.id === "works") return (
    <>

    <Textarea
      
      placeholder={cell.getValue()}
      className="text-pretty field-sizing-fixed"
      onChange={(e) => {
             // ← collected value
            setAnyChanges(true);
            handleChange(cell.row.original.id, 'works', e.currentTarget.value);
            // do something with v...
          }}

    
    />
     
    </>

    

  )

  if(cell.column.id === "clockIn") return (

       <Input
          type="time"
          id="time-picker"
          step="1"
          defaultValue={cell.getValue()}
          onChange={(e) => {
            setAnyChanges(true)
            handleChange(cell.row.original.id, 'clockIn', e.currentTarget.value);
          }}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />


  )

   if(cell.column.id === "clockOut") return (

       <Input
          type="time"
          id="time-picker"
          step="1"
          defaultValue={cell.getValue()}
          onChange={(e) => {
            setAnyChanges(true)
            handleChange(cell.row.original.id, 'clockOut', e.currentTarget.value);
          }}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />


  )


   if (cell.column.id === "location") {

        const rowId = cell.row.original.id;
        const current = String(
    (rowsToSave[rowId]?.location ?? cell.getValue() ?? "")
  );



    return (
   
   
                      <Select 

                 
                      onValueChange={(v) => {


                        
                      setAnyChanges(true)
                      handleChange(cell.row.original.id, 'location', v)
                      


                      }
                      } >
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
                    )}

    if (cell.column.id === "date")      
      
      return (
      
            <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-48 justify-between font-normal"
          >
            {date ? date.toLocaleDateString('lv-LV', {
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    }).replace(/\.$/, "") : cell.getValue() }
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger >
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={(date) => {
              setDate(date)
              setOpen(false)
              setAnyChanges(true)
              handleChange(cell.row.original.id, 'date', date)
            }}
          />
        </PopoverContent>
      </Popover>
    )

    if (cell.column.id === "workerName") {
      
      return ( 


                      <Select 

                      
                      
                      
                      
                      onValueChange={(v) => {
                        
                     
                       setAnyChanges(true)
                       handleChange(cell.row.original.id, 'workerId', v)
                     
                       
                       
                       } }>
                      <SelectTrigger  className="w-[180px]">
                        <SelectValue placeholder={cell.getValue() } />
                      </SelectTrigger>
                      <SelectContent>

                        {/* Now here I need to get a list of available locations somewhore.  */}

                        {workers.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.name} {worker.surname}
                            </SelectItem>
                        ))}                        


                      </SelectContent>

                    </Select>


    )}
 
  return flexRender(cell.column.columnDef.cell, cell.getContext()); //This renders cells in normal mode. 

  } else {
    return flexRender(cell.column.columnDef.cell, cell.getContext()); //This renders other rows not in question at the moment (not being edited).
  }

}

  
  


  return (
    <form 
    
    
    
     action={async (fd) => {
          fd.set("id", Object.keys(rowsToSave)[0]  ?? "");
          console.log(Object.keys(rowsToSave)[0]  ?? "")
          fd.set("siteId", siteId);

          if (patch?.works) {

          const parsed = ZodRowSchema.safeParse({works: patch?.works});
          if (!parsed.success) {
                toast.error(parsed.error.errors[0].message);
                return;
              }

          }
        
          if (patch?.works    != null) fd.set("works",    String(patch.works));
          if (patch?.location != null) fd.set("location", String(patch.location));
          if (patch?.clockIn  != null) fd.set("clockIn",  String(patch.clockIn));
          if (patch?.clockOut != null) fd.set("clockOut", String(patch.clockOut));
          if (patch?.date     != null) fd.set("date",     String(patch.date));
          if (patch?.workerId     != null) fd.set("workerId",     String(patch.workerId));

          action(fd);

          
           
       
         
    
      }}
    
    >


    <div ref={wrapperRef} className="w-full overflow-x-auto">
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

  
       




        {anyChanges ? 
       <SubmitButton text="Save changes"  className="ml-2"/>: null}
      </div>
      {/* Table */}
      <div className="mb-2 text-sm text-muted-foreground">
        {table.getFilteredRowModel().rows.length} of {data.length} results
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

                  <TableHead>
                  Edit
                </TableHead>

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
                <TableCell>

                <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                        <MoreHorizontal />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />


                        <DropdownMenuItem onClick={() => {setEditRowId(row.id)}} >
                          Edit
                          </DropdownMenuItem>


                        <DropdownMenuItem className="cursor-pointer text-red-600">
                            Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                </DropdownMenu>



                  



                  </TableCell>
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
   </form>
  );
   
}
