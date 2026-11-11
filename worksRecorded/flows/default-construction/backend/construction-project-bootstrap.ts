import { createHash } from "node:crypto";
import { getDashboardBisStatusForCase } from "@/lib/bis/dashboard-status";
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
	return readAuthorizedConstructionBootstrap(userId, siteId, access, trace);
}

export async function readAuthorizedConstructionBootstrap(
	userId: string,
	siteId: string,
	access: Awaited<ReturnType<typeof requireConstructionProjectAccess>>,
	trace?: ProjectBootstrapTrace,
): Promise<LimeniProjectSnapshot> {
	const [diary, bis] = await Promise.all([
		measureBootstrapPhase(trace, "bootstrapDiary", () =>
			readConstructionDiaryBootstrap(siteId, access.organizationId),
		),
		access.bisCaseId
			? measureBootstrapPhase(trace, "bootstrapBis", () =>
					getDashboardBisStatusForCase(userId, siteId, true, access.bisCaseId),
				)
			: Promise.resolve({ enabled: false, unavailable: false }),
	]);
	const config = access.diaryConfig;
	const language = access.organizationLanguage;
	const data = {
		settings: {
			siteId,
			userId,
			organizationId: access.organizationId,
			bisEnabled: bis.enabled,
			bisUnavailable: bis.unavailable,
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
