"use client";

import SiteDiaryList from "@/components/sitediary/SiteDiaryList";

type DefaultProductionFlowProps = {
  siteId: string;
  bisEnabled: boolean;
  organizationLanguage?: string | null;
};

export function DefaultProductionFlow({
  siteId,
  bisEnabled,
  organizationLanguage,
}: DefaultProductionFlowProps) {
  return (
    <SiteDiaryList
      siteId={siteId}
      bisEnabled={bisEnabled}
      organizationLanguage={organizationLanguage}
      isZtcFlow
    />
  );
}
