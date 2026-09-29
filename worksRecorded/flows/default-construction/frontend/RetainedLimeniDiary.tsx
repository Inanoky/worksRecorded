"use client";

import { usePathname } from "next/navigation";
import {
	createContext,
	lazy,
	type ReactNode,
	Suspense,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";

const Diary = lazy(() => import("@/components/sitediary/SiteDiaryList"));

type DiarySettings = {
	siteId: string;
	userId: string;
	organizationId: string;
	bisEnabled: boolean;
	organizationLanguage: string | null;
};

const DiaryContext = createContext<{
	register: (settings: DiarySettings | null) => void;
	ready: boolean;
} | null>(null);

export function RetainedLimeniDiary({
	siteId,
	children,
}: {
	siteId: string;
	children: ReactNode;
}) {
	const [settings, setSettings] = useState<DiarySettings | null>(null);
	const active = usePathname() === `/dashboard/sites/${siteId}/dashboard`;
	const scroll = useRef(0);
	const visited = useRef(false);
	const scrollScope = useRef("");
	const scope = settings
		? `${settings.userId}:${settings.organizationId}:${siteId}`
		: "";
	const ready = settings?.siteId === siteId;
	const context = useMemo(
		() => ({ register: setSettings, ready: active && ready }),
		[active, ready],
	);

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
				{ready && settings ? (
					<Suspense fallback={<Skeleton className="h-64 w-full" />}>
						<Diary
							key={scope}
							siteId={siteId}
							bisEnabled={settings.bisEnabled}
							organizationLanguage={settings.organizationLanguage}
							limeniClientDiary
							active={active}
						/>
					</Suspense>
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
