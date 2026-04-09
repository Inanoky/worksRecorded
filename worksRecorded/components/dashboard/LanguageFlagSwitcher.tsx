"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateOrganizationLanguage } from "@/server/actions/shared-actions";
import { normalizeOrganizationLanguage, type OrganizationLanguage } from "@/lib/dashboard-i18n";
import { cn } from "@/lib/utils/utils";

type Props = {
  currentLanguage?: string | null;
};

const FLAG_OPTIONS: Array<{ code: OrganizationLanguage; flag: string; label: string }> = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "lv", flag: "🇱🇻", label: "Latviešu" },
];

export function LanguageFlagSwitcher({ currentLanguage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const value = normalizeOrganizationLanguage(currentLanguage);

  const onChange = (language: OrganizationLanguage) => {
    if (language === value) return;

    startTransition(async () => {
      const result = await updateOrganizationLanguage(language);

      if (result?.ok) {
        toast.success(language === "lv" ? "Valoda nomainīta" : "Language updated");
        router.refresh();
        return;
      }

      toast.error(result?.message ?? "Failed to update organization language");
    });
  };

  return (
    <div className="flex items-center gap-1 rounded-full border bg-background/70 p-1">
      {FLAG_OPTIONS.map((option) => {
        const active = option.code === value;

        return (
          <Button
            key={option.code}
            type="button"
            variant="ghost"
            size="icon"
            disabled={isPending}
            onClick={() => onChange(option.code)}
            className={cn(
              "h-8 w-8 rounded-full text-base leading-none",
              active ? "bg-muted ring-1 ring-border" : "opacity-80 hover:opacity-100",
            )}
            aria-label={option.label}
            title={option.label}
          >
            <span aria-hidden>{option.flag}</span>
          </Button>
        );
      })}
    </div>
  );
}
