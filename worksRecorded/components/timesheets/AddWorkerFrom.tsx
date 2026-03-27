"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createTeamMember } from "@/server/actions/timesheets-actions";
import { checkPhoneUnique } from "@/lib/utils/Timesheets/phone-check";
import { COUNTRY_CALLING_CODES } from "@/lib/constants/countryCallingCodes";

const nameRegex = /^[\p{L}][\p{L}\s'-]{1,49}$/u;

const normalizePhonePart = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  return digits;
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
  phone: z
    .string()
    .transform((s) => normalizePhonePart(s))
    .refine((value) => value.length >= 6, "Phone number is too short")
    .refine((value) => value.length <= 14, "Phone number is too long"),
  countryCode: z.string().regex(/^\d{1,4}$/, "Select country code"),
  siteId: z.string().min(1),
}).transform((data) => ({
  ...data,
  phone: `${data.countryCode}${data.phone}`,
}));

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
    siteId,
    phone: "",
    countryCode: "371",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormState;
        if (path) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      const firstError =
        parsed.error.issues[0]?.message ?? "Please fix validation errors.";
      toast.error(firstError);
      return;
    }

    const data: NormalizedForm = parsed.data;

    startTransition(async () => {
      const phoneCheck = await checkPhoneUnique(data.phone);
      if (!phoneCheck.unique) {
        setErrors((prev) => ({ ...prev, phone: "Phone number already used" }));
        toast.error("Phone number already used");
        return;
      }

      const res = await createTeamMember({
        name: data.name,
        surname: data.surname,
        siteId: data.siteId,
        phone: data.phone,
      });

      if (res.success) {
        toast.success("Worker added!");
        setForm({
          name: "",
          surname: "",
          siteId,
          phone: "",
          countryCode: data.countryCode,
        });
        setErrors({});
        onSuccess?.(res.worker);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to add worker");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="John"
          value={form.name}
          onChange={handleChange}
          aria-invalid={!!errors.name}
          required
        />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="surname">Surname</Label>
        <Input
          id="surname"
          name="surname"
          placeholder="Doe"
          value={form.surname}
          onChange={handleChange}
          aria-invalid={!!errors.surname}
          required
        />
        {errors.surname && (
          <p className="mt-1 text-xs text-destructive">{errors.surname}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">Phone</Label>
        <div className="flex gap-2">
          <Select
            value={form.countryCode}
            onValueChange={(value) => {
              setForm((prev) => ({ ...prev, countryCode: value }));
              if (errors.countryCode) {
                setErrors((prev) => ({ ...prev, countryCode: undefined }));
              }
            }}
          >
            <SelectTrigger className="w-[220px]" aria-invalid={!!errors.countryCode}>
              <SelectValue placeholder="Country code" />
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
            id="phone"
            name="phone"
            placeholder="24885690"
            inputMode="tel"
            value={form.phone}
            onChange={handleChange}
            aria-invalid={!!errors.phone}
            required
          />
        </div>
        {errors.countryCode && (
          <p className="mt-1 text-xs text-destructive">{errors.countryCode}</p>
        )}
        {errors.phone && (
          <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Add worker"}
        </Button>
      </div>
    </form>
  );
}
