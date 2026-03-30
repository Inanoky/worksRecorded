// components/landing/news/PrefetchNewsRoute.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PrefetchNewsRoute({ locale }: { locale: string }) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(`/${locale}/Landing/News`);
  }, [router, locale]);

  return null;
}