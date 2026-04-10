"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScrollTable } from "../_templates/scrollAreaTemplate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type EditForm = {
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
  if (!digits) {
    return { countryCode: DEFAULT_COUNTRY_CODE, phone: "" };
  }

  const codesByLength = [...COUNTRY_CALLING_CODES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .map((item) => item.dialCode);

  const matchedCode = codesByLength.find((code) => digits.startsWith(code));
  if (!matchedCode) {
    return { countryCode: DEFAULT_COUNTRY_CODE, phone: digits };
  }

  return {
    countryCode: matchedCode,
    phone: digits.slice(matchedCode.length),
  };
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

  const [newWorker, setNewWorker] = React.useState({
    name: "",
    surname: "",
    countryCode: DEFAULT_COUNTRY_CODE,
    phone: "",
    siteId: "none",
  });

  const [editForm, setEditForm] = React.useState<EditForm>({
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

  const tableData = workers.map((w) => ({
    id: w.id,
    name: w.name ?? "",
    surname: w.surname ?? "",
    phone: w.phone ?? "",
    project: projects.find((p) => p.id === w.siteId)?.name ?? "No project",
    reminderTime: toHHmm(w.reminderTime),
    remindersEnabled: w.remindersEnabled ? "Enabled" : "Disabled",
    reminderText: w.reminderText ?? "",
  }));

  async function handleDeleteRow(id: string) {
    const res = await deleteOrganizationWorker(id);
    if (res.ok) {
      toast.success("Worker deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete worker");
    }
  }

  function handleStartEdit(row: any) {
    const source = workers.find((w) => w.id === row.id);
    if (!source) return;

    const parsedPhone = splitPhone(source.phone);
    setEditForm({
      id: source.id,
      name: source.name ?? "",
      surname: source.surname ?? "",
      countryCode: parsedPhone.countryCode,
      phone: parsedPhone.phone,
      siteId: source.siteId ?? "none",
      reminderTime: toHHmm(source.reminderTime),
      remindersEnabled: !!source.remindersEnabled,
      reminderText: source.reminderText ?? "",
    });
    setEditOpen(true);
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorker.name.trim() || !newWorker.surname.trim()) {
      toast.error("Name and surname are required");
      return;
    }

    const normalizedPhone = normalizePhonePart(newWorker.phone);

    startTransition(async () => {
      const res = await createOrganizationWorker({
        organizationId: orgId,
        name: newWorker.name.trim(),
        surname: newWorker.surname.trim(),
        phone: normalizedPhone ? `${newWorker.countryCode}${normalizedPhone}` : null,
        siteId: newWorker.siteId === "none" ? null : newWorker.siteId,
      });

      if (res.ok) {
        toast.success("Worker created");
        setAddOpen(false);
        setNewWorker({ name: "", surname: "", countryCode: DEFAULT_COUNTRY_CODE, phone: "", siteId: "none" });
        router.refresh();
      } else {
        toast.error("Failed to create worker");
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.id || !editForm.name.trim() || !editForm.surname.trim()) {
      toast.error("Name and surname are required");
      return;
    }

    const normalizedPhone = normalizePhonePart(editForm.phone);

    startTransition(async () => {
      const res = await updateWorkerOrganizationSettings(editForm.id, {
        name: editForm.name.trim(),
        surname: editForm.surname.trim(),
        phone: normalizedPhone ? `${editForm.countryCode}${normalizedPhone}` : null,
        siteId: editForm.siteId === "none" ? null : editForm.siteId,
        reminderTime: editForm.reminderTime ? new Date(`1970-01-01T${editForm.reminderTime}:00.000Z`) : null,
        remindersEnabled: editForm.remindersEnabled,
        reminderText: editForm.reminderText.trim() || null,
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

  async function handleSendNow() {
    if (!editForm.id) return;
    try {
      await sendManualReminder({
        targetType: "worker",
        targetId: editForm.id,
        reminderText: editForm.reminderText.trim() || null,
      });
      toast.success("Reminder sent");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to send reminder");
    }
  }

  return (
    <Card className="mt-6 border-muted/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base md:text-lg">Workers settings</CardTitle>
          <p className="text-xs text-muted-foreground">Manage workers, assignment and reminders.</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add worker</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add worker</DialogTitle>
              <DialogDescription>Create a worker and assign project.</DialogDescription>
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
                <Button type="button" variant="ghost" size="sm" onClick={() => setAddOpen(false)} disabled={pending}>Cancel</Button>
                <Button type="submit" size="sm" disabled={pending}>{pending ? "..." : "Add worker"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-[320px] rounded-md border bg-background">
          <ScrollTable
            data={tableData}
            pageSize={25}
            visibleColumns={[1, 2, 3, 4, 5, 6, 7]}
            columnLabels={[
              "ID",
              "First name",
              "Last name",
              "Phone",
              "Project",
              "Reminder time",
              "Reminder enabled",
              "Reminder text",
            ]}
            toolbar={false}
            onDeleteRow={handleDeleteRow}
            onEditRow={handleStartEdit}
          />
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Total workers: {workers.length}</span>
      </CardFooter>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit worker</DialogTitle>
            <DialogDescription>Update worker profile and reminder settings.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>First name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Last name</Label>
              <Input value={editForm.surname} onChange={(e) => setEditForm((p) => ({ ...p, surname: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <div className="flex gap-2">
                <Select value={editForm.countryCode} onValueChange={(v) => setEditForm((p) => ({ ...p, countryCode: v }))}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Country code" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CALLING_CODES.map((country) => (
                      <SelectItem key={`${country.iso2}-${country.dialCode}`} value={country.dialCode}>
                        {country.name} (+{country.dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: normalizePhonePart(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Project</Label>
              <Select value={editForm.siteId} onValueChange={(v) => setEditForm((p) => ({ ...p, siteId: v }))}>
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
              <Input type="time" step={60} lang="en-GB" value={editForm.reminderTime} onChange={(e) => setEditForm((p) => ({ ...p, reminderTime: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Reminder text</Label>
              <Input value={editForm.reminderText} onChange={(e) => setEditForm((p) => ({ ...p, reminderText: e.target.value }))} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editForm.remindersEnabled} onChange={(e) => setEditForm((p) => ({ ...p, remindersEnabled: e.target.checked }))} />
              Reminder enabled
            </label>
            <div className="flex justify-between gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={handleSendNow}>Send now</Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(false)} disabled={pending}>Cancel</Button>
                <Button type="submit" size="sm" disabled={pending}>{pending ? "..." : "Save changes"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
