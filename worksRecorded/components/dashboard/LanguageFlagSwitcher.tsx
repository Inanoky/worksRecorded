"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateOrganizationLanguage } from "@/server/actions/shared-actions";
import { getToastMessages, normalizeOrganizationLanguage, type OrganizationLanguage } from "@/lib/dashboard-i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";

type Props = {
  currentLanguage?: string | null;
};

const FLAG_OPTIONS: Array<{ code: OrganizationLanguage; src: string; label: string }> = [
  { code: "en", src: "/flags/gb.svg", label: "English" },
  { code: "lv", src: "/flags/lv.svg", label: "Latviešu" },
];

export function LanguageFlagSwitcher({ currentLanguage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const value = normalizeOrganizationLanguage(currentLanguage);
  const toastMessages = getToastMessages(value);
  const activeOption = FLAG_OPTIONS.find((option) => option.code === value) ?? FLAG_OPTIONS[0];

  const onChange = (language: OrganizationLanguage) => {
    if (language === value) return;

    startTransition(async () => {
      const result = await updateOrganizationLanguage(language);

      if (result?.ok) {
        toast.success(getToastMessages(language).languageUpdated);
        router.refresh();
        return;
      }

      toast.error(result?.message ?? toastMessages.failedUpdateOrganizationLanguage);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-full size-8 lg:size-10"
          disabled={isPending}
          aria-label={`Language: ${activeOption.label}`}
          title={activeOption.label}
        >
          <Image src={activeOption.src} alt={activeOption.label} width={20} height={20} className="rounded-full" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {FLAG_OPTIONS.map((option) => {
          const active = option.code === value;
          return (
            <DropdownMenuItem
              key={option.code}
              onClick={() => onChange(option.code)}
              className="flex items-center gap-2"
              disabled={isPending}
            >
              <Image src={option.src} alt={option.label} width={18} height={18} className="rounded-full" />
              <span>{option.label}</span>
              {active ? <Check className="ml-auto h-4 w-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
