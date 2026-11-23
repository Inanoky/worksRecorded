"use client";

import { usePathname } from "next/navigation";
import {
	lazy,
	Suspense,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";
import type { ProjectSettingsData } from "@/app/dashboard/sites/[siteId]/settings/load-settings";
import { createSettingsResource } from "@/components/dashboard/settings-resource";
import {
	useWorkspaceActive,
	WorkspaceView,
} from "@/components/projects/WorkspaceActivity";
import { SettingsRefreshContext } from "@/components/settings/SettingsRefreshContext";
import { Button } from "@/components/ui/button";

const loadView = () =>
	import("@/app/dashboard/sites/[siteId]/settings/ProjectSettingsView").then(
		(module) => ({ default: module.ProjectSettingsView }),
	);
const View = lazy(loadView);

async function loadSettings(siteId: string): Promise<ProjectSettingsData> {
	const response = await fetch(
		`/api/sites/${encodeURIComponent(siteId)}/project-settings`,
		{ cache: "no-store" },
	);
	if (!response.ok) throw new Error("Project settings unavailable");
	return response.json();
}

export function RetainedLimeniProjectSettings({ siteId }: { siteId: string }) {
	const pathname = usePathname();
	const workspaceActive = useWorkspaceActive();
	const active =
		workspaceActive && pathname === `/dashboard/sites/${siteId}/settings`;
	const [resource] = useState(() =>
		createSettingsResource(() => loadSettings(siteId)),
	);
	const snapshot = useSyncExternalStore(
		resource.subscribe,
		resource.getSnapshot,
		resource.getServerSnapshot,
	);
	useEffect(() => {
		if (!active) return;
		void loadView().catch(() => {});
		void resource.load();
	}, [active, resource]);

	if (!active && !snapshot.data) return null;
	const loading = (
		<output className="block py-6 text-sm text-muted-foreground">
			Ielādē projekta iestatījumus…
		</output>
	);
	return (
		<section hidden={!active} inert={!active} aria-label="Projekta iestatījumi">
			<WorkspaceView active={active}>
				{snapshot.status === "error" ? (
					<div className="space-y-3 py-6">
						<p role="alert">Neizdevās ielādēt projekta iestatījumus.</p>
						<Button variant="outline" onClick={resource.refresh}>
							Mēģināt vēlreiz
						</Button>
					</div>
				) : snapshot.data ? (
					<SettingsRefreshContext.Provider value={resource.refresh}>
						<Suspense fallback={loading}>
							<View data={snapshot.data} />
						</Suspense>
					</SettingsRefreshContext.Provider>
				) : (
					loading
				)}
			</WorkspaceView>
		</section>
	);
}
