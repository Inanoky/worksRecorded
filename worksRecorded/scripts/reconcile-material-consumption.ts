import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { buildMaterialConsumption } from "@/lib/material-consumption/extract";
import {
	MATERIAL_CONSUMPTION_DOCUMENT_TYPE,
	summarizeMaterialConsumption,
} from "@/lib/material-consumption/model";
import {
	materialCorrectionSchema,
	reconcileMaterialReview,
} from "@/lib/material-consumption/reconcile";
import {
	materialRecordsFingerprint,
	materialReviewSchema,
	materialSourceSelect,
	readMaterialConsumption,
	saveReviewedMaterialConsumption,
} from "@/lib/material-consumption/store";
import { prisma } from "@/lib/utils/db";

function argument(name: string) {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

const planSchema = z
	.object({
		organizationId: z.string().min(1),
		userId: z.string().min(1),
		expectedReviewDocumentId: z.string().min(1),
		expectedFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
		reviewedAt: z.string().datetime(),
		corrections: z.array(materialCorrectionSchema).min(1),
	})
	.strict();

async function main() {
	const planPath = argument("--plan");
	const outputPath = argument("--out");
	if (!planPath || !outputPath)
		throw new Error(
			"Usage: node --import tsx scripts/reconcile-material-consumption.ts --plan <reviewed-plan.json> --out <result.json> [--apply]",
		);
	const plan = planSchema.parse(JSON.parse(await readFile(planPath, "utf8")));
	const [data, records, document] = await Promise.all([
		readMaterialConsumption(plan.organizationId),
		prisma.sitediaryrecords.findMany({
			where: {
				organizationId: plan.organizationId,
				Site: { organizationId: plan.organizationId },
			},
			select: materialSourceSelect,
		}),
		prisma.documents.findFirst({
			where: {
				organizationId: plan.organizationId,
				siteId: null,
				documentType: MATERIAL_CONSUMPTION_DOCUMENT_TYPE,
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			select: { id: true, description: true },
		}),
	]);
	if (!document || document.id !== plan.expectedReviewDocumentId)
		throw new Error("Material review changed; prepare a fresh correction plan");
	if (materialRecordsFingerprint(records) !== plan.expectedFingerprint)
		throw new Error("Journal changed; prepare a fresh correction plan");
	const review = reconcileMaterialReview({
		review: materialReviewSchema.parse(JSON.parse(document.description)),
		entries: data.entries,
		projects: data.projects,
		corrections: plan.corrections,
		reviewedAt: plan.reviewedAt,
	});
	const entries = buildMaterialConsumption({
		records,
		projects: data.projects,
		reviewed: review.observations,
	});
	const totals = summarizeMaterialConsumption(data.projects, entries);
	const summary = {
		corrections: plan.corrections.length,
		thermowhiteBags: totals.reduce(
			(sum, project) => sum + project.thermowhiteBags,
			0,
		),
		cementBags: totals.reduce((sum, project) => sum + project.cementBags, 0),
		reviewEntries: entries.filter((entry) => entry.status === "needs_review")
			.length,
	};
	const result = {
		mode: process.argv.includes("--apply") ? "apply" : "preview",
		summary,
		review,
		entries,
	};
	await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
	await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
	if (process.argv.includes("--apply")) {
		const saved = await saveReviewedMaterialConsumption({
			userId: plan.userId,
			review,
			expectedFingerprint: plan.expectedFingerprint,
			expectedReviewDocumentId: plan.expectedReviewDocumentId,
		});
		await writeFile(
			outputPath,
			`${JSON.stringify({ ...result, saved }, null, 2)}\n`,
		);
		console.log(JSON.stringify({ ...summary, ...saved }));
	} else console.log(JSON.stringify(summary));
}

main()
	.catch((error: unknown) => {
		console.error(
			error instanceof Error ? error.message : "Material correction failed",
		);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
