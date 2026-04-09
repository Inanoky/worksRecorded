"use client";
import React from "react";
import { ScrollTable } from "../_templates/scrollAreaTemplate";
import { useRouter } from "next/navigation";
import { deleteTeamMember, editTeamMember } from "@/server/actions/timesheets-actions";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddWorkerForm } from "@/components/timesheets/AddWorkerFrom";
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
import { getWorkersUiMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

type WorkerRow = {
  id: string;
  name: string;
  surname: string;
  phone: string;
  isClockedIn: string;
  lastWorkDate: string;
  lastWorkType: string;
};

type WorkerTableCardProps = {
  siteId: string;
  initialWorkers: WorkerRow[];
  organizationLanguage?: string | null;
};

const DEFAULT_COUNTRY_CODE = "371";

const normalizePhonePart = (raw: string) => (raw || "").replace(/\D/g, "");

function splitPhone(phone: string) {
  const digits = normalizePhonePart(phone);
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

const EMPTY_EDIT_FORM = {
  id: "",
  name: "",
  surname: "",
  countryCode: DEFAULT_COUNTRY_CODE,
  phone: "",
};

export function WorkerTableCard({ siteId, initialWorkers, organizationLanguage }: WorkerTableCardProps) {
  const router = useRouter();
  const t = getWorkersUiMessages(normalizeOrganizationLanguage(organizationLanguage));
  const [open, setOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editPending, startEditTransition] = React.useTransition();
  const [editForm, setEditForm] = React.useState(EMPTY_EDIT_FORM);

  async function handleDeleteRow(id: string) {
    const res = await deleteTeamMember(id);
    if (res.success) {
      toast.success("Worker deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete worker");
    }
  }

  function handleStartEdit(worker: WorkerRow) {
    const parsedPhone = splitPhone(worker.phone ?? "");

    setEditForm({
      id: worker.id,
      name: worker.name ?? "",
      surname: worker.surname ?? "",
      countryCode: parsedPhone.countryCode,
      phone: parsedPhone.phone,
    });
    setEditOpen(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!editForm.id || !editForm.name.trim() || !editForm.surname.trim()) {
      toast.error("Name and surname are required");
      return;
    }

    const normalizedPhone = normalizePhonePart(editForm.phone);
    if (normalizedPhone && normalizedPhone.length < 6) {
      toast.error("Phone number is too short");
      return;
    }
    if (normalizedPhone.length > 14) {
      toast.error("Phone number is too long");
      return;
    }

    const fullPhone = normalizedPhone
      ? `${editForm.countryCode}${normalizedPhone}`
      : undefined;

    startEditTransition(async () => {
      const res = await editTeamMember({
        id: editForm.id,
        name: editForm.name.trim(),
        surname: editForm.surname.trim(),
        phone: fullPhone,
        siteId,
      });

      if (res.success) {
        toast.success("Worker updated");
        setEditOpen(false);
        setEditForm(EMPTY_EDIT_FORM);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update worker");
      }
    });
  }

  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base md:text-lg">{t.workersOnSite}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t.workersDescription}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">{t.addWorker}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.addWorker}</DialogTitle>
              <DialogDescription>
                {t.addWorkerDescription}
              </DialogDescription>
            </DialogHeader>
            <AddWorkerForm
              siteId={siteId}
              organizationLanguage={organizationLanguage}
              onSuccess={() => {
                setOpen(false);
              }}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-[260px] rounded-md border bg-background">
          <ScrollTable
            data={initialWorkers}
            pageSize={25}
            visibleColumns={[2, 3, 5, 6, 7, 8]}
            columnLabels={[
              "ID",
              t.firstName,
              t.lastName,
              "",
              t.phone,
              t.onSite,
              t.lastWorkDate,
              t.lastWorkType,
            ]}
            toolbar={false}
            onDeleteRow={handleDeleteRow}
            onEditRow={(row) => handleStartEdit(row as WorkerRow)}
          />
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t.totalWorkers}: {initialWorkers.length}</span>
      </CardFooter>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.editWorker}</DialogTitle>
            <DialogDescription>{t.updateWorkerInformation}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-name">{t.name}</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-surname">{t.surname}</Label>
              <Input
                id="edit-surname"
                value={editForm.surname}
                onChange={(e) => setEditForm((prev) => ({ ...prev, surname: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-phone">{t.phone}</Label>
              <div className="flex gap-2">
                <Select
                  value={editForm.countryCode}
                  onValueChange={(value) => {
                    setEditForm((prev) => ({ ...prev, countryCode: value }));
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder={t.countryCode} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CALLING_CODES.map((country) => (
                      <SelectItem
                        key={`${country.iso2}-${country.dialCode}`}
                        value={country.dialCode}
                      >
                        {country.name} (+{country.dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="edit-phone"
                  inputMode="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="24885690"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(false)}
                disabled={editPending}
              >
                {t.cancel}
              </Button>
              <Button type="submit" size="sm" disabled={editPending}>
                {editPending ? "..." : t.saveChanges}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
