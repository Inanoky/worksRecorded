import { createHash } from "node:crypto";
import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import { prisma } from "@/lib/utils/db";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import {
	getConfig,
	getLimeniDiarySnapshot,
} from "@/server/actions/site-diary-actions";
import { getDefaultConstructionForma2Results } from "../backend/forma2-analytics-actions";
import { compactVisualDrawing } from "./compact-drawing";
import {
	normalizeVisualLocation,
	VISUAL_DOCUMENT_TYPE,
	visualStateSchema,
} from "./model";
import {
	loadVisualPlanningProjectData,
	visualPlansForLocation,
} from "./planning-store";
import {
	PREVIEW_DOCUMENT_TYPE,
	readPreparedPreview,
} from "./prepared-preview-model";
import { previewSource } from "./preview-revision";
import { requireVisualAccess, visualDrawingIndex } from "./store";

export class ProjectAccessError extends Error {}

type ProjectSnapshotPerfTrace = {
	measure<T>(phase: string, task: () => T | Promise<T>): Promise<T>;
};

async function measureSnapshotPhase<T>(
	trace: ProjectSnapshotPerfTrace | undefined,
	phase: string,
	task: () => T | Promise<T>,
) {
	return trace ? trace.measure(phase, task) : task();
}

export function projectAccessFailure(error: unknown): never {
	if (
		(error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "FORBIDDEN") ||
		(error instanceof Error &&
			[
				"Denied",
				"Access denied",
				"Project access denied",
				"Visual skats šai organizācijai nav pieejams.",
			].includes(error.message))
	)
		throw new ProjectAccessError("Project access denied");
	throw error;
}

export async function loadLimeniProjectSnapshot(
	userId: string,
	siteId: string,
	trace?: ProjectSnapshotPerfTrace,
) {
	const access = await measureSnapshotPhase(trace, "snapshotAccess", () =>
		requireVisualAccess(userId, siteId).catch(projectAccessFailure),
	);
	const [documents, planning, diary, config, forma2, bis, language] =
		await Promise.all([
			measureSnapshotPhase(trace, "snapshotDocuments", () =>
				prisma.documents.findMany({
					where: {
						siteId,
						organizationId: access.organizationId,
						documentType: {
							in: [VISUAL_DOCUMENT_TYPE, PREVIEW_DOCUMENT_TYPE],
						},
					},
					orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				}),
			),
			measureSnapshotPhase(trace, "snapshotPlanning", () =>
				loadVisualPlanningProjectData(siteId, access.organizationId),
			),
			measureSnapshotPhase(trace, "snapshotDiary", () =>
				getLimeniDiarySnapshot(siteId),
			),
			measureSnapshotPhase(trace, "snapshotConfig", () => getConfig(siteId)),
			measureSnapshotPhase(trace, "snapshotForma2", () =>
				getDefaultConstructionForma2Results(siteId),
			),
			measureSnapshotPhase(trace, "snapshotBis", () =>
				getDashboardBisStatus(userId, siteId, true),
			),
			measureSnapshotPhase(trace, "snapshotLanguage", () =>
				getOrganizationLanguageByUserId(userId),
			),
		]);
	const data = await measureSnapshotPhase(trace, "snapshotAssemble", () => {
		const index = visualDrawingIndex(
			planning.actualRows,
			documents.filter((row) => row.documentType === VISUAL_DOCUMENT_TYPE),
			planning.site,
		);
		const drawings = index.drawings.map((item) => {
			const row = documents.find((row) => row.id === item.id);
			if (!row) throw new Error("Drawing changed during project loading");
			const state = visualStateSchema.parse(JSON.parse(row.description));
			const dates = planning.actualRows
				.filter(
					(actual) =>
						normalizeVisualLocation(actual.Location ?? "") ===
						normalizeVisualLocation(state.location),
				)
				.flatMap((actual) => (actual.Date ? [actual.Date.getTime()] : []));
			const drawing = compactVisualDrawing({
				id: row.id,
				name: row.documentName,
				createdAt: row.createdAt.toISOString(),
				latestDiaryDate: dates.length
					? new Date(Math.max(...dates)).toISOString()
					: null,
				state,
			});
			const source = previewSource(row.url);
			const prepared = documents.find(
				(doc) => doc.id === `visual-preview:${row.id}:${source}`,
			);
			const parsed = readPreparedPreview(prepared?.description);
			const preview =
				parsed?.source === source
					? {
							...parsed,
							pages: parsed.pages.map((page) => ({
								...page,
								url: `/api/sites/${encodeURIComponent(siteId)}/visual/${row.id}/preview/${page.page}?v=${source}`,
								...(page.tiles
									? {
											tiles: {
												...page.tiles,
												levels: page.tiles.levels.map((level, levelIndex) => ({
													...level,
													urls: level.urls.map(
														(_, tileIndex) =>
															`/api/sites/${encodeURIComponent(siteId)}/visual/${row.id}/preview/${page.page}?v=${source}&level=${levelIndex}&tile=${tileIndex}`,
													),
												})),
											},
										}
									: {}),
							})),
						}
					: null;
			return {
				drawing,
				planning: visualPlansForLocation(state.location, planning),
				preview,
			};
		});
		return {
			settings: {
				siteId,
				userId,
				organizationId: access.organizationId,
				bisEnabled: bis.enabled,
				organizationLanguage: language,
			},
			index: { ...index, userId },
			drawings,
			diary,
			config,
			forma2: { data: forma2, organizationLanguage: language },
		};
	});
	const version = await measureSnapshotPhase(trace, "snapshotHash", () =>
		createHash("sha256").update(JSON.stringify(data)).digest("hex"),
	);
	return {
		...data,
		version,
	};
}

export type LimeniProjectSnapshot = Awaited<
	ReturnType<typeof loadLimeniProjectSnapshot>
> & { revision?: string; partVersions?: Record<string, string> };
