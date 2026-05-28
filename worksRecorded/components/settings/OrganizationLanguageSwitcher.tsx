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
import {
  getSettingsUiMessages,
  getToastMessages,
  normalizeOrganizationLanguage,
  type OrganizationLanguage,
} from "@/lib/dashboard-i18n";

type Props = {
  currentLanguage?: string | null;
};

export function OrganizationLanguageSwitcher({ currentLanguage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const value = normalizeOrganizationLanguage(currentLanguage);
  const t = getSettingsUiMessages(value);
  const toastMessages = getToastMessages(value);

  const onChange = (language: OrganizationLanguage) => {
    startTransition(async () => {
      const result = await updateOrganizationLanguage(language);

      if (result?.ok) {
        toast.success(getToastMessages(language).organizationLanguageUpdated);
        router.refresh();
        return;
      }

      toast.error(result?.message ?? toastMessages.failedUpdateOrganizationLanguage);
    });
  };

  return (
    <div className="mb-6 rounded-lg border p-4">
      <div className="text-sm font-medium">{t.organizationLanguage}</div>
      <p className="text-sm text-muted-foreground mt-1 mb-3">
        {t.organizationLanguageHelp}
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
