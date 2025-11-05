"use client";

// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\settings\MembersTable.tsx

import * as React from "react";
import * as XLSX from "xlsx";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";

// server actions
import { editUserData, saveTemporaryUser } from "@/server/actions/settings-actions";
import { inviteUserByEmail } from "@/server/actions/settings-actions";


type Role = "project manager" | "site manager";

export type Member = {
  id: string;
  email: string | null;       // READ-ONLY
  firstName: string | null;   // editable
  lastName: string | null;    // editable
  phone: string | null;       // editable
  role: Role | null;          // editable (enum)
};

type MembersTableProps = {
  data: Member[];
  pageSize: number;
  exportFileName?: string;
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "project manager", label: "Project manager" },
  { value: "site manager", label: "Site manager" },
];

function getColumns(): ColumnDef<Member, any>[] {
  return [
    { accessorKey: "email", header: "Email" },         // read-only
    { accessorKey: "firstName", header: "First name" },
    { accessorKey: "lastName", header: "Last name" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "role", header: "Role" },
    { accessorKey: "status", header: "Status" },
  ];
}

const defaultGlobalFilterFn = (row: any, _colId: string, filterValue: string) => {
  if (!filterValue) return true;
  const flat = Object.values(row.original ?? {})
    .filter(v => ["string","number","boolean"].includes(typeof v))
    .join(" ")
    .toLowerCase();
  return flat.includes(filterValue.toLowerCase());
};

