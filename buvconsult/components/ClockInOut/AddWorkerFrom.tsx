// app/components/AddWorkerForm.tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createTeamMember } from "@/app/actions/clockinActions";

export function AddWorkerForm({siteId, onSuccess, onCancel }: { siteId: string; onSuccess?: (w: any) => void, onCancel?: () => void }) {
  const [form, setForm] = useState({ name: "", surname: "", personalId: "", siteId: siteId , phone: ""});
  const [pending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTeamMember({
        name: form.name,
        surname: form.surname,
        personalId: form.personalId,
        siteId: siteId,
        phone: form.phone
      });
      if (res.success) {
        toast.success("Worker added!");
        setForm({ name: "", surname: "", personalId: "", siteId: "" , phone: ""});
        onSuccess?.(res.worker);
      } else {
        toast.error(res.error || "Failed to add worker");
      }
    });
  };

  return (
    <Card className="max-w-md w-full h-80 ">
      <form onSubmit={handleSubmit} className="grid gap-2">
        <CardHeader>
          <CardTitle>Add Worker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <Input
            name="surname"
            placeholder="Surname"
            value={form.surname}
            onChange={handleChange}
            required
          />
          <Input
            name="personalId"
            placeholder="Personal ID"
            value={form.personalId}
            onChange={handleChange}
            required
          />
           <Input
            name="phone"
            placeholder="phone number"
            value={form.phone}
            onChange={handleChange}
            required
          />
         
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Add Worker"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
