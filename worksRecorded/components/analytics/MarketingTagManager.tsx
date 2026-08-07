"use client";

import { GoogleTagManager } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { isMarketingAnalyticsPath } from "@/lib/analytics/marketing-path";

type MarketingTagManagerProps = {
  gtmId: string;
};

export function MarketingTagManager({ gtmId }: MarketingTagManagerProps) {
  const pathname = usePathname();

  if (!isMarketingAnalyticsPath(pathname)) return null;

  return <GoogleTagManager gtmId={gtmId} />;
}
