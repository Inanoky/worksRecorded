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

type WorkerRow = {
  id: string;
  name: string;
  surname: string;
  personalId?: string;
  phone: string;
  isClockedIn: string;
  lastWorkDate: string;
  lastWorkType: string;
};

type WorkerTableCardProps = {
  siteId: string;
  initialWorkers: WorkerRow[];
};

const EMPTY_EDIT_FORM = {
  id: "",
  name: "",
  surname: "",
  personalId: "",
  phone: "",
};

export function WorkerTableCard({ siteId, initialWorkers }: WorkerTableCardProps) {
  const router = useRouter();
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
    setEditForm({
      id: worker.id,
      name: worker.name ?? "",
      surname: worker.surname ?? "",
      personalId: worker.personalId ?? "",
      phone: worker.phone ?? "",
    });
    setEditOpen(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!editForm.id || !editForm.name.trim() || !editForm.surname.trim()) {
      toast.error("Name and surname are required");
      return;
    }

    startEditTransition(async () => {
      const res = await editTeamMember({
        id: editForm.id,
        name: editForm.name.trim(),
        surname: editForm.surname.trim(),
        personalId: editForm.personalId.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
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
          <CardTitle className="text-base md:text-lg">Workers on site</CardTitle>
          <p className="text-xs text-muted-foreground">
            Create, update, and delete workers available for timesheets on this project.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add worker</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add worker</DialogTitle>
              <DialogDescription>
                Create a new worker profile for this site.
              </DialogDescription>
            </DialogHeader>
            <AddWorkerForm
              siteId={siteId}
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
            visibleColumns={[2, 3, 4, 5, 6, 7, 8]}
            columnLabels={[
              "ID",
              "First Name",
              "Last Name",
              "Personal ID",
              "Phone",
              "On site?",
              "Last Work Date",
              "Last Work Type",
            ]}
            toolbar={false}
            onDeleteRow={handleDeleteRow}
            onEditRow={(row) => handleStartEdit(row as WorkerRow)}
          />
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Total workers: {initialWorkers.length}</span>
      </CardFooter>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit worker</DialogTitle>
            <DialogDescription>Update worker information.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-surname">Surname</Label>
              <Input
                id="edit-surname"
                value={editForm.surname}
                onChange={(e) => setEditForm((prev) => ({ ...prev, surname: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-personal-id">Personal ID</Label>
              <Input
                id="edit-personal-id"
                value={editForm.personalId}
                onChange={(e) => setEditForm((prev) => ({ ...prev, personalId: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(false)}
                disabled={editPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editPending}>
                {editPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
