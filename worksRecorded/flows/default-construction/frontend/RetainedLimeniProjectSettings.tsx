"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { ProjectSettingsData } from "@/app/dashboard/sites/[siteId]/settings/load-settings";
import { createSettingsResource } from "@/components/dashboard/settings-resource";
import {
	useWorkspaceActive,
	WorkspaceView,
} from "@/components/projects/WorkspaceActivity";
import { SettingsRefreshContext } from "@/components/settings/SettingsRefreshContext";
import { Button } from "@/components/ui/button";

const settingsView = createSettingsResource(() =>
	import("@/app/dashboard/sites/[siteId]/settings/ProjectSettingsView").then(
		(module) => module.ProjectSettingsView,
	),
);

async function loadSettings<T>(
	siteId: string,
	part: "base" | "bis",
): Promise<T> {
	const response = await fetch(
		`/api/sites/${encodeURIComponent(siteId)}/project-settings?part=${part}`,
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
	const [visited, setVisited] = useState(active);
	const [resource] = useState(() =>
		createSettingsResource(() =>
			loadSettings<ProjectSettingsData>(siteId, "base"),
		),
	);
	const [bisResource] = useState(() =>
		createSettingsResource(() =>
			loadSettings<Pick<ProjectSettingsData, "bis">>(siteId, "bis"),
		),
	);
	const snapshot = useSyncExternalStore(
		resource.subscribe,
		resource.getSnapshot,
		resource.getServerSnapshot,
	);
	const bis = useSyncExternalStore(
		bisResource.subscribe,
		bisResource.getSnapshot,
		bisResource.getServerSnapshot,
	);
	const view = useSyncExternalStore(
		settingsView.subscribe,
		settingsView.getSnapshot,
		settingsView.getServerSnapshot,
	);
	const View = view.data;
	const bisDeferred = snapshot.data?.bisDeferred;
	useEffect(() => {
		if (!workspaceActive) return;
		if (!settingsView.getSnapshot().data) void settingsView.load();
		void resource.load();
	}, [workspaceActive, resource]);
	useEffect(() => {
		if (!active) return;
		setVisited(true);
		if (bisDeferred) void bisResource.load();
	}, [active, bisDeferred, bisResource]);
	const refresh = useCallback(() => {
		void resource.refresh();
		if (bisDeferred) void bisResource.refresh();
	}, [bisDeferred, bisResource, resource]);

	if (!active && !visited) return null;
	const loading = (
		<output className="block py-6 text-sm text-muted-foreground">
			Ielādē projekta iestatījumus…
		</output>
	);
	return (
		<section hidden={!active} inert={!active} aria-label="Projekta iestatījumi">
			<WorkspaceView active={active}>
				{snapshot.status === "error" || view.status === "error" ? (
					<div className="space-y-3 py-6">
						<p role="alert">Neizdevās ielādēt projekta iestatījumus.</p>
						<Button
							variant="outline"
							onClick={() => {
								if (!View) void settingsView.load();
								if (!snapshot.data) void resource.load();
							}}
						>
							Mēģināt vēlreiz
						</Button>
					</div>
				) : snapshot.data && View ? (
					<SettingsRefreshContext.Provider value={refresh}>
						<View
							data={{
								...snapshot.data,
								bis: bis.data?.bis ?? snapshot.data.bis,
								bisDeferred: Boolean(bisDeferred && !bis.data),
							}}
							bisError={bis.status === "error"}
							onRetryBis={bisResource.refresh}
						/>
					</SettingsRefreshContext.Provider>
				) : (
					loading
				)}
			</WorkspaceView>
		</section>
	);
}
