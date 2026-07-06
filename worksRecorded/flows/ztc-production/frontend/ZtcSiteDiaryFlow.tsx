"use client";

import SiteDiaryCalendar from "@/components/sitediary/Calendar";

type ZtcSiteDiaryFlowProps = {
  siteId: string;
};

export function ZtcSiteDiaryFlow({ siteId }: ZtcSiteDiaryFlowProps) {
  return <SiteDiaryCalendar siteId={siteId} isZtcFlow />;
}
