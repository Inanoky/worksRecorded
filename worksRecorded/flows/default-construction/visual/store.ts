import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { createPerfTrace } from "@/lib/observability/perf";
import { prisma } from "@/lib/utils/db";
import { requireWarehouseImportAccess } from "../backend/warehouse-import-upload";
import { sectionMappingAnalysisPhotos } from "../lib/section-mapping-source";
import {
	LIMENI_ORGANIZATION_ID,
	normalizeDiaryPhotoUrls,
} from "../lib/diary-photos";
import {
	getDefaultConstructionOptionValues,
	withDefaultConstructionSystemWorks,
} from "../lib/site-diary-productivity-settings";
import {
	readVisualLayerSettings,
	type VisualLayerConfiguration,
	visualLayerPositionIds,
} from "./layer-settings";
import {
	normalizeVisualLocation,
	VISUAL_DOCUMENT_TYPE,
	VISUAL_LEASE_MS,
	VISUAL_MAX_PHOTOS,
	type VisualDrawing,
	type VisualEvidence,
	type VisualState,
	visualImageProgress,
	visualStateSchema,
	workLayer,
} from "./model";
import { VISUAL_PLAN_TYPE } from "./planning-model";
import {
	PolygonSaveConflictError,
	type PolygonSaveResult,
	polygonDeleteSchema,
	polygonEditSchema,
} from "./polygon-edit";
import { syncVisualEvidence } from "./sync-evidence";

const archivedVisualType = `${VISUAL_DOCUMENT_TYPE}-archived`;

function locationMatches(description: string, location: string) {
	try {
		return (
			normalizeVisualLocation(JSON.parse(description).location) ===
			normalizeVisualLocation(location)
		);
	} catch {
		return false;
	}
}

export async function requireVisualAccess(userId: string, siteId: string) {
	const access = await requireWarehouseImportAccess(userId, siteId);
	if (access.organizationId !== LIMENI_ORGANIZATION_ID)
		throw new Error("Visual skats šai organizācijai nav pieejams.");
	return access;
}

