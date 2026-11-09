import { buildForma2AnalyticsView } from "@/flows/default-construction/lib/forma2-analytics";
import { getForma2ClientCostDetails } from "@/flows/default-construction/lib/forma2-client-costs";
import { calculateForma2Split } from "@/flows/default-construction/lib/forma2-splits";
import { getDefaultConstructionOptionValues } from "@/flows/default-construction/lib/site-diary-productivity-settings";
import { buildDefaultConstructionScopeSummary } from "@/flows/default-construction/lib/site-diary-summary";
import {
	comparePlans,
	plannerToday,
	planSchema,
	weekStart,
} from "@/flows/default-construction/planner/model";
import { workLayer } from "@/flows/default-construction/visual/model";
import { visualPlanInputSchema } from "@/flows/default-construction/visual/planning-model";
import {
	polygonEditReplacements,
	polygonEditSchema,
} from "@/flows/default-construction/visual/polygon-edit";
import { visualRecordInputSchema } from "@/flows/default-construction/visual/record-model";
import { appendFimaEvent } from "@/lib/fima/diary-collaboration";
import { getData, type LocalData, saveLocal } from "./store";

type LocalRecord = Record<string, any>;
type Handler = (...args: any[]) => any;
const rows = () => getData().snapshot.diary.rows as LocalRecord[];
const drawing = (id: string) => {
	const item = getData().snapshot.drawings.find(
		(item: LocalRecord) => item.drawing.id === id,
	);
	if (!item) throw new Error("Rasējums nav atrasts.");
	return item;
};
const record = (id: string) => {
	const row = rows().find((row) => row.id === id);
	if (!row) throw new Error("Ieraksts nav atrasts.");
	return row;
};
function changeRecord(id: string, fields: LocalRecord) {
	saveLocal((draft) => {
		Object.assign(
			draft.snapshot.diary.rows.find((row: LocalRecord) => row.id === id),
			fields,
		);
	});
	return record(id);
}
function updateDrawing(
	id: string,
	change: (item: LocalRecord, draft: LocalData) => void,
) {
	saveLocal((draft) => {
		const item = draft.snapshot.drawings.find(
			(item: LocalRecord) => item.drawing.id === id,
		);
		if (!item) throw new Error("Rasējums nav atrasts.");
		change(item, draft);
	});
	return drawing(id).drawing;
}
function cloneRecord(input: LocalRecord) {
	return {
		Date: new Date(),
		Works: "",
		Location: "",
		Units: "m2",
		Amounts: "",
		Comments: "",
		Photos: [],
		WorkersInvolved: "",
		TimeInvolved: "",
		...structuredClone(input),
		id: crypto.randomUUID(),
		createdAt: new Date(),
		fimaNumber: Math.max(0, ...rows().map((row) => row.fimaNumber ?? 0)) + 1,
		fimaCollaboration: { version: 0, status: null, materials: [], history: [] },
	};
}
function saveEdits(input: LocalRecord) {
	const ids = [
		...(input.updates ?? []).map((row: LocalRecord) => row.id),
		...(input.creates ?? []).map((row: LocalRecord) => row.clientId),
	];
	saveLocal((draft) => {
		for (const update of input.updates ?? [])
			Object.assign(
				draft.snapshot.diary.rows.find(
					(row: LocalRecord) => row.id === update.id,
				),
				update.fields,
			);
		for (const create of input.creates ?? [])
			draft.snapshot.diary.rows.push({
				...cloneRecord({}),
				...create.fields,
				id: create.clientId,
			});
	});
	return {
		rows: rows().filter((row) => ids.includes(row.id)),
		createdIds: (input.creates ?? []).map((row: LocalRecord) => row.clientId),
	};
}
function savePolygon(_siteId: string, drawingId: string, input: unknown) {
	const edit = polygonEditSchema.parse(input);
	let result: any;
	updateDrawing(drawingId, (item) => {
		const primary = item.drawing.state.marks.find(
			(mark: LocalRecord) => mark.id === edit.markId,
		);
		if (
			!primary ||
			JSON.stringify(primary.polygon) !== JSON.stringify(edit.expectedPolygon)
		)
			throw new Error("Zona ir mainīta. Atveriet to vēlreiz.");
		const replacedMarkIds = edit.group?.expected.map((mark) => mark.markId) ?? [
			edit.markId,
		];
		const editedAt = new Date().toISOString();
		const replacements = polygonEditReplacements(
			item.drawing.state.marks,
			edit,
			editedAt,
			"ozolu-user",
		);
		item.drawing.state.marks = [
			...item.drawing.state.marks.filter(
				(mark: LocalRecord) => !replacedMarkIds.includes(mark.id),
			),
			...replacements,
		];
		result = {
			drawingId,
			markId: edit.markId,
			polygon: edit.polygon,
			editedAt,
			editedBy: "ozolu-user",
			mutationId: edit.mutationId ?? null,
			replacedMarkIds,
			replacements,
		};
	});
	return { ok: true, result };
}
function savePlan(input: unknown) {
	const value = visualPlanInputSchema.parse(input);
	const id = value.id ?? value.clientId ?? crypto.randomUUID();
	updateDrawing(value.drawingId, (item) => {
		const existing = item.planning.plans.find(
			(plan: LocalRecord) => plan.id === id,
		);
		const plan = {
			...value,
			id,
			version: (existing?.version ?? 0) + 1,
			geometryReviewRequired: false,
			archivedAt: null,
			whatsAppSends: existing?.whatsAppSends ?? [],
		};
		item.planning.plans = [
			...item.planning.plans.filter((plan: LocalRecord) => plan.id !== id),
			plan,
		];
	});
	return {
		ok: true,
		plan: drawing(value.drawingId).planning.plans.find(
			(plan: LocalRecord) => plan.id === id,
		),
	};
}
function archivePlan(input: LocalRecord, archivedAt: string | null) {
	let selected: any;
	saveLocal((draft) => {
		for (const item of draft.snapshot.drawings) {
			const plan = item.planning.plans.find(
				(plan: LocalRecord) => plan.id === input.id,
			);
			if (plan) {
				Object.assign(plan, { archivedAt, version: plan.version + 1 });
				selected = plan;
			}
		}
	});
	if (!selected) throw new Error("Plāns nav atrasts.");
	return { ok: true, plan: selected };
}
function removePhoto(id: string) {
	const photo = getData().photos.find((photo) => photo.id === id);
	if (!photo) throw new Error("Foto nav atrasts.");
	saveLocal((draft) => {
		draft.photos = draft.photos.filter((item) => item.id !== id);
		const owner = draft.snapshot.diary.rows.find(
			(row: LocalRecord) => row.id === photo.diaryRecordId,
		);
		if (owner)
			owner.Photos = owner.Photos.filter((url: string) => url !== photo.URL);
		draft.snapshot.diary.mediaPhotos = draft.snapshot.diary.mediaPhotos.filter(
			(item: LocalRecord) => item.URL !== photo.URL || item.Date !== photo.Date,
		);
		for (const item of draft.snapshot.drawings) {
			const removed = item.drawing.state.evidence
				.filter(
					(entry: LocalRecord) =>
						entry.photoUrl === photo.URL &&
						(!photo.diaryRecordId || entry.recordId === photo.diaryRecordId),
				)
				.map((entry: LocalRecord) => entry.id);
			item.drawing.state.evidence = item.drawing.state.evidence.filter(
				(entry: LocalRecord) => !removed.includes(entry.id),
			);
			item.drawing.state.marks = item.drawing.state.marks.filter(
				(mark: LocalRecord) => !removed.includes(mark.evidenceId),
			);
		}
	});
	return { success: true };
}
function quantityDetails(input: LocalRecord) {
	const costs = getData().snapshot.forma2.data.clientCosts;
	const view = buildForma2AnalyticsView({
		...costs,
		includeSuggestions: false,
	});
	const position = view.resultRows.find(
		(position) => position.id === input.positionId,
	);
	if (!position) throw new Error("Pozīcija nav atrasta.");
	const records = view.mappingRows
		.filter(
			(source) =>
				source.type === "work" && source.assignedPositionId === position.id,
		)
		.map((source) => {
			const row = record(source.id);
			return {
				...source,
				label: row.Works,
				secondaryLabel: row.Location,
				description: row.originalUserComment || row.Comments,
				photos: row.Photos,
				plannedQuantity: Number(row.Amounts) || null,
				reportedQuantity: Number(row.Amounts) || null,
				exclusion: source.unit === position.unit ? null : "unit_mismatch",
			};
		});
	return {
		position,
		calculatedTotal: position.actualQuantity,
		usesDrawingQuantities: false,
		includedRecords: records.filter((row) => !row.exclusion).length,
		excludedRecords: records.filter((row) => row.exclusion).length,
		records,
	};
}
function collaboration(input: LocalRecord) {
	return record(input.recordId).fimaCollaboration;
}
function actualRows() {
	return rows().map((row) => ({
		id: row.id,
		date: new Date(row.Date).toISOString().slice(0, 10),
		work: row.Works,
		location: row.Location,
		unit: row.Units,
		quantity: Number(row.Amounts) || null,
		comments: row.Comments ?? "",
	}));
}
function week(date: string) {
	const data = getData();
	const options = getDefaultConstructionOptionValues(data.snapshot.config);
	return {
		start: weekStart(date),
		today: plannerToday(),
		siteName: "Ozolu biroju centrs",
		organizationId: data.snapshot.settings.organizationId,
		plans: data.dailyPlans ?? [],
		visualPlans: data.snapshot.drawings.flatMap(
			(item: LocalRecord) => item.planning.plans,
		),
		options: {
			works: options.productivity.works,
			locations: options.locations,
			units: options.units,
		},
		actuals: actualRows(),
	};
}
function feedback() {
	return (
		getData().feedback ?? {
			snapshot: {
				revision: 0,
				userInstructions: "",
				generatedPrompt:
					"Izmantojiet projekta darbu katalogu. Saglabājiet ziņojumā norādītos apjomus un mērvienības.",
				sourceRecordCount: rows().length,
				updatedAt: null,
				checkedAt: null,
				busy: false,
				active: false,
			},
			history: [],
			hasMore: false,
		}
	);
}
const handlers: Record<string, Handler> = {
	getConfig: () => getData().snapshot.config,
	getConstructionDiarySnapshot: () => getData().snapshot.diary,
	getLimeniDiarySnapshot: () => getData().snapshot.diary,
	getSiteDiaryRecordsPage: () => ({
		rows: rows(),
		totalCount: rows().length,
		totalPages: 1,
		page: 1,
		mediaPhotos: getData().snapshot.diary.mediaPhotos,
	}),
	getSiteDiaryMediaOnlyDays: () => [],
	getSiteDiaryRecord: (input: string | LocalRecord) =>
		typeof input === "string"
			? record(input)
			: rows().filter(
					(row) =>
						!input.date ||
						new Date(row.Date).toISOString().slice(0, 10) ===
							String(input.date).slice(0, 10),
				),
	getSitediaryRecordsBySiteIdForExcel: () => rows(),
	getFilledDays: () => [
		...new Set(
			rows().map((row) => new Date(row.Date).toISOString().slice(0, 10)),
		),
	],
	getLocationsWorksFromSiteSchema: (_siteId: string, field: string) =>
		field === "Location"
			? getData().snapshot.index.locations
			: getData().snapshot.drawings[0].planning.workOptions.map(
					(item: LocalRecord) => item.work,
				),
	getSiteDiarySchema: () => getData().snapshot.config,
	getFimaDiaryCollaboration: collaboration,
	refreshFimaBisMaterials: collaboration,
	getFimaAvailableMaterials: () => [
		...new Map(
			rows()
				.flatMap((row) => row.fimaCollaboration?.materials ?? [])
				.map((material) => [
					material.id,
					{
						...material,
						availableQuantity: 1000,
						measurementUnit: material.unit,
					},
				]),
		).values(),
	],
	getFimaWarehouseAvailability: () => ({ enabled: false, available: false }),
	getFimaDiaryFilterOptions: () => ({
		actions: [],
		statuses: [],
		works: [...new Set(rows().map((row) => row.Works))],
		locations: getData().snapshot.index.locations,
	}),
	updateFimaDiaryField: (input: LocalRecord) => {
		changeRecord(input.recordId, {
			[input.field]:
				input.field === "Date" ? new Date(input.value) : input.value,
		});
		return { field: input.field, value: input.value };
	},
	saveFimaDiaryCollaboration: (input: LocalRecord) => {
		const current = record(input.recordId).fimaCollaboration;
		const patch =
			input.kind === "status"
				? { status: input.status }
				: input.kind === "act_type"
					? { actType: input.actType }
					: input.kind === "materials"
						? { materials: input.materials }
						: {};
		const next = appendFimaEvent(
			current,
			{
				id: input.requestId,
				kind: input.kind,
				actorId: "ozolu-user",
				actorName: "Jānis Ozols",
				at: new Date().toISOString(),
				text: input.text ?? "",
				...(input.kind === "status"
					? { previousStatus: current.status, status: input.status }
					: {}),
				...(input.kind === "act_type"
					? { previousActType: current.actType, actType: input.actType }
					: {}),
			},
			patch,
			input.kind === "comment" ? undefined : input.expectedVersion,
		);
		changeRecord(input.recordId, { fimaCollaboration: next });
		return next;
	},
	saveDefaultConstructionDiaryEdits: saveEdits,
	updateSiteDiaryRecord: (input: LocalRecord) =>
		changeRecord(input.id ?? input.recordId, input.fields ?? input),
	saveSiteDiaryRecordFromWeb: saveEdits,
	deleteSiteDiaryRecord: (input: LocalRecord) => {
		const id = input.id ?? input.recordId;
		saveLocal((draft) => {
			draft.snapshot.diary.rows = draft.snapshot.diary.rows.filter(
				(row: LocalRecord) => row.id !== id,
			);
			draft.photos = draft.photos.filter((photo) => photo.diaryRecordId !== id);
		});
		return { success: true };
	},
	copySiteDiaryRecordToDate: (id: string, date: string) => {
		const copy = cloneRecord(record(id));
		copy.Date = new Date(date);
		saveLocal((draft) => {
			draft.snapshot.diary.rows.push(copy);
			for (const photo of draft.photos.filter(
				(photo) => photo.diaryRecordId === id,
			))
				draft.photos.push({
					...photo,
					id: crypto.randomUUID(),
					diaryRecordId: copy.id,
					Date: copy.Date,
				});
		});
		return copy;
	},
	syncDeletedSiteDiaryBisRecords: () => ({ deletedCount: 0, deletedIds: [] }),
	refreshFimaAcceptanceActs: () => ({ updated: 0, success: true }),
	getSiteWeatherAvailability: () => ({ enabled: false, available: false }),
	getSiteDayWeather: () => null,
	getSiteGalleryAttachments: () => getData().photos,
	getAllPhotos: () => getData().photos,
	getPhotosByDate: (_siteId: string, date: string) =>
		getData().photos.filter(
			(photo) => new Date(photo.Date).toISOString().slice(0, 10) === date,
		),
	deletePhotoById: removePhoto,
	attachLocalPhotos: (input: LocalRecord, files: LocalRecord[]) => {
		const row = record(input.recordId);
		saveLocal((draft) => {
			const owner = draft.snapshot.diary.rows.find(
				(row: LocalRecord) => row.id === input.recordId,
			);
			for (const file of files) {
				owner.Photos.push(file.url);
				const photo = {
					id: crypto.randomUUID(),
					Date: row.Date,
					URL: file.url,
					fileUrl: file.url,
					Comment: row.Comments,
					Location: row.Location,
					diaryRecordId: row.id,
					siteId: input.siteId,
					mediaPurpose: "site_diary",
				};
				draft.photos.push(photo);
				draft.snapshot.diary.mediaPhotos.push(photo);
			}
		});
		return record(input.recordId).Photos;
	},
	movePhotoToDate: (id: string, date: string) => {
		saveLocal((draft) => {
			const photo = draft.photos.find((photo) => photo.id === id);
			if (photo) photo.Date = new Date(date);
		});
		return { success: true };
	},
	getBeginHours: () => ({
		enabled: true,
		days: getData().beginRows.map((row) => JSON.parse(row.Comments_Custom_2)),
		diaryDates: rows().map((row) =>
			new Date(row.Date).toISOString().slice(0, 10),
		),
	}),
	getWorkersBySiteId: () => getData().workers,
	getAllWorkers: () => getData().workers,
	getTimelogsBySiteId: () => getData().timelogs,
	updateTimeRecord: (input: LocalRecord) => {
		saveLocal((draft) => {
			const row = draft.timelogs.find((row) => row.id === input.id);
			if (!row) throw new Error("Laika ieraksts nav atrasts.");
			Object.assign(row, input, { wocation: input.location });
		});
		return { success: true };
	},
	deleteTimeRecord: (id: string) => {
		saveLocal((draft) => {
			draft.timelogs = draft.timelogs.filter((row) => row.id !== id);
		});
		return { success: true };
	},
	getVisualDrawings: () => getData().snapshot.index,
	getVisualPlanning: (_siteId: string, id: string) => drawing(id).planning,
	getVisualWorkTypes: () =>
		getData().snapshot.drawings[0].planning.workOptions.map(
			(item: LocalRecord) => item.work,
		),
	saveVisualPolygonPatch: savePolygon,
	saveVisualPolygon: (siteId: string, id: string, input: unknown) => {
		savePolygon(siteId, id, input);
		return drawing(id).drawing;
	},
	deleteVisualPolygon: (_siteId: string, id: string, input: LocalRecord) =>
		updateDrawing(id, (item) => {
			item.drawing.state.marks = item.drawing.state.marks.filter(
				(mark: LocalRecord) => mark.id !== input.markId,
			);
		}),
	saveVisualPlanningItem: savePlan,
	archiveVisualPlanningItem: (input: LocalRecord) =>
		archivePlan(input, new Date().toISOString()),
	restoreVisualPlanningItem: (input: LocalRecord) => archivePlan(input, null),
	saveVisualLayers: (_siteId: string, settings: LocalRecord) => {
		saveLocal((draft) => {
			draft.snapshot.index.layerConfiguration.settings = settings;
		});
		return settings;
	},
	addVisualSection: (_siteId: string, label: string) => {
		saveLocal((draft) => {
			for (const item of draft.snapshot.drawings)
				item.planning.sections = [
					...new Set([...item.planning.sections, label]),
				];
		});
		return getData().snapshot.drawings[0].planning.sections;
	},
	refreshVisualDrawing: (_siteId: string, id: string) => ({
		drawing: drawing(id).drawing,
		addedCount: 0,
		updatedCount: 0,
		removedCount: 0,
		analysisCount: 0,
	}),
	deleteVisualDrawing: (_siteId: string, id: string) => {
		saveLocal((draft) => {
			draft.snapshot.drawings = draft.snapshot.drawings.filter(
				(item: LocalRecord) => item.drawing.id !== id,
			);
			draft.snapshot.index.drawings = draft.snapshot.index.drawings.filter(
				(item: LocalRecord) => item.id !== id,
			);
		});
		return { ok: true };
	},
	resolveVisualSourceReview: (_siteId: string, id: string) =>
		updateDrawing(id, (item) => {
			item.drawing.state.sourceReviews = [];
		}),
	saveVisualDrawingScale: (_siteId: string, id: string, input: LocalRecord) => {
		updateDrawing(id, (item) => {
			item.drawing.state.pageScales = {
				...item.drawing.state.pageScales,
				[input.page]: input.scale,
			};
		});
		return drawing(id).drawing.state.pageScales;
	},
	saveVisualWorkType: (_siteId: string, id: string, input: LocalRecord) => {
		updateDrawing(id, (item, draft) => {
			const evidence = item.drawing.state.evidence.find(
				(entry: LocalRecord) => entry.id === input.evidenceId,
			);
			if (evidence) {
				evidence.work = input.work;
				const row = draft.snapshot.diary.rows.find(
					(row: LocalRecord) => row.id === evidence.recordId,
				);
				if (row) row.Works = input.work;
			}
		});
		return drawing(id).drawing;
	},
	addVisualRecord: (_siteId: string, id: string, input: unknown) => {
		const value = visualRecordInputSchema.parse(input);
		updateDrawing(id, (item, draft) => {
			const row = {
				...cloneRecord({}),
				id: value.id,
				Date: new Date(value.date),
				Works: value.work,
				Location: item.drawing.state.location,
				Amounts: String(value.quantity),
				Units: value.unit,
				Comments: value.comments,
				WorkersInvolved: "",
				TimeInvolved: "",
				Photos: [],
			};
			draft.snapshot.diary.rows.push(row);
			const evidenceId = `${value.id}:manual`;
			item.drawing.state.evidence.push({
				id: evidenceId,
				recordId: value.id,
				manual: true,
				photoUrl: "",
				work: row.Works,
				location: row.Location,
				description: row.Comments,
				date: new Date(row.Date).toISOString(),
				amount: value.quantity,
				unit: value.unit,
			});
			item.drawing.state.marks.push(
				...value.areas.map((area, index) => ({
					id: `${evidenceId}:${index}`,
					evidenceId,
					page: area.page,
					polygon: area.polygon,
					layer: workLayer(value.work),
					confidence: 1,
					anchors: [],
					explanation: "Manuāli norādīta zona.",
				})),
			);
		});
		return { ok: true, drawing: drawing(id).drawing, recordId: value.id };
	},
	getDefaultConstructionForma2Results: () => getData().snapshot.forma2.data,
	getDefaultConstructionForma2PositionCostDetails: (input: LocalRecord) =>
		getForma2ClientCostDetails(
			getData().snapshot.forma2.data.clientCosts,
			input as any,
		),
	getDefaultConstructionForma2PositionQuantityDetails: quantityDetails,
	getDefaultConstructionForma2SplitDetails: (input: LocalRecord) => {
		const costs = getData().snapshot.forma2.data.clientCosts;
		const allocation = costs.allocations.find(
			(item: LocalRecord) =>
				item.sourceType === "material" && item.sourceId === input.sourceId,
		);
		return {
			source: costs.sources.find(
				(source: LocalRecord) =>
					source.id === input.sourceId && source.type === "material",
			),
			split: allocation?.split ?? null,
			positionId: allocation?.positionId ?? null,
			expectedAllocation: JSON.stringify(allocation ?? null),
			positionOptions: costs.positions,
		};
	},
	saveDefaultConstructionForma2Split: (input: LocalRecord) => {
		const costs = getData().snapshot.forma2.data.clientCosts;
		const source = costs.sources.find(
			(source: LocalRecord) =>
				source.id === input.sourceId && source.type === "material",
		);
		const allocation = costs.allocations.find(
			(item: LocalRecord) =>
				item.sourceType === "material" && item.sourceId === input.sourceId,
		);
		if (JSON.stringify(allocation ?? null) !== input.expectedAllocation)
			throw new Error("Piesaiste ir mainīta. Atveriet sadalījumu vēlreiz.");
		const calculated = calculateForma2Split(input.split, source);
		saveLocal((draft) => {
			const entries = draft.snapshot.forma2.data.clientCosts.allocations;
			const index = entries.findIndex(
				(item: LocalRecord) =>
					item.sourceId === input.sourceId && item.sourceType === "material",
			);
			const next = {
				...allocation,
				sourceType: "material",
				sourceId: input.sourceId,
				positionId: input.split.parts[0].positionId,
				method: "manual",
				split: input.split,
			};
			if (index < 0) entries.push(next);
			else entries[index] = next;
		});
		return calculated;
	},
	updateDefaultConstructionForma2ContractPosition: (input: LocalRecord) => {
		saveLocal((draft) => {
			const position = draft.snapshot.forma2.data.clientCosts.positions.find(
				(position: LocalRecord) =>
					position.id === (input.positionId ?? input.id),
			);
			if (!position) throw new Error("Pozīcija nav atrasta.");
			Object.assign(position, input.fields ?? input);
		});
		return { success: true };
	},
	saveDefaultConstructionForma2Allocations: (input: LocalRecord) => {
		saveLocal((draft) => {
			for (const allocation of input.allocations) {
				const entries = draft.snapshot.forma2.data.clientCosts.allocations;
				const index = entries.findIndex(
					(entry: LocalRecord) =>
						entry.sourceId === allocation.sourceId &&
						entry.sourceType === allocation.sourceType,
				);
				if (index >= 0) entries[index] = allocation;
				else entries.push(allocation);
			}
		});
		return { success: true };
	},
	saveDefaultConstructionForma2Import: (input: LocalRecord) => {
		saveLocal((draft) => {
			const forma = draft.snapshot.forma2.data;
			forma.document = {
				id: crypto.randomUUID(),
				fileName: input.fileName,
				sheetName: input.sheetName,
				importedAt: new Date().toISOString(),
				positions: input.positions,
			};
			forma.clientCosts.positions = input.positions;
			forma.clientCosts.allocations = forma.clientCosts.allocations.filter(
				(item: LocalRecord) =>
					input.positions.some(
						(position: LocalRecord) => position.id === item.positionId,
					),
			);
		});
		return { positionCount: input.positions.length };
	},
	clearDefaultConstructionForma2Import: () => {
		saveLocal((draft) => {
			draft.snapshot.forma2.data.document = null;
			draft.snapshot.forma2.data.clientCosts.positions = [];
			draft.snapshot.forma2.data.clientCosts.allocations = [];
		});
		return { success: true };
	},
	getDefaultConstructionSiteDiaryOptions: () =>
		getDefaultConstructionOptionValues(getData().snapshot.config),
	getDefaultConstructionScopeSummary: (input: LocalRecord) =>
		buildDefaultConstructionScopeSummary({
			scope: input.scope,
			value: input.value ?? "project",
			rows: rows()
				.filter(
					(row) =>
						input.scope === "project" ||
						(input.scope === "location" ? row.Location : row.Works) ===
							input.value,
				)
				.map((row) => ({
					...row,
					Amounts: Number(row.Amounts),
					WorkersInvolved: Number(row.WorkersInvolved),
					TimeInvolved: Number(row.TimeInvolved),
				})) as any,
			productivitySettings: getDefaultConstructionOptionValues(
				getData().snapshot.config,
			).productivity.works,
			config: getData().snapshot.config,
		}),
	getConstructionDiaryFeedback: feedback,
	saveConstructionDiaryFeedback: (input: LocalRecord) => {
		const current = feedback();
		if (current.snapshot.revision !== input.expectedRevision)
			throw new Error("Norādījumi ir mainīti. Atveriet tos vēlreiz.");
		const next = {
			...current,
			snapshot: {
				...current.snapshot,
				revision: current.snapshot.revision + 1,
				userInstructions: input.userInstructions,
				updatedAt: new Date().toISOString(),
			},
			history: [
				...current.history,
				{ ...current.snapshot, createdAt: new Date().toISOString() },
			],
		};
		saveLocal((draft) => {
			draft.feedback = next;
		});
		return next;
	},
	loadConstructionWeek: (_siteId: string, date: string) => week(date),
	loadCurrentConstructionWeekReport: () => week(plannerToday()),
	loadConstructionDiaryPlans: () =>
		comparePlans(
			(getData().dailyPlans ?? []) as any,
			actualRows(),
			plannerToday(),
		).filter((row) => row.plan !== null),
	saveConstructionPlan: (input: unknown) => {
		const value = planSchema.parse(input);
		const id = value.id ?? crypto.randomUUID();
		const existing = getData().dailyPlans?.find((plan) => plan.id === id);
		const plan = { ...value, id, version: (existing?.version ?? 0) + 1 };
		saveLocal((draft) => {
			draft.dailyPlans = [
				...(draft.dailyPlans ?? []).filter((plan) => plan.id !== id),
				plan,
			];
		});
		return { ok: true, plan };
	},
	deleteConstructionPlan: (input: LocalRecord) => {
		saveLocal((draft) => {
			draft.dailyPlans = (draft.dailyPlans ?? []).filter(
				(plan) => plan.id !== input.id,
			);
		});
		return { ok: true };
	},
};
export async function invokeLocalAction(
	_module: string,
	name: string,
	args: any[],
): Promise<any> {
	const handler = handlers[name];
	if (!handler)
		throw new Error(
			"Šai darbībai nepieciešams savienojums ar ārējo pakalpojumu.",
		);
	return handler(...args);
}
