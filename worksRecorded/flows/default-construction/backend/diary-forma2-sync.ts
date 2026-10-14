import type { Prisma } from "@prisma/client";
import {
	DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY,
	normalizeDefaultConstructionForma2State,
	suggestForma2Position,
} from "../lib/forma2-analytics";

export async function syncDiaryEditAssignments(
	db: Prisma.TransactionClient,
	siteId: string,
	records: { id: string; work: string | null | undefined }[],
) {
	if (!records.length) return;
	const analytics = await db.analytics.findUnique({
		where: { siteId },
		select: { currentWeekProgress: true },
	});
	const root = analytics?.currentWeekProgress;
	if (!root || typeof root !== "object" || Array.isArray(root)) return;
	const state = normalizeDefaultConstructionForma2State(
		root[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY],
	);
	const positions = state.document?.positions;
	if (!positions?.length) return;
	const protectedIds = new Set(
		state.allocations
			.filter((item) => item.sourceType === "work" && item.split)
			.map((item) => item.sourceId),
	);
	const changes = records.filter((record) => !protectedIds.has(record.id));
	if (!changes.length) return;
	const changedIds = new Set(changes.map((record) => record.id));
	const allocations = state.allocations.filter(
		(item) => item.sourceType !== "work" || !changedIds.has(item.sourceId),
	);
	for (const record of changes) {
		const suggestion = suggestForma2Position(
			{
				id: record.id,
				type: "work",
				label: record.work ?? "",
				secondaryLabel: "",
				date: null,
				unit: "",
				quantity: null,
				hours: null,
				actualCost: null,
			},
			positions,
		);
		if (suggestion && suggestion.confidence >= 0.9)
			allocations.push({
				sourceType: "work",
				sourceId: record.id,
				positionId: suggestion.positionId,
				method: "manual",
				confidence: suggestion.confidence,
				assignedAt: new Date().toISOString(),
			});
	}
	const updated = await db.analytics.updateMany({
		where: {
			siteId,
			currentWeekProgress: { equals: root as Prisma.InputJsonObject },
		},
		data: {
			currentWeekProgress: {
				...root,
				[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY]: { ...state, allocations },
			} as Prisma.InputJsonObject,
		},
	});
	if (updated.count !== 1)
		throw new Error("Forma 2 dati ir mainīti. Mēģiniet saglabāt vēlreiz.");
}
