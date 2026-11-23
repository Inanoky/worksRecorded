"use client";

import { ChevronLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardSettingsLink } from "@/components/dashboard/DashboardSettingsLink";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import TourRunner from "@/components/joyride/TourRunner";
import { useWorkspaceVisible } from "@/components/projects/WorkspaceActivity";
import { BisIntegrationCard } from "@/components/settings/BisIntegrationCard";
import { ConfirmDeleteSite } from "@/components/settings/ConfirmDeleteSite";
import { PhotoExportCard } from "@/components/settings/PhotoExportCard";
import { UploadImageForm } from "@/components/settings/UploadImageForm";
import { VisualPlanningContactsCard } from "@/components/settings/VisualPlanningContactsCard";
import { VisualWhatsAppConnectionsCard } from "@/components/settings/VisualWhatsAppConnectionsCard";
import { VisualWhatsAppGroupsCard } from "@/components/settings/VisualWhatsAppGroupsCard";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getSiteSettingsMessages } from "@/lib/dashboard-i18n";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import type { ProjectSettingsData } from "./load-settings";
import { UpdateSiteForm } from "./updatesiteform";

export function ProjectSettingsView({
	data,
	bisError,
	onRetryBis,
}: {
	data: ProjectSettingsData;
	bisError?: boolean;
	onRetryBis?: () => void;
}) {
	const { siteId, organizationLanguage } = data;
	const [connectionRevision, setConnectionRevision] = useState(0);
	const refreshGroups = useCallback(
		() => setConnectionRevision((previous) => previous + 1),
		[],
	);
	const t = getSiteSettingsMessages(organizationLanguage);
	const search = useSearchParams();
	const visible = useWorkspaceVisible();
	useEffect(() => {
		if (!visible || !data.showVisualPlanningContacts) return;
		const anchor = `whatsapp-groups-${siteId}`;
		if (window.location.hash === `#${anchor}`)
			document.getElementById(anchor)?.scrollIntoView();
	}, [data.showVisualPlanningContacts, siteId, visible]);
	const bisStatus = search.get("bis");
	const bisMessage = search.get("message");
	const statusMessageMap: Record<string, string> = {
		connected: `${t.bisIntegration}: OK`,
		disconnected: t.disconnectNote,
		"case-selected": t.saveBisCase,
		"round-selected": t.constructionRoundSaved,
		error: bisMessage
			? `BIS connection failed: ${bisMessage}`
			: "BIS connection failed.",
	};
	const backView =
		data.flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION
			? "analytics"
			: "dashboard";
	return (
		<>
			<TourRunner
				steps={getJoyRideSteps(organizationLanguage).steps_siteid_settings}
				stepName="steps_siteid_settings"
			/>
			<div className="flex items-center gap-x-2 mb-6">
				<Button variant="outline" size="icon" asChild>
					<DashboardSettingsLink
						href={`/dashboard/sites/${siteId}/${backView}`}
						aria-label={t.goBack}
					>
						<ChevronLeft className="size-4" />
					</DashboardSettingsLink>
				</Button>
				<h3 className="text-xl font-semibold">{t.goBack}</h3>
			</div>
			<div data-tour="settings-image">
				<UploadImageForm
					siteId={siteId}
					organizationLanguage={organizationLanguage}
				/>
			</div>
			{data.photoCount !== null ? (
				<PhotoExportCard
					organizationLanguage={organizationLanguage}
					photoCount={data.photoCount}
					siteId={siteId}
				/>
			) : null}
			{data.bis ? (
				<div data-tour="settings-bis">
					<BisIntegrationCard
						{...data.bis}
						organizationLanguage={organizationLanguage}
						siteId={siteId}
						statusMessage={
							bisStatus && Object.hasOwn(statusMessageMap, bisStatus)
								? statusMessageMap[bisStatus]
								: null
						}
					/>
				</div>
			) : null}
			{data.bisDeferred ? (
				<Card className="mb-6">
					<CardHeader>
						<CardTitle>{t.bisIntegration}</CardTitle>
						{bisError ? (
							<CardDescription role="alert">
								{organizationLanguage === "en"
									? "Could not load BIS settings."
									: "Neizdevās ielādēt BIS iestatījumus."}
							</CardDescription>
						) : (
							<output className="text-sm text-muted-foreground">
								{organizationLanguage === "en"
									? "Loading BIS settings…"
									: "Ielādē BIS iestatījumus…"}
							</output>
						)}
					</CardHeader>
					{bisError ? (
						<CardFooter>
							<Button type="button" variant="outline" onClick={onRetryBis}>
								{organizationLanguage === "en"
									? "Try again"
									: "Mēģināt vēlreiz"}
							</Button>
						</CardFooter>
					) : null}
				</Card>
			) : null}
			<div data-tour="settings-site-info">
				<UpdateSiteForm
					organizationLanguage={organizationLanguage}
					siteId={siteId}
					site={data.site}
					parsedPolygon={data.parsedPolygon}
					hideSiteArea={data.hideSiteAreaSettings}
				/>
			</div>
			{data.showVisualPlanningContacts ? (
				<>
					<VisualPlanningContactsCard
						siteId={siteId}
						initialContacts={data.visualPlanningContacts}
						organizationLanguage={organizationLanguage}
					/>
					<VisualWhatsAppConnectionsCard
						siteId={siteId}
						onConnectionChange={refreshGroups}
					/>
					<VisualWhatsAppGroupsCard
						siteId={siteId}
						connectionRevision={connectionRevision}
					/>
				</>
			) : null}
			<Card
				data-tour="settings-danger-zone"
				className="mt-6 border-red-500 bg-red-500/10"
			>
				<CardHeader>
					<CardTitle className="text-red-500">{t.danger}</CardTitle>
					<CardDescription>{t.dangerDescription}</CardDescription>
				</CardHeader>
				<CardFooter>
					<ConfirmDeleteSite
						siteId={siteId}
						organizationLanguage={organizationLanguage}
					/>
				</CardFooter>
			</Card>
		</>
	);
}
