"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useWorkspaceActive } from "@/components/projects/WorkspaceActivity";
import {
	useProjectCacheScope,
	useVisualProjectPreload,
} from "@/components/providers/ProjectLoadingProgressProvider";
import { mergeDiaryEditChanges } from "../lib/diary-edit";
import { DIARY_RECORD_UPDATED } from "../lib/diary-record-updated-event";
import {
	clearPersistentProjects,
	PersistentProjectCache,
} from "../visual/project-persistent-cache";
import type { LimeniProjectSnapshot } from "../visual/project-snapshot-store";
import {
	applyLocalProjectPatch,
	mergeProjectDelta,
	PROJECT_CHANGED,
	PROJECT_PATCH,
	type ProjectDelta,
	type ProjectPatch,
	patchProject,
} from "../visual/project-sync";
import { hasActiveProjectEditor } from "../visual/project-sync-activity";
import {
	type ConstructionProjectBootstrapPayload,
	fetchConstructionProjectBootstrap,
	fetchProjectSync,
	LIMENI_DIARY_BOOTSTRAP_KEY,
} from "../visual/project-sync-client";
import { useDiarySaveQueue } from "./DiarySaveContext";
import { FORMA2_CHANGED } from "./forma2-client-refresh";

type ProjectData = {
	enabled: boolean;
	mode?: "limeni" | "construction";
	streamedTabs?: boolean;
	snapshot: LimeniProjectSnapshot | null;
	persistence?: PersistentProjectCache;
	refresh?: () => Promise<void>;
	failed: boolean;
	denied: boolean;
};
function hydrateProjectDates(snapshot: LimeniProjectSnapshot) {
	for (const row of snapshot.diary.rows)
		for (const key of [
			"Date",
			"Date_Custom_1",
			"Date_Custom_2",
			"createdAt",
		] as const) {
			const record = row as unknown as Record<string, unknown>;
			if (typeof record[key] === "string") {
				const value = new Date(record[key] as string);
				record[key] = Number.isNaN(value.getTime()) ? null : value;
			}
		}
	return snapshot;
}
const Context = createContext<ProjectData>({
	enabled: false,
	snapshot: null,
	failed: false,
	denied: false,
});

export function LimeniProjectData(props: {
	siteId: string;
	constructionWorkspace?: boolean;
	initialDiary?: LimeniProjectSnapshot;
	children: ReactNode;
}) {
	const scope = useProjectCacheScope();
	return (
		<ScopedLimeniProjectData
			key={JSON.stringify([scope, props.siteId, !!props.constructionWorkspace])}
			{...props}
		/>
	);
}

