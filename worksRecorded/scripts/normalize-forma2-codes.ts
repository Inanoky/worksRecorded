import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { prepareForma2CodeRepair } from "../flows/default-construction/lib/forma2-code-repair";
import { planMatchKey } from "../flows/default-construction/planner/model";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const siteId = process.argv.find((arg) => arg.startsWith("--site="))?.slice(7);
const backupDir =
	process.argv.find((arg) => arg.startsWith("--backup-dir="))?.slice(13) ??
	`/tmp/forma2-code-repair-${new Date().toISOString().replace(/[:.]/g, "-")}`;

async function main() {
	const candidates = await prisma.analytics.findMany({
		where: siteId ? { siteId } : {},
		select: {
			id: true,
			siteId: true,
			currentWeekProgress: true,
			Site: { select: { name: true, siteDiaryRecordsMap: true } },
		},
	});
	let repairedSites = 0;
	for (const candidate of candidates) {
		if (!candidate.siteId || !candidate.Site || !candidate.currentWeekProgress)
			continue;
		const targetSiteId = candidate.siteId;
		const originalConfig = candidate.Site.siteDiaryRecordsMap;
		const repair = prepareForma2CodeRepair(
			candidate.currentWeekProgress,
			originalConfig,
		);
		if (!repair.changedPositions && !repair.workRenames.size) continue;
		const names = [...repair.workRenames.keys()];
		const [records, plans] = await Promise.all([
			prisma.sitediaryrecords.findMany({
				where: {
					siteId: targetSiteId,
					OR: [
						{ Works: { in: names } },
						{ Works_Custom_1: { in: names } },
						{ Works_Custom_2: { in: names } },
					],
				},
				select: {
					id: true,
					Works: true,
					Works_Custom_1: true,
					Works_Custom_2: true,
				},
			}),
			prisma.constructionPlan.findMany({
				where: { siteId: targetSiteId, work: { in: names } },
			}),
		]);
		const summary = {
			mode: apply ? "apply" : "preview",
			siteId: targetSiteId,
			siteName: candidate.Site.name,
			positions: repair.changedPositions,
			workNames: repair.workRenames.size,
			diaryRows: records.length,
			plans: plans.length,
		};
		if (!apply) {
			console.log(JSON.stringify(summary));
			continue;
		}
		await mkdir(backupDir, { recursive: true, mode: 0o700 });
		await writeFile(
			join(backupDir, `${targetSiteId}.json`),
			JSON.stringify({
				createdAt: new Date().toISOString(),
				candidate,
				records,
				plans,
				workRenames: [...repair.workRenames],
			}),
			{ flag: "wx", mode: 0o600 },
		);
		await prisma.$transaction(
			async (tx) => {
				const analyticsUpdate = await tx.analytics.updateMany({
					where: {
						id: candidate.id,
						currentWeekProgress: {
							equals: candidate.currentWeekProgress as Prisma.InputJsonValue,
						},
					},
					data: {
						currentWeekProgress: repair.analytics as Prisma.InputJsonValue,
					},
				});
				if (analyticsUpdate.count !== 1)
					throw new Error(`Forma 2 changed concurrently: ${targetSiteId}`);
				const configUpdate = await tx.site.updateMany({
					where: {
						id: targetSiteId,
						siteDiaryRecordsMap: {
							equals:
								originalConfig === null
									? Prisma.DbNull
									: (originalConfig as Prisma.InputJsonValue),
						},
					},
					data: {
						siteDiaryRecordsMap:
							repair.config === null
								? Prisma.DbNull
								: (repair.config as Prisma.InputJsonValue),
					},
				});
				if (configUpdate.count !== 1)
					throw new Error(
						`Site configuration changed concurrently: ${targetSiteId}`,
					);
				for (const record of records) {
					const rename = (work: string | null) =>
						work === null ? null : (repair.workRenames.get(work) ?? work);
					const update = await tx.sitediaryrecords.updateMany({
						where: { ...record, siteId: targetSiteId },
						data: {
							Works: rename(record.Works),
							Works_Custom_1: rename(record.Works_Custom_1),
							Works_Custom_2: rename(record.Works_Custom_2),
						},
					});
					if (update.count !== 1)
						throw new Error(`Diary row changed concurrently: ${record.id}`);
				}
				for (const plan of plans) {
					const work = repair.workRenames.get(plan.work) ?? plan.work;
					const update = await tx.constructionPlan.updateMany({
						where: { id: plan.id, version: plan.version, work: plan.work },
						data: {
							work,
							matchKey: planMatchKey(work, plan.location, plan.unit),
							version: { increment: 1 },
						},
					});
					if (update.count !== 1)
						throw new Error(`Plan changed concurrently: ${plan.id}`);
					const updatedPlan = await tx.constructionPlan.findUniqueOrThrow({
						where: { id: plan.id },
					});
					await tx.constructionPlanRevision.create({
						data: {
							planId: plan.id,
							version: updatedPlan.version,
							action: "forma2_code_normalized",
							actorId: "script:normalize-forma2-codes",
							snapshot: JSON.parse(
								JSON.stringify(updatedPlan),
							) as Prisma.InputJsonValue,
						},
					});
				}
			},
			{
				timeout: 30_000,
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			},
		);
		repairedSites++;
		console.log(
			JSON.stringify({
				...summary,
				backup: join(backupDir, `${targetSiteId}.json`),
			}),
		);
	}
	console.log(JSON.stringify({ repairedSites }));
}

main()
	.catch((error: unknown) => {
		console.error(
			error instanceof Prisma.PrismaClientKnownRequestError
				? `Database operation failed: ${error.code}`
				: error instanceof Error
					? error.message
					: "Forma 2 code repair failed",
		);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
