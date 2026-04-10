"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createOrganizationWorker,
  deleteOrganizationWorker,
  sendManualReminder,
  updateWorkerOrganizationSettings,
} from "@/server/actions/settings-actions";
import { COUNTRY_CALLING_CODES } from "@/lib/constants/countryCallingCodes";
import { MoreHorizontal } from "lucide-react";

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

function toHHmm(dt: string | Date | null | undefined) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function WorkersSettingsTable({ orgId, workers, projects }: Props) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Record<string, Partial<WorkerRow>>>({});
  const [editRowId, setEditRowId] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newWorker, setNewWorker] = React.useState({
    name: "",
    surname: "",
    phone: "",
    countryCode: "371",
    siteId: "none",
  });

  const updateDraft = (id: string, patch: Partial<WorkerRow>) => {
    setDraft((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  };

  const saveRow = async (worker: WorkerRow) => {
    const rowDraft = draft[worker.id] ?? {};
    setSavingId(worker.id);
    try {
      const time = rowDraft.reminderTime !== undefined ? String(rowDraft.reminderTime || "") : toHHmm(worker.reminderTime);
      await updateWorkerOrganizationSettings(worker.id, {
        siteId: rowDraft.siteId !== undefined ? (rowDraft.siteId || null) : worker.siteId,
        remindersEnabled:
          rowDraft.remindersEnabled !== undefined
            ? Boolean(rowDraft.remindersEnabled)
            : Boolean(worker.remindersEnabled),
        reminderText:
          rowDraft.reminderText !== undefined
            ? (String(rowDraft.reminderText || "").trim() || null)
            : (worker.reminderText || null),
        reminderTime: time ? new Date(`1970-01-01T${time}:00.000Z`) : null,
        timezone: "Europe/Riga",
      });

      toast.success("Worker settings updated");
      setDraft((prev) => {
        const next = { ...prev };
        delete next[worker.id];
        return next;
      });
      setEditRowId(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save worker");
    } finally {
      setSavingId(null);
    }
  };

  const sendNow = async (worker: WorkerRow) => {
    setSavingId(worker.id);
    try {
      const rowDraft = draft[worker.id] ?? {};
      const text = String(rowDraft.reminderText ?? worker.reminderText ?? "").trim();
      await sendManualReminder({
        targetType: "worker",
        targetId: worker.id,
        reminderText: text || null,
      });
      toast.success("Reminder sent");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to send reminder");
    } finally {
      setSavingId(null);
    }
  };

  const createWorker = async () => {
    if (!newWorker.name.trim()) {
      toast.error("Worker first name is required");
      return;
    }

    setCreating(true);
    try {
      await createOrganizationWorker({
        organizationId: orgId,
        name: newWorker.name,
        surname: newWorker.surname || null,
        phone: newWorker.phone ? `${newWorker.countryCode}${newWorker.phone}` : null,
        siteId: newWorker.siteId === "none" ? null : newWorker.siteId,
      });
      toast.success("Worker created");
      setNewWorker({ name: "", surname: "", phone: "", countryCode: "371", siteId: "none" });
      setCreateOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to create worker");
    } finally {
      setCreating(false);
    }
  };

  const deleteWorker = async (workerId: string) => {
    setSavingId(workerId);
    try {
      await deleteOrganizationWorker(workerId);
      toast.success("Worker deleted");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to delete worker");
    } finally {
      setSavingId(null);
    }
  };

  const startEdit = (worker: WorkerRow) => {
    setEditRowId(worker.id);
    setDraft((prev) => ({
      ...prev,
      [worker.id]: {
        siteId: worker.siteId,
        reminderTime: toHHmm(worker.reminderTime),
        remindersEnabled: Boolean(worker.remindersEnabled),
        reminderText: worker.reminderText ?? "",
      },
    }));
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Workers settings</CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add worker</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add worker</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>First name</Label>
                  <Input
                    placeholder="John"
                    value={newWorker.name}
                    onChange={(e) => setNewWorker((prev) => ({ ...prev, name: e.currentTarget.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Last name</Label>
                  <Input
                    placeholder="Doe"
                    value={newWorker.surname}
                    onChange={(e) => setNewWorker((prev) => ({ ...prev, surname: e.currentTarget.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <div className="flex gap-2">
                    <Select
                      value={newWorker.countryCode}
                      onValueChange={(value) => setNewWorker((prev) => ({ ...prev, countryCode: value }))}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Country code" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CALLING_CODES.map((country) => (
                          <SelectItem key={`${country.iso2}-${country.dialCode}`} value={country.dialCode}>
                            {country.name} (+{country.dialCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="24885690"
                      value={newWorker.phone}
                      onChange={(e) => setNewWorker((prev) => ({ ...prev, phone: e.currentTarget.value.replace(/\D/g, "") }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Project</Label>
                  <Select
                    value={newWorker.siteId}
                    onValueChange={(value) => setNewWorker((prev) => ({ ...prev, siteId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
                    Cancel
                  </Button>
                  <Button onClick={createWorker} disabled={creating}>
                    {creating ? "Creating..." : "Add worker"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Current project</TableHead>
              <TableHead>Reminder time</TableHead>
              <TableHead>Reminder enabled</TableHead>
              <TableHead>Reminder text</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => {
              const workerDraft = draft[worker.id] ?? {};
              const isEditing = editRowId === worker.id;
              const resolvedSiteId = (workerDraft.siteId ?? worker.siteId ?? "none") as string;
              const projectName =
                projects.find((project) => project.id === (worker.siteId ?? ""))?.name ?? "No project";
              return (
                <TableRow key={worker.id}>
                  <TableCell>{`${worker.name ?? ""} ${worker.surname ?? ""}`.trim() || "Unnamed"}</TableCell>
                  <TableCell>{worker.phone ?? ""}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={resolvedSiteId}
                        onValueChange={(value) => updateDraft(worker.id, { siteId: value === "none" ? null : value })}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>{projectName}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="time"
                        step={60}
                        lang="en-GB"
                        value={(workerDraft.reminderTime as string | undefined) ?? toHHmm(worker.reminderTime)}
                        onChange={(e) => updateDraft(worker.id, { reminderTime: e.currentTarget.value })}
                      />
                    ) : (
                      <span>{toHHmm(worker.reminderTime) || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={
                          workerDraft.remindersEnabled !== undefined
                            ? Boolean(workerDraft.remindersEnabled)
                            : Boolean(worker.remindersEnabled)
                        }
                        onChange={(e) => updateDraft(worker.id, { remindersEnabled: e.currentTarget.checked })}
                      />
                    ) : (
                      <span>{worker.remindersEnabled ? "Enabled" : "Disabled"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={(workerDraft.reminderText as string | undefined) ?? worker.reminderText ?? ""}
                        onChange={(e) => updateDraft(worker.id, { reminderText: e.currentTarget.value })}
                        placeholder="Reminder text"
                      />
                    ) : (
                      <span>{worker.reminderText ?? ""}</span>
                    )}
                  </TableCell>
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
                        {!isEditing ? (
                          <DropdownMenuItem onClick={() => startEdit(worker)}>Edit</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => saveRow(worker)}>
                            {savingId === worker.id ? "Saving..." : "Save"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => sendNow(worker)} disabled={savingId === worker.id}>
                          Send now
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteWorker(worker.id)} className="text-red-600" disabled={savingId === worker.id}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
