"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	useProjectCacheScope,
	useVisualProjectPreload,
} from "@/components/providers/ProjectLoadingProgressProvider";
import {
	clearPersistentProjects,
	PersistentProjectCache,
} from "../visual/project-persistent-cache";
import type { LimeniProjectSnapshot } from "../visual/project-snapshot-store";

type ProjectData = {
	enabled: boolean;
	snapshot: LimeniProjectSnapshot | null;
	persistence?: PersistentProjectCache;
	failed: boolean;
	denied: boolean;
};
const Context = createContext<ProjectData>({
	enabled: false,
	snapshot: null,
	failed: false,
	denied: false,
});

export function LimeniProjectData({
	siteId,
	children,
}: {
	siteId: string;
	children: ReactNode;
}) {
	const scope = useProjectCacheScope();
	const enabled = useVisualProjectPreload(siteId) && !!scope;
	const persistence = useMemo(
		() => (scope ? new PersistentProjectCache(scope, siteId) : undefined),
		[scope, siteId],
	);
	const [snapshot, setSnapshot] = useState<LimeniProjectSnapshot | null>(null);
	const [failed, setFailed] = useState(false);
	const [denied, setDenied] = useState(false);
	useEffect(() => {
		if (!enabled || !persistence) return;
		const controller = new AbortController();
		performance.mark?.(`limeni:${siteId}:opening`);
		let interacted = false;
		const edited = () => {
			interacted = true;
		};
		for (const event of ["input", "submit", "pointerdown"])
			document.addEventListener(event, edited, true);
		void (async () => {
			const cached = await persistence.read<LimeniProjectSnapshot>("snapshot");
			if (controller.signal.aborted) return;
			if (cached?.settings?.siteId === siteId) setSnapshot(cached);
			try {
				const response = await fetch(
					`/api/sites/${encodeURIComponent(siteId)}/limeni-project`,
					{
						cache: "no-cache",
						signal: controller.signal,
						headers: cached ? { "If-None-Match": `"${cached.version}"` } : {},
					},
				);
				if (response.status === 403 || response.status === 401) {
					await clearPersistentProjects();
					if (!controller.signal.aborted) {
						setSnapshot(null);
						setDenied(true);
					}
					return;
				}
				if (response.status === 304 && cached) return;
				if (!response.ok) throw new Error("Project unavailable");
				const next = (await response.json()) as LimeniProjectSnapshot;
				if (next.settings.siteId !== siteId || controller.signal.aborted)
					return;
				for (const row of next.diary.rows)
					for (const key of [
						"Date",
						"Date_Custom_1",
						"Date_Custom_2",
						"createdAt",
					] as const) {
						const record = row as unknown as Record<string, unknown>;
						if (typeof record[key] === "string")
							record[key] = new Date(record[key] as string);
					}
				if (!cached || !interacted) setSnapshot(next);
				void persistence.write("snapshot", next);
			} catch {
				if (!controller.signal.aborted) setFailed(true);
			}
		})();
		return () => {
			controller.abort();
			for (const event of ["input", "submit", "pointerdown"])
				document.removeEventListener(event, edited, true);
		};
	}, [enabled, persistence, siteId]);
	const value = useMemo(
		() => ({ enabled, snapshot, persistence, failed, denied }),
		[enabled, snapshot, persistence, failed, denied],
	);
	if (denied)
		return (
			<p role="alert">
				Projekta piekļuve vairs nav pieejama. Atveriet projektu sarakstu.
			</p>
		);
	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLimeniProjectData() {
	return useContext(Context);
}
