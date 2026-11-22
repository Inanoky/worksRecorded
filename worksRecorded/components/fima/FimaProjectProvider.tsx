"use client";
import { usePathname } from "next/navigation";
import {
	createContext,
	lazy,
	memo,
	type ReactNode,
	Suspense,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import AiWidgetRag from "@/components/ai/AiChatLazy";
import { WorkspaceView } from "@/components/projects/WorkspaceActivity";
import { BEFORE_WORKSPACE_NAVIGATION } from "@/components/projects/workspace-store";
import { useProjectPreparationReporter } from "@/components/providers/ProjectLoadingProgressProvider";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { Button } from "@/components/ui/button";
import { FORMA2_CHANGED } from "@/flows/default-construction/frontend/forma2-client-refresh";
import { DIARY_RECORD_UPDATED } from "@/flows/default-construction/lib/diary-record-updated-event";
import {
	getFimaActsActivity,
	getFimaActsDelta,
	getFimaActsForSite,
} from "@/server/actions/fima-acts";
import { createFimaActsResource } from "./acts-resource";
import { createFimaDiaryResource } from "./diary-resource";
import { FimaProjectNavigationContext } from "./FimaProjectNavigationLink";
import { createFimaForma2Resource } from "./forma2-resource";

const loadView = () =>
	import("./FimaActsPage").then((module) => ({ default: module.FimaActsPage }));
const View = lazy(() =>
	loadView().then((module) => ({ default: memo(module.default) })),
);
const loadDiary = () => import("@/components/sitediary/SiteDiaryList");
const Diary = lazy(() =>
	loadDiary().then((module) => ({ default: memo(module.default) })),
);
const loadForma2 = () =>
	import("./FimaForma2View").then((module) => ({
		default: module.FimaForma2View,
	}));
const Forma2 = lazy(loadForma2);

import type { FimaActsData } from "@/lib/fima/act-register";
import type { FimaDiaryWorkspace } from "@/lib/fima/diary-workspace";
import { fimaResourcePersistence } from "./persistent-resource";

const noCases: Record<string, string | null> = {};
const beforeNavigation = "fima:before-navigation";
type ProjectContext = {
	resource: ReturnType<typeof createFimaActsResource>;
	diary: ReturnType<typeof createFimaDiaryResource>;
	forma2: ReturnType<typeof createFimaForma2Resource>;
	siteIds: readonly string[];
	forma2SiteIds: readonly string[];
};
const Context = createContext<ProjectContext | null>(null);
function isDiaryPath(path: string, siteId: string) {
	return (
		path === `/dashboard/sites/${siteId}/dashboard` ||
		path === `/dashboard/sites/${siteId}/siteDiary`
	);
}
export function FimaProjectProvider({
	cacheScope,
	projectCases = noCases,
	siteIds,
	forma2SiteIds = siteIds,
	children,
}: {
	siteIds: readonly string[];
	forma2SiteIds?: readonly string[];
	cacheScope?: string;
	projectCases?: Record<string, string | null>;
	children: ReactNode;
}) {
	const [resource] = useState(() =>
		createFimaActsResource(getFimaActsForSite, loadView, {
			check: getFimaActsActivity,
			loadDelta: getFimaActsDelta,
			persistence: fimaResourcePersistence<FimaActsData>(
				cacheScope,
				projectCases,
				"acts",
			),
		}),
	);
	const [diary] = useState(() =>
		createFimaDiaryResource(
			loadDiary,
			undefined,
			fimaResourcePersistence<FimaDiaryWorkspace>(
				cacheScope,
				projectCases,
				"diary",
			),
		),
	);
	const [forma2] = useState(() =>
		createFimaForma2Resource(
			loadForma2,
			fimaResourcePersistence(cacheScope, projectCases, "forma2"),
		),
	);
	const pathname = usePathname();
	const siteId = /^\/dashboard\/sites\/([^/]+)/.exec(pathname)?.[1];
	const enabled = !!siteId && siteIds.includes(siteId);
	const forma2Enabled = !!siteId && forma2SiteIds.includes(siteId);
	useEffect(() => {
		if (!siteId || !forma2Enabled) return;
		const online = () =>
			navigator.onLine !== false && document.visibilityState !== "hidden";
		const background = () => {
			if (online()) void forma2.load(siteId);
		};
		const changed = (event: Event) => {
			if (
				(event as CustomEvent<{ siteId?: string }>).detail?.siteId !== siteId ||
				!online()
			)
				return;
			clearTimeout(debounce);
			debounce = setTimeout(() => void forma2.refresh(siteId), 500);
		};
		let debounce: ReturnType<typeof setTimeout> | undefined;
		void forma2.load(siteId);
		const interval = setInterval(background, 60_000);
		window.addEventListener("online", background);
		document.addEventListener("visibilitychange", background);
		window.addEventListener(FORMA2_CHANGED, changed);
		window.addEventListener(DIARY_RECORD_UPDATED, changed);
		return () => {
			clearInterval(interval);
			clearTimeout(debounce);
			window.removeEventListener("online", background);
			document.removeEventListener("visibilitychange", background);
			window.removeEventListener(FORMA2_CHANGED, changed);
			window.removeEventListener(DIARY_RECORD_UPDATED, changed);
		};
	}, [forma2, forma2Enabled, siteId]);
	useEffect(() => {
		if (!enabled) return;
		if (document.visibilityState !== "hidden" && navigator.onLine !== false) {
			void resource.load(siteId, resource.get(siteId).data !== null);
			void diary.load(siteId, diary.get(siteId).data !== null);
		}
		let checked = Date.now();
		let debounce: ReturnType<typeof setTimeout> | undefined;
		const sync = (forced = false) => {
			if (
				document.visibilityState === "hidden" ||
				navigator.onLine === false ||
				(!forced && Date.now() - checked < 15000)
			)
				return;
			checked = Date.now();
			void diary.load(siteId, true);
			void resource.load(siteId, true);
		};
		const focus = () => sync(true);
		const changed = (event: Event) => {
			const detail = (event as CustomEvent<{ siteId?: string }>).detail;
			if (detail?.siteId && detail.siteId !== siteId) return;
			clearTimeout(debounce);
			debounce = setTimeout(() => sync(true), 1500);
		};
		const interval = setInterval(() => sync(), 15000);
		window.addEventListener("focus", focus);
		window.addEventListener("online", focus);
		document.addEventListener("visibilitychange", focus);
		window.addEventListener(DIARY_RECORD_UPDATED, changed);
		return () => {
			clearInterval(interval);
			clearTimeout(debounce);
			window.removeEventListener("focus", focus);
			window.removeEventListener("online", focus);
			document.removeEventListener("visibilitychange", focus);
			window.removeEventListener(DIARY_RECORD_UPDATED, changed);
		};
	}, [enabled, resource, diary, siteId]);
	const navigation = useMemo(
		() => ({
			local: (href: string) =>
				(forma2Enabled && href === `/dashboard/sites/${siteId}/analytics`) ||
				(enabled &&
					(href === `/dashboard/sites/${siteId}/acts` ||
						isDiaryPath(href, siteId))),
			navigate: (
				href: string,
				options: { replace?: boolean; scroll?: boolean },
			) => {
				if (
					window.location.pathname === href &&
					!window.location.search &&
					!window.location.hash
				)
					return;
				window.dispatchEvent(new Event(beforeNavigation));
				if (options.replace) window.history.replaceState(null, "", href);
				else window.history.pushState(null, "", href);
			},
		}),
		[enabled, forma2Enabled, siteId],
	);
	const value = useMemo(
		() => ({ resource, diary, forma2, siteIds, forma2SiteIds }),
		[resource, diary, forma2, siteIds, forma2SiteIds],
	);
	return (
		<Context.Provider value={value}>
			<FimaProjectNavigationContext.Provider value={navigation}>
				{children}
			</FimaProjectNavigationContext.Provider>
		</Context.Provider>
	);
}
export function FimaProjectContent({
	siteId,
	children,
}: {
	siteId: string;
	children: ReactNode;
}) {
	const context = useContext(Context);
	if (
		!context ||
		(!context.siteIds.includes(siteId) &&
			!context.forma2SiteIds.includes(siteId))
	)
		return children;
	return (
		<PreparedProject siteId={siteId} context={context}>
			{children}
		</PreparedProject>
	);
}
function useRetainedScroll(active: boolean, ready: boolean) {
	const root = useRef<HTMLElement>(null);
	const position = useRef({
		x: 0,
		y: 0,
		tables: [] as { x: number; y: number }[],
	});
	useLayoutEffect(() => {
		if (!active || !ready) return;
		let restoring = true;
		const tables = () => [
			...(root.current?.querySelectorAll<HTMLElement>(
				'[data-slot="table-container"]',
			) ?? []),
		];
		const frame = requestAnimationFrame(() => {
			window.scrollTo(position.current.x, position.current.y);
			tables().forEach((table, index) => {
				const saved = position.current.tables[index];
				if (saved) {
					table.scrollLeft = saved.x;
					table.scrollTop = saved.y;
				}
			});
			restoring = false;
		});
		const remember = () => {
			if (restoring) return;
			position.current = {
				x: window.scrollX,
				y: window.scrollY,
				tables: tables().map((table) => ({
					x: table.scrollLeft,
					y: table.scrollTop,
				})),
			};
		};
		window.addEventListener("scroll", remember, true);
		window.addEventListener(beforeNavigation, remember);
		window.addEventListener(BEFORE_WORKSPACE_NAVIGATION, remember);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", remember, true);
			window.removeEventListener(beforeNavigation, remember);
			window.removeEventListener(BEFORE_WORKSPACE_NAVIGATION, remember);
		};
	}, [active, ready]);
	return root;
}
function PreparedProject({
	siteId,
	context,
	children,
}: {
	siteId: string;
	context: ProjectContext;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const withActs = context.siteIds.includes(siteId);
	const withForma2 = context.forma2SiteIds.includes(siteId);
	const active = withActs && pathname === `/dashboard/sites/${siteId}/acts`;
	const diaryActive = withActs && isDiaryPath(pathname, siteId);
	const forma2Active =
		withForma2 && pathname === `/dashboard/sites/${siteId}/analytics`;
	const { resource, diary, forma2 } = context;
	const get = useCallback(() => resource.get(siteId), [resource, siteId]);
	const getDiary = useCallback(() => diary.get(siteId), [diary, siteId]);
	const getForma2 = useCallback(() => forma2.get(siteId), [forma2, siteId]);
	const state = useSyncExternalStore(resource.subscribe, get, resource.empty);
	const diaryState = useSyncExternalStore(
		diary.subscribe,
		getDiary,
		diary.empty,
	);
	const report = useProjectPreparationReporter(siteId);
	const forma2State = useSyncExternalStore(
		forma2.subscribe,
		getForma2,
		forma2.empty,
	);
	const forma2Root = useRetainedScroll(forma2Active, !!forma2State.snapshot);
	const actsRoot = useRetainedScroll(active, !!state.data);
	const diaryRoot = useRetainedScroll(diaryActive, !!diaryState.data);
	const patchRows = useCallback<
		NonNullable<Parameters<typeof Diary>[0]["onFimaRowsChange"]>
	>((rows, removed) => diary.patch(siteId, rows, removed), [diary, siteId]);
	const sync = useCallback(async () => {
		await diary.load(siteId, true);
		return diary.get(siteId).data;
	}, [diary, siteId]);
	useEffect(() => {
		if (!withForma2) return;
		report(
			"forma2",
			forma2State.snapshot
				? "done"
				: forma2State.status === "error"
					? "error"
					: "pending",
		);
	}, [report, withForma2, forma2State.status, forma2State.snapshot]);
	useEffect(() => {
		if (!withActs) return;
		report(
			"acts",
			state.data ? "done" : state.status === "error" ? "error" : "pending",
		);
	}, [report, withActs, state.status, state.data]);
	useEffect(() => {
		if (diaryState.status === "error" && !diaryState.data) {
			report("settings", "error");
			report("diary", "error");
		}
	}, [report, diaryState.status, diaryState.data]);
	const pending =
		withActs &&
		[state.status, diaryState.status].some(
			(status, index) =>
				![state.data, diaryState.data][index] &&
				(status === "loading" || status === "idle"),
		);
	return (
		<>
			{!active && !diaryActive && !forma2Active ? children : null}
			{[
				{ key: "acts", entry: state, retry: resource },
				{ key: "diary", entry: diaryState, retry: diary },
			].map(({ key, entry, retry }) =>
				entry.status === "error" ? (
					<div
						key={key}
						role="alert"
						className="m-4 space-y-2 rounded-lg border p-4 text-sm"
					>
						<p>{entry.error}</p>
						<Button
							variant="outline"
							onClick={() => void retry.load(siteId, true)}
						>
							Mēģināt vēlreiz
						</Button>
					</div>
				) : null,
			)}
			<section
				ref={diaryRoot}
				hidden={!diaryActive}
				aria-label="Būvdarbu žurnāls"
			>
				<Suspense fallback={null}>
					{diaryState.data ? (
						<WorkspaceView active={diaryActive}>
							<Diary
								key={siteId}
								siteId={siteId}
								active={diaryActive}
								batchEditing
								bisEnabled={diaryState.data.bisEnabled}
								organizationLanguage={diaryState.data.organizationLanguage}
								fimaClientData={diaryState.data}
								onFimaRowsChange={patchRows}
								onFimaSync={sync}
							/>
						</WorkspaceView>
					) : null}
				</Suspense>
			</section>
			<section ref={actsRoot} hidden={!active} aria-label="Akti">
				<Suspense fallback={null}>
					{state.data ? (
						<WorkspaceView active={active}>
							<View
								active={active}
								key={siteId}
								initial={state.data}
								onDataChange={resource.update}
							/>
						</WorkspaceView>
					) : null}
				</Suspense>
			</section>
			<section ref={forma2Root} hidden={!forma2Active} aria-label="Forma 2">
				{forma2State.snapshot ? (
					<Suspense fallback={null}>
						<WorkspaceView active={forma2Active}>
							<Forma2
								key={siteId}
								workspace={forma2State.snapshot.data}
								resource={forma2}
							/>
						</WorkspaceView>
					</Suspense>
				) : forma2State.status === "error" ? (
					<div
						role="alert"
						className="m-4 space-y-2 rounded-lg border p-4 text-sm"
					>
						<p>{forma2State.error}</p>
						<Button variant="outline" onClick={() => void forma2.load(siteId)}>
							Mēģināt vēlreiz
						</Button>
					</div>
				) : forma2Active && !pending ? (
					<ProjectOpeningOverlay siteId={siteId} label="Ielādē Forma 2…" />
				) : null}
			</section>
			{diaryState.data ? <AiWidgetRag siteId={siteId} /> : null}
			{pending ? (
				<ProjectOpeningOverlay
					label="Sagatavo FIMA žurnālu, aktus un paraugus…"
					siteId={siteId}
				/>
			) : null}
		</>
	);
}
