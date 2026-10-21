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
import {
	useProjectPreparationReporter,
	useVisualProjectPreload,
} from "@/components/providers/ProjectLoadingProgressProvider";
import type { getDefaultConstructionForma2Results } from "../backend/forma2-analytics-actions";
import { DIARY_RECORD_UPDATED } from "../lib/diary-record-updated-event";
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
	const enabled = useVisualProjectPreload(siteId);
	const projectData = useLimeniProjectData();
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
	}, [siteId, report]);
	useEffect(() => {
		if (projectData.enabled) {
			void loadView().catch(() => report("forma2", "error"));
			if (
				projectData.snapshot &&
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
	}, [enabled, refresh, projectData.enabled, projectData.snapshot, report]);
	useEffect(() => {
		if (snapshot.revision === lastDiaryRevision.current) return;
		lastDiaryRevision.current = snapshot.revision;
		lastLoaded.current = 0;
		if (enabled && active && !snapshot.items.length) void refresh();
	}, [snapshot.revision, snapshot.items.length, enabled, active, refresh]);
	useEffect(() => {
		if (!enabled) return;
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
	}, [enabled, active, refresh, siteId]);
	const update = useCallback(() => {
		void refresh();
	}, [refresh]);
	if (!enabled) return null;
	return (
		<section hidden={!active} aria-label="Forma 2">
			{failed ? (
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
						<View siteId={siteId} {...payload} />
					</Suspense>
				</Forma2RefreshContext.Provider>
			) : null}
		</section>
	);
}
