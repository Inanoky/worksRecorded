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
import { z } from "zod"; // <-- Zod

// server actions
import { editUserData, saveTemporaryUser, inviteUserByEmail } from "@/server/actions/settings-actions";

type Role = "project manager" | "site manager";

export type Member = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null; // stored WITHOUT '+'
  role: Role | null;
  status?: string | null;
  reminderTime?: string | Date | null;
  remindersEnabled?: boolean | null;
};

type MembersTableProps = {
  data: Member[];
  pageSize: number;
  exportFileName?: string;
  userid?: string;
  orgId?: string;
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "project manager", label: "Project manager" },
  { value: "site manager", label: "Site manager" },
];

function getColumns(): ColumnDef<Member, any>[] {
  return [
    { accessorKey: "email", header: "Email" },
    { accessorKey: "firstName", header: "First name" },
    { accessorKey: "lastName", header: "Last name" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "role", header: "Role" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "reminderTime", header: "Whatsapp reminder" },
    { accessorKey: "remindersEnabled", header: "Allow reminders" },
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

// ---- Helpers ----
function toHHmm(dt: string | Date | null | undefined) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// display with "+" if digits exist
function formatPhoneForDisplay(v: string | null | undefined) {
  const digits = String(v ?? "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

// keep only digits, max 15
function sanitizePhoneDigits(v: string) {
  return v.replace(/\D/g, "").slice(0, 15);
}

// ---- Zod schema (client-side) ----
const PatchSchema = z.object({
  firstName: z
    .string()
    .trim()
    .max(15, "First name must be ≤ 15 characters")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  lastName: z
    .string()
    .trim()
    .max(15, "Last name must be ≤ 15 characters")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // phone comes in as display form (+digits); store digits only (no '+')
  phone: z
    .string()
    .trim()
    .optional()
    .refine(v => v === undefined || v === "" || /^\+?\d{1,15}$/.test(v), "Phone must be +digits (max 15)")
    .transform(v => (v ? sanitizePhoneDigits(v) : undefined)),
  role: z.enum(["project manager","site manager"]).optional(),
  reminderTime: z.string().optional(),        // ISO string
  remindersEnabled: z.boolean().optional(),
});

export function MembersTable({
  data,
  pageSize,
  exportFileName = "table_data.xlsx",
  userid,
  orgId
}: MembersTableProps) {
  const router = useRouter();
  const columns = React.useMemo(() => getColumns(), []);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});
  const [editRowId, setEditRowId] = React.useState<string | null>(null);
  const [draftById, setDraftById] = React.useState<Record<string, Partial<Member>>>({});
  const [anyChanges, setAnyChanges] = React.useState(false);

  const [openAdd, setOpenAdd] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");

  // Save (server action) — validate with Zod, then strip '+' from phone before save
  const [result, action] = useActionState(async (_prev: any, fd: FormData) => {
    const id = String(fd.get("id") || "");
    if (!id) return { ok: false, message: "Missing id" };

    const raw = {
      firstName: fd.get("firstName")?.toString(),
      lastName: fd.get("lastName")?.toString(),
      phone: fd.get("phone")?.toString(), // may be "+digits"
      role: fd.get("role")?.toString() as Role | undefined,
      reminderTime: fd.get("reminderTime")?.toString(),
      remindersEnabled: (() => {
        const v = fd.get("remindersEnabled");
        return v != null ? String(v) === "true" || String(v) === "on" : undefined;
      })(),
    };

    let parsed: z.infer<typeof PatchSchema>;
    try {
      parsed = PatchSchema.parse(raw);
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message ?? "Validation failed";
      return { ok: false, message: msg };
    }

    // Build patch for DB: phone is digits only (no '+')
    const patch: Partial<Member> = {
      ...(parsed.firstName !== undefined ? { firstName: parsed.firstName } : {}),
      ...(parsed.lastName  !== undefined ? { lastName:  parsed.lastName }  : {}),
      ...(parsed.phone     !== undefined ? { phone:     parsed.phone }     : {}),
      ...(parsed.role      !== undefined ? { role:      parsed.role }       : {}),
      ...(parsed.reminderTime !== undefined ? { reminderTime: parsed.reminderTime } : {}),
      ...(parsed.remindersEnabled !== undefined ? { remindersEnabled: parsed.remindersEnabled } : {}),
    };

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
        // store only digits in draft state
        phone: sanitizePhoneDigits(rowData.phone ?? ""),
        role:  rowData.role ?? null,
        reminderTime: toHHmm(rowData.reminderTime),
        remindersEnabled: !!rowData.remindersEnabled,
      }
    });
    setAnyChanges(false);
  };

  const cancelEdit = () => {
    setEditRowId(null);
    setDraftById({});
    setAnyChanges(false);
  };

  type EditableKey = "firstName" | "lastName" | "phone" | "role" | "reminderTime" | "remindersEnabled";
  const handleChange = (rowId: string, field: EditableKey, value: any) => {
    setAnyChanges(true);
    setDraftById(prev => {
      const next = { ...(prev[rowId] ?? {}) };
      if (field === "phone") {
        // keep only digits in state, limit 15
        next.phone = sanitizePhoneDigits(String(value));
      } else if (field === "firstName" || field === "lastName") {
        // limit to 15 client-side
        const v = String(value).slice(0, 15);
        next[field] = v;
      } else {
        (next as any)[field] = value;
      }
      return { ...prev, [rowId]: next };
    });
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
                  const res = await inviteUserByEmail(formData);
                  await saveTemporaryUser(newEmail, orgId || "");
                  router.refresh();
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

            // Enforce max length and display/save rules before sending
            if (patch.firstName != null) fd.set("firstName", String(patch.firstName).trim().slice(0, 15));
            if (patch.lastName  != null) fd.set("lastName",  String(patch.lastName).trim().slice(0, 15));

            if (patch.phone != null) {
              // draft keeps digits only; display uses '+'
              const digits = sanitizePhoneDigits(String(patch.phone));
              // for UI we show +; for DB we save without '+'
              fd.set("phone", digits); // <-- save without '+'
            }

            if (patch.role != null) fd.set("role", String(patch.role));

            if (patch.reminderTime != null && patch.reminderTime !== "") {
              fd.set("reminderTime", new Date(`1970-01-01T${patch.reminderTime}:00`).toISOString());
            }
            if (patch.remindersEnabled != null) {
              fd.set("remindersEnabled", String(!!patch.remindersEnabled));
            }
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

                          // reminderTime
                          if (col === "reminderTime") {
                            if (isEditing) {
                              const valueHHmm = (draft.reminderTime as string | undefined) ?? toHHmm(r.reminderTime);
                              return (
                                <TableCell key={cell.id}>
                                  <Input
                                    type="time"
                                    value={valueHHmm}
                                    onChange={(e) => handleChange(r.id, "reminderTime", e.currentTarget.value)}
                                    className="border rounded px-2 py-1"
                                  />
                                </TableCell>
                              );
                            }
                            return (
                              <TableCell key={cell.id}>
                                {r.reminderTime
                                  ? new Date(r.reminderTime as any).toLocaleTimeString([], {
                                      hour: "2-digit", minute: "2-digit", hour12: false
                                    })
                                  : ""}
                              </TableCell>
                            );
                          }

                          // remindersEnabled
                          if (col === "remindersEnabled") {
                            if (isEditing) {
                              const checked = (draft.remindersEnabled as boolean | undefined) ?? !!r.remindersEnabled;
                              return (
                                <TableCell key={cell.id}>
                                  <label className="inline-flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => handleChange(r.id, "remindersEnabled", e.currentTarget.checked)}
                                    />
                                    <span>{checked ? "Enabled" : "Disabled"}</span>
                                  </label>
                                </TableCell>
                              );
                            }
                            return <TableCell key={cell.id}>{r.remindersEnabled ? "Enabled" : "Disabled"}</TableCell>;
                          }

                          // Email read-only
                          if (col === "email") {
                            return (
                              <TableCell key={cell.id}>
                                <span>{r.email ?? ""}</span>
                              </TableCell>
                            );
                          }

                          // Editable text fields
                          if (isEditing && (col === "firstName" || col === "lastName" || col === "phone")) {
                            if (col === "phone") {
                              const digits = String(draft.phone ?? r.phone ?? "");
                              return (
                                <TableCell key={cell.id}>
                                  <Input
                                    inputMode="tel"
                                    pattern="\+?\d{1,15}"
                                    maxLength={16} // '+' + 15 digits
                                    value={formatPhoneForDisplay(digits)}
                                    onChange={(e) => handleChange(r.id, "phone", e.currentTarget.value)}
                                    placeholder="+371xxxxxxxx"
                                  />
                                </TableCell>
                              );
                            }

                            // firstName / lastName
                            type EditTxt = "firstName" | "lastName";
                            const val = String((draft[col as EditTxt] ?? (r[col] ?? "")) as string);
                            return (
                              <TableCell key={cell.id}>
                                <Input
                                  value={val}
                                  maxLength={15}
                                  onChange={(e) => handleChange(r.id, col as EditTxt, e.currentTarget.value)}
                                />
                              </TableCell>
                            );
                          }

                          // Role select
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

                          // read-only for others
                          const value = r[col as keyof Member];
                          const display =
                            col === "role"
                              ? ROLE_OPTIONS.find(o => o.value === value)?.label ?? ""
                              : col === "phone"
                                ? formatPhoneForDisplay(String(value ?? "")) // display with '+'
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
                              {editRowId !== row.id ? (
                                <DropdownMenuItem onClick={() => startEdit(row.id, row.original)}>
                                  Edit
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => {}}>
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