export async function listVisualDrawings(userId: string, siteId: string) {
	const access = await requireVisualAccess(userId, siteId);
	const [rows, documents, site] = await Promise.all([
		prisma.sitediaryrecords.findMany({
			where: {
				siteId,
				organizationId: access.organizationId,
				archivedAt: null,
				Location: { not: null },
			},
			select: { Location: true },
			distinct: ["Location"],
		}),
		prisma.documents.findMany({
			where: {
				siteId,
				organizationId: access.organizationId,
				documentType: VISUAL_DOCUMENT_TYPE,
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			select: {
				id: true,
				documentName: true,
				createdAt: true,
				description: true,
			},
		}),
		prisma.site.findFirst({
			where: { id: siteId, organizationId: access.organizationId },
			select: { siteDiaryRecordsMap: true },
		}),
	]);
	if (!site) throw new Error("Projekts nav atrasts.");
	return visualDrawingIndex(rows, documents, site);
}

export function visualDrawingIndex(
	rows: { Location: string | null }[],
	documents: {
		id: string;
		documentName: string;
		createdAt: Date;
		description: string;
	}[],
	site: { siteDiaryRecordsMap: unknown },
) {
	if (!site) throw new Error("Projekts nav atrasts.");
	const seenLocations = new Set<string>();
	const drawings = documents.flatMap((row) => {
		try {
			const state = visualStateSchema.parse(JSON.parse(row.description));
			const key = normalizeVisualLocation(state.location);
			if (seenLocations.has(key)) return [];
			seenLocations.add(key);
			return [
				{
					id: row.id,
					name: row.documentName,
					createdAt: row.createdAt.toISOString(),
					location: state.location,
					status: state.status,
				},
			];
		} catch {
			return [];
		}
	});
	const locationsByKey = new Map<string, string>();
	for (const candidate of [
		...getDefaultConstructionOptionValues(
			(site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>,
		).locations,
		...rows.map((row) => row.Location?.trim() || ""),
		...drawings.map((row) => row.location),
	]) {
		const location = candidate.trim();
		if (!location) continue;
		const key = normalizeVisualLocation(location);
		if (!locationsByKey.has(key)) locationsByKey.set(key, location);
	}
	const locations = [...locationsByKey.values()].sort((a, b) =>
		a.localeCompare(b, "lv"),
	);
	const config = (site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>;
	const workOptions = new Set(withDefaultConstructionSystemWorks(config));
	for (const document of documents) {
		try {
			const state = visualStateSchema.parse(JSON.parse(document.description));
			for (const source of state.evidence)
				if (source.work.trim()) workOptions.add(source.work);
		} catch {}
	}
	const layerConfiguration: VisualLayerConfiguration = {
		settings: readVisualLayerSettings(config),
		workOptions: [...workOptions].sort((a, b) => a.localeCompare(b, "lv")),
		positionIds: visualLayerPositionIds(config),
	};
	const result: {
		locations: typeof locations;
		drawings: typeof drawings;
		layerConfiguration?: VisualLayerConfiguration;
	} = {
		locations,
		drawings,
		layerConfiguration,
	};
	return result;
}

async function loadVisualEvidence(
	siteId: string,
	organizationId: string,
	location: string,
	db: Pick<typeof prisma, "sitediaryrecords"> = prisma,
	manualRecordIds: string[] = [],
) {
	const rows = await db.sitediaryrecords.findMany({
		where: {
			siteId,
			organizationId,
			archivedAt: null,
			OR: [
				{ Photos: { isEmpty: false } },
				...(manualRecordIds.length ? [{ id: { in: manualRecordIds } }] : []),
			],
		},
		orderBy: [{ Date: "asc" }, { id: "asc" }],
	});
	return rows
		.filter(
			(row) =>
				normalizeVisualLocation(row.Location || "") ===
				normalizeVisualLocation(location),
		)
		.flatMap((row) =>
			[
				...sectionMappingAnalysisPhotos(
					normalizeDiaryPhotoUrls(row.Photos),
					row.evalMetadata,
				).map((photoUrl) => ({
					photoUrl,
					manual: undefined,
				})),
				...(manualRecordIds.includes(row.id)
					? [{ photoUrl: "", manual: true }]
					: []),
			].map(
				({ photoUrl, manual }, index): VisualEvidence => ({
					id: manual ? `${row.id}:manual` : `${row.id}:${index}`,
					recordId: row.id,
					photoUrl,
					...(manual ? { manual: true } : {}),
					work: row.Works || "",
					location,
					description: row.Comments || "",
					date: row.Date?.toISOString() ?? null,
					amount: row.Amounts,
					unit: row.Units || "",
					sourceRevision: createHash("sha256")
						.update(
							JSON.stringify(
								Object.fromEntries(
									Object.entries({
										...row,
										Location: normalizeVisualLocation(row.Location || ""),
									})
										.filter(([key]) => key !== "Photos")
										.sort(([a], [b]) => a.localeCompare(b)),
								),
							),
						)
						.digest("hex"),
				}),
			),
		);
}

export async function listVisualWorkTypes(userId: string, siteId: string) {
	const access = await requireVisualAccess(userId, siteId);
	const site = await prisma.site.findFirst({
		where: { id: siteId, organizationId: access.organizationId },
		select: { siteDiaryRecordsMap: true },
	});
	if (!site) throw new Error("Projekts nav atrasts.");
	return withDefaultConstructionSystemWorks(
		(site.siteDiaryRecordsMap ?? {}) as Record<string, unknown>,
	);
}

export async function editVisualWorkType(
	userId: string,
	siteId: string,
	drawingId: string,
	input: unknown,
) {
	const edit = z
		.object({
			evidenceId: z.string().min(1),
			expectedWork: z.string(),
			work: z.string().trim().min(1).max(500),
		})
		.parse(input);
	const options = await listVisualWorkTypes(userId, siteId);
	if (!options.includes(edit.work))
		throw new Error("Izvēlieties projekta darba tipu.");
	const { row, drawing } = await loadVisualDrawing(userId, siteId, drawingId);
	if (!row.organizationId)
		throw new Error("Rasējuma organizācija nav atrasta.");
	const organizationId = row.organizationId;
	requireIdleDrawing(drawing.state);
	const source = drawing.state.evidence.find(
		(item) => item.id === edit.evidenceId,
	);
	if (!source || source.work !== edit.expectedWork)
		throw new Error("Zonas avots jau ir mainīts. Atjaunojiet skatu.");
	const result = await prisma.$transaction(
		async (tx) => {
			const before = (
				await loadVisualEvidence(
					siteId,
					organizationId,
					drawing.state.location,
					tx,
					drawing.state.evidence
						.filter((item) => item.manual)
						.map((item) => item.recordId),
				)
			).find(
				(item) =>
					item.recordId === source.recordId &&
					item.photoUrl === source.photoUrl,
			);
			if (
				!before ||
				(source.sourceRevision &&
					source.sourceRevision !== before.sourceRevision) ||
				source.work !== before.work ||
				source.description !== before.description ||
				source.amount !== before.amount ||
				source.unit !== before.unit ||
				source.date !== before.date
			)
				throw new Error(
					"Žurnāla avots jau ir mainīts. Atjaunojiet skatu pirms darba tipa maiņas.",
				);
			const updated = await tx.sitediaryrecords.updateMany({
				where: {
					id: source.recordId,
					siteId,
					organizationId: row.organizationId,
					archivedAt: null,
					...(edit.expectedWork
						? { Works: edit.expectedWork }
						: { OR: [{ Works: "" }, { Works: null }] }),
				},
				data: { Works: edit.work },
			});
			if (updated.count !== 1)
				throw new Error(
					"Žurnāla ieraksts jau ir mainīts vai dzēsts. Atjaunojiet skatu.",
				);
			const documents = await tx.documents.findMany({
				where: {
					siteId,
					organizationId: row.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
				},
			});
			let current = drawing;
			for (const document of documents) {
				const state = visualStateSchema.parse(JSON.parse(document.description));
				if (!state.evidence.some((item) => item.recordId === source.recordId))
					continue;
				requireIdleDrawing(state);
				const snapshot = await loadVisualEvidence(
					siteId,
					organizationId,
					state.location,
					tx,
					state.evidence
						.filter((item) => item.manual)
						.map((item) => item.recordId),
				);
				const byPhoto = new Map(
					snapshot
						.filter((item) => item.recordId === source.recordId)
						.map((item) => [item.photoUrl, item]),
				);
				state.evidence = state.evidence.map((item) => {
					const fresh =
						item.recordId === source.recordId
							? byPhoto.get(item.photoUrl)
							: undefined;
					return fresh
						? {
								...fresh,
								id: item.id,
								...(item.reviewRequired ? { reviewRequired: true } : {}),
							}
						: item;
				});
				const ids = new Set(
					state.evidence
						.filter((item) => item.recordId === source.recordId)
						.map((item) => item.id),
				);
				state.marks = state.marks.map((mark) =>
					ids.has(mark.evidenceId)
						? { ...mark, layer: workLayer(edit.work) }
						: mark,
				);
				const saved = await tx.documents.updateMany({
					where: {
						id: document.id,
						siteId,
						organizationId: row.organizationId,
						documentType: VISUAL_DOCUMENT_TYPE,
						description: document.description,
					},
					data: { description: JSON.stringify(visualStateSchema.parse(state)) },
				});
				if (saved.count !== 1)
					throw new Error("Rasējums jau ir mainīts. Mēģiniet vēlreiz.");
				if (document.id === drawingId) current = { ...drawing, state };
			}
			if (
				!documents.some(
					(item) =>
						item.id === drawingId && item.description === row.description,
				)
			)
				throw new Error("Rasējums jau ir mainīts. Mēģiniet vēlreiz.");
			return current;
		},
		{ isolationLevel: "Serializable" },
	);
	let assignmentWarning: string | undefined;
	try {
		const { syncDefaultConstructionForma2WorkAssignments } = await import(
			"../backend/forma2-analytics-actions"
		);
		await syncDefaultConstructionForma2WorkAssignments({
			siteId,
			records: [{ id: source.recordId, work: edit.work }],
		});
	} catch {
		assignmentWarning =
			"Darba tips saglabāts, bet Forma 2 piesaiste netika atjaunota. Pārbaudiet to Forma 2 skatā.";
	}
	return { ...result, assignmentWarning };
}

export async function reviewVisualSource(
	userId: string,
	siteId: string,
	drawingId: string,
	evidenceId: string,
	reanalyze: boolean,
) {
	const { row, drawing } = await loadVisualDrawing(userId, siteId, drawingId);
	requireIdleDrawing(drawing.state);
	const source = drawing.state.evidence.find((item) => item.id === evidenceId);
	if (!source?.reviewRequired)
		throw new Error("Avots jau ir pārskatīts. Atjaunojiet skatu.");
	delete source.reviewRequired;
	if (reanalyze) {
		if (source.manual)
			throw new Error("Manuāli izveidotai zonai nav analizējama avota attēla.");
		if (drawing.state.deletedPolygons)
			drawing.state.deletedPolygons = drawing.state.deletedPolygons.filter(
				(item) => item.evidenceId !== evidenceId,
			);
		drawing.state.imageProgress = visualImageProgress(drawing.state).map(
			(item) =>
				item.evidenceId === evidenceId
					? { ...item, status: "pending", error: null }
					: item,
		);
		drawing.state.processed = drawing.state.imageProgress.filter(
			(item) => item.status === "complete",
		).length;
		drawing.state.status = "paused";
		drawing.state.error = null;
	}
	await saveVisualState(row, drawing.state);
	return drawing;
}

export async function createVisualDrawing(args: {
	userId: string;
	siteId: string;
	location: string;
	url: string;
	name: string;
	replaceDrawingId?: string;
}) {
	const access = await requireVisualAccess(args.userId, args.siteId);
	const location = args.location.trim();
	if (!location || location.length > 200)
		throw new Error("Izvēlieties lokāciju.");
	const evidence = await loadVisualEvidence(
		args.siteId,
		access.organizationId,
		location,
	);
	if (evidence.length > VISUAL_MAX_PHOTOS)
		throw new Error(
			`Lokācijai ir vairāk nekā ${VISUAL_MAX_PHOTOS} attēlu. Sadaliet to precīzākās lokācijās.`,
		);
	const state: VisualState = {
		version: 1,
		location,
		status: "uploaded",
		pageCount: null,
		processed: 0,
		evidence,
		marks: [],
		unlocated: [],
		error: null,
		lockedAt: null,
		attempts: [],
	};
	return prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visual:${args.siteId}`}))`;
		const existing = (
			await tx.documents.findMany({
				where: {
					siteId: args.siteId,
					organizationId: access.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			})
		).filter((row) => locationMatches(row.description, location));
		if (existing.length && args.replaceDrawingId !== existing[0].id)
			throw new Error("Lokācijai jau ir rasējums. Apstipriniet tā aizstāšanu.");
		if (!existing.length && args.replaceDrawingId)
			throw new Error(
				"Aizstājamais rasējums ir mainīts. Pārlādējiet Visual skatu.",
			);
		for (const previous of existing) {
			requireIdleDrawing(
				visualStateSchema.parse(JSON.parse(previous.description)),
			);
			const archived = await tx.documents.updateMany({
				where: {
					id: previous.id,
					siteId: args.siteId,
					organizationId: access.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
					description: previous.description,
				},
				data: { documentType: archivedVisualType },
			});
			if (archived.count !== 1)
				throw new Error("Rasējums jau ir mainīts. Pārlādējiet Visual skatu.");
		}
		const drawingId = randomUUID();
		const drawing = await tx.documents.create({
			data: {
				id: drawingId,
				siteId: args.siteId,
				organizationId: access.organizationId,
				userId: args.userId,
				url: args.url,
				documentName: args.name,
				documentType: VISUAL_DOCUMENT_TYPE,
				description: JSON.stringify(visualStateSchema.parse(state)),
			},
		});
		const replacedDrawingIds = existing.map((item) => item.id);
		if (replacedDrawingIds.length) {
			const linkedPlans = await tx.constructionPlan.findMany({
				where: {
					siteId: args.siteId,
					planType: VISUAL_PLAN_TYPE,
					visualDrawingId: { in: replacedDrawingIds },
				},
			});
			for (const plan of linkedPlans) {
				const changed = await tx.constructionPlan.updateMany({
					where: {
						id: plan.id,
						siteId: args.siteId,
						planType: VISUAL_PLAN_TYPE,
						visualDrawingId: plan.visualDrawingId,
						version: plan.version,
					},
					data: {
						visualDrawingId: drawingId,
						geometryReviewRequired: true,
						updatedBy: args.userId,
						version: { increment: 1 },
					},
				});
				if (changed.count !== 1)
					throw new Error(
						"Plānotā zona jau ir mainīta. Pārlādējiet Visual skatu.",
					);
				const saved = await tx.constructionPlan.findUniqueOrThrow({
					where: { id: plan.id },
				});
				await tx.constructionPlanRevision.create({
					data: {
						planId: saved.id,
						version: saved.version,
						action: "drawing_replace",
						actorId: args.userId,
						snapshot: {
							id: saved.id,
							version: saved.version,
							drawingId: saved.visualDrawingId,
							work: saved.work,
							location: saved.location,
							unit: saved.unit,
							quantity: saved.quantity,
							startDate: saved.startDate?.toISOString().slice(0, 10) ?? null,
							endDate: saved.date.toISOString().slice(0, 10),
							geometry: saved.visualAreas,
							geometryReviewRequired: saved.geometryReviewRequired,
							archivedAt: saved.archivedAt?.toISOString() ?? null,
							planType: VISUAL_PLAN_TYPE,
						},
					},
				});
			}
		}
		return drawing.id;
	});
}

export async function loadVisualDrawing(
	userId: string,
	siteId: string,
	id: string,
) {
	const access = await requireVisualAccess(userId, siteId);
	const [row, diaryDates] = await Promise.all([
		prisma.documents.findFirst({
			where: {
				id,
				siteId,
				organizationId: access.organizationId,
				documentType: VISUAL_DOCUMENT_TYPE,
			},
		}),
		prisma.sitediaryrecords.groupBy({
			by: ["Location"],
			where: {
				siteId,
				organizationId: access.organizationId,
				archivedAt: null,
				Date: { not: null },
			},
			_max: { Date: true },
		}),
	]);
	if (!row) throw new Error("Rasējums nav atrasts vai nav pieejams.");
	const state = visualStateSchema.parse(JSON.parse(row.description));
	const dates = diaryDates
		.filter(
			(item) =>
				normalizeVisualLocation(item.Location || "") ===
				normalizeVisualLocation(state.location),
		)
		.flatMap((item) => (item._max.Date ? [item._max.Date.getTime()] : []));
	const latestDiaryDate = dates.length
		? new Date(Math.max(...dates)).toISOString()
		: null;
	const drawing: VisualDrawing = {
		id: row.id,
		name: row.documentName,
		createdAt: row.createdAt.toISOString(),
		latestDiaryDate,
		state,
	};
	return { row, drawing };
}

export async function saveVisualState(
	row: {
		id: string;
		siteId: string | null;
		organizationId: string | null;
		description: string;
	},
	state: VisualState,
) {
	const description = JSON.stringify(visualStateSchema.parse(state));
	const result = await prisma.documents.updateMany({
		where: {
			id: row.id,
			siteId: row.siteId,
			organizationId: row.organizationId,
			documentType: VISUAL_DOCUMENT_TYPE,
			description: row.description,
		},
		data: { description },
	});
	if (result.count !== 1)
		throw new Error("Analīze jau tiek atjaunināta. Pārlādējiet Visual skatu.");
	return { ...row, description };
}

function requireIdleDrawing(state: VisualState) {
	if (state.lockedAt && Date.now() - state.lockedAt < VISUAL_LEASE_MS)
		throw new Error("Analīze vēl notiek. Uzgaidiet, līdz tā ir pabeigta.");
}

export async function appendVisualDiaryEvidence(
	userId: string,
	siteId: string,
	drawingId: string,
) {
	const { row, drawing } = await loadVisualDrawing(userId, siteId, drawingId);
	const state = drawing.state;
	requireIdleDrawing(state);
	if (!row.organizationId)
		throw new Error("Rasējuma organizācija nav atrasta.");
	const current = await loadVisualEvidence(
		siteId,
		row.organizationId,
		state.location,
		prisma,
		state.evidence.filter((item) => item.manual).map((item) => item.recordId),
	);
	const result = syncVisualEvidence(state, current, randomUUID, true);
	drawing.state = result.state;
	if (result.changed) await saveVisualState(row, result.state);
	return {
		drawing,
		addedCount: result.addedCount,
		updatedCount: result.updatedCount,
		removedCount: result.removedCount,
		analysisCount: result.analysisCount,
		reviewCount: result.reviewCount,
	};
}

export async function removeVisualDrawing(
	userId: string,
	siteId: string,
	id: string,
) {
	const { row, drawing } = await loadVisualDrawing(userId, siteId, id);
	requireIdleDrawing(drawing.state);
	await prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visual:${siteId}`}))`;
		const duplicates = (
			await tx.documents.findMany({
				where: {
					siteId,
					organizationId: row.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
				},
			})
		).filter(
			(item) =>
				item.id !== id &&
				locationMatches(item.description, drawing.state.location),
		);
		for (const item of duplicates) {
			requireIdleDrawing(visualStateSchema.parse(JSON.parse(item.description)));
			const result = await tx.documents.updateMany({
				where: {
					id: item.id,
					siteId,
					organizationId: row.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
					description: item.description,
				},
				data: { documentType: archivedVisualType },
			});
			if (result.count !== 1)
				throw new Error("Rasējums jau ir mainīts. Pārlādējiet Visual skatu.");
		}
		const result = await tx.documents.deleteMany({
			where: {
				id: row.id,
				siteId: row.siteId,
				organizationId: row.organizationId,
				documentType: VISUAL_DOCUMENT_TYPE,
				description: row.description,
			},
		});
		if (result.count !== 1)
			throw new Error("Rasējums jau ir mainīts. Pārlādējiet Visual skatu.");
	});
}

