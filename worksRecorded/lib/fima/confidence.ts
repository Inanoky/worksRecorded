export type FimaConfidence = {
	level: 100 | 90 | 80 | 50;
	basis: string;
};

function object(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function readFimaConfidence(
	metadata: unknown,
): FimaConfidence | undefined {
	const root = object(metadata);
	const links = object(root.kuceImport).bisLinks;
	if (
		Array.isArray(links) &&
		links.some((raw) => {
			const link = object(raw);
			return link.status === "approved" && /^\d+$/.test(String(link.id));
		})
	) {
		return {
			level: 100,
			basis: "Ierakstam ir piesaistīts apstiprināts BIS ieraksts.",
		};
	}
	const review = object(object(root.fimaCompletionReview20261022).review);
	if (review.outcome !== "UPDATE" && review.outcome !== "UNCHANGED")
		return undefined;
	const reference = object(review.reference);
	const approvedExample =
		typeof reference.key === "string" &&
		/^\d+\/\d+$/.test(reference.key) &&
		typeof reference.updatedAt === "string";
	if (
		approvedExample &&
		(review.tier === "TOR_EXACT" || review.tier === "OLA_EXACT")
	) {
		return {
			level: 100,
			basis: "Precīza darba apraksta atbilstība apstiprinātam BIS paraugam.",
		};
	}
	if (approvedExample && review.tier === "DRAWING_VALIDATED_EQUIVALENT") {
		return {
			level: 90,
			basis: "Tuvs apstiprināts BIS paraugs ar rasējumos pārbaudītu kontekstu.",
		};
	}
	if (
		review.locationComplete === true &&
		((review.tier === "DRAWING_ONLY" &&
			Array.isArray(review.drawingEvidence) &&
			review.drawingEvidence.length > 0) ||
			review.description === "DRAWING_LOCATION_AND_LITERAL_OPERATION_DRAFT")
	) {
		return {
			level: 80,
			basis:
				"Priekšlikums pamatots ar rasējumiem; precīza apstiprināta BIS parauga nav.",
		};
	}
	if (
		review.description === "EXISTING_PRESERVED" ||
		review.materials === "EXISTING_PROPOSALS_PRESERVED"
	) {
		return {
			level: 50,
			basis:
				"Aptuvens priekšlikums bez pārbaudīta atbilstoša BIS parauga vai pietiekama pamatojuma rasējumos.",
		};
	}
	return undefined;
}
