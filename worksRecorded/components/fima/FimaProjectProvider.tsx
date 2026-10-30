"use client";
import { usePathname } from "next/navigation";
import {
	createContext,
	lazy,
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
import { useProjectPreparationReporter } from "@/components/providers/ProjectLoadingProgressProvider";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { Button } from "@/components/ui/button";
import { DIARY_RECORD_UPDATED } from "@/flows/default-construction/lib/diary-record-updated-event";
import { getFimaActsForSite } from "@/server/actions/fima-acts";
import { createFimaActsResource } from "./acts-resource";
import { createFimaDiaryResource } from "./diary-resource";
import { FimaProjectNavigationContext } from "./FimaProjectNavigationLink";

const loadView = () =>
	import("./FimaActsPage").then((module) => ({ default: module.FimaActsPage }));
const View = lazy(loadView);
const loadDiary = () => import("@/components/sitediary/SiteDiaryList");
const Diary = lazy(loadDiary);
const beforeNavigation = "fima:before-navigation";
type ProjectContext = {
	resource: ReturnType<typeof createFimaActsResource>;
	diary: ReturnType<typeof createFimaDiaryResource>;
	siteIds: readonly string[];
};
const Context = createContext<ProjectContext | null>(null);
function isDiaryPath(path: string, siteId: string) {
	return (
		path === `/dashboard/sites/${siteId}/dashboard` ||
		path === `/dashboard/sites/${siteId}/siteDiary`
	);
}
export function FimaProjectProvider({
	siteIds,
	children,
}: {
	siteIds: readonly string[];
	children: ReactNode;
}) {
	const [resource] = useState(() =>
		createFimaActsResource(getFimaActsForSite, loadView),
	);
	const [diary] = useState(() => createFimaDiaryResource(loadDiary));
	const pathname = usePathname();
	const siteId = /^\/dashboard\/sites\/([^/]+)/.exec(pathname)?.[1];
	const enabled = !!siteId && siteIds.includes(siteId);
	useEffect(() => {
		if (!enabled) return;
		void resource.load(siteId);
		void diary.load(siteId);
		let checked = Date.now();
		let debounce: ReturnType<typeof setTimeout> | undefined;
		const sync = (forced = false) => {
			if (
				document.visibilityState === "hidden" ||
				(!forced && Date.now() - checked < 60000)
			)
				return;
			checked = Date.now();
			void diary.load(siteId, true);
		};
		const focus = () => sync();
		const changed = (event: Event) => {
			const detail = (event as CustomEvent<{ siteId?: string }>).detail;
			if (detail?.siteId && detail.siteId !== siteId) return;
			clearTimeout(debounce);
			debounce = setTimeout(() => sync(true), 1500);
		};
		const interval = setInterval(focus, 60000);
		window.addEventListener("focus", focus);
		document.addEventListener("visibilitychange", focus);
		window.addEventListener(DIARY_RECORD_UPDATED, changed);
		return () => {
			clearInterval(interval);
			clearTimeout(debounce);
			window.removeEventListener("focus", focus);
			document.removeEventListener("visibilitychange", focus);
			window.removeEventListener(DIARY_RECORD_UPDATED, changed);
		};
	}, [enabled, resource, diary, siteId]);
	const navigation = useMemo(
		() => ({
			local: (href: string) =>
				enabled &&
				(href === `/dashboard/sites/${siteId}/acts` ||
					isDiaryPath(href, siteId)),
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
		[enabled, siteId],
	);
	const value = useMemo(
		() => ({ resource, diary, siteIds }),
		[resource, diary, siteIds],
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
	if (!context?.siteIds.includes(siteId)) return children;
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
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", remember, true);
			window.removeEventListener(beforeNavigation, remember);
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
	const active = pathname === `/dashboard/sites/${siteId}/acts`;
	const diaryActive = isDiaryPath(pathname, siteId);
	const { resource, diary } = context;
	const get = useCallback(() => resource.get(siteId), [resource, siteId]);
	const getDiary = useCallback(() => diary.get(siteId), [diary, siteId]);
	const state = useSyncExternalStore(resource.subscribe, get, resource.empty);
	const diaryState = useSyncExternalStore(
		diary.subscribe,
		getDiary,
		diary.empty,
	);
	const report = useProjectPreparationReporter(siteId);
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
		report(
			"acts",
			state.status === "ready"
				? "done"
				: state.status === "error"
					? "error"
					: "pending",
		);
	}, [report, state.status]);
	useEffect(() => {
		if (diaryState.status === "error") {
			report("settings", "error");
			report("diary", "error");
		}
	}, [report, diaryState.status]);
	const pending = [state.status, diaryState.status].some(
		(status) => status === "loading" || status === "idle",
	);
	return (
		<>
			{!active && !diaryActive ? children : null}
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
					) : null}
				</Suspense>
			</section>
			<section ref={actsRoot} hidden={!active} aria-label="Akti">
				<Suspense fallback={null}>
					{state.data ? (
						<View
							active={active}
							key={siteId}
							initial={state.data}
							onDataChange={resource.update}
						/>
					) : null}
				</Suspense>
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
