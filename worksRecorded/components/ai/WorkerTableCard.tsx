"use client";
import React from "react";
import { ScrollTable } from "../_templates/scrollAreaTemplate";
import { useRouter } from "next/navigation";
import { deleteTeamMember } from "@/server/actions/timesheets-actions";
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

type WorkerTableCardProps = {
  siteId: string;
  initialWorkers: any[];
};

export function WorkerTableCard({ siteId, initialWorkers }: WorkerTableCardProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  async function handleDeleteRow(id: string) {
    const res = await deleteTeamMember(id);
    if (res.success) {
      toast.success("Worker deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete worker");
    }
  }

  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base md:text-lg">Workers on site</CardTitle>
          <p className="text-xs text-muted-foreground">
            People available for timesheets on this project.
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
            visibleColumns={[2, 3, 4, 5, 6, 7, 8, 9, 10]}
            columnLabels={[
              "ID",
              "First Name",
              "Last Name",
              "ID",
              "Phone",
              "On site?",
              "Clock In",
              "Last Work",
            ]}
            toolbar={false}
            onDeleteRow={handleDeleteRow}
          />
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Total workers: {initialWorkers.length}</span>
      </CardFooter>
    </Card>
  );
}
