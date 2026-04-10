"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendManualReminder, updateWorkerOrganizationSettings } from "@/server/actions/settings-actions";

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
  workers: WorkerRow[];
  projects: ProjectOption[];
};

function toHHmm(dt: string | Date | null | undefined) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function normalizeHHmmInput(value: string) {
  const digits = value.replace(/[^\d]/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidHHmm(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hh, mm] = value.split(":").map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

export function WorkersSettingsTable({ workers, projects }: Props) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Record<string, Partial<WorkerRow>>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const updateDraft = (id: string, patch: Partial<WorkerRow>) => {
    setDraft((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  };

  const saveRow = async (worker: WorkerRow) => {
    const rowDraft = draft[worker.id] ?? {};
    setSavingId(worker.id);
    try {
      const time = rowDraft.reminderTime !== undefined ? String(rowDraft.reminderTime || "") : toHHmm(worker.reminderTime);
      if (time && !isValidHHmm(time)) {
        toast.error("Use 24-hour format HH:mm (for example 18:30)");
        return;
      }
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

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Workers & project/reminder settings</CardTitle>
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
              return (
                <TableRow key={worker.id}>
                  <TableCell>{`${worker.name ?? ""} ${worker.surname ?? ""}`.trim() || "Unnamed"}</TableCell>
                  <TableCell>{worker.phone ?? ""}</TableCell>
                  <TableCell>
                    <Select
                      value={(workerDraft.siteId ?? worker.siteId ?? "none") as string}
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
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:mm"
                      value={(workerDraft.reminderTime as string | undefined) ?? toHHmm(worker.reminderTime)}
                      onChange={(e) =>
                        updateDraft(worker.id, {
                          reminderTime: normalizeHHmmInput(e.currentTarget.value),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={
                        workerDraft.remindersEnabled !== undefined
                          ? Boolean(workerDraft.remindersEnabled)
                          : Boolean(worker.remindersEnabled)
                      }
                      onChange={(e) => updateDraft(worker.id, { remindersEnabled: e.currentTarget.checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={(workerDraft.reminderText as string | undefined) ?? worker.reminderText ?? ""}
                      onChange={(e) => updateDraft(worker.id, { reminderText: e.currentTarget.value })}
                      placeholder="Reminder text"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button onClick={() => saveRow(worker)} disabled={savingId === worker.id}>
                        {savingId === worker.id ? "Saving..." : "Save"}
                      </Button>
                      <Button variant="outline" onClick={() => sendNow(worker)} disabled={savingId === worker.id}>
                        Send now
                      </Button>
                    </div>
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
