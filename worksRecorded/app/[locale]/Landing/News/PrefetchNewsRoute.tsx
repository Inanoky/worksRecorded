// components/landing/news/PrefetchNewsRoute.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type PrefetchNewsRouteProps = {
  locale: string;
  articleIds: number[];
};

export default function PrefetchNewsRoute({ locale, articleIds }: PrefetchNewsRouteProps) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(`/${locale}/Landing/News`);
    router.prefetch(`/${locale}/Landing/News?page=1`);

    for (const articleId of articleIds) {
      router.prefetch(`/${locale}/Landing/News/${articleId}`);
    }
  }, [router, locale, articleIds]);

  return null;
}
