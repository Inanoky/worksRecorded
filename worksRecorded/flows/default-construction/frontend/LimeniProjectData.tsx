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
import { fetchProjectSync } from "../visual/project-sync-client";
import { useDiarySaveQueue } from "./DiarySaveContext";
import { FORMA2_CHANGED } from "./forma2-client-refresh";

type ProjectData = {
	enabled: boolean;
	checkingCache?: boolean;
	restored?: boolean;
	snapshot: LimeniProjectSnapshot | null;
	persistence?: PersistentProjectCache;
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
}: {
	siteId: string;
	constructionWorkspace?: boolean;
	children: ReactNode;
}) {
	const scope = useProjectCacheScope();
	const workspaceActive = useWorkspaceActive();
	const visual = useVisualProjectPreload(siteId);
	const enabled = (visual || constructionWorkspace) && !!scope;
	const cacheKey = constructionWorkspace ? "construction:snapshot" : "snapshot";
	const mode = constructionWorkspace ? "construction" : "limeni";
	const persistence = useMemo(
		() => (scope ? new PersistentProjectCache(scope, siteId) : undefined),
		[scope, siteId],
	);
	const [restored, setRestored] = useState(false);
	const [checkingCache, setCheckingCache] = useState(true);
	const current = useRef<LimeniProjectSnapshot | null>(null);
	const displayed = useRef<LimeniProjectSnapshot | null>(null);
	const deferred = useRef<LimeniProjectSnapshot | null>(null);
	const patchRevision = useRef(0);
	const { snapshot: saves } = useDiarySaveQueue(siteId, enabled);
	const pendingSaves = useRef(0);
	pendingSaves.current = saves.items.length;
	const confirmedRevision = useRef(0);
	const [snapshot, setSnapshot] = useState<LimeniProjectSnapshot | null>(null);
	const [failed, setFailed] = useState(false);
	const [denied, setDenied] = useState(false);
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
			void persistence.write(cacheKey, current.current);
		},
		[siteId, persistence, publish, cacheKey],
	);
	useEffect(() => {
		if (!enabled || !persistence || !workspaceActive) return;
		const controller = new AbortController();
		performance.mark?.(`limeni:${siteId}:opening`);
		let interaction = 0;
		let inFlight = false;
		let initialized = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const flush = () => {
			if (
				deferred.current &&
				!pendingSaves.current &&
				!hasActiveProjectEditor()
			) {
				publish(deferred.current);
				deferred.current = null;
			}
		};
		const edited = () => {
			interaction++;
		};
		const patch = (event: Event) => {
			const detail = (event as CustomEvent<ProjectPatch>).detail;
			if (detail.siteId !== siteId || !current.current) return;
			interaction++;
			applyPatch(detail);
			schedule();
		};
		const refresh = async () => {
			flush();
			if (
				document.visibilityState === "hidden" ||
				navigator.onLine === false ||
				inFlight ||
				controller.signal.aborted ||
				!initialized ||
				pendingSaves.current
			)
				return;
			inFlight = true;
			const before = interaction;
			const cached = current.current;
			try {
				let response = await fetchProjectSync(
					siteId,
					cached,
					controller.signal,
					mode,
				);
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
				if (response.status === 304 && cached) {
					if (before === interaction) flush();
					setFailed(false);
					return;
				}
				if (!response.ok) throw new Error("Project unavailable");
				const payload = (await response.json()) as
					| LimeniProjectSnapshot
					| ProjectDelta;
				let next: LimeniProjectSnapshot | null;
				try {
					next =
						"kind" in payload && payload.kind === "delta"
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
					if (await deniedResponse()) return;
					if (!response.ok) throw new Error("Project unavailable");
					next = (await response.json()) as LimeniProjectSnapshot;
				}
				if (
					!next ||
					next.settings.siteId !== siteId ||
					controller.signal.aborted
				)
					return;
				hydrateProjectDates(next);
				if (before !== interaction || pendingSaves.current) {
					schedule();
					return;
				}
				current.current = next;
				if (!cached || !hasActiveProjectEditor()) {
					publish(next);
					deferred.current = null;
				} else deferred.current = next;
				void persistence.write(cacheKey, next);
				setFailed(false);
			} catch {
				if (!controller.signal.aborted) setFailed(true);
			} finally {
				inFlight = false;
			}
		};
		function schedule() {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => void refresh(), 1500);
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
			if (document.visibilityState !== "hidden") void refresh();
		};
		for (const event of ["input", "submit", "pointerdown"])
			document.addEventListener(event, edited, true);
		for (const event of [PROJECT_CHANGED, DIARY_RECORD_UPDATED, FORMA2_CHANGED])
			window.addEventListener(event, changed);
		window.addEventListener(PROJECT_PATCH, patch);
		window.addEventListener("focus", wake);
		window.addEventListener("online", wake);
		document.addEventListener("visibilitychange", wake);
		document.addEventListener("focusout", schedule);
		const interval = setInterval(wake, 15000);
		void (async () => {
			if (current.current) {
				flush();
				initialized = true;
				void refresh();
				return;
			}
			const cached = await persistence.read<LimeniProjectSnapshot>(cacheKey);
			if (controller.signal.aborted) return;
			if (cached?.settings?.siteId === siteId) {
				current.current = hydrateProjectDates(cached);
				setRestored(true);
				publish(cached);
			}
			setCheckingCache(false);
			initialized = true;
			void refresh();
		})();
		return () => {
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
			window.removeEventListener("online", wake);
			document.removeEventListener("visibilitychange", wake);
			document.removeEventListener("focusout", schedule);
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
			checkingCache,
			restored,
			snapshot,
			persistence,
			failed,
			denied,
		}),
		[enabled, checkingCache, restored, snapshot, persistence, failed, denied],
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