function ScopedLimeniProjectData({
	siteId,
	children,
	constructionWorkspace = false,
	initialDiary,
}: {
	siteId: string;
	constructionWorkspace?: boolean;
	initialDiary?: LimeniProjectSnapshot;
	children: ReactNode;
}) {
	const scope = useProjectCacheScope();
	const workspaceActive = useWorkspaceActive();
	const visual = useVisualProjectPreload(siteId);
	const enabled = (visual || constructionWorkspace) && !!scope;
	const cacheKey = constructionWorkspace ? "construction:snapshot" : "snapshot";
	const mode: "construction" | "limeni" = constructionWorkspace
		? "construction"
		: "limeni";
	const persistence = useMemo(
		() => (scope ? new PersistentProjectCache(scope, siteId) : undefined),
		[scope, siteId],
	);
	const current = useRef<LimeniProjectSnapshot | null>(initialDiary ?? null);
	const displayed = useRef<LimeniProjectSnapshot | null>(initialDiary ?? null);
	const deferred = useRef<LimeniProjectSnapshot | null>(null);
	const patchRevision = useRef(0);
	const { snapshot: saves } = useDiarySaveQueue(siteId, enabled);
	const pendingSaves = useRef(0);
	pendingSaves.current = saves.items.length;
	const confirmedRevision = useRef(0);
	const [snapshot, setSnapshot] = useState<LimeniProjectSnapshot | null>(
		initialDiary ?? null,
	);
	const [failed, setFailed] = useState(false);
	const [denied, setDenied] = useState(false);
	const manualRefresh = useRef<(() => Promise<void>) | null>(null);
	const refreshProject = useCallback(async () => {
		if (!manualRefresh.current) throw new Error("Neizdevās atjaunot projektu.");
		await manualRefresh.current();
	}, []);
	const publish = useCallback((next: LimeniProjectSnapshot | null) => {
		displayed.current = next;
		setSnapshot(next);
	}, []);
	const applyPatch = useCallback(
		(detail: ProjectPatch) => {
			if (detail.siteId !== siteId || !current.current || !persistence) return;
			const previous = current.current;
			const version = `local:${Date.now()}:${++patchRevision.current}`;
			current.current = hydrateProjectDates(
				applyLocalProjectPatch(previous, detail.apply, version),
			);
			if (deferred.current) deferred.current = current.current;
			const visible = displayed.current;
			publish(
				visible === previous || !visible
					? current.current
					: hydrateProjectDates(
							applyLocalProjectPatch(visible, detail.apply, version),
						),
			);
			if (!current.current.bootstrap)
				void persistence.write(cacheKey, current.current);
			else if (mode === "limeni")
				void persistence.write(LIMENI_DIARY_BOOTSTRAP_KEY, current.current);
		},
		[siteId, persistence, publish, cacheKey, mode],
	);
	useEffect(() => {
		if (!enabled || !persistence || !workspaceActive) return;
		const controller = new AbortController();
		const markName = (phase: string) => `limeni:${siteId}:${phase}`;
		for (const phase of [
			"opening",
			"cache-read-start",
			"cache-read-end",
			"sync-request-start",
			"sync-response",
			"snapshot-published",
		])
			performance.clearMarks?.(markName(phase));
		const mark = (phase: string) => performance.mark?.(markName(phase));
		mark("opening");
		let interaction = 0;
		let inFlight: Promise<void> | undefined;
		let initialized = false;
		let firstSyncPending = true;
		let lastPassiveSync = Number.NEGATIVE_INFINITY;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const flush = () => {
			if (
				deferred.current &&
				!pendingSaves.current &&
				!hasActiveProjectEditor(siteId)
			) {
				publish(deferred.current);
				deferred.current = null;
			}
		};
		const edited = () => {
			if (hasActiveProjectEditor(siteId)) interaction++;
		};
		const patch = (event: Event) => {
			const detail = (event as CustomEvent<ProjectPatch>).detail;
			if (detail.siteId !== siteId || !current.current) return;
			interaction++;
			applyPatch(detail);
			schedule();
		};
		const sync = async (manual: boolean) => {
			const before = interaction;
			const cached = current.current;
			try {
				if (firstSyncPending) mark("sync-request-start");
				const coldBootstrap = !cached && firstSyncPending;
				let deferCompleteSync = coldBootstrap;
				let response = coldBootstrap
					? await fetchConstructionProjectBootstrap(siteId, controller.signal)
					: await fetchProjectSync(siteId, cached, controller.signal, mode);
				if (firstSyncPending) {
					mark("sync-response");
					firstSyncPending = false;
				}
				const deniedResponse = async () => {
					if (controller.signal.aborted) return true;
					if (response.status !== 403 && response.status !== 401) return false;
					await clearPersistentProjects();
					if (!controller.signal.aborted) {
						current.current = null;
						deferred.current = null;
						publish(null);
						setDenied(true);
					}
					controller.abort();
					return true;
				};
				if (await deniedResponse()) return;
				if (!response.ok && coldBootstrap) {
					response = await fetchProjectSync(
						siteId,
						null,
						controller.signal,
						mode,
					);
					deferCompleteSync = false;
					if (await deniedResponse()) return;
				}
				if ((response.status === 304 || response.status === 204) && cached) {
					if (before === interaction) {
						flush();
						if (manual && !cached.bootstrap)
							await persistence.write(cacheKey, cached);
					}
					setFailed(false);
					return;
				}
				if (!response.ok) throw new Error("Project unavailable");
				const payload = (await response.json()) as
					| LimeniProjectSnapshot
					| ProjectDelta
					| ConstructionProjectBootstrapPayload;
				let next: LimeniProjectSnapshot | null;
				try {
					next =
						"kind" in payload && payload.kind === "construction-bootstrap"
							? payload.snapshot
							: "kind" in payload && payload.kind === "delta"
								? cached
									? mergeProjectDelta(cached, payload)
									: null
								: (payload as LimeniProjectSnapshot);
				} catch {
					response = await fetchProjectSync(
						siteId,
						null,
						controller.signal,
						mode,
					);
					deferCompleteSync = false;
					if (await deniedResponse()) return;
					if (!response.ok) throw new Error("Project unavailable");
					next = (await response.json()) as LimeniProjectSnapshot;
				}
				if (
					!next ||
					next.settings.siteId !== siteId ||
					controller.signal.aborted
				)
					throw new Error("Neizdevās atjaunot projektu.");
				hydrateProjectDates(next);
				if (before !== interaction || pendingSaves.current) {
					schedule();
					if (manual)
						throw new Error("Pabeidziet labojumus un atjaunojiet vēlreiz.");
					return;
				}
				current.current = next;
				if (!cached || !hasActiveProjectEditor(siteId)) {
					publish(next);
					mark("snapshot-published");
					deferred.current = null;
				} else deferred.current = next;
				if (!next.bootstrap) await persistence.write(cacheKey, next);
				else if (mode === "limeni")
					await persistence.write(LIMENI_DIARY_BOOTSTRAP_KEY, next);
				setFailed(false);
				if (deferCompleteSync) schedule(mode === "limeni" ? 0 : undefined);
			} catch (error) {
				if (!controller.signal.aborted) setFailed(true);
				if (manual) throw error;
			}
		};
		const refresh = async (manual = false, passive = false) => {
			flush();
			if (!manual && passive && Date.now() - lastPassiveSync < 15000) return;
			if (manual) {
				while (inFlight) await inFlight.catch(() => {});
			} else if (inFlight || document.visibilityState === "hidden") return;
			if (
				navigator.onLine === false ||
				controller.signal.aborted ||
				!initialized
			) {
				if (manual) throw new Error("Neizdevās atjaunot projektu.");
				return;
			}
			if (pendingSaves.current || (manual && hasActiveProjectEditor(siteId))) {
				if (manual)
					throw new Error("Pabeidziet labojumus un atjaunojiet vēlreiz.");
				return;
			}
			lastPassiveSync = Date.now();
			inFlight = sync(manual);
			try {
				await inFlight;
			} finally {
				inFlight = undefined;
			}
		};
		manualRefresh.current = () => refresh(true);
		function schedule(delay = 1500) {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => void refresh(), delay);
		}
		const changed = (event: Event) => {
			if (
				(event as CustomEvent<{ siteId?: string }>).detail?.siteId === siteId
			) {
				interaction++;
				schedule();
			}
		};
		const wake = () => {
			if (document.visibilityState !== "hidden") void refresh(false, true);
		};
		const reconnect = () => void refresh();
		for (const event of ["input", "submit", "pointerdown"])
			document.addEventListener(event, edited, true);
		for (const event of [PROJECT_CHANGED, DIARY_RECORD_UPDATED, FORMA2_CHANGED])
			window.addEventListener(event, changed);
		window.addEventListener(PROJECT_PATCH, patch);
		window.addEventListener("focus", wake);
		window.addEventListener("online", reconnect);
		document.addEventListener("visibilitychange", wake);
		const interval = setInterval(wake, 15000);
		void (async () => {
			if (!current.current && initialDiary) {
				current.current = initialDiary;
				publish(initialDiary);
			}
			if (current.current) {
				flush();
				initialized = true;
				if (!current.current.bootstrap || mode === "limeni") void refresh();
				return;
			}
			mark("cache-read-start");
			const cached =
				(await persistence.read<LimeniProjectSnapshot>(cacheKey)) ??
				(mode === "limeni"
					? await persistence.read<LimeniProjectSnapshot>(
							LIMENI_DIARY_BOOTSTRAP_KEY,
						)
					: undefined);
			mark("cache-read-end");
			if (controller.signal.aborted) return;
			if (cached?.settings?.siteId === siteId) {
				current.current = hydrateProjectDates(cached);
				publish(cached);
			}
			initialized = true;
			void refresh();
		})();
		return () => {
			manualRefresh.current = null;
			controller.abort();
			clearInterval(interval);
			if (timer) clearTimeout(timer);
			for (const event of ["input", "submit", "pointerdown"])
				document.removeEventListener(event, edited, true);
			for (const event of [
				PROJECT_CHANGED,
				DIARY_RECORD_UPDATED,
				FORMA2_CHANGED,
			])
				window.removeEventListener(event, changed);
			window.removeEventListener(PROJECT_PATCH, patch);
			window.removeEventListener("focus", wake);
			window.removeEventListener("online", reconnect);
			document.removeEventListener("visibilitychange", wake);
		};
	}, [
		enabled,
		persistence,
		siteId,
		workspaceActive,
		applyPatch,
		publish,
		cacheKey,
		mode,
		initialDiary,
	]);
	useEffect(() => {
		if (!enabled || !persistence || workspaceActive) return;
		const patch = (event: Event) => {
			const detail = (event as CustomEvent<ProjectPatch>).detail;
			if (detail.siteId !== siteId || !current.current) return;
			applyPatch(detail);
		};
		window.addEventListener(PROJECT_PATCH, patch);
		return () => window.removeEventListener(PROJECT_PATCH, patch);
	}, [enabled, persistence, siteId, workspaceActive, applyPatch]);
	useEffect(() => {
		if (
			!enabled ||
			!persistence ||
			!current.current ||
			!saves.revision ||
			saves.revision === confirmedRevision.current
		)
			return;
		confirmedRevision.current = saves.revision;
		patchProject(siteId, (snapshot) => ({
			...snapshot,
			revision: undefined,
			diary: {
				...snapshot.diary,
				rows: mergeDiaryEditChanges(snapshot.diary.rows, saves.confirmed),
			},
		}));
	}, [enabled, persistence, saves.revision, saves.confirmed, siteId]);

	const value = useMemo(
		() => ({
			enabled,
			mode,
			streamedTabs: Boolean(initialDiary),
			snapshot,
			persistence,
			refresh: enabled ? refreshProject : undefined,
			failed,
			denied,
		}),
		[
			enabled,
			mode,
			initialDiary,
			snapshot,
			persistence,
			refreshProject,
			failed,
			denied,
		],
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
