"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useProjectCacheScope } from "@/components/providers/ProjectLoadingProgressProvider";
import { useWorkspaceActive } from "./WorkspaceActivity";
import { useWorkspaceNavigation } from "./WorkspaceNavigation";

export function WorkspaceCatalogRefresh({ revision }: { revision: string }) {
	const active = useWorkspaceActive();
	const scope = useProjectCacheScope();
	const workspace = useWorkspaceNavigation();
	const router = useRouter();
	const current = useRef(revision);
	useEffect(() => {
		current.current = revision;
	}, [revision]);
	useEffect(() => {
		if (!active || !scope || !workspace) return;
		const controller = new AbortController();
		let pending = false;
		const refresh = async () => {
			if (
				pending ||
				document.visibilityState === "hidden" ||
				navigator.onLine === false
			)
				return;
			pending = true;
			try {
				const response = await fetch("/api/workspace-navigation", {
					cache: "no-store",
					signal: controller.signal,
					headers: { "If-None-Match": `"${scope}:${current.current}"` },
				});
				if (controller.signal.aborted || response.status === 304) return;
				if (response.status === 401 || response.status === 403) {
					workspace.store.clear();
					router.refresh();
					return;
				}
				if (!response.ok) return;
				const next = await response.json();
				if (controller.signal.aborted) return;
				if (next.scope !== scope) workspace.store.clear();
				else if (next.revision === current.current) return;
				current.current = next.revision;
				router.refresh();
			} catch {
			} finally {
				pending = false;
			}
		};
		void refresh();
		const wake = () => {
			void refresh();
		};
		const interval = setInterval(wake, 15000);
		window.addEventListener("focus", wake);
		window.addEventListener("online", wake);
		document.addEventListener("visibilitychange", wake);
		return () => {
			controller.abort();
			clearInterval(interval);
			window.removeEventListener("focus", wake);
			window.removeEventListener("online", wake);
			document.removeEventListener("visibilitychange", wake);
		};
	}, [active, scope, workspace, router]);
	return null;
}
