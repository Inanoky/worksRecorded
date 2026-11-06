"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useProjectCacheScope } from "@/components/providers/ProjectLoadingProgressProvider";
import { useRetainedViewActive } from "@/components/providers/RetainedView";
import {
	getZtcWorkspaceActivity,
	syncZtcWorkspace,
} from "@/flows/ztc-production/backend/actions";
import { ZtcPersistentCache } from "@/flows/ztc-production/lib/ztc-persistent-cache";
import { ZtcWorkspaceResource } from "@/flows/ztc-production/lib/ztc-workspace-resource";

export function useZtcWorkspaceData(
	siteId: string | null,
	enabled: boolean,
	active = true,
) {
	const scope = useProjectCacheScope();
	const visible = useRetainedViewActive();
	const key = JSON.stringify([scope, siteId]);
	const resource = useMemo(
		() =>
			enabled && siteId
				? new ZtcWorkspaceResource(
						siteId,
						new ZtcPersistentCache(scope, siteId),
						(known) => syncZtcWorkspace({ siteId, known }),
						async () => [],
						() => getZtcWorkspaceActivity({ siteId }),
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
	useEffect(() => () => resource?.release(), [resource]);
	useEffect(() => {
		if (!resource || !active || !visible) return;
		void resource.hydrate().catch(() => {});
		const refresh = () => {
			if (document.visibilityState !== "hidden")
				void resource.refresh().catch(() => {});
		};
		refresh();
		window.addEventListener("focus", refresh);
		window.addEventListener("online", refresh);
		document.addEventListener("visibilitychange", refresh);
		const timer = window.setInterval(refresh, 15000);
		return () => {
			window.removeEventListener("focus", refresh);
			window.removeEventListener("online", refresh);
			document.removeEventListener("visibilitychange", refresh);
			window.clearInterval(timer);
		};
	}, [resource, active, visible]);
	return { ...state, key, resource };
}
