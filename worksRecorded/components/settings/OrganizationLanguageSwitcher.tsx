"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrganizationLanguage } from "@/server/actions/shared-actions";
import { normalizeOrganizationLanguage, type OrganizationLanguage } from "@/lib/dashboard-i18n";

type Props = {
  currentLanguage?: string | null;
};

export function OrganizationLanguageSwitcher({ currentLanguage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const value = normalizeOrganizationLanguage(currentLanguage);

  const onChange = (language: OrganizationLanguage) => {
    startTransition(async () => {
      const result = await updateOrganizationLanguage(language);

      if (result?.ok) {
        toast.success(language === "lv" ? "Organizācijas valoda nomainīta" : "Organization language updated");
        router.refresh();
        return;
      }

      toast.error(result?.message ?? "Failed to update organization language");
    });
  };

  return (
    <div className="mb-6 rounded-lg border p-4">
      <div className="text-sm font-medium">Organization language</div>
      <p className="text-sm text-muted-foreground mt-1 mb-3">
        Choose which language is used for shared organization UI text.
      </p>

      <Select value={value} onValueChange={(v) => onChange(v as OrganizationLanguage)} disabled={isPending}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="lv">Latviešu</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
