import { z } from "zod";
import fixture from "@/test/fixtures/ai-evals/ocelt-reviewed-diary.json";

const dateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const measured = z.number().finite().nonnegative().nullable();
const expectedRecord = z.object({
	id: z.string().min(1),
	dateISO,
	work: z.string().min(1),
	location: z.string().nullable(),
	commentSignals: z.array(z.string()),
	reviewedComment: z.string().nullable(),
	amount: measured,
	unit: z.string().nullable(),
	workers: measured,
	hours: measured,
	forma2PositionId: z.string().min(1).nullable(),
	checkLocation: z.boolean().optional(),
	locationAlternatives: z.array(z.string().nullable()).optional(),
	quantityAlternatives: z
		.array(z.object({ amount: measured, unit: z.string().nullable() }))
		.optional(),
	provenance: z.object({
		recordFingerprint: z.string().length(64),
		assignmentBasis: z.enum([
			"stored-allocation",
			"journal-work-selection",
			"not-assigned",
		]),
	}),
});
export const ReviewedDiaryCaseSchema = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/),
	intent: z.string().min(1),
	tags: z.array(z.string()),
	tier: z.enum(["smoke", "regression", "extended"]),
	priority: z.enum(["critical", "standard", "extended"]),
	receivedDateISO: dateISO,
	sourceText: z.string().min(1),
	sourceFingerprint: z.string().length(64),
	sourceKind: z
		.enum(["full-message", "source-fragment"])
		.default("full-message"),
	sourceTextFingerprint: z.string().length(64).optional(),
	inputFingerprint: z.string().length(64).optional(),
	expectedRecords: z.array(expectedRecord).min(1),
});
export const ReviewedDiaryCorpusSchema = z
	.object({
		version: z.literal(1),
		provenance: z.object({
			organization: z.string(),
			project: z.string(),
			periodStart: dateISO,
			periodEnd: dateISO,
			snapshotDate: dateISO,
			sourcePeriodStart: dateISO.optional(),
			sourcePeriodEnd: dateISO.optional(),
			sourceSiteFingerprint: z.string().length(64),
			reviewBasis: z.string(),
			redactions: z.array(z.string()),
		}),
		project: z.object({
			key: z
				.string()
				.regex(/^[a-z0-9-]+$/)
				.default("ocelt"),
			language: z.enum(["lv", "en", "ru"]).default("lv"),
			documentId: z.string(),
			config: z.record(z.unknown()),
			positions: z.array(
				z.object({
					id: z.string(),
					code: z.string(),
					name: z.string(),
					categoryName: z.string(),
					categoryCode: z.string(),
					kind: z.enum(["work", "material"]),
					parentId: z.string().nullable(),
					sourceRow: z.number(),
					unit: z.string(),
					manualAssignmentOnly: z.boolean().optional(),
				}),
			),
		}),
		cases: z.array(ReviewedDiaryCaseSchema).min(1),
		referenceCandidates: z
			.array(
				z.object({
					id: z.string(),
					sourceText: z.string(),
					receivedDateISO: dateISO,
					sourceFingerprint: z.string().length(64),
					issues: z.array(z.string()).min(1),
					expectedRecords: z.array(expectedRecord),
				}),
			)
			.default([]),
	})
	.superRefine((corpus, ctx) => {
		const ids = new Set<string>();
		const fingerprints = new Set<string>();
		const positionIds = new Set(
			corpus.project.positions.map((position) => position.id),
		);
		for (const [index, evalCase] of corpus.cases.entries()) {
			if (ids.has(evalCase.id) || fingerprints.has(evalCase.sourceFingerprint))
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["cases", index],
					message: "Duplicate case or source batch",
				});
			ids.add(evalCase.id);
			fingerprints.add(evalCase.sourceFingerprint);
			const rowIds = new Set<string>();
			for (const [rowIndex, row] of evalCase.expectedRecords.entries()) {
				if (
					(row.forma2PositionId !== null &&
						!positionIds.has(row.forma2PositionId)) ||
					rowIds.has(row.id)
				)
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["cases", index, "expectedRecords", rowIndex],
						message: "Unknown Forma2 position or duplicate expected row",
					});
				rowIds.add(row.id);
				if (
					row.dateISO < corpus.provenance.periodStart ||
					row.dateISO > corpus.provenance.periodEnd
				)
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["cases", index, "expectedRecords", rowIndex, "dateISO"],
						message: "Expected date outside reviewed period",
					});
			}
		}
	});
export type ReviewedDiaryCase = z.infer<typeof ReviewedDiaryCaseSchema>;
export type ReviewedDiaryCorpus = z.infer<typeof ReviewedDiaryCorpusSchema>;
export type FrozenDiaryProject = ReviewedDiaryCorpus["project"];
export type DiaryExtractionEvalCase = Omit<
	ReviewedDiaryCase,
	"sourceFingerprint" | "sourceKind" | "expectedRecords"
> & {
	sourceKind?: ReviewedDiaryCase["sourceKind"];
	expectedRecords: Array<
		Omit<
			ReviewedDiaryCase["expectedRecords"][number],
			"provenance" | "forma2PositionId"
		> & {
			forma2PositionId: string | null;
			workAlternatives?: string[];
			reviewRequired?: boolean;
			quantityAlternatives?: Array<{
				amount: number | null;
				unit: string | null;
			}>;
		}
	>;
};
export const reviewedDiaryCorpus = ReviewedDiaryCorpusSchema.parse(fixture);
export const reviewedDiaryCases = reviewedDiaryCorpus.cases;
