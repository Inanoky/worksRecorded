"use client";

import { usePathname } from "next/navigation";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { WorkspaceView } from "@/components/projects/WorkspaceActivity";
import {
	useProjectPreparationReporter,
	useVisualProjectPreload,
} from "@/components/providers/ProjectLoadingProgressProvider";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import type { getDefaultConstructionForma2Results } from "../backend/forma2-analytics-actions";
import { DIARY_RECORD_UPDATED } from "../lib/diary-record-updated-event";
import { patchProject } from "../visual/project-sync";
import { useDiarySaveQueue } from "./DiarySaveProvider";
import { FORMA2_CHANGED, Forma2RefreshContext } from "./forma2-client-refresh";
import { useLimeniProjectData } from "./LimeniProjectData";

const loadView = () =>
	import("./DefaultConstructionForma2View").then((module) => ({
		default: module.DefaultConstructionForma2View,
	}));
const View = lazy(loadView);
type Payload = {
	data: Awaited<ReturnType<typeof getDefaultConstructionForma2Results>>;
	organizationLanguage: string | null;
};

export function RetainedLimeniForma2({ siteId }: { siteId: string }) {
	const visualPreload = useVisualProjectPreload(siteId);
	const projectData = useLimeniProjectData();
	const sharedSync = projectData.enabled && projectData.mode === "limeni";
	const enabled = visualPreload || projectData.enabled;
	const seeded = useRef("");
	const active = usePathname() === `/dashboard/sites/${siteId}/analytics`;
	const report = useProjectPreparationReporter(siteId);
	const [payload, setPayload] = useState<Payload | null>(null);
	const [failed, setFailed] = useState(false);
	const lastLoaded = useRef(0);
	const etag = useRef("");
	const pending = useRef<Promise<void> | null>(null);
	const controller = useRef<AbortController | null>(null);
	const { snapshot } = useDiarySaveQueue(siteId, enabled);
	const lastDiaryRevision = useRef(snapshot.revision);
	const refresh = useCallback(() => {
		if (pending.current) return pending.current;
		const request = new AbortController();
		controller.current = request;
		const work = Promise.all([
			loadView(),
			fetch(`/api/sites/${encodeURIComponent(siteId)}/forma2/results`, {
				signal: request.signal,
				cache: "no-cache",
				headers: etag.current ? { "If-None-Match": etag.current } : {},
			}),
		])
			.then(async ([, response]) => {
				if (request.signal.aborted) return;
				if (response.status !== 304) {
					if (!response.ok) throw new Error("Forma 2 unavailable");
					const next = (await response.json()) as Payload;
					if (request.signal.aborted) return;
					etag.current = response.headers.get("etag") ?? "";
					setPayload(next);
					if (
						next.data.document &&
						projectData.enabled &&
						!projectData.snapshot?.bootstrap
					)
						patchProject(siteId, (snapshot) => ({
							...snapshot,
							revision: undefined,
							forma2: {
								...next,
								organizationLanguage:
									next.organizationLanguage ??
									snapshot.forma2.organizationLanguage,
							},
						}));
				}
				lastLoaded.current = Date.now();
				setFailed(false);
				report("forma2");
			})
			.catch(() => {
				if (request.signal.aborted) return;
				setFailed(true);
				report("forma2", "error");
			})
			.finally(() => {
				if (pending.current === work) pending.current = null;
			});
		pending.current = work;
		return work;
	}, [siteId, report, projectData.enabled, projectData.snapshot?.bootstrap]);
	useEffect(() => {
		if (projectData.enabled) {
			if (projectData.snapshot)
				void loadView().catch(() => report("forma2", "error"));
			if (
				projectData.snapshot &&
				!projectData.snapshot.bootstrap &&
				seeded.current !== projectData.snapshot.version
			) {
				seeded.current = projectData.snapshot.version;
				setPayload(projectData.snapshot.forma2);
				lastLoaded.current = Date.now();
				report("forma2");
			}
			return;
		}
		if (!enabled) {
			setPayload(null);
			etag.current = "";
			lastLoaded.current = 0;
			return;
		}
		void refresh();
		return () => {
			controller.current?.abort();
			pending.current = null;
		};
	}, [
		enabled,
		refresh,
		projectData.enabled,
		projectData.snapshot,
		report,
	]);
	useEffect(() => {
		if (
			projectData.enabled &&
			!sharedSync &&
			active &&
			(!payload || lastLoaded.current === 0)
		)
			void refresh();
	}, [active, payload, projectData.enabled, refresh, sharedSync]);
	useEffect(() => {
		if (snapshot.revision === lastDiaryRevision.current) return;
		lastDiaryRevision.current = snapshot.revision;
		lastLoaded.current = 0;
		if (enabled && active && !snapshot.items.length && !projectData.enabled)
			void refresh();
	}, [
		snapshot.revision,
		snapshot.items.length,
		enabled,
		active,
		refresh,
		projectData.enabled,
	]);
	useEffect(() => {
		if (!enabled || projectData.enabled) return;
		const check = () => {
			if (
				!active ||
				document.visibilityState === "hidden" ||
				Date.now() - lastLoaded.current < 60_000
			)
				return;
			if (
				document.querySelector('[role="dialog"]') ||
				/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "")
			)
				return;
			void refresh();
		};
		const changed = (event: Event) => {
			if ((event as CustomEvent<{ siteId?: string }>).detail?.siteId !== siteId)
				return;
			lastLoaded.current = 0;
			if (active) void refresh();
		};
		check();
		const timer = window.setInterval(check, 60_000);
		window.addEventListener("focus", check);
		document.addEventListener("visibilitychange", check);
		window.addEventListener(FORMA2_CHANGED, changed);
		window.addEventListener(DIARY_RECORD_UPDATED, changed);
		return () => {
			window.clearInterval(timer);
			window.removeEventListener("focus", check);
			document.removeEventListener("visibilitychange", check);
			window.removeEventListener(FORMA2_CHANGED, changed);
			window.removeEventListener(DIARY_RECORD_UPDATED, changed);
		};
	}, [enabled, active, refresh, siteId, projectData.enabled]);
	useEffect(() => {
		if (!enabled || !projectData.enabled || sharedSync) return;
		const changed = (event: Event) => {
			if ((event as CustomEvent<{ siteId?: string }>).detail?.siteId !== siteId)
				return;
			lastLoaded.current = 0;
			if (active) void refresh();
		};
		window.addEventListener(FORMA2_CHANGED, changed);
		window.addEventListener(DIARY_RECORD_UPDATED, changed);
		return () => {
			window.removeEventListener(FORMA2_CHANGED, changed);
			window.removeEventListener(DIARY_RECORD_UPDATED, changed);
		};
	}, [enabled, projectData.enabled, active, refresh, sharedSync, siteId]);

	const refreshProject = projectData.refresh;
	const update = useCallback(() => {
		if (sharedSync && refreshProject) {
			void refreshProject().catch(() => setFailed(true));
		} else {
			void refresh();
		}
	}, [refresh, refreshProject, sharedSync]);
	const loadFailed = sharedSync
		? !payload && (projectData.failed || failed)
		: failed;
	if (!enabled) return null;
	return (
		<section hidden={!active} aria-label="Forma 2">
			{active && projectData.enabled && !payload && !loadFailed ? (
				<ProjectOpeningOverlay
					primary={visualPreload}
					label="Ielādē Forma 2…"
				/>
			) : null}
			{loadFailed ? (
				<output className="block rounded-md border p-3 text-sm">
					Neizdevās atjaunot Forma 2.{" "}
					<button type="button" className="underline" onClick={update}>
						Mēģināt vēlreiz
					</button>
				</output>
			) : null}
			{payload ? (
				<Forma2RefreshContext.Provider value={update}>
					<Suspense fallback={null}>
						<WorkspaceView active={active}>
							<View siteId={siteId} {...payload} />
						</WorkspaceView>
					</Suspense>
				</Forma2RefreshContext.Provider>
			) : null}
		</section>
	);
}
