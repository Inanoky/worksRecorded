"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
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
import { getToastMessages, getWorkersUiMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";
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
  organizationLanguage?: string | null;
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
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const workerValidationSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be at most 50 characters")
    .regex(NAME_REGEX, "First name contains invalid characters"),
  surname: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be at most 50 characters")
    .regex(NAME_REGEX, "Last name contains invalid characters"),
  countryCode: z.string().min(1, "Country code is required"),
  phone: z.string().optional(),
  siteId: z.string().optional(),
  reminderTime: z.string().optional(),
  reminderText: z.string().max(300, "Reminder text must be at most 300 characters").optional(),
});

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

export function WorkersSettingsTable({ orgId, workers, projects, organizationLanguage }: Props) {
  const router = useRouter();
  const language = normalizeOrganizationLanguage(organizationLanguage);
  const t = getWorkersUiMessages(language);
  const toastMessages = getToastMessages(language);
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

  function validateWorkerInput(worker: WorkerFormState, mode: "create" | "edit") {
    const parsed = workerValidationSchema.safeParse(worker);
    if (!parsed.success) return language === "lv" ? toastMessages.correctForm : parsed.error.issues[0]?.message ?? toastMessages.correctForm;

    if (mode === "edit" && !worker.id) {
      return toastMessages.correctForm;
    }

    const normalizedPhone = normalizePhonePart(worker.phone);
    if (normalizedPhone && (normalizedPhone.length < 7 || normalizedPhone.length > 15)) {
      return `${toastMessages.phoneTooShort} / ${toastMessages.phoneTooLong}`;
    }

    if (worker.reminderTime && !HHMM_REGEX.test(worker.reminderTime)) {
      return toastMessages.correctForm;
    }

    if (worker.siteId !== "none" && worker.siteId && !projects.some((project) => project.id === worker.siteId)) {
      return toastMessages.correctForm;
    }

    return null;
  }

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
    const validationError = validateWorkerInput(newWorker, "create");
    if (validationError) {
      toast.error(validationError);
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
        toast.success(toastMessages.workerCreated);
        setAddOpen(false);
        setNewWorker((prev) => ({ ...prev, name: "", surname: "", phone: "", siteId: "none" }));
        router.refresh();
      } else {
        toast.error(toastMessages.failedCreateWorker);
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateWorkerInput(editWorker, "edit");
    if (validationError) {
      toast.error(validationError);
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
        toast.success(toastMessages.workerUpdated);
        setEditOpen(false);
        router.refresh();
      } else {
        toast.error(toastMessages.failedUpdateWorker);
      }
    });
  }

  async function handleDelete(workerId: string) {
    const confirmed = window.confirm(t.deleteWorkerConfirm);
    if (!confirmed) return;

    const res = await deleteOrganizationWorker(workerId);
    if (res.ok) {
      toast.success(toastMessages.workerDeleted);
      router.refresh();
    } else {
      toast.error(toastMessages.failedDeleteWorker);
    }
  }

  async function handleSendNow(worker: WorkerRow) {
    try {
      await sendManualReminder({
        targetType: "worker",
        targetId: worker.id,
        reminderText: worker.reminderText?.trim() || null,
      });
      toast.success(toastMessages.reminderSent);
    } catch (error: any) {
      toast.error(error?.message ?? toastMessages.failedSendReminder);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{t.workersSettings}</CardTitle>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">{t.addWorker}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.addWorker}</DialogTitle>
              <DialogDescription>{t.createWorkerAndSetProjectAssignment}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label>{t.firstName}</Label>
                <Input value={newWorker.name} onChange={(e) => setNewWorker((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>{t.lastName}</Label>
                <Input value={newWorker.surname} onChange={(e) => setNewWorker((p) => ({ ...p, surname: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>{t.phone}</Label>
                <div className="flex gap-2">
                  <Select value={newWorker.countryCode} onValueChange={(v) => setNewWorker((p) => ({ ...p, countryCode: v }))}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder={t.countryCode} /></SelectTrigger>
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
                <Label>{t.project}</Label>
                <Select value={newWorker.siteId} onValueChange={(v) => setNewWorker((p) => ({ ...p, siteId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t.project} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.noProject}</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setAddOpen(false)} disabled={pending}>{t.cancel}</Button>
                <Button type="submit" disabled={pending}>{pending ? "..." : t.addWorker}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.worker}</TableHead>
              <TableHead>{t.phone}</TableHead>
              <TableHead>{t.project}</TableHead>
              <TableHead>{t.reminderTime}</TableHead>
              <TableHead>{t.reminderEnabled}</TableHead>
              <TableHead>{t.reminderText}</TableHead>
              <TableHead>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => (
              <TableRow key={worker.id}>
                <TableCell>{`${worker.name ?? ""} ${worker.surname ?? ""}`.trim() || t.unnamed}</TableCell>
                <TableCell>{worker.phone ?? ""}</TableCell>
                <TableCell>{projects.find((p) => p.id === worker.siteId)?.name ?? t.noProject}</TableCell>
                <TableCell>{toHHmm(worker.reminderTime) || "-"}</TableCell>
                <TableCell>{worker.remindersEnabled ? t.enabled : t.disabled}</TableCell>
                <TableCell>{worker.reminderText ?? ""}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"><MoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t.actions}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openEdit(worker)}>{t.edit}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendNow(worker)}>{t.sendNow}</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(worker.id)}>{t.delete}</DropdownMenuItem>
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
            <DialogTitle>{t.editWorker}</DialogTitle>
            <DialogDescription>{t.allWorkerEditsDoneInThisModal}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>{t.firstName}</Label>
              <Input value={editWorker.name} onChange={(e) => setEditWorker((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>{t.lastName}</Label>
              <Input value={editWorker.surname} onChange={(e) => setEditWorker((p) => ({ ...p, surname: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>{t.phone}</Label>
              <div className="flex gap-2">
                <Select value={editWorker.countryCode} onValueChange={(v) => setEditWorker((p) => ({ ...p, countryCode: v }))}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder={t.countryCode} /></SelectTrigger>
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
              <Label>{t.project}</Label>
              <Select value={editWorker.siteId} onValueChange={(v) => setEditWorker((p) => ({ ...p, siteId: v }))}>
                <SelectTrigger><SelectValue placeholder={t.project} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.noProject}</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t.reminderTime}</Label>
              <Input type="time" step={60} lang="en-GB" value={editWorker.reminderTime} onChange={(e) => setEditWorker((p) => ({ ...p, reminderTime: e.target.value }))} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editWorker.remindersEnabled} onChange={(e) => setEditWorker((p) => ({ ...p, remindersEnabled: e.target.checked }))} />
              {t.reminderEnabled}
            </label>
            <div className="space-y-1">
              <Label>{t.reminderText}</Label>
              <Input value={editWorker.reminderText} onChange={(e) => setEditWorker((p) => ({ ...p, reminderText: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={pending}>{t.cancel}</Button>
              <Button type="submit" disabled={pending}>{pending ? "..." : t.saveChanges}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
