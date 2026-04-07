"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function SettingsSavedToast() {
  const searchParams = useSearchParams();
  const lastShownTokenRef = useRef<string | null>(null);
  const saveToken = searchParams.get("saved");

  useEffect(() => {
    console.log("[SettingsSavedToast] save token from query", saveToken);
    if (!saveToken) return;
    if (lastShownTokenRef.current === saveToken) return;

    lastShownTokenRef.current = saveToken;
    console.log("[SettingsSavedToast] showing success toast");
    toast.success("Saved successfully");
  }, [saveToken]);

  return null;
}
