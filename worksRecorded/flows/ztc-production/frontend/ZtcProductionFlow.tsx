"use client";

import SiteDiaryList from "@/components/sitediary/SiteDiaryList";
import { useRetainedViewActive } from "@/components/providers/RetainedView";

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
  const active = useRetainedViewActive();
  return (
    <SiteDiaryList
      siteId={siteId}
      bisEnabled={bisEnabled}
      organizationLanguage={organizationLanguage}
      isZtcFlow
      active={active}
    />
  );
}
