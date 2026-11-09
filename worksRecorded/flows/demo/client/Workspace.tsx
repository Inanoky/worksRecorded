"use client";
import {
	BookOpen,
	ChartNoAxesCombined,
	ClipboardList,
	Clock3,
	Layers,
} from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { WorkspaceView } from "@/components/projects/WorkspaceActivity";
import {
	ProjectProvider,
	ProjectScope,
} from "@/components/providers/ProjectProvider";
import { SiteSchemaProvider } from "@/components/providers/SiteSchemaProvider";
import { FimaSuiteLogo } from "@/components/sitediary/FimaSuiteLogo";
import SiteDiary from "@/components/sitediary/SiteDiaryList";
import { FrontendTable } from "@/components/timesheets/FrontendTable";
import { Button } from "@/components/ui/button";
import { DefaultConstructionForma2View } from "@/flows/default-construction/frontend/DefaultConstructionForma2View";
import { DiarySaveProvider } from "@/flows/default-construction/frontend/DiarySaveProvider";
import { Forma2RefreshContext } from "@/flows/default-construction/frontend/forma2-client-refresh";
import VisualView from "@/flows/default-construction/visual/VisualView";
import { DEMO_ORGANIZATION_ID, DEMO_SITE_ID } from "../constants";
import { navigate, useView } from "./navigation";
import {
	getData,
	getDiarySnapshot,
	getTimeRows,
	restoreData,
	subscribe,
} from "./store";

const tabs = [
	{ view: "bis", label: "BIS žurnāls", Icon: BookOpen },
	{ view: "diary", label: "Būvdarbu žurnāls", Icon: ClipboardList },
	{ view: "visual", label: "Izpildshēmas", Icon: Layers },
	{ view: "forma2", label: "Forma 2", Icon: ChartNoAxesCombined },
	{ view: "hours", label: "Darba laika uzskaites lapas", Icon: Clock3 },
] as const;
const projects = [
	{
		id: DEMO_SITE_ID,
		name: "Ozolu biroju centrs",
		organizationId: DEMO_ORGANIZATION_ID,
	},
];
export default function OzoluWorkspace() {
	const data = useSyncExternalStore(subscribe, getData, getData);
	const active = useView();
	useEffect(() => {
		restoreData();
	}, []);
	return (
		<ProjectProvider userId="ozolu-user">
			<ProjectScope id={DEMO_SITE_ID} name="Ozolu biroju centrs">
				<DiarySaveProvider
					userId="ozolu-user"
					projects={projects}
					language="lv"
				>
					<header className="border-b bg-background px-4 py-3">
						<a
							href="/dashboard"
							aria-label="WorksRecorded"
							onClick={(event) => {
								if (window.history.state?.ozoluFrom) {
									event.preventDefault();
									window.history.back();
								}
							}}
						>
							<FimaSuiteLogo enabled={false} />
						</a>
					</header>
					<nav
						className="flex flex-wrap items-center gap-1 border-b bg-background px-4 py-2"
						aria-label="Projekta sadaļas"
					>
						<span className="mr-2 rounded-md border px-3 py-2 text-sm font-medium">
							Ozolu biroju centrs
						</span>
						{tabs.map(({ view, label, Icon }) => (
							<Button
								key={view}
								variant="outline"
								aria-current={active === view ? "page" : undefined}
								className={
									active === view
										? "border-green-500 bg-green-50 text-green-700"
										: ""
								}
								onClick={() => navigate(view)}
							>
								<Icon className="mr-2 size-4" />
								{label}
							</Button>
						))}
					</nav>
					<main className="px-4 py-6">
						{tabs.map(({ view }) => (
							<section
								key={view}
								hidden={active !== view}
								inert={active !== view}
								aria-label={tabs.find((tab) => tab.view === view)?.label}
							>
								<WorkspaceView active={active === view || view === "visual"}>
									{view === "bis" || view === "diary" ? (
										<SiteDiary
											siteId={DEMO_SITE_ID}
											organizationLanguage="lv"
											bisEnabled={false}
											limeniClientDiary
											batchEditing
											initialLimeniProject={getDiarySnapshot(view === "bis")}
											active={active === view}
										/>
									) : null}
									{view === "visual" ? (
										<VisualView
											siteId={DEMO_SITE_ID}
											active={active === view}
											preload
										/>
									) : null}
									{view === "forma2" ? (
										<Forma2RefreshContext.Provider value={() => {}}>
											<DefaultConstructionForma2View
												siteId={DEMO_SITE_ID}
												data={data.snapshot.forma2.data as any}
												organizationLanguage="lv"
											/>
										</Forma2RefreshContext.Provider>
									) : null}
									{view === "hours" ? (
										<SiteSchemaProvider
											siteId={DEMO_SITE_ID}
											schemaLocations={data.snapshot.index.locations}
											schemaWorks={data.snapshot.drawings[0].planning.workOptions.map(
												(item: any) => item.work,
											)}
										>
											<h1 className="mb-6 text-2xl font-semibold">
												Darba laika uzskaites lapas
											</h1>
											<FrontendTable
												siteId={DEMO_SITE_ID}
												workers={data.workers as any}
												data={getTimeRows() as any}
												pageSize={20}
												organizationLanguage="lv"
											/>
										</SiteSchemaProvider>
									) : null}
								</WorkspaceView>
							</section>
						))}
					</main>
					<Toaster richColors />
				</DiarySaveProvider>
			</ProjectScope>
		</ProjectProvider>
	);
}
