"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea"; // <-- textbox
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveSiteReminders } from "@/server/actions/reminder-actions";

export default function RemindersTable({ orgId, reminderData }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const initialRows = (reminderData ?? []).map((s) => ({
    siteId: s.id,
    siteName: s.name,
    reminder: s.reminders ?? "", // pre-typed if exists
  }));

  const [rows, setRows] = useState(initialRows);
  const [dirty, setDirty] = useState(false);

  const onTextChange = (siteId, text) => {
    setRows((prev) => prev.map((r) => (r.siteId === siteId ? { ...r, reminder: text } : r)));
    setDirty(true);
  };

  const onSave = () => {
    start(async () => {
      try {
        const payload = rows.map((r) => ({ siteId: r.siteId, reminder: r.reminder }));
        await saveSiteReminders(orgId, payload);
        toast.success("Reminders saved");
        setDirty(false);
        router.refresh();
      } catch (e) {
        toast.error(e?.message ?? "Failed to save reminders");
      }
    });
  };

  const onCancel = () => {
    setRows(initialRows);
    setDirty(false);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Reminders</h3>
        {dirty && (
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={pending}>Save changes</Button>
            <Button variant="ghost" onClick={onCancel} disabled={pending}>Cancel</Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Project</TableHead>
                <TableHead className="w-[70%]">Reminder</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows?.length ? (
                rows.map((r) => (
                  <TableRow key={r.siteId}>
                    <TableCell className="align-top">{r.siteName}</TableCell>
                    <TableCell>
                      <Textarea
                        value={r.reminder}
                        onChange={(e) => onTextChange(r.siteId, e.currentTarget.value)}
                        placeholder="Type a reminder for this project…"
                        rows={3}
                        className="min-h-[96px] resize-y"
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    No projects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