export async function editVisualPolygon(
	userId: string,
	siteId: string,
	drawingId: string,
	input: unknown,
	trace?: ReturnType<typeof createPerfTrace>,
) {
	const edit = polygonEditSchema.parse(input);
	const measure =
		trace?.measure ??
		(async <T>(_phase: string, task: () => T | Promise<T>) => task());
	const access = await measure("access", () =>
		requireVisualAccess(userId, siteId),
	);
	const row = await measure("read", () =>
		prisma.documents.findFirst({
			where: {
				id: drawingId,
				siteId,
				organizationId: access.organizationId,
				documentType: VISUAL_DOCUMENT_TYPE,
			},
			select: {
				id: true,
				siteId: true,
				organizationId: true,
				description: true,
			},
		}),
	);
	if (!row)
		throw new PolygonSaveConflictError(
			"Rasējums nav atrasts vai nav pieejams.",
		);
	const state = await measure("validate", () =>
		visualStateSchema.parse(JSON.parse(row.description)),
	);
	requireIdleDrawing(state);
	const mark = state.marks.find((item) => item.id === edit.markId);
	if (!mark)
		throw new PolygonSaveConflictError(
			"Zona nav atrasta. Atjaunojiet rasējumu.",
		);
	const samePolygon =
		JSON.stringify(mark.polygon) === JSON.stringify(edit.polygon);
	const repeatedMutation =
		edit.mutationId && mark.geometryMutationId === edit.mutationId;
	if (
		(repeatedMutation && !samePolygon) ||
		(!repeatedMutation &&
			JSON.stringify(mark.polygon) !== JSON.stringify(edit.expectedPolygon))
	)
		throw new PolygonSaveConflictError(
			"Zona jau ir mainīta. Pārlādējiet rasējumu pirms rediģēšanas.",
		);
	if (!samePolygon) {
		mark.polygon = edit.polygon;
		mark.editedAt = new Date().toISOString();
		mark.editedBy = userId;
		mark.geometryMutationId = edit.mutationId;
		const changed = await measure("write", () =>
			prisma.documents.updateMany({
				where: {
					id: row.id,
					siteId,
					organizationId: access.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
					description: row.description,
				},
				data: { description: JSON.stringify(state) },
			}),
		);
		if (changed.count !== 1)
			throw new PolygonSaveConflictError(
				"Rasējums jau ir mainīts. Atjaunojiet skatu pirms atkārtotas saglabāšanas.",
			);
	}
	const result: PolygonSaveResult = {
		drawingId,
		markId: mark.id,
		polygon: mark.polygon,
		editedAt: mark.editedAt ?? null,
		editedBy: mark.editedBy ?? null,
		mutationId: edit.mutationId ?? null,
		geometryMutationId: mark.geometryMutationId ?? null,
	};
	return result;
}

