"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useProjectCacheScope } from "@/components/providers/ProjectLoadingProgressProvider";
import { getZtcWorkspaceSnapshot } from "@/flows/ztc-production/backend/actions";
import { ZtcPersistentCache } from "@/flows/ztc-production/lib/ztc-persistent-cache";
import { ZtcWorkspaceResource } from "@/flows/ztc-production/lib/ztc-workspace-resource";
import { getSiteDiaryMediaOnlyDays } from "@/server/actions/site-diary-actions";

export function useZtcWorkspaceData(
	siteId: string | null,
	enabled: boolean,
	active = true,
) {
	const scope = useProjectCacheScope();
	const key = JSON.stringify([scope, siteId]);
	const resource = useMemo(
		() =>
			enabled && siteId
				? new ZtcWorkspaceResource(
						siteId,
						new ZtcPersistentCache(scope, siteId),
						() => getZtcWorkspaceSnapshot({ siteId }),
						() => getSiteDiaryMediaOnlyDays(siteId, { flowId: "ztc" }),
					)
				: null,
		[enabled, scope, siteId],
	);
	const empty = useMemo(
		() => ({
			data: null,
			hydrating: false,
			refreshing: false,
			error: null,
			denied: false,
		}),
		[],
	);
	const state = useSyncExternalStore(
		resource?.subscribe ?? (() => () => {}),
		resource?.getSnapshot ?? (() => empty),
		resource?.getSnapshot ?? (() => empty),
	);
	useEffect(() => {
		if (!resource || !active) return;
		void resource.hydrate().catch(() => {});
		void resource.refresh().catch(() => {});
		const refresh = () => {
			if (document.visibilityState !== "hidden")
				void resource.refresh().catch(() => {});
		};
		window.addEventListener("focus", refresh);
		window.addEventListener("online", refresh);
		return () => {
			window.removeEventListener("focus", refresh);
			window.removeEventListener("online", refresh);
			resource.release();
		};
	}, [resource, active]);
	return { ...state, key, resource };
}
