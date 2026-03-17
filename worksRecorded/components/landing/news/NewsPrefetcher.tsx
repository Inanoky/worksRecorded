"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type NewsPrefetcherProps = {
  locale: string;
  ids: number[];
};

export default function NewsPrefetcher({ locale, ids }: NewsPrefetcherProps) {
  const router = useRouter();

  useEffect(() => {
    for (const id of ids) {
      router.prefetch(`/${locale}/Landing/News/${id}`);
    }
  }, [router, locale, ids]);

  return null;
}
