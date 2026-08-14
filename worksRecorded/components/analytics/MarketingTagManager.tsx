"use client";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { isMarketingAnalyticsPath } from "@/lib/analytics/marketing-path";

type MarketingTagManagerProps = {
	gaId: string;
	gtmId: string;
};

export function MarketingTagManager({ gaId, gtmId }: MarketingTagManagerProps) {
	const pathname = usePathname();

	if (!isMarketingAnalyticsPath(pathname)) {
		return <GoogleAnalytics gaId={gaId} />;
	}

	return <GoogleTagManager gtmId={gtmId} />;
}
