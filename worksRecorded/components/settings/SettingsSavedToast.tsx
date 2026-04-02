"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function SettingsSavedToast({ shouldShow }: { shouldShow: boolean }) {
  const shownRef = useRef(false);

  useEffect(() => {
    if (!shouldShow || shownRef.current) return;
    shownRef.current = true;
    toast.success("Changes saved");
  }, [shouldShow]);

  return null;
}
