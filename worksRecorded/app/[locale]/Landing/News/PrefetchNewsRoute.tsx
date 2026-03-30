// components/landing/news/PrefetchNewsRoute.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PREFETCHED_IDS_KEY = "landing-news-prefetched-ids";

function parseIdList(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((part) => Number(part))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export default function PrefetchNewsRoute({ locale }: { locale: string }) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(`/${locale}/Landing/News`);

    const cachedIds = parseIdList(sessionStorage.getItem(`${PREFETCHED_IDS_KEY}:${locale}`));
    if (cachedIds.length > 0) {
      for (const articleId of cachedIds) {
        router.prefetch(`/${locale}/Landing/News/${articleId}`);
      }
      return;
    }

    const runBackgroundPrefetch = async () => {
      try {
        const response = await fetch(`/api/news/prefetch-ids?locale=${locale}`, { cache: "force-cache" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { ids?: number[] };
        const ids = Array.isArray(payload.ids)
          ? payload.ids.filter((id) => Number.isFinite(id) && id > 0).slice(0, 6)
          : [];

        if (!ids.length) {
          return;
        }

        sessionStorage.setItem(`${PREFETCHED_IDS_KEY}:${locale}`, ids.join(","));

        for (const articleId of ids) {
          router.prefetch(`/${locale}/Landing/News/${articleId}`);
        }
      } catch {
        // No-op: prefetch is a best-effort optimization.
      }
    };

    let idleId: number | null = null;
    const idleCallback = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline), 900));

    idleId = idleCallback(() => {
      void runBackgroundPrefetch();
    });

    return () => {
      if (idleId === null) {
        return;
      }

      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [router, locale]);

  return null;
}