export async function removeVisualPolygon(
	userId: string,
	siteId: string,
	drawingId: string,
	input: unknown,
) {
	const deletion = polygonDeleteSchema.parse(input);
	const { row, drawing } = await loadVisualDrawing(userId, siteId, drawingId);
	requireIdleDrawing(drawing.state);
	const state = drawing.state;
	const mark = state.marks.find((item) => item.id === deletion.markId);
	if (!mark) throw new Error("Poligons nav atrasts. Atjaunojiet rasējumu.");
	if (JSON.stringify(mark.polygon) !== JSON.stringify(deletion.expectedPolygon))
		throw new Error(
			"Poligons jau ir mainīts. Atjaunojiet rasējumu pirms dzēšanas.",
		);
	const progress = visualImageProgress(state);
	const source = state.evidence.find((item) => item.id === mark.evidenceId);
	if (!source) throw new Error("Poligona avots nav atrasts.");
	if (
		progress.some(
			(item) => item.evidenceId === source.id && item.status !== "complete",
		)
	)
		source.reviewRequired = true;
	state.imageProgress = progress.map((item) =>
		item.evidenceId === source.id
			? { ...item, status: "complete", error: null }
			: item,
	);
	state.processed = state.imageProgress.filter(
		(item) => item.status === "complete",
	).length;
	state.marks = state.marks.filter((item) => item.id !== mark.id);
	state.deletedPolygons = [
		...(state.deletedPolygons ?? []),
		{
			markId: mark.id,
			evidenceId: mark.evidenceId,
			polygon: mark.polygon,
			deletedAt: new Date().toISOString(),
			deletedBy: userId,
		},
	];
	await saveVisualState(row, state);
	return drawing;
}

