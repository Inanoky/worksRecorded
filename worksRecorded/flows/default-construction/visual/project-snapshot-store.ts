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

export async function loadLimeniProjectSnapshot(
	userId: string,
	siteId: string,
) {
	const access = await requireVisualAccess(userId, siteId).catch(() => {
		throw new ProjectAccessError("Project access denied");
	});
	const [documents, planning, diary, config, forma2, bis, language] =
		await Promise.all([
			prisma.documents.findMany({
				where: {
					siteId,
					organizationId: access.organizationId,
					documentType: { in: [VISUAL_DOCUMENT_TYPE, PREVIEW_DOCUMENT_TYPE] },
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			}),
			loadVisualPlanningProjectData(siteId, access.organizationId),
			getLimeniDiarySnapshot(siteId),
			getConfig(siteId),
			getDefaultConstructionForma2Results(siteId),
			getDashboardBisStatus(userId, siteId, true),
			getOrganizationLanguageByUserId(userId),
		]);
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
						})),
					}
				: null;
		return {
			drawing,
			planning: visualPlansForLocation(state.location, planning),
			preview,
		};
	});
	const data = {
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
	return {
		...data,
		version: createHash("sha256").update(JSON.stringify(data)).digest("hex"),
	};
}

export type LimeniProjectSnapshot = Awaited<
	ReturnType<typeof loadLimeniProjectSnapshot>
>;
