"use client";

import SiteDiaryCalendar from "@/components/sitediary/Calendar";

type DefaultSiteDiaryFlowProps = {
  siteId: string;
};

export function DefaultSiteDiaryFlow({ siteId }: DefaultSiteDiaryFlowProps) {
  return <SiteDiaryCalendar siteId={siteId} isZtcFlow />;
}
