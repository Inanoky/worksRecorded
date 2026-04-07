"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function SettingsSavedToast({ saveToken }: { saveToken: string | null }) {
  useEffect(() => {
    if (!saveToken) return;
    toast.success("Changes saved");
  }, [saveToken]);

  return null;
}
