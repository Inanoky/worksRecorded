// app/components/AddWorkerForm.tsx
"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createTeamMember } from "@/server/actions/timesheets-actions";
import { checkPhoneUnique } from "@/app/utils/Timesheets/phoneCheck";

// --- Zod schema & helpers ---

// Unicode-friendly name validation: letters, spaces, hyphens, apostrophes; 2–50 chars
const nameRegex = /^[\p{L}][\p{L}\s'-]{1,49}$/u;

const normalizePhone = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, ""); // keep numbers only
  // If already starts with 371, keep; else prefix it
  const withCc = digits.startsWith("371") ? digits : `371${digits}`;
  return withCc;
};

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .regex(nameRegex, "Only letters, spaces, apostrophes and hyphens are allowed"),
  surname: z
    .string()
    .trim()
    .min(2, "Surname must be at least 2 characters")
    .max(50, "Surname must be at most 50 characters")
    .regex(nameRegex, "Only letters, spaces, apostrophes and hyphens are allowed"),
  personalId: z
    .string()
    .trim()
    .regex(/^\d{6}-\d{5}$/, "Personal ID must be in the format xxxxxx-xxxxx"),
  phone: z
    .string()
    .transform((s) => normalizePhone(s)) // normalize to digits, ensure it starts with 371
    .refine((s) => /^371\d{8}$/.test(s), {
      message: "Incorrect phone number",
    }),
  siteId: z.string().min(1),
});

type FormState = z.input<typeof formSchema>;
type NormalizedForm = z.output<typeof formSchema>;

export function AddWorkerForm({
  siteId,
  onSuccess,
  onCancel,
}: {
  siteId: string;
  onSuccess?: (w: any) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    name: "",
    surname: "",
    personalId: "",
    siteId,
    phone: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pending, startTransition] = useTransition();
   const router = useRouter(); 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // clear field-specific error on change
    if (errors[e.target.name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate & normalize
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormState;
        if (path) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      const firstError = parsed.error.issues[0]?.message ?? "Please fix validation errors.";
      toast.error(firstError);
      return;
    }

    const data: NormalizedForm = parsed.data;

    startTransition(async () => {


         // --- NEW: check phone uniqueness ---
      const phoneCheck = await checkPhoneUnique(data.phone);
      if (!phoneCheck.unique) {
        setErrors((prev) => ({ ...prev, phone: "Phone number already used" }));
        toast.error("Phone number already used");
        return;
      }
















      const res = await createTeamMember({
        name: data.name,
        surname: data.surname,
        personalId: data.personalId,
        siteId: data.siteId,
        phone: data.phone, // already normalized like 371XXXXXXXX
      });

      if (res.success) {
        toast.success("Worker added!");
        setForm({ name: "", surname: "", personalId: "", siteId, phone: "" });
        setErrors({});
        onSuccess?.(res.worker);
        router.push(`/dashboard/sites/${siteId}/timesheets`);
      } else {
        toast.error(res.error || "Failed to add worker");
      }
    });
  };

  return (
    <Card className="max-w-md w-full h-85">
      <form onSubmit={handleSubmit} className="grid gap-2">
        <CardHeader>
          <CardTitle>Add Worker</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div>
            <Input
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              aria-invalid={!!errors.name}
              required
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Input
              name="surname"
              placeholder="Surname"
              value={form.surname}
              onChange={handleChange}
              aria-invalid={!!errors.surname}
              required
            />
            {errors.surname && <p className="text-sm text-red-600 mt-1">{errors.surname}</p>}
          </div>

          <div>
            <Input
              name="personalId"
              placeholder="Personal ID (e.g. 010203-12345)"
              value={form.personalId}
              onChange={handleChange}
              aria-invalid={!!errors.personalId}
              required
            />
            {errors.personalId && <p className="text-sm text-red-600 mt-1">{errors.personalId}</p>}
          </div>

          <div>
            <Input
              name="phone"
              placeholder="+371 24885690"
              inputMode="tel"
              value={form.phone}
              onChange={handleChange}
              aria-invalid={!!errors.phone}
              required
            />
           
            {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
          </div>
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
