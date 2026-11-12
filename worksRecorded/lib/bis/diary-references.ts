export type BisDiaryReference = { id: string; label: string };
export type BisDiaryReferences = {
	scope: string;
	drawings: BisDiaryReference[];
	estimates: BisDiaryReference[];
};

export function bisNumericId(value: string): number {
	if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
		throw new Error("Nederīgs BIS identifikators.");
	return Number(value);
}

export function performedWorkReferences(
	references: BisDiaryReferences,
	selection: {
		projectDocumentIds?: string[];
		estimatePositionId?: string | null;
	},
) {
	const ids = [...new Set(selection.projectDocumentIds ?? [])];
	for (const id of ids) {
		bisNumericId(id);
		if (!references.drawings.some((drawing) => drawing.id === id))
			throw new Error(
				"Rasējums nav pieejams šajā BIS lietā. Atjaunojiet BIS sarakstus.",
			);
	}
	const estimateId = selection.estimatePositionId;
	if (
		estimateId &&
		!references.estimates.some((estimate) => estimate.id === estimateId)
	)
		throw new Error(
			"Tāmes pozīcija nav pieejama šajā BIS kārtā. Atjaunojiet BIS sarakstus.",
		);
	return {
		attributes: ids.length
			? { project_document_ids: ids.map(bisNumericId) }
			: {},
		relationships: estimateId
			? {
					estimate_positions: {
						data: [{ type: "estimate_position", id: bisNumericId(estimateId) }],
					},
				}
			: {},
	};
}
