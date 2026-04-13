"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { COUNTRY_CALLING_CODES } from "@/lib/constants/countryCallingCodes";
import {
  createOrganizationWorker,
  deleteOrganizationWorker,
  sendManualReminder,
  updateWorkerOrganizationSettings,
} from "@/server/actions/settings-actions";

type WorkerRow = {
  id: string;
  name: string | null;
  surname: string | null;
  phone: string | null;
  siteId: string | null;
  reminderTime: string | Date | null;
  remindersEnabled: boolean | null;
  reminderText: string | null;
};

type ProjectOption = { id: string; name: string };

type Props = {
  orgId: string;
  workers: WorkerRow[];
  projects: ProjectOption[];
};

type WorkerFormState = {
  id: string;
  name: string;
  surname: string;
  countryCode: string;
  phone: string;
  siteId: string;
  reminderTime: string;
  remindersEnabled: boolean;
  reminderText: string;
};

const DEFAULT_COUNTRY_CODE = "371";
const normalizePhonePart = (raw: string) => (raw || "").replace(/\D/g, "");

function splitPhone(phone: string | null | undefined) {
  const digits = normalizePhonePart(phone || "");
  if (!digits) return { countryCode: DEFAULT_COUNTRY_CODE, phone: "" };

  const codesByLength = [...COUNTRY_CALLING_CODES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .map((item) => item.dialCode);

  const matchedCode = codesByLength.find((code) => digits.startsWith(code));
  if (!matchedCode) return { countryCode: DEFAULT_COUNTRY_CODE, phone: digits };

  return { countryCode: matchedCode, phone: digits.slice(matchedCode.length) };
}

function toHHmm(dt: string | Date | null | undefined) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function WorkersSettingsTable({ orgId, workers, projects }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [newWorker, setNewWorker] = React.useState<WorkerFormState>({
    id: "",
    name: "",
    surname: "",
    countryCode: DEFAULT_COUNTRY_CODE,
    phone: "",
    siteId: "none",
    reminderTime: "",
    remindersEnabled: false,
    reminderText: "",
  });

  const [editWorker, setEditWorker] = React.useState<WorkerFormState>(newWorker);

  function openEdit(worker: WorkerRow) {
    const parsedPhone = splitPhone(worker.phone);
    setEditWorker({
      id: worker.id,
      name: worker.name ?? "",
      surname: worker.surname ?? "",
      countryCode: parsedPhone.countryCode,
      phone: parsedPhone.phone,
      siteId: worker.siteId ?? "none",
      reminderTime: toHHmm(worker.reminderTime),
      remindersEnabled: !!worker.remindersEnabled,
      reminderText: worker.reminderText ?? "",
    });
    setEditOpen(true);
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorker.name.trim() || !newWorker.surname.trim()) {
      toast.error("Name and surname are required");
      return;
    }

    startTransition(async () => {
      const res = await createOrganizationWorker({
        organizationId: orgId,
        name: newWorker.name.trim(),
        surname: newWorker.surname.trim(),
        phone: newWorker.phone ? `${newWorker.countryCode}${normalizePhonePart(newWorker.phone)}` : null,
        siteId: newWorker.siteId === "none" ? null : newWorker.siteId,
      });

      if (res.ok) {
        toast.success("Worker created");
        setAddOpen(false);
        setNewWorker((prev) => ({ ...prev, name: "", surname: "", phone: "", siteId: "none" }));
        router.refresh();
      } else {
        toast.error("Failed to create worker");
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editWorker.id || !editWorker.name.trim() || !editWorker.surname.trim()) {
      toast.error("Name and surname are required");
      return;
    }

    startTransition(async () => {
      const res = await updateWorkerOrganizationSettings(editWorker.id, {
        name: editWorker.name.trim(),
        surname: editWorker.surname.trim(),
        phone: editWorker.phone ? `${editWorker.countryCode}${normalizePhonePart(editWorker.phone)}` : null,
        siteId: editWorker.siteId === "none" ? null : editWorker.siteId,
        reminderTime: editWorker.reminderTime ? new Date(`1970-01-01T${editWorker.reminderTime}:00.000Z`) : null,
        remindersEnabled: editWorker.remindersEnabled,
        reminderText: editWorker.reminderText.trim() || null,
        timezone: "Europe/Riga",
      });

      if (res.ok) {
        toast.success("Worker updated");
        setEditOpen(false);
        router.refresh();
      } else {
        toast.error("Failed to update worker");
      }
    });
  }

  async function handleDelete(workerId: string) {
    const res = await deleteOrganizationWorker(workerId);
    if (res.ok) {
      toast.success("Worker deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete worker");
    }
  }

  async function handleSendNow(worker: WorkerRow) {
    try {
      await sendManualReminder({
        targetType: "worker",
        targetId: worker.id,
        reminderText: worker.reminderText?.trim() || null,
      });
      toast.success("Reminder sent");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to send reminder");
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Workers settings</CardTitle>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add worker</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add worker</DialogTitle>
              <DialogDescription>Create worker and set project assignment.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label>First name</Label>
                <Input value={newWorker.name} onChange={(e) => setNewWorker((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Last name</Label>
                <Input value={newWorker.surname} onChange={(e) => setNewWorker((p) => ({ ...p, surname: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <div className="flex gap-2">
                  <Select value={newWorker.countryCode} onValueChange={(v) => setNewWorker((p) => ({ ...p, countryCode: v }))}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Country code" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CALLING_CODES.map((country) => (
                        <SelectItem key={`${country.iso2}-${country.dialCode}`} value={country.dialCode}>
                          {country.name} (+{country.dialCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={newWorker.phone} onChange={(e) => setNewWorker((p) => ({ ...p, phone: normalizePhonePart(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Project</Label>
                <Select value={newWorker.siteId} onValueChange={(v) => setNewWorker((p) => ({ ...p, siteId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setAddOpen(false)} disabled={pending}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? "..." : "Add worker"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Reminder time</TableHead>
              <TableHead>Reminder enabled</TableHead>
              <TableHead>Reminder text</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => (
              <TableRow key={worker.id}>
                <TableCell>{`${worker.name ?? ""} ${worker.surname ?? ""}`.trim() || "Unnamed"}</TableCell>
                <TableCell>{worker.phone ?? ""}</TableCell>
                <TableCell>{projects.find((p) => p.id === worker.siteId)?.name ?? "No project"}</TableCell>
                <TableCell>{toHHmm(worker.reminderTime) || "-"}</TableCell>
                <TableCell>{worker.remindersEnabled ? "Enabled" : "Disabled"}</TableCell>
                <TableCell>{worker.reminderText ?? ""}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"><MoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openEdit(worker)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendNow(worker)}>Send now</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(worker.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit worker</DialogTitle>
            <DialogDescription>All worker edits are done in this modal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>First name</Label>
              <Input value={editWorker.name} onChange={(e) => setEditWorker((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Last name</Label>
              <Input value={editWorker.surname} onChange={(e) => setEditWorker((p) => ({ ...p, surname: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <div className="flex gap-2">
                <Select value={editWorker.countryCode} onValueChange={(v) => setEditWorker((p) => ({ ...p, countryCode: v }))}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Country code" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CALLING_CODES.map((country) => (
                      <SelectItem key={`${country.iso2}-${country.dialCode}`} value={country.dialCode}>
                        {country.name} (+{country.dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={editWorker.phone} onChange={(e) => setEditWorker((p) => ({ ...p, phone: normalizePhonePart(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Project</Label>
              <Select value={editWorker.siteId} onValueChange={(v) => setEditWorker((p) => ({ ...p, siteId: v }))}>
                <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reminder time</Label>
              <Input type="time" step={60} lang="en-GB" value={editWorker.reminderTime} onChange={(e) => setEditWorker((p) => ({ ...p, reminderTime: e.target.value }))} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editWorker.remindersEnabled} onChange={(e) => setEditWorker((p) => ({ ...p, remindersEnabled: e.target.checked }))} />
              Reminder enabled
            </label>
            <div className="space-y-1">
              <Label>Reminder text</Label>
              <Input value={editWorker.reminderText} onChange={(e) => setEditWorker((p) => ({ ...p, reminderText: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={pending}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "..." : "Save changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
