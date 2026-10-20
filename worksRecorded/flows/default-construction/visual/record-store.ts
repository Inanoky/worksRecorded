import { prisma } from "@/lib/utils/db";
import {
	VISUAL_DOCUMENT_TYPE,
	VISUAL_LEASE_MS,
	VISUAL_MAX_PAGES,
	VISUAL_MAX_PHOTOS,
	type VisualDrawing,
	visualImageProgress,
	visualStateSchema,
	workLayer,
} from "./model";
import { visualRecordInputSchema } from "./record-model";
import { requireVisualAccess } from "./store";

export class VisualRecordError extends Error {}

export async function createVisualRecord(
	userId: string,
	siteId: string,
	drawingId: string,
	input: unknown,
) {
	const record = visualRecordInputSchema.parse(input);
	const access = await requireVisualAccess(userId, siteId);
	const date = new Date(`${record.date}T00:00:00.000Z`);
	const result = await prisma.$transaction(
		async (tx) => {
			const row = await tx.documents.findFirst({
				where: {
					id: drawingId,
					siteId,
					organizationId: access.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
				},
			});
			if (!row)
				throw new VisualRecordError("Rasējums nav atrasts vai nav pieejams.");
			const state = visualStateSchema.parse(JSON.parse(row.description));
			if (state.lockedAt && Date.now() - state.lockedAt < VISUAL_LEASE_MS)
				throw new VisualRecordError(
					"Uzgaidiet, līdz rasējuma analīze ir pabeigta.",
				);
			if (
				record.areas.some(
					(area) => area.page > (state.pageCount ?? VISUAL_MAX_PAGES),
				)
			)
				throw new VisualRecordError("Zona atrodas ārpus rasējuma lapām.");
			const evidenceId = `${record.id}:manual`;
			const markId = `${evidenceId}:0`;
			const existing = await tx.sitediaryrecords.findUnique({
				where: { id: record.id },
			});
			if (existing) {
				const marks = state.marks.filter(
					(mark) => mark.evidenceId === evidenceId,
				);
				if (
					existing.userId !== userId ||
					existing.siteId !== siteId ||
					existing.organizationId !== access.organizationId ||
					existing.archivedAt ||
					existing.Works !== record.work ||
					existing.Location !== state.location ||
					existing.Date?.toISOString() !== date.toISOString() ||
					existing.Amounts !== record.quantity ||
					existing.Units !== record.unit ||
					existing.Comments !== record.comments ||
					!state.evidence.some(
						(source) => source.id === evidenceId && source.manual,
					) ||
					JSON.stringify(
						marks.map(({ page, polygon }) => ({ page, polygon })),
					) !==
						JSON.stringify(
							record.areas.map(({ page, polygon }) => ({ page, polygon })),
						)
				)
					throw new VisualRecordError(
						"Ieraksts jau ir saglabāts un mainīts. Atjaunojiet skatu pirms atkārtotas saglabāšanas.",
					);
			} else {
				if (state.evidence.length >= VISUAL_MAX_PHOTOS)
					throw new VisualRecordError(
						"Šajā rasējumā sasniegts avotu skaita ierobežojums.",
					);
				await tx.sitediaryrecords.create({
					data: {
						id: record.id,
						siteId,
						organizationId: access.organizationId,
						userId,
						Date: date,
						Location: state.location,
						Works: record.work,
						Amounts: record.quantity,
						Units: record.unit,
						Comments: record.comments,
						Photos: [],
					},
				});
				const progress = visualImageProgress(state);
				state.evidence.push({
					id: evidenceId,
					recordId: record.id,
					manual: true,
					photoUrl: "",
					work: record.work,
					location: state.location,
					description: record.comments,
					date: date.toISOString(),
					amount: record.quantity,
					unit: record.unit,
				});
				const now = new Date().toISOString();
				state.marks.push(
					...record.areas.map((area, index) => ({
						id: `${evidenceId}:${index}`,
						evidenceId,
						layer: workLayer(record.work),
						page: area.page,
						polygon: area.polygon,
						confidence: 1,
						anchors: ["Manuāli norādīta zona", state.location],
						explanation: "Lietotāja norādīta izpildītā darba zona.",
						editedAt: now,
						editedBy: userId,
					})),
				);
				state.imageProgress = [
					...progress,
					{ evidenceId, status: "complete", error: null },
				];
				state.processed = state.imageProgress.filter(
					(item) => item.status === "complete",
				).length;
				if (state.processed === state.evidence.length) {
					state.status = "complete";
					state.error = null;
				}
				const saved = await tx.documents.updateMany({
					where: {
						id: drawingId,
						siteId,
						organizationId: access.organizationId,
						documentType: VISUAL_DOCUMENT_TYPE,
						description: row.description,
					},
					data: { description: JSON.stringify(visualStateSchema.parse(state)) },
				});
				if (saved.count !== 1)
					throw new VisualRecordError(
						"Rasējums jau ir mainīts. Mēģiniet saglabāt vēlreiz.",
					);
			}
			const drawing: VisualDrawing = {
				id: row.id,
				name: row.documentName,
				createdAt: row.createdAt.toISOString(),
				state,
			};
			return { drawing, markId };
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
			records: [{ id: record.id, work: record.work }],
		});
	} catch {
		assignmentWarning =
			"Ieraksts saglabāts. Pārbaudiet darba piesaisti Forma 2 skatā.";
	}
	return { ...result, assignmentWarning };
}
