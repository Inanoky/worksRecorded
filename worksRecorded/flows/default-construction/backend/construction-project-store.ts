import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { getConfig } from "@/server/actions/site-diary-actions";
import {
	loadLimeniProjectDelta,
	projectPartHash,
} from "../visual/project-delta-store";
import { readConstructionProjectManifest } from "../visual/project-revision-store";
import type { LimeniProjectSnapshot } from "../visual/project-snapshot-store";
import { readConstructionDiarySnapshot } from "./construction-diary-snapshot";
import { requireConstructionProjectAccess } from "./construction-project-access";
import { getDefaultConstructionForma2Results } from "./forma2-analytics-actions";

export async function loadConstructionProjectManifest(
	userId: string,
	siteId: string,
	trace?: ProjectSyncTrace,
) {
	const access = await measureProjectPhase(trace, "manifestAccess", () =>
		requireConstructionProjectAccess(userId, siteId),
	);
	return measureProjectPhase(trace, "manifestQuery", () =>
		readConstructionProjectManifest(userId, siteId, access.organizationId),
	);
}

type ProjectSyncTrace = {
	measure<T>(phase: string, task: () => T | Promise<T>): Promise<T>;
};

async function measureProjectPhase<T>(
	trace: ProjectSyncTrace | undefined,
	phase: string,
	task: () => T | Promise<T>,
) {
	return trace ? trace.measure(phase, task) : task();
}

export async function loadConstructionProjectSnapshot(
	userId: string,
	siteId: string,
	trace?: ProjectSyncTrace,
	manifest?: Awaited<ReturnType<typeof loadConstructionProjectManifest>>,
): Promise<LimeniProjectSnapshot> {
	const organizationId =
		manifest?.organizationId ??
		(
			await measureProjectPhase(trace, "snapshotAccess", () =>
				requireConstructionProjectAccess(userId, siteId),
			)
		).organizationId;
	const [diary, config, forma2, bis, language] = await Promise.all([
		measureProjectPhase(trace, "snapshotDiary", () =>
			readConstructionDiarySnapshot(siteId, organizationId),
		),
		measureProjectPhase(trace, "snapshotConfig", () => getConfig(siteId)),
		measureProjectPhase(trace, "snapshotForma2", () =>
			getDefaultConstructionForma2Results(siteId),
		),
		measureProjectPhase(trace, "snapshotBis", () =>
			getDashboardBisStatus(userId, siteId, true),
		),
		measureProjectPhase(trace, "snapshotLanguage", () =>
			getOrganizationLanguageByUserId(userId),
		),
	]);
	const data = await measureProjectPhase(trace, "snapshotAssemble", () => ({
		settings: {
			siteId,
			userId,
			organizationId,
			bisEnabled: bis.enabled,
			organizationLanguage: language,
		},
		index: { userId, locations: [], drawings: [] },
		drawings: [],
		diary,
		config,
		forma2: { data: forma2, organizationLanguage: language },
	}));
	return measureProjectPhase(trace, "snapshotHash", () => ({
		...data,
		version: projectPartHash(data),
	}));
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
