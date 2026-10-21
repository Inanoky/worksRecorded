"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
	mergeProjectDelta,
	PROJECT_CHANGED,
	PROJECT_PATCH,
	type ProjectDelta,
	type ProjectPatch,
	patchProject,
} from "../visual/project-sync";
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
	const [restored, setRestored] = useState(false);
	const [checkingCache, setCheckingCache] = useState(true);
	const current = useRef<LimeniProjectSnapshot | null>(null);
	const { snapshot: saves } = useDiarySaveQueue(siteId, enabled);
	const confirmedRevision = useRef(0);
	const [snapshot, setSnapshot] = useState<LimeniProjectSnapshot | null>(null);
	const [failed, setFailed] = useState(false);
	const [denied, setDenied] = useState(false);
	useEffect(() => {
		if (!enabled || !persistence) return;
		const controller = new AbortController();
		performance.mark?.(`limeni:${siteId}:opening`);
		let interaction = 0;
		let inFlight = false;
		let initialized = false;
		let deferred: LimeniProjectSnapshot | null = null;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const edited = () => {
			interaction++;
		};
		const patch = (event: Event) => {
			const detail = (event as CustomEvent<ProjectPatch>).detail;
			if (detail.siteId !== siteId || !current.current) return;
			interaction++;
			current.current = hydrateProjectDates(detail.apply(current.current));
			void persistence.write("snapshot", current.current);
			schedule();
		};
		const refresh = async () => {
			if (inFlight || controller.signal.aborted || !initialized) return;
			inFlight = true;
			const before = interaction;
			const cached = current.current;
			try {
				const response = await fetch(
					`/api/sites/${encodeURIComponent(siteId)}/limeni-project`,
					{
						cache: "no-cache",
						signal: controller.signal,
						headers: cached
							? {
									"If-None-Match": `"${cached.revision ?? cached.version}"`,
									...(cached.partVersions
										? { "X-Project-Parts": JSON.stringify(cached.partVersions) }
										: {}),
								}
							: {},
					},
				);
				if (response.status === 403 || response.status === 401) {
					await clearPersistentProjects();
					if (!controller.signal.aborted) {
						current.current = null;
						setSnapshot(null);
						setDenied(true);
					}
					controller.abort();
					return;
				}
				if (response.status === 304 && cached) {
					if (
						deferred &&
						before === interaction &&
						!document.querySelector('[role="dialog"]') &&
						!/^(INPUT|TEXTAREA|SELECT)$/.test(
							document.activeElement?.tagName ?? "",
						)
					) {
						setSnapshot(deferred);
						deferred = null;
					}
					return;
				}
				if (!response.ok) throw new Error("Project unavailable");
				const payload = (await response.json()) as
					| LimeniProjectSnapshot
					| ProjectDelta;
				const next =
					"kind" in payload && payload.kind === "delta"
						? cached
							? mergeProjectDelta(cached, payload)
							: null
						: (payload as LimeniProjectSnapshot);
				if (
					!next ||
					next.settings.siteId !== siteId ||
					controller.signal.aborted
				)
					return;
				hydrateProjectDates(next);
				if (before !== interaction) {
					schedule();
					return;
				}
				current.current = next;
				if (
					!cached ||
					(!document.querySelector('[role="dialog"]') &&
						!/^(INPUT|TEXTAREA|SELECT)$/.test(
							document.activeElement?.tagName ?? "",
						))
				) {
					setSnapshot(next);
					deferred = null;
				} else deferred = next;
				void persistence.write("snapshot", next);
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
		document.addEventListener("visibilitychange", wake);
		document.addEventListener("focusout", schedule);
		const interval = setInterval(wake, 30000);
		void (async () => {
			const cached = await persistence.read<LimeniProjectSnapshot>("snapshot");
			if (controller.signal.aborted) return;
			if (cached?.settings?.siteId === siteId) {
				current.current = hydrateProjectDates(cached);
				setRestored(true);
				setSnapshot(cached);
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
			document.removeEventListener("visibilitychange", wake);
			document.removeEventListener("focusout", schedule);
		};
	}, [enabled, persistence, siteId]);
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
