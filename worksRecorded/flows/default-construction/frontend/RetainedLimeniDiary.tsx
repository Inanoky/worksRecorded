"use client";

import { usePathname, useRouter } from "next/navigation";
import {
	createContext,
	lazy,
	memo,
	type ReactNode,
	Suspense,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { WorkspaceView } from "@/components/projects/WorkspaceActivity";
import {
	useProjectPreparationReporter,
	useVisualProjectPreload,
} from "@/components/providers/ProjectLoadingProgressProvider";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { useLimeniProjectData } from "./LimeniProjectData";

const Diary = lazy(() =>
	import("@/components/sitediary/SiteDiaryList").then((module) => ({
		default: memo(module.default),
	})),
);

type DiarySettings = {
	siteId: string;
	userId: string;
	organizationId: string;
	bisEnabled: boolean;
	bisUnavailable?: boolean;
	organizationLanguage: string | null;
};

const DiaryContext = createContext<{
	register: (settings: DiarySettings | null) => void;
	ready: boolean;
} | null>(null);

export function RetainedLimeniDiary({
	constructionBisTools = false,
	siteId,
	children,
}: {
	siteId: string;
	constructionBisTools?: boolean;
	children: ReactNode;
}) {
	const [settings, setSettings] = useState<DiarySettings | null>(null);
	const projectData = useLimeniProjectData();
	const visualPreload = useVisualProjectPreload(siteId);
	const preload = visualPreload || projectData.enabled;
	const journalProgress = visualPreload ? { completed: 0, total: 1 } : undefined;
	const report = useProjectPreparationReporter(siteId);
	const router = useRouter();
	const backgroundRoutesPrefetched = useRef(false);
	useEffect(() => {
		if (!preload) return;
		if (projectData.enabled) {
			void import("@/components/sitediary/SiteDiaryList").catch(() =>
				report("diary", "error"),
			);
			if (projectData.snapshot) setSettings(projectData.snapshot.settings);
			return;
		}
		const controller = new AbortController();
		void Promise.all([
			import("@/components/sitediary/SiteDiaryList"),
			fetch(`/api/sites/${encodeURIComponent(siteId)}/limeni-workspace`, {
				signal: controller.signal,
				cache: "no-store",
			}).then(async (response) => {
				if (!response.ok) throw new Error("Project unavailable");
				return (await response.json()) as DiarySettings;
			}),
		]).then(
			([, loaded]) => {
				if (controller.signal.aborted || loaded.siteId !== siteId) return;
				setSettings(loaded);
			},
			() => {
				if (controller.signal.aborted) return;
				report("settings", "error");
				report("diary", "error");
			},
		);
		return () => controller.abort();
	}, [preload, siteId, report, projectData.enabled, projectData.snapshot]);
	const active = usePathname() === `/dashboard/sites/${siteId}/dashboard`;
	const scroll = useRef(0);
	const visited = useRef(false);
	const scrollScope = useRef("");
	const scope = settings
		? `${settings.userId}:${settings.organizationId}:${siteId}`
		: "";
	const ready =
		settings?.siteId === siteId &&
		(!projectData.enabled || !!projectData.snapshot);
	const context = useMemo(
		() => ({ register: setSettings, ready: active && ready }),
		[active, ready],
	);
	useEffect(() => {
		if (
			projectData.mode !== "construction" ||
			projectData.streamedTabs ||
			!projectData.snapshot ||
			projectData.snapshot.bootstrap ||
			backgroundRoutesPrefetched.current
		)
			return;
		backgroundRoutesPrefetched.current = true;
		router.prefetch(`/dashboard/sites/${siteId}/timesheets`);
		router.prefetch(`/dashboard/sites/${siteId}/BIS`);
	}, [
		projectData.mode,
		projectData.snapshot,
		projectData.streamedTabs,
		router,
		siteId,
	]);

	useLayoutEffect(() => {
		if (scrollScope.current !== scope) {
			scrollScope.current = scope;
			scroll.current = 0;
			visited.current = false;
		}
		if (!active || !ready) return;
		const top = scroll.current;
		let restoring = visited.current;
		const frame = visited.current
			? requestAnimationFrame(() => {
					window.scrollTo(0, top);
					restoring = false;
				})
			: null;
		visited.current = true;
		const remember = () => {
			if (!restoring) scroll.current = window.scrollY;
		};
		window.addEventListener("scroll", remember, { passive: true });
		return () => {
			if (frame !== null) cancelAnimationFrame(frame);
			window.removeEventListener("scroll", remember);
		};
	}, [active, ready, scope]);

	return (
		<DiaryContext.Provider value={context}>
			{children}
			<section hidden={!active} aria-label="Būvdarbu žurnāls">
				{settings?.bisUnavailable ? (
					<output className="block rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
						{settings.organizationLanguage === "en"
							? "BIS is temporarily unavailable. You can continue using the diary; your BIS connection is retained. Try again in a minute."
							: "BIS īslaicīgi nav pieejams. Žurnālu varat lietot kā parasti; BIS savienojums ir saglabāts. Mēģiniet vēlreiz pēc minūtes."}
					</output>
				) : null}
				{ready && settings ? (
					<Suspense
						fallback={
							active ? (
								<ProjectOpeningOverlay
									progress={journalProgress}
									label={
										settings.organizationLanguage === "en"
											? "Loading construction diary…"
											: "Ielādē būvdarbu žurnālu…"
									}
								/>
							) : null
						}
					>
						<WorkspaceView active={active}>
							<Diary
								key={scope}
								siteId={siteId}
								bisEnabled={settings.bisEnabled}
								constructionBisTools={constructionBisTools}
								organizationLanguage={settings.organizationLanguage}
								limeniClientDiary
								initialLimeniProject={projectData.snapshot ?? undefined}
								onRefreshCachedProject={projectData.refresh}
								active={active}
								batchEditing
							/>
						</WorkspaceView>
					</Suspense>
				) : active && projectData.enabled ? (
					projectData.failed ? (
						<p role="alert">
							Neizdevās ielādēt būvdarbu žurnālu. Savienojums tiks pārbaudīts
							atkārtoti.
						</p>
					) : (
						<ProjectOpeningOverlay
							label="Ielādē būvdarbu žurnālu…"
							progress={journalProgress}
						/>
					)
				) : null}
			</section>
		</DiaryContext.Provider>
	);
}

export function RegisterLimeniDiary(settings: DiarySettings) {
	const context = useContext(DiaryContext);
	const register = context?.register;
	const { siteId, userId, organizationId, bisEnabled, organizationLanguage } =
		settings;
	useEffect(() => {
		register?.({
			siteId,
			userId,
			organizationId,
			bisEnabled,
			organizationLanguage,
		});
	}, [
		register,
		siteId,
		userId,
		organizationId,
		bisEnabled,
		organizationLanguage,
	]);
	if (!context) throw new Error("Missing project diary provider");
	return null;
}

export function useRetainedDiaryReady() {
	return useContext(DiaryContext)?.ready ?? false;
}

export function ClearRetainedDiary() {
	const register = useContext(DiaryContext)?.register;
	useEffect(() => {
		register?.(null);
	}, [register]);
	return null;
}
