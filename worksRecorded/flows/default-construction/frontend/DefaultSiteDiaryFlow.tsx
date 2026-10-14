"use client";

import SiteDiaryCalendar from "@/components/sitediary/Calendar";

type DefaultSiteDiaryFlowProps = {
	siteId: string;
	batchEditing?: boolean;
};

export function DefaultSiteDiaryFlow({
	siteId,
	batchEditing = false,
}: DefaultSiteDiaryFlowProps) {
	return <SiteDiaryCalendar siteId={siteId} batchEditing={batchEditing} />;
}
