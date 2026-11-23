import "server-only";

import { notFound } from "next/navigation";
import type { ComponentProps } from "react";
import type { WorkspaceDescriptor } from "@/components/projects/workspace-store";
import type { BisIntegrationCard } from "@/components/settings/BisIntegrationCard";
import { listVisualPlanningContacts } from "@/flows/default-construction/visual/planning-contacts";
import { getFlowModuleUi } from "@/lib/flows/registry";
import { siteDiaryPhotoPurposeWhere } from "@/lib/photos/media-purpose";
import { prisma } from "@/lib/utils/db";
import {
	fetchBisAvailableCases,
	fetchBisCaseConstructionRounds,
	getBisAuthorizeUrl,
	getSiteBisConfig,
	getUserBisTokenByUserId,
	isBisHostedAuthorizationEnabled,
} from "@/server/actions/BIS/service";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

function parsePolygon(raw: unknown) {
	let value = raw;
	if (typeof value === "string") {
		try {
			value = JSON.parse(value);
		} catch {
			return [];
		}
	}
	if (Array.isArray(value))
		return value.flatMap((point: unknown) => {
			if (!point || typeof point !== "object") return [];
			const { lat, lng } = point as { lat?: unknown; lng?: unknown };
			return typeof lat === "number" && typeof lng === "number"
				? [{ lat, lng }]
				: [];
		});
	if (!value || typeof value !== "object") return [];
	const { geometry } = value as {
		geometry?: { type?: unknown; coordinates?: unknown };
	};
	if (geometry?.type !== "Polygon" || !Array.isArray(geometry.coordinates))
		return [];
	const [ring] = geometry.coordinates;
	if (!Array.isArray(ring) || ring.length < 4) return [];
	return ring.slice(0, -1).flatMap((coordinate: unknown) => {
		if (!Array.isArray(coordinate)) return [];
		const [lng, lat] = coordinate;
		return typeof lat === "number" && typeof lng === "number"
			? [{ lat, lng }]
			: [];
	});
}

async function loadBisSettings(siteId: string, userId: string) {
	const [config, token] = await Promise.all([
		getSiteBisConfig(siteId),
		getUserBisTokenByUserId(userId),
	]);
	const accessToken = token?.accessToken;
	const [availableCases, availableConstructionRounds] = await Promise.all([
		accessToken && !config?.bisCaseId
			? fetchBisAvailableCases(accessToken).catch(() => [])
			: [],
		accessToken && config?.bisCaseId
			? fetchBisCaseConstructionRounds(accessToken, config.bisCaseId).catch(
					() => [],
				)
			: [],
	]);
	const useHostedAuthorization = isBisHostedAuthorizationEnabled();
	return {
		isConnected: Boolean(accessToken),
		selectedCase: {
			id: config?.bisCaseId ?? null,
			caseNumber: config?.bisCaseNumber ?? null,
			name: config?.bisCaseName ?? null,
			stage: config?.bisCaseStage ?? null,
		},
		selectedConstructionRound: {
			id: config?.bisConstructionRoundId ?? null,
			name: config?.bisConstructionRoundName ?? null,
			roundNumber: config?.bisConstructionRoundNumber ?? null,
			status: config?.bisConstructionRoundStatus ?? null,
		},
		availableCases,
		availableConstructionRounds,
		hasManualAuthorizationCode: Boolean(process.env.BIS_AUTHORIZATION_CODE),
		useHostedAuthorization,
		manualAuthorizeHref: useHostedAuthorization
			? ""
			: getBisAuthorizeUrl("manual-bis-connect"),
		showManualAuthorizationInput: process.env.NODE_ENV !== "production",
	} satisfies Omit<
		ComponentProps<typeof BisIntegrationCard>,
		"organizationLanguage" | "siteId" | "statusMessage"
	>;
}

export async function readProjectBisSettings(workspace: WorkspaceDescriptor) {
	if (!workspace.organizationId) notFound();
	if (getFlowModuleUi(workspace.flowModuleKey).hideBisSettings) return null;
	return loadBisSettings(workspace.siteId, workspace.userId);
}

export async function readProjectSettings(
	workspace: WorkspaceDescriptor,
	{ deferBis = false } = {},
) {
	if (!workspace.organizationId) notFound();
	const { siteId, userId, flowModuleKey, visualPreload } = workspace;
	const flowUi = getFlowModuleUi(flowModuleKey);
	const [site, organizationLanguage, bis, photoCount, visualPlanningContacts] =
		await Promise.all([
			prisma.site.findUnique({
				where: { id: siteId },
				select: {
					name: true,
					description: true,
					subdirectory: true,
					geofenceMapLink: true,
					geofencePolygon: true,
				},
			}),
			getOrganizationLanguageByUserId(userId),
			flowUi.hideBisSettings || deferBis
				? null
				: loadBisSettings(siteId, userId),
			flowUi.showPhotoExport
				? prisma.photos.count({
						where: {
							siteId,
							AND: [
								{ fileUrl: { not: null } },
								{ fileUrl: { not: "" } },
								siteDiaryPhotoPurposeWhere(),
							],
						},
					})
				: null,
			visualPreload ? listVisualPlanningContacts(userId, siteId) : [],
		]);
	if (!site) notFound();
	return {
		siteId,
		organizationLanguage,
		flowModuleKey,
		showVisualPlanningContacts: !!visualPreload,
		hideSiteAreaSettings: !!flowUi.hideSiteAreaSettings,
		visualPlanningContacts,
		bis,
		bisDeferred: deferBis && !flowUi.hideBisSettings,
		photoCount,
		parsedPolygon: parsePolygon(site.geofencePolygon),
		site: {
			name: site.name ?? "",
			description: site.description ?? "",
			subdirectory: site.subdirectory ?? "",
			geofenceMapLink: site.geofenceMapLink ?? "",
		},
	};
}

export type ProjectSettingsData = Awaited<
	ReturnType<typeof readProjectSettings>
>;