export function MembersTable({
  data,
  pageSize,
  exportFileName = "table_data.xlsx",
  userid,
  orgId
}) {
  const router = useRouter();
  const columns = React.useMemo(() => getColumns(), []);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});
  const [editRowId, setEditRowId] = React.useState<string | null>(null);
  const [draftById, setDraftById] = React.useState<Record<string, Partial<Member>>>({});
  const [anyChanges, setAnyChanges] = React.useState(false);
  

  // ----- Add User dialog state -----
  const [openAdd, setOpenAdd] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");

  // Save only editable fields (email excluded)
  const [result, action] = useActionState(async (_prev: any, fd: FormData) => {
    const id = String(fd.get("id") || "");
    if (!id) return { ok: false, message: "Missing id" };

    const patch: Partial<Member> = {};
    const firstName = fd.get("firstName");
    const lastName  = fd.get("lastName");
    const phone     = fd.get("phone");
    const role      = fd.get("role");

    if (firstName !== null) patch.firstName = String(firstName);
    if (lastName  !== null) patch.lastName  = String(lastName);
    if (phone     !== null) patch.phone     = String(phone);
    if (role      !== null && role !== "") patch.role = String(role) as Role;

    try {
      await editUserData(id, patch);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Failed to update" };
    }
  }, undefined);

  React.useEffect(() => {
    if (result?.ok) {
      toast.success("Member updated");
      setDraftById({});
      setEditRowId(null);
      setAnyChanges(false);
      router.refresh();
    } else if (result && result.ok === false) {
      toast.error(result.message ?? "Update failed");
    }
  }, [result, router]);

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

  function exportToExcel() {
    const rows = table.getFilteredRowModel().rows.map(r => r.original);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, exportFileName);
  }

  const startEdit = (rowId: string, rowData: Member) => {
    setEditRowId(rowId);
    setDraftById({
      [rowData.id]: {
        firstName: rowData.firstName ?? "",
        lastName:  rowData.lastName  ?? "",
        phone:     rowData.phone     ?? "",
        role:      rowData.role      ?? null,
      }
    });
    setAnyChanges(false);
  };

  const cancelEdit = () => {
    setEditRowId(null);
    setDraftById({});
    setAnyChanges(false);
  };

  // Only editable keys here
  type EditableKey = "firstName" | "lastName" | "phone" | "role";
  const handleChange = (rowId: string, field: EditableKey, value: string) => {
    setAnyChanges(true);
    setDraftById(prev => ({ ...prev, [rowId]: { ...prev[rowId], [field]: value } }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center py-4 gap-2">
          <Input
            placeholder="Search..."
            value={globalFilter ?? ""}
            onChange={e => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline" onClick={exportToExcel} type="button">
            Export to Excel
          </Button>

          {/* -------- Add User dialog & action -------- */}
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button>Add user</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite user</DialogTitle>
              </DialogHeader>

              <form
                action={async (formData) => {
                  formData.set("email", newEmail);
                  if (!newEmail) {
                    toast.error("Email is required");
                    return;
                  }

                  const res = await inviteUserByEmail(formData)
                     const saveToDatabase = await saveTemporaryUser(
                   newEmail, orgId,
                   
                  )
                  router.refresh()
                  if (res?.ok) {
                    toast.success("Invitation email sent");
                    setNewEmail("");
                    setOpenAdd(false);
                  } else {
                    toast.error(res?.message ?? "Failed to send invite");
                  }
                }}
              >
                <Input
                  type="email"
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-3"
                  required
                />

                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="ghost" onClick={() => setOpenAdd(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Send invite</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {anyChanges && (
            <>
              <Button type="submit" form="members-form">Save changes</Button>
              <Button variant="ghost" type="button" onClick={cancelEdit}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form
          id="members-form"
          action={(fd: FormData) => {
            const id = editRowId ? Object.keys(draftById)[0] : "";
            if (!id) return;
            fd.set("id", id);
            const patch = draftById[id] ?? {};
            if (patch.firstName != null) fd.set("firstName", String(patch.firstName));
            if (patch.lastName  != null) fd.set("lastName",  String(patch.lastName));
            if (patch.phone     != null) fd.set("phone",     String(patch.phone));
            if (patch.role      != null) fd.set("role",      String(patch.role));
            // @ts-expect-error bound server action
            return action(fd);
          }}
        >
          <div className="w-full overflow-x-auto">
            <div className="mb-2 text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} of {data.length} results
            </div>

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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map(row => {
                    const r = row.original;
                    const isEditing = editRowId === row.id;
                    const draft = draftById[r.id] ?? {};

                    return (
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                        {row.getVisibleCells().map(cell => {
                          const col = cell.column.id as keyof Member;

                          // Email is always read-only
                          if (col === "email") {
                            return (
                              <TableCell key={cell.id}>
                                <span>{r.email ?? ""}</span>
                              </TableCell>
                            );
                          }

                          // Editable fields in edit mode
                          if (isEditing && (col === "firstName" || col === "lastName" || col === "phone")) {
                            return (
                              <TableCell key={cell.id}>
                                <Input
                                  value={String(
                                    (draft[col as EditableKey] ??
                                      (r[col] ?? "")) as string
                                  )}
                                  onChange={(e) =>
                                    handleChange(r.id, col as EditableKey, e.currentTarget.value)
                                  }
                                />
                              </TableCell>
                            );
                          }

                          if (isEditing && col === "role") {
                            return (
                              <TableCell key={cell.id}>
                                <Select
                                  value={(draft.role ?? r.role ?? "") as string}
                                  onValueChange={(v) => handleChange(r.id, "role", v)}
                                >
                                  <SelectTrigger className="w-[220px]">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROLE_OPTIONS.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            );
                          }

                          // Read-only display (not editing)
                          const value = r[col];
                          const display =
                            col === "role"
                              ? ROLE_OPTIONS.find(o => o.value === value)?.label ?? ""
                              : String(value ?? "");

                          return (
                            <TableCell key={cell.id} className="whitespace-normal">
                              <span>{display}</span>
                            </TableCell>
                          );
                        })}

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" type="button">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {!isEditing ? (
                                <DropdownMenuItem onClick={() => startEdit(row.id, r)}>
                                  Edit
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => { /* use Save changes button above */ }}>
                                  Use “Save changes” above
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="cursor-pointer text-red-600" disabled>
                                Delete (not implemented)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center">
                      No data found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

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
      </CardContent>
    </Card>
  );

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
}
