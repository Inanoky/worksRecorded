"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function GATracker() {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    (window as any).gtag?.("config", GA_ID, { page_path: url });
  }, [pathname, searchParams, GA_ID]);

  return null;
}