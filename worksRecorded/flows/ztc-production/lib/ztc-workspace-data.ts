import type { ZtcProjectTaskRates } from "@/flows/ztc-production/backend/actions";
import type { ZtcDiaryRow } from "@/flows/ztc-production/lib/ztc-site-diary-utils";
import type { getSiteDiaryMediaOnlyDays } from "@/server/actions/site-diary-actions";

export type ZtcWorkspaceRevisions = {
	rows: string;
	config: string;
	media: string;
};

export type ZtcWorkspaceSync = {
	version: 1;
	siteId: string;
	revisions: ZtcWorkspaceRevisions;
	rows: Record<string, string>;
	media: Record<string, string>;
};

export type ZtcWorkspaceData = {
	siteId: string;
	config: Record<string, unknown>;
	rows: ZtcDiaryRow[];
	rates: ZtcProjectTaskRates[];
	projectOptions: string[];
	mediaOnlyDays: Awaited<ReturnType<typeof getSiteDiaryMediaOnlyDays>>;
	sync?: ZtcWorkspaceSync;
};

export type ZtcWorkspaceDelta = {
	status: "delta";
	siteId: string;
	sync: Pick<ZtcWorkspaceSync, "version" | "siteId" | "revisions">;
	rowVersions: Record<string, string>;
	mediaVersions: Record<string, string>;
	changedRows: ZtcDiaryRow[];
	deletedRowIds: string[];
	rowOrder?: string[];
	config?: ZtcWorkspaceData["config"];
	rates?: ZtcWorkspaceData["rates"];
	projectOptions?: string[];
	changedMedia: ZtcWorkspaceData["mediaOnlyDays"];
	deletedMediaKeys: string[];
	mediaOrder?: string[];
};

export type ZtcWorkspaceActivity =
	| { status: "ok"; siteId: string; revisions: ZtcWorkspaceRevisions }
	| { status: "denied" };

export type ZtcWorkspaceResult =
	| {
			status: "ok";
			data: Omit<ZtcWorkspaceData, "mediaOnlyDays"> & {
				mediaOnlyDays?: ZtcWorkspaceData["mediaOnlyDays"];
			};
	  }
	| ZtcWorkspaceDelta
	| { status: "unchanged"; siteId: string }
	| { status: "denied" };
