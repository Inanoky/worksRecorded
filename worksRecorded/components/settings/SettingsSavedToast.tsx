"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getToastMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

export function SettingsSavedToast({ organizationLanguage }: { organizationLanguage?: string | null }) {
  const searchParams = useSearchParams();
  const lastShownTokenRef = useRef<string | null>(null);
  const saveToken = searchParams.get("saved");
  const toastMessages = getToastMessages(normalizeOrganizationLanguage(organizationLanguage));

  useEffect(() => {
    console.log("[SettingsSavedToast] save token from query", saveToken);
    if (!saveToken) return;
    if (lastShownTokenRef.current === saveToken) return;

    lastShownTokenRef.current = saveToken;
    console.log("[SettingsSavedToast] showing success toast");
    toast.success(toastMessages.savedSuccessfully);
  }, [saveToken, toastMessages.savedSuccessfully]);

  return null;
}
