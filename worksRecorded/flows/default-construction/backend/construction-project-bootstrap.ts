import { createHash } from "node:crypto";
import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { getConfig } from "@/server/actions/site-diary-actions";
import type { LimeniProjectSnapshot } from "../visual/project-snapshot-store";
import { readConstructionDiaryBootstrap } from "./construction-diary-snapshot";
import { requireConstructionProjectAccess } from "./construction-project-access";

type ProjectBootstrapTrace = {
	measure<T>(phase: string, task: () => T | Promise<T>): Promise<T>;
};

async function measureBootstrapPhase<T>(
	trace: ProjectBootstrapTrace | undefined,
	phase: string,
	task: () => T | Promise<T>,
) {
	return trace ? trace.measure(phase, task) : task();
}

export async function loadConstructionProjectBootstrap(
	userId: string,
	siteId: string,
	trace?: ProjectBootstrapTrace,
): Promise<LimeniProjectSnapshot> {
	const access = await measureBootstrapPhase(trace, "bootstrapAccess", () =>
		requireConstructionProjectAccess(userId, siteId),
	);
	const [diary, config, bis, language] = await Promise.all([
		measureBootstrapPhase(trace, "bootstrapDiary", () =>
			readConstructionDiaryBootstrap(siteId, access.organizationId),
		),
		measureBootstrapPhase(trace, "bootstrapConfig", () =>
			getConfig(siteId, { flowId: "default" }),
		),
		access.bisCaseId
			? measureBootstrapPhase(trace, "bootstrapBis", () =>
					getDashboardBisStatus(userId, siteId, true),
				)
			: Promise.resolve({ enabled: false, unavailable: false }),
		measureBootstrapPhase(trace, "bootstrapLanguage", () =>
			getOrganizationLanguageByUserId(userId),
		),
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
		forma2: {
			data: {
				siteName: "",
				document: null,
				resultRows: [],
				clientCosts: { positions: [], sources: [], allocations: [] },
			},
			organizationLanguage: language,
		},
	};
	return {
		...data,
		version: `bootstrap:${createHash("sha256")
			.update(JSON.stringify(data))
			.digest("hex")}`,
		bootstrap: true,
	};
}
