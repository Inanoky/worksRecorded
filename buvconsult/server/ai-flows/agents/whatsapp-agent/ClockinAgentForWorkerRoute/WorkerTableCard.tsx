"use client";
import { ScrollTable } from "@/components/_templates/scrollAreaTemplate";
import { Card, CardTitle, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useTransition, useState } from "react";
import { deleteTeamMember, getWorkersBySiteId } from "@/server/actions/timesheets-actions";
import { toast } from "sonner";

// Pass siteId as prop
export function WorkerTableCard({ siteId, initialWorkers }) {
  const [workers, setWorkers] = useState(initialWorkers);
  const [pending, startTransition] = useTransition();

  async function handleDeleteRow(id) {
    startTransition(async () => {
      const res = await deleteTeamMember(id);
      if (res.success) {
        setWorkers(w => w.filter(worker => worker.id !== id));
        toast.success("Worker deleted");
      } else {
        toast.error("Failed to delete worker");
      }
    });
  }

  return (
    <Card className="h-80">
      <CardHeader>
        <CardTitle>Workers on site</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollTable
          data={workers}
          pageSize={25}
          visibleColumns={[2,3,4,5,6,7,8,9,10]} // adjust to your actual data shape
          columnLabels={["ID", "First Name", "Last Name", "ID", "Phone", "On site?", "Clock In", "Last Work"]}
          toolbar={false}
          onDeleteRow={handleDeleteRow}
        />
      </CardContent>
      <CardFooter>
        something
      </CardFooter>
    </Card>
  );
}
