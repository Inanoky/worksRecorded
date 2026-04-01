"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { updateOrganizationLanguage } from "@/server/actions/settings-actions";
import { DashboardLanguage, tDashboard } from "@/lib/dashboard-i18n";

export function CompanyLanguageSelector({ language }: { language: DashboardLanguage }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={language}
      disabled={isPending}
      onValueChange={(value: DashboardLanguage) => {
        startTransition(async () => {
          const res = await updateOrganizationLanguage(value);
          if (res?.ok) {
            toast.success(tDashboard(value, "languageUpdated"));
          } else {
            toast.error(tDashboard(language, "languageUpdateFailed"));
          }
        });
      }}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{tDashboard(language, "english")}</SelectItem>
        <SelectItem value="lv">{tDashboard(language, "latvian")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
