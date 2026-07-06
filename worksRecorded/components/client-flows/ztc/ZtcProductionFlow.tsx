"use client";

import SiteDiaryList from "@/components/sitediary/SiteDiaryList";

type ZtcProductionFlowProps = {
  siteId: string;
  bisEnabled: boolean;
  organizationLanguage?: string | null;
};

export function ZtcProductionFlow({
  siteId,
  bisEnabled,
  organizationLanguage,
}: ZtcProductionFlowProps) {
  return (
    <SiteDiaryList
      siteId={siteId}
      bisEnabled={bisEnabled}
      organizationLanguage={organizationLanguage}
      isZtcFlow
    />
  );
}
