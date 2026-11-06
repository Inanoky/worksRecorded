import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { getConfig } from "@/server/actions/site-diary-actions";
import {
	loadLimeniProjectDelta,
	projectPartHash,
} from "../visual/project-delta-store";
import { readProjectManifest } from "../visual/project-revision-store";
import type { LimeniProjectSnapshot } from "../visual/project-snapshot-store";
import { readConstructionDiarySnapshot } from "./construction-diary-snapshot";
import { requireConstructionProjectAccess } from "./construction-project-access";
import { getDefaultConstructionForma2Results } from "./forma2-analytics-actions";

export async function loadConstructionProjectManifest(
	userId: string,
	siteId: string,
) {
	const access = await requireConstructionProjectAccess(userId, siteId);
	return readProjectManifest(userId, siteId, access.organizationId);
}
export async function loadConstructionProjectSnapshot(
	userId: string,
	siteId: string,
): Promise<LimeniProjectSnapshot> {
	const access = await requireConstructionProjectAccess(userId, siteId);
	const [diary, config, forma2, bis, language] = await Promise.all([
		readConstructionDiarySnapshot(siteId, access.organizationId),
		getConfig(siteId),
		getDefaultConstructionForma2Results(siteId),
		getDashboardBisStatus(userId, siteId, true),
		getOrganizationLanguageByUserId(userId),
	]);
	const data = {
		settings: {
			siteId,
			userId,
			organizationId: access.organizationId,
			bisEnabled: bis.enabled,
			organizationLanguage: language,
		},
		index: { userId, locations: [], drawings: [] },
		drawings: [],
		diary,
		config,
		forma2: { data: forma2, organizationLanguage: language },
	};
	return { ...data, version: projectPartHash(data) };
}
export async function loadConstructionProjectDelta(
	userId: string,
	siteId: string,
	manifest: Awaited<ReturnType<typeof loadConstructionProjectManifest>>,
	known: Record<string, string>,
	rows: Record<string, string>,
	sources: Record<string, string>,
) {
	return loadLimeniProjectDelta(
		userId,
		siteId,
		manifest,
		known,
		rows,
		sources,
		{
			visual: false,
			diary: (_siteId, options) =>
				readConstructionDiarySnapshot(siteId, manifest.organizationId, options),
		},
	);
}
