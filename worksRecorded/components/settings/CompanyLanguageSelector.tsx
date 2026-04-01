"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { updateOrganizationLanguage } from "@/server/actions/settings-actions";
import { DashboardLanguage, tDashboard } from "@/lib/dashboard-i18n";
import { useRouter } from "next/navigation";

export function CompanyLanguageSelector({ language }: { language: DashboardLanguage }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Select
      value={language}
      disabled={isPending}
      onValueChange={(value: DashboardLanguage) => {
        startTransition(async () => {
          try {
            const res = await updateOrganizationLanguage(value);
            if (res?.ok) {
              toast.success(tDashboard(value, "languageUpdated"));
              router.refresh();
            } else {
              toast.error(res?.message ?? tDashboard(language, "languageUpdateFailed"));
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : tDashboard(language, "languageUpdateFailed"));
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
