"use client";

import { usePathname } from "next/navigation";
import {
	type ComponentType,
	createContext,
	lazy,
	type ReactNode,
	Suspense,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from "react";
import { loadFlowConfigs } from "@/app/dashboard/admin/flow-configs/load-settings";
import { loadOrganizationSettings } from "@/app/dashboard/settings/load-settings";
import { SettingsRefreshContext } from "@/components/settings/SettingsRefreshContext";
import { Button } from "@/components/ui/button";
import {
	DashboardSettingsNavigationContext,
	FLOW_CONFIGS_PATH,
	ORGANIZATION_SETTINGS_PATH,
} from "./DashboardSettingsLink";
import { createSettingsResource } from "./settings-resource";

const importOrganizationSettings = () =>
	import("@/app/dashboard/settings/OrganizationSettingsView");
const importFlowConfigs = () =>
	import("@/app/dashboard/admin/flow-configs/FlowConfigsView");
const OrganizationSettingsView = lazy(() =>
	importOrganizationSettings().then((module) => ({
		default: module.OrganizationSettingsView,
	})),
);
const FlowConfigsView = lazy(() =>
	importFlowConfigs().then((module) => ({ default: module.FlowConfigsView })),
);

function createResources() {
	return {
		organization: createSettingsResource(loadOrganizationSettings),
		flows: createSettingsResource(loadFlowConfigs),
	};
}

const SettingsContext = createContext<{
	resources: ReturnType<typeof createResources>;
	canAccessFlowConfigs: boolean;
	organizationLanguage: string | null;
} | null>(null);

export function DashboardSettingsProvider({
	canAccessFlowConfigs,
	organizationLanguage,
	children,
}: {
	canAccessFlowConfigs: boolean;
	organizationLanguage: string | null;
	children: ReactNode;
}) {
	const [resources] = useState(createResources);
	const value = useMemo(
		() => ({ resources, canAccessFlowConfigs, organizationLanguage }),
		[resources, canAccessFlowConfigs, organizationLanguage],
	);
	const navigation = useMemo(
		() => ({
			preload(href: string) {
				if (href === ORGANIZATION_SETTINGS_PATH) {
					void importOrganizationSettings().catch(() => {});
					void resources.organization.load();
				} else if (href === FLOW_CONFIGS_PATH && canAccessFlowConfigs) {
					void importFlowConfigs().catch(() => {});
					void resources.flows.load();
				}
			},
		}),
		[resources, canAccessFlowConfigs],
	);

	return (
		<SettingsContext.Provider value={value}>
			<DashboardSettingsNavigationContext.Provider value={navigation}>
				{children}
			</DashboardSettingsNavigationContext.Provider>
		</SettingsContext.Provider>
	);
}

export function DashboardSettingsContent({
	children,
}: {
	children: ReactNode;
}) {
	const pathname = usePathname();
	const settings = useContext(SettingsContext);
	if (!settings) return children;
	const { resources, organizationLanguage, canAccessFlowConfigs } = settings;

	if (pathname === ORGANIZATION_SETTINGS_PATH) {
		return (
			<SettingsResourceView
				key="organization"
				resource={resources.organization}
				invalidateOther={resources.flows.clear}
				view={OrganizationSettingsView}
				language={organizationLanguage}
			/>
		);
	}
	if (pathname === FLOW_CONFIGS_PATH) {
		if (!canAccessFlowConfigs) {
			return (
				<p role="alert">
					{organizationLanguage === "en"
						? "Page not available."
						: "Lapa nav pieejama."}
				</p>
			);
		}
		return (
			<SettingsResourceView
				key="flows"
				resource={resources.flows}
				invalidateOther={resources.organization.clear}
				view={FlowConfigsView}
				language={organizationLanguage}
			/>
		);
	}
	return children;
}

function SettingsResourceView<T>({
	resource,
	invalidateOther,
	view: View,
	language,
}: {
	resource: ReturnType<typeof createSettingsResource<T>>;
	invalidateOther: () => void;
	view: ComponentType<{ data: T }>;
	language: string | null;
}) {
	const snapshot = useSyncExternalStore(
		resource.subscribe,
		resource.getSnapshot,
		resource.getServerSnapshot,
	);
	const english = language === "en";
	const refresh = useCallback(() => {
		invalidateOther();
		void resource.refresh();
	}, [invalidateOther, resource]);
	useEffect(() => {
		void resource.load();
	}, [resource]);
	const loading = (
		<output className="py-6 text-sm text-muted-foreground">
			{english ? "Loading settings…" : "Ielādē iestatījumus…"}
		</output>
	);

	if (snapshot.status === "error") {
		return (
			<div className="space-y-3 py-6">
				<p role="alert">
					{english
						? "Could not load settings. Please try again."
						: "Neizdevās ielādēt iestatījumus. Lūdzu, mēģiniet vēlreiz."}
				</p>
				<Button variant="outline" onClick={refresh}>
					{english ? "Try again" : "Mēģināt vēlreiz"}
				</Button>
			</div>
		);
	}
	if (!snapshot.data) return loading;

	return (
		<SettingsRefreshContext.Provider value={refresh}>
			<div className="flex items-center justify-end gap-3">
				{snapshot.status === "loading" ? (
					<output className="text-sm text-muted-foreground">
						{english ? "Updating…" : "Atjaunina…"}
					</output>
				) : null}
				<Button
					variant="outline"
					size="sm"
					disabled={snapshot.status === "loading"}
					onClick={refresh}
				>
					{english ? "Refresh" : "Atjaunot"}
				</Button>
			</div>
			<Suspense fallback={loading}>
				<View data={snapshot.data} />
			</Suspense>
		</SettingsRefreshContext.Provider>
	);
}
