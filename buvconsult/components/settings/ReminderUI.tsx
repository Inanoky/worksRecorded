"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveSiteReminders } from "@/server/actions/reminder-actions";
import { z } from "zod";

const ReminderItemSchema = z.object({
  siteId: z.string().min(1, "Missing site id"),
  reminder: z.string().trim().max(900, "Reminder must be 900 characters or fewer"),
});
const ReminderPayloadSchema = z.array(ReminderItemSchema);

export default function RemindersTable({ orgId, reminderData }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const initialRows = (reminderData ?? []).map((s) => ({
    siteId: s.id,
    siteName: s.name,
    reminder: s.reminders ?? "",
  }));

  // map of initial reminders for quick per-row comparison
  const initialById = useMemo(
    () =>
      Object.fromEntries(
        (reminderData ?? []).map((s) => [s.id, (s.reminders ?? "") as string])
      ) as Record<string, string>,
    [reminderData]
  );

  const [rows, setRows] = useState(initialRows);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({}); // siteId -> error
  const [changed, setChanged] = useState<Record<string, boolean>>({}); // siteId -> has changed vs initial

  const validateOne = (siteId: string, text: string) => {
    const res = ReminderItemSchema.shape.reminder.safeParse(text.trim());
    setErrors((prev) => ({
      ...prev,
      [siteId]: res.success ? null : res.error.issues[0]?.message || "Invalid",
    }));
  };

  const onTextChange = (siteId: string, text: string) => {
    // Hard cap at 900
    const capped = text.slice(0, 900);

    setRows((prev) =>
      prev.map((r) => (r.siteId === siteId ? { ...r, reminder: capped } : r))
    );

    // mark row as changed only if differs from initial
    const orig = initialById[siteId] ?? "";
    setChanged((prev) => ({ ...prev, [siteId]: capped !== orig }));

    validateOne(siteId, capped);
    setDirty(true);
  };

  const onSave = () => {
    start(async () => {
      try {
        const payload = rows.map((r) => ({ siteId: r.siteId, reminder: r.reminder }));
        const parsed = ReminderPayloadSchema.safeParse(payload);

        if (!parsed.success) {
          const nextErrors: Record<string, string | null> = {};
          parsed.error.issues.forEach((iss) => {
            const idx = Number(iss.path?.[0]);
            if (!Number.isNaN(idx) && payload[idx]) {
              nextErrors[payload[idx].siteId] = iss.message;
            }
          });
          setErrors((prev) => ({ ...prev, ...nextErrors }));
          toast.error("Please fix validation errors before saving.");
          return;
        }

        await saveSiteReminders(orgId, parsed.data);
        toast.success("Reminders saved");
        setDirty(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to save reminders");
      }
    });
  };

  const onCancel = () => {
    setRows(initialRows);
    setErrors({});
    setChanged({});
    setDirty(false);
  };

  const hasErrors = Object.values(errors).some((m) => m);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Reminders</h3>
        {dirty && (
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={pending || hasErrors}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
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
                rows.map((r) => {
                  const err = errors[r.siteId];
                  const isChanged = !!changed[r.siteId];
                  const len = r.reminder.length;

                  return (
                    <TableRow key={r.siteId}>
                      <TableCell className="align-top">{r.siteName}</TableCell>
                      <TableCell>
                        <Textarea
                          value={r.reminder}
                          onChange={(e) => onTextChange(r.siteId, e.currentTarget.value)}
                          placeholder="Type a reminder for this project…"
                          rows={3}
                          className={`min-h-[96px] resize-y ${
                            err ? "border-red-500 focus-visible:ring-red-500" : ""
                          }`}
                          maxLength={900}
                        />
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className={`h-4 ${err ? "text-red-600" : "text-muted-foreground"}`}>
                            {err ? err : isChanged ? "Max 900 characters" : ""}
                          </span>
                          <span className="text-muted-foreground">{len}/900</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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
