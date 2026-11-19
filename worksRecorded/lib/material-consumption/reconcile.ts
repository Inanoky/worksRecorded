import { z } from "zod";
import {
	type ConsumptionProject,
	type MaterialObservation,
	materialObservationSchema,
} from "./model";
import { materialRecordsFingerprint, materialReviewSchema } from "./store";

export const materialCorrectionSchema = z.object({
	id: z.string().min(1),
	expectedFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
	changes: materialObservationSchema
		.pick({
			siteId: true,
			date: true,
			status: true,
			reason: true,
			originalText: true,
		})
		.partial()
		.strict(),
});

export function reconcileMaterialReview(args: {
	review: z.infer<typeof materialReviewSchema>;
	entries: MaterialObservation[];
	projects: ConsumptionProject[];
	corrections: z.infer<typeof materialCorrectionSchema>[];
	reviewedAt: string;
}) {
	const review = materialReviewSchema.parse(args.review);
	const corrections = z
		.array(materialCorrectionSchema)
		.min(1)
		.parse(args.corrections);
	if (new Set(corrections.map((item) => item.id)).size !== corrections.length)
		throw new Error("Repeated material correction ID");
	const current = new Map(args.entries.map((entry) => [entry.id, entry]));
	const observations = new Map(
		review.observations.map((entry) => [entry.id, entry]),
	);
	const projects = new Set(args.projects.map((project) => project.id));
	for (const correction of corrections) {
		const entry = current.get(correction.id);
		if (
			!entry ||
			materialRecordsFingerprint([entry]) !== correction.expectedFingerprint
		)
			throw new Error(`Material observation changed: ${correction.id}`);
		if (correction.changes.siteId && !projects.has(correction.changes.siteId))
			throw new Error("Material correction project is outside the register");
		for (const sibling of args.entries.filter(
			(item) =>
				item.siteId === entry.siteId && item.sourceKey === entry.sourceKey,
		))
			if (!observations.has(sibling.id))
				observations.set(sibling.id, { ...sibling, basis: "reviewed" });
	}
	for (const correction of corrections) {
		const entry = current.get(correction.id);
		if (!entry) throw new Error("Material observation is missing");
		const corrected = materialObservationSchema.parse({
			...entry,
			...correction.changes,
			basis: "reviewed",
		});
		if (corrected.status === "needs_review" && !corrected.reason?.trim())
			throw new Error(
				"Unresolved material observations require a review reason",
			);
		observations.set(corrected.id, corrected);
	}
	return materialReviewSchema.parse({
		...review,
		reviewedAt: args.reviewedAt,
		observations: [...observations.values()],
	});
}
