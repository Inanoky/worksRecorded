"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
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
import { useProject } from "@/components/providers/ProjectProvider";
import { RetainedView } from "@/components/providers/RetainedView";
import {
	ZtcNavigationContext,
	type ZtcNavigationProject,
	ztcNavigationTarget,
} from "./ZtcNavigationContext";

const ProjectChooser = dynamic(() =>
	import("./ZtcProjectChooser").then((module) => module.ZtcProjectChooser),
);

const ProjectView = dynamic(() =>
	import("./ZtcNavigationProject").then(
		(module) => module.ZtcNavigationProject,
	),
);
const Views = createContext<{
	projects: ZtcNavigationProject[];
	language: string | null;
	valid: boolean;
} | null>(null);

export function ZtcNavigationProvider({
	enabled,
	userId,
	organizationId,
	projects,
	language,
	children,
}: {
	enabled: boolean;
	userId: string;
	organizationId: string | null;
	projects: ZtcNavigationProject[];
	language: string | null;
	children: ReactNode;
}) {
	return enabled ? (
		<NavigationSession
			key={JSON.stringify([userId, organizationId])}
			userId={userId}
			organizationId={organizationId}
			initialProjects={projects}
			language={language}
		>
			{children}
		</NavigationSession>
	) : (
		children
	);
}

function NavigationSession({
	userId,
	organizationId,
	initialProjects,
	language,
	children,
}: {
	userId: string;
	organizationId: string | null;
	initialProjects: ZtcNavigationProject[];
	language: string | null;
	children: ReactNode;
}) {
	const [projects, setProjects] = useState(initialProjects);
	const [valid, setValid] = useState(true);
	const pathname = usePathname();
	const router = useRouter();
	const project = useProject();
	const projectRef = useRef(project);
	projectRef.current = project;
	const lastCheck = useRef(0);
	const canNavigate = useCallback(
		(href: string) => valid && Boolean(ztcNavigationTarget(href, projects)),
		[projects, valid],
	);
	const navigate = useCallback(
		(href: string, options?: { replace?: boolean; scroll?: boolean }) => {
			if (!valid) return false;
			const target = ztcNavigationTarget(href, projects);
			if (!target) return false;
			if (
				window.location.pathname !== target.href ||
				window.location.search ||
				window.location.hash
			) {
				if (options?.replace)
					window.history.replaceState(null, "", target.href);
				else window.history.pushState(null, "", target.href);
				if (options?.scroll !== false) window.scrollTo(0, 0);
			}
			return true;
		},
		[projects, valid],
	);
	useEffect(() => {
		setProjects(initialProjects);
	}, [initialProjects]);
	useEffect(() => {
		const target = ztcNavigationTarget(pathname, projects);
		const selected =
			target?.siteId && projects.find((item) => item.id === target.siteId);
		if (selected) projectRef.current.setProject(selected.id, selected.name);
	}, [pathname, projects]);
	useEffect(() => {
		const controller = new AbortController();
		let pending = false;
		const refresh = async () => {
			if (
				pending ||
				document.visibilityState === "hidden" ||
				Date.now() - lastCheck.current < 60000
			)
				return;
			lastCheck.current = Date.now();
			pending = true;
			try {
				const response = await fetch("/api/ztc/navigation", {
					cache: "no-store",
					signal: controller.signal,
				});
				if (controller.signal.aborted) return;
				if ([401, 403].includes(response.status)) {
					setValid(false);
					router.refresh();
					return;
				}
				if (!response.ok) return;
				const next = (await response.json()) as {
					userId: string;
					organizationId: string;
					projects: ZtcNavigationProject[];
				};
				if (controller.signal.aborted) return;
				if (next.userId !== userId || next.organizationId !== organizationId) {
					setValid(false);
					router.refresh();
					return;
				}
				setProjects(next.projects);
				const current = /^\/dashboard\/sites\/([^/]+)\/dashboard$/.exec(
					window.location.pathname,
				);
				if (current && !next.projects.some((item) => item.id === current[1])) {
					window.history.replaceState(null, "", "/dashboard");
					projectRef.current.reset();
				}
			} catch {
			} finally {
				pending = false;
			}
		};
		void refresh();
		const onRefresh = () => {
			void refresh();
		};
		window.addEventListener("focus", onRefresh);
		window.addEventListener("online", onRefresh);
		document.addEventListener("visibilitychange", onRefresh);
		const timer = window.setInterval(onRefresh, 60000);
		return () => {
			controller.abort();
			lastCheck.current = 0;
			window.clearInterval(timer);
			window.removeEventListener("focus", onRefresh);
			window.removeEventListener("online", onRefresh);
			document.removeEventListener("visibilitychange", onRefresh);
		};
	}, [userId, organizationId, router]);
	const navigation = useMemo(
		() => ({ canNavigate, navigate }),
		[canNavigate, navigate],
	);
	const views = useMemo(
		() => ({ projects, language, valid }),
		[projects, language, valid],
	);
	return (
		<ZtcNavigationContext.Provider value={navigation}>
			<Views.Provider value={views}>{children}</Views.Provider>
		</ZtcNavigationContext.Provider>
	);
}

export function ZtcNavigationViewport({ children }: { children: ReactNode }) {
	const views = useContext(Views);
	if (views && !views.valid) return null;
	return views ? (
		<RetainedViews projects={views.projects} language={views.language}>
			{children}
		</RetainedViews>
	) : (
		children
	);
}

function RetainedViews({
	projects,
	language,
	children,
}: {
	projects: ZtcNavigationProject[];
	language: string | null;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const target = ztcNavigationTarget(pathname, projects);
	const [visited, setVisited] = useState<string[]>([]);
	const siteId = target?.siteId;
	const retained = projects.filter(
		(item) => visited.includes(item.id) || item.id === siteId,
	);
	useEffect(() => {
		if (siteId)
			setVisited((previous) =>
				previous.includes(siteId) ? previous : [...previous, siteId],
			);
	}, [siteId]);
	return (
		<>
			<RetainedView active={Boolean(target && !siteId)}>
				<ProjectChooser projects={projects} language={language} />
			</RetainedView>
			{retained.map((item) => (
				<RetainedView key={item.id} active={siteId === item.id}>
					<ProjectView siteId={item.id} organizationLanguage={language} />
				</RetainedView>
			))}
			{!target ? children : null}
		</>
	);
}
