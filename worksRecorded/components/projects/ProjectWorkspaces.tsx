"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	memo,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { FimaProjectContent } from "@/components/fima/FimaProjectProvider";
import { ProjectScope } from "@/components/providers/ProjectProvider";
import { RetainedView } from "@/components/providers/RetainedView";
import { LimeniProjectData } from "@/flows/default-construction/frontend/LimeniProjectData";
import { RetainedLimeniDiary } from "@/flows/default-construction/frontend/RetainedLimeniDiary";
import { RetainedLimeniForma2 } from "@/flows/default-construction/frontend/RetainedLimeniForma2";
import { VisualProjectView } from "@/flows/default-construction/visual/VisualProjectView";
import { WorkspaceActivityContext } from "./WorkspaceActivity";
import { WorkspaceNavigationContext as Context } from "./WorkspaceNavigation";
import {
	BEFORE_WORKSPACE_NAVIGATION,
	createWorkspaceStore,
	type ProjectWorkspace,
	projectIdFromHref,
	type WorkspaceDescriptor,
	type WorkspaceRoute,
	type WorkspaceStore,
} from "./workspace-store";

export {
	RegisterProjectPage,
	RegisterProjectWorkspace,
} from "./ProjectRegistration";

function useHref() {
	const path = usePathname();
	const query = useSearchParams().toString();
	return `${path}${query ? `?${query}` : ""}`;
}
function IdentityWorkspaceProvider({
	userId,
	organizationId,
	children,
}: {
	userId: string;
	organizationId: string | null;
	children: ReactNode;
}) {
	const [store] = useState(() => createWorkspaceStore(userId, organizationId));
	const router = useRouter();
	const checked = useRef(new Map<string, number>());
	const href = useHref();
	const navigate = useCallback(
		(target: string, options?: { replace?: boolean; scroll?: boolean }) => {
			if (!store.hasRoute(target)) return false;
			target = store.resolveHref(target);
			window.dispatchEvent(new Event(BEFORE_WORKSPACE_NAVIGATION));
			window.dispatchEvent(new Event("fima:before-navigation"));
			store.visit(target);
			if (options?.replace) window.history.replaceState(null, "", target);
			else window.history.pushState(null, "", target);
			const siteId = projectIdFromHref(target);
			if (
				siteId &&
				Date.now() -
					(checked.current.get(siteId) ??
						store
							.getSnapshot()
							.find((entry) => entry.descriptor.siteId === siteId)
							?.authorizedAt ??
						0) >
					60000
			) {
				checked.current.set(siteId, Date.now());
				void fetch(
					`/api/sites/${encodeURIComponent(siteId)}/workspace-access`,
					{ cache: "no-store" },
				)
					.then(async (response) => {
						if ([401, 403, 404].includes(response.status)) {
							store.remove(siteId);
							if (projectIdFromHref(window.location.pathname) === siteId)
								router.replace("/dashboard/sites");
							return;
						}
						if (!response.ok) return;
						const descriptor = (await response.json()) as WorkspaceDescriptor;
						if (descriptor.userId !== userId || descriptor.siteId !== siteId) {
							store.clear();
							router.refresh();
							return;
						}
						if (!store.register(descriptor)) {
							store.remove(siteId);
							router.refresh();
							return;
						}
						if (
							window.location.pathname + window.location.search === target &&
							!/\/(dashboard|siteDiary)$/.test(window.location.pathname) &&
							!store.isProtected(siteId) &&
							!descriptor.visualPreload &&
							!descriptor.fimaActs
						)
							router.refresh();
					})
					.catch(() => {});
			}
			return true;
		},
		[store, router, userId],
	);
	useLayoutEffect(() => {
		store.visit(href);
	}, [store, href]);
	useEffect(() => {
		const logout = (event: MouseEvent) => {
			const link =
				event.target instanceof Element ? event.target.closest("a") : null;
			if (
				link?.origin === window.location.origin &&
				/\/logout\b/.test(link.pathname)
			)
				store.clear();
		};
		document.addEventListener("click", logout, true);
		return () => document.removeEventListener("click", logout, true);
	}, [store]);
	const value = useMemo(() => ({ store, navigate }), [store, navigate]);
	return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function ProjectWorkspaceProvider(props: {
	userId: string;
	organizationId: string | null;
	children: ReactNode;
}) {
	return (
		<IdentityWorkspaceProvider
			key={`${props.userId}:${props.organizationId ?? "admin"}`}
			{...props}
		/>
	);
}
export function ProjectWorkspaceViewport({
	children,
}: {
	children: ReactNode;
}) {
	const context = useContext(Context);
	if (!context) return children;
	return (
		<WorkspaceViewport store={context.store}>{children}</WorkspaceViewport>
	);
}
function WorkspaceViewport({
	store,
	children,
}: {
	store: WorkspaceStore;
	children: ReactNode;
}) {
	const entries = useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getServerSnapshot,
	);
	const href = useHref();
	const cached = store.hasRoute(href);
	return (
		<>
			<div hidden={cached} inert={cached}>
				{children}
			</div>
			{entries.map((entry) => (
				<Workspace
					key={entry.descriptor.siteId}
					entry={entry}
					store={store}
					href={href}
				/>
			))}
			{store.getRoots().map((route) => (
				<RetainedView
					key={route.href}
					active={store.resolveHref(href) === route.href}
				>
					<WorkspaceActivityContext.Provider
						value={{
							active: store.resolveHref(href) === route.href,
							managed: true,
							protect: () => {},
						}}
					>
						<RetainedRoute
							route={route}
							active={store.resolveHref(href) === route.href}
						/>
					</WorkspaceActivityContext.Provider>
				</RetainedView>
			))}
		</>
	);
}
function Workspace({
	entry,
	store,
	href,
}: {
	entry: ProjectWorkspace;
	store: WorkspaceStore;
	href: string;
}) {
	const { siteId, name } = entry.descriptor;
	const active = projectIdFromHref(href) === siteId && store.hasRoute(href);
	const protect = useCallback(
		(token: string, dirty: boolean) => store.protect(siteId, token, dirty),
		[store, siteId],
	);
	const activity = useMemo(
		() => ({ active, protect, managed: true }),
		[active, protect],
	);
	const root = useRef<HTMLDivElement>(null);
	const protectedEditors = useRef(new Set<Element>());
	const observer = useRef<MutationObserver | null>(null);
	const captureDraft = useCallback(
		(event: { target: EventTarget | null }) => {
			if (!(event.target instanceof Element)) return;
			const editor = event.target.closest(
				'form,[role="dialog"],[data-workspace-editor]',
			);
			if (!editor) return;
			protectedEditors.current.add(editor);
			protect("form-drafts", true);
			if (!observer.current) {
				observer.current = new MutationObserver(() => {
					for (const item of protectedEditors.current)
						if (!item.isConnected) protectedEditors.current.delete(item);
					protect("form-drafts", protectedEditors.current.size > 0);
					if (!protectedEditors.current.size) {
						observer.current?.disconnect();
						observer.current = null;
					}
				});
				observer.current.observe(document.body, {
					childList: true,
					subtree: true,
				});
			}
		},
		[protect],
	);
	useEffect(() => {
		return () => observer.current?.disconnect();
	}, []);
	return (
		<div
			ref={root}
			hidden={!active}
			inert={!active}
			data-project-workspace={siteId}
			onInputCapture={captureDraft}
			onChangeCapture={captureDraft}
		>
			<WorkspaceActivityContext.Provider value={activity}>
				<ProjectScope id={siteId} name={name}>
					<FimaProjectContent siteId={siteId}>
						<LimeniProjectData
							siteId={siteId}
							constructionWorkspace={entry.descriptor.constructionWorkspace}
							initialDiary={entry.initialDiary}
						>
							<VisualProjectView siteId={siteId}>
								<RetainedLimeniDiary
									siteId={siteId}
									constructionBisTools={
										entry.descriptor.constructionWorkspace ||
										entry.descriptor.visualPreload
									}
								>
									{[...entry.routes.values()].map((route) => (
										<RetainedRoute
											key={route.href}
											route={route}
											active={active && href === route.href}
										/>
									))}
									<RetainedLimeniForma2 siteId={siteId} />
								</RetainedLimeniDiary>
							</VisualProjectView>
						</LimeniProjectData>
					</FimaProjectContent>
				</ProjectScope>
			</WorkspaceActivityContext.Provider>
		</div>
	);
}
const RetainedRoute = memo(function RetainedRoute({
	route,
	active,
}: {
	route: WorkspaceRoute;
	active: boolean;
}) {
	const outer = useContext(WorkspaceActivityContext);
	const value = useMemo(() => ({ ...outer, active }), [outer, active]);
	const [visited, setVisited] = useState(active);
	const root = useRef<HTMLDivElement>(null);
	const scroll = useRef({
		x: 0,
		y: 0,
		nested: new Map<Element, { x: number; y: number }>(),
	});
	useLayoutEffect(() => {
		if (!active) return;
		setVisited(true);
		const remember = (event: Event) => {
			scroll.current.x = window.scrollX;
			scroll.current.y = window.scrollY;
			if (
				event.target instanceof Element &&
				root.current?.contains(event.target)
			)
				scroll.current.nested.set(event.target, {
					x: event.target.scrollLeft,
					y: event.target.scrollTop,
				});
		};
		const restore = requestAnimationFrame(() => {
			window.scrollTo(scroll.current.x, scroll.current.y);
			for (const [node, saved] of scroll.current.nested) {
				node.scrollLeft = saved.x;
				node.scrollTop = saved.y;
			}
		});
		window.addEventListener("scroll", remember, true);
		window.addEventListener(BEFORE_WORKSPACE_NAVIGATION, remember);
		return () => {
			cancelAnimationFrame(restore);
			window.removeEventListener("scroll", remember, true);
			window.removeEventListener(BEFORE_WORKSPACE_NAVIGATION, remember);
		};
	}, [active]);
	return (
		<div
			ref={root}
			hidden={!active}
			inert={!active}
			data-project-route={route.href}
		>
			<WorkspaceActivityContext.Provider value={value}>
				{(active || visited) && route.content}
			</WorkspaceActivityContext.Provider>
		</div>
	);
});
