import type { ZtcProjectTaskRates } from "@/flows/ztc-production/backend/actions";
import type { ZtcDiaryRow } from "@/flows/ztc-production/lib/ztc-site-diary-utils";
import type { getSiteDiaryMediaOnlyDays } from "@/server/actions/site-diary-actions";

export type ZtcWorkspaceData = {
	siteId: string;
	config: Record<string, unknown>;
	rows: ZtcDiaryRow[];
	rates: ZtcProjectTaskRates[];
	projectOptions: string[];
	mediaOnlyDays: Awaited<ReturnType<typeof getSiteDiaryMediaOnlyDays>>;
};

export type ZtcWorkspaceResult =
	| { status: "ok"; data: Omit<ZtcWorkspaceData, "mediaOnlyDays"> }
	| { status: "denied" };