export async function resetVisualDrawing(
	userId: string,
	siteId: string,
	id: string,
) {
	const { row, drawing } = await loadVisualDrawing(userId, siteId, id);
	requireIdleDrawing(drawing.state);
	if (!row.organizationId) throw new Error("Drawing organization missing");
	const evidence = await loadVisualEvidence(
		siteId,
		row.organizationId,
		drawing.state.location,
		prisma,
		drawing.state.evidence
			.filter((item) => item.manual)
			.map((item) => item.recordId),
	);
	if (evidence.length > VISUAL_MAX_PHOTOS)
		throw new Error(`Too many photos (maximum ${VISUAL_MAX_PHOTOS})`);
	const manualIds = new Set(
		evidence.filter((item) => item.manual).map((item) => item.id),
	);
	const state: VisualState = {
		...drawing.state,
		evidence,
		status: "uploaded",
		processed: manualIds.size,
		marks: drawing.state.marks.filter((mark) => manualIds.has(mark.evidenceId)),
		deletedPolygons: undefined,
		imageProgress: manualIds.size
			? evidence.map((item) => ({
					evidenceId: item.id,
					status: item.manual ? "complete" : "pending",
					error: null,
				}))
			: undefined,
		unlocated: [],
		error: null,
		lockedAt: null,
		attempts: drawing.state.attempts.map((attempt) =>
			attempt.status === "running"
				? { ...attempt, status: "failed", endedAt: new Date().toISOString() }
				: attempt,
		),
	};
	await saveVisualState(row, state);
	return { ...drawing, state };
}
