import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ZtcRecords } from "@prisma/client";
import { config } from "dotenv";
import { Client, types } from "pg";
import {
	buildZtcCanonicalCatalog,
	matchZtcCanonicalEntitiesFromCatalog,
} from "@/flows/ztc-production/backend/canonical-entity-matching";
import { matchZtcQualityWork } from "@/flows/ztc-production/backend/quality-work-matching";
import {
	findZtcDefaultRateForTask,
	type ZtcRateCategory,
} from "@/flows/ztc-production/lib/ztc-rate-matching";

async function main() {
	assert.equal(process.env.RUN_ZTC_MATCHING_AUDIT, "true");
	config({ quiet: true });
	const [siteId, projectName, output] = process.argv.slice(2);
	assert(
		siteId && projectName && output,
		"Required: siteId projectName outputDirectory",
	);
	assert(process.env.OPENAI_API_KEY && process.env.DIRECT_URL);
	const directory = resolve(output);
	mkdirSync(directory, { recursive: true });
	types.setTypeParser(1114, (value) => new Date(`${value}Z`));
	const client = new Client({ connectionString: process.env.DIRECT_URL });
	await client.connect();
	let snapshot: {
		checkedAt: string;
		siteId: string;
		projectName: string;
		configuration: unknown;
		projects: Array<{ Location: string | null }>;
		rows: Array<
			ZtcRecords & { workerName: string | null; workerSurname: string | null }
		>;
	};
	try {
		await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
		const configuration = (
			await client.query(
				'SELECT "siteDiaryRecordsMap" FROM public."ZtcSiteConfiguration" WHERE "siteId" = $1',
				[siteId],
			)
		).rows[0]?.siteDiaryRecordsMap;
		assert(configuration, "Site configuration missing");
		const rows = (
			await client.query<
				ZtcRecords & { workerName: string | null; workerSurname: string | null }
			>(
				'SELECT r.*, w.name AS "workerName", w.surname AS "workerSurname" FROM public."ZTCrecords" r LEFT JOIN public.workers w ON w.id = r."workerId" WHERE r."siteId"=$1 AND lower(trim(r."Location"))=lower(trim($2)) ORDER BY r."createdAt", r.id',
				[siteId, projectName],
			)
		).rows;
		const projects = (
			await client.query<{ Location: string | null }>(
				'SELECT DISTINCT "Location" FROM public."ZTCrecords" WHERE "siteId"=$1 AND "Location" IS NOT NULL',
				[siteId],
			)
		).rows;
		snapshot = {
			checkedAt: new Date().toISOString(),
			siteId,
			projectName,
			configuration,
			projects,
			rows,
		};
		await client.query("ROLLBACK");
	} finally {
		await client.end();
	}
	writeFileSync(
		resolve(directory, "snapshot.json"),
		JSON.stringify(snapshot, null, 2),
	);
	const decisions: Array<Record<string, unknown>> = [];
	for (const category of [
		"works",
		"additionalDetails",
		"additionalWorks",
	] as const) {
		const rows = snapshot.rows.filter((row) => {
			if (
				!row.Works ||
				row.Works === "Kvalitātes kontrole" ||
				row.Comments_Custom_1?.startsWith("__ZTC_CANCELLED")
			)
				return false;
			const rowCategory: ZtcRateCategory =
				row.Works_Custom_1 === "Papilddetāļas"
					? "additionalDetails"
					: row.Works_Custom_1 === "Papilddarbi" || row.Units === "st"
						? "additionalWorks"
						: "works";
			return rowCategory === category;
		});
		const labels = [
			...new Set(
				rows
					.map((row) => row.Works)
					.filter((value): value is string => Boolean(value)),
			),
		];
		const catalog = buildZtcCanonicalCatalog(
			snapshot.configuration,
			snapshot.projects,
			category,
		);
		const project = catalog.projects.find(
			(candidate) => candidate.name.toLowerCase() === projectName.toLowerCase(),
		);
		assert(project);
		const rates = catalog.works
			.filter(
				(candidate) =>
					!candidate.projectCandidateId ||
					candidate.projectCandidateId === project.id,
			)
			.map((candidate) => candidate.rate);
		for (let offset = 0; offset < labels.length; offset += 8) {
			const batch = labels.slice(offset, offset + 8);
			const result = await matchZtcCanonicalEntitiesFromCatalog(
				{ siteId, rawProjectName: projectName, rawWorks: batch, category },
				catalog,
			);
			for (const match of result.works) {
				for (const row of rows.filter((row) => row.Works === match.rawWork)) {
					decisions.push({
						id: row.id,
						date: row.Date,
						element: row.Location_Custom_1,
						worker: `${row.workerName ?? ""} ${row.workerSurname ?? ""}`.trim(),
						category,
						rawWork: match.rawWork,
						savedRate: row.Location_Custom_2,
						amount: row.Amounts,
						previousMatcher:
							findZtcDefaultRateForTask(match.rawWork, rates, { category })
								?.entry ?? null,
						proposed: match,
					});
				}
			}
			writeFileSync(
				resolve(directory, "rate-decisions.json"),
				JSON.stringify(decisions, null, 2),
			);
		}
	}
	const qaDecisions = [];
	for (const row of snapshot.rows.filter(
		(row) => row.Works === "Kvalitātes kontrole",
	)) {
		let metadata: { type?: string; checkedWork?: string; qualityText?: string };
		try {
			metadata = JSON.parse(row.Comments_Custom_2 ?? "{}");
		} catch {
			continue;
		}
		if (metadata.type !== "ztc_quality_check") continue;
		const source = row.Comments_Custom_1?.startsWith("__ZTC_QA_PENDING__")
			? row.Comments_Custom_1.slice("__ZTC_QA_PENDING__".length)
			: null;
		qaDecisions.push({
			id: row.id,
			element: row.Location_Custom_1,
			checkedWork: metadata.checkedWork,
			qualityText: metadata.qualityText,
			source,
		});
	}
	const panel7Drawing = snapshot.rows
		.filter(
			(row) =>
				row.Location_Custom_1 === "B1-2R1-7" &&
				row.Comments_Custom_2?.includes("ztc_drawing_context"),
		)
		.sort(
			(left, right) =>
				JSON.parse(right.Comments_Custom_2 ?? "{}").elements[0].works.length -
				JSON.parse(left.Comments_Custom_2 ?? "{}").elements[0].works.length,
		)[0];
	const drawing = panel7Drawing
		? JSON.parse(panel7Drawing.Comments_Custom_2 ?? "{}")
		: null;
	const works =
		drawing?.elements?.[0]?.works?.map((work: { name: string }) => work.name) ??
		[];
	const qaRegression = [];
	for (const text of [
		"Vertikālā latojuma 45 mm kontrole",
		"Vartikālasi latojums 45mm",
		"Horizontālā latojuma 32 mm kontrole",
		"Iekšējā latojuma kontrole",
		"Paneļa kvalitāte atbilst prasībām, viss darbs pieņemts",
		"Nenosaukta īpaša darba pārbaude",
	]) {
		qaRegression.push({
			text,
			works,
			result: await matchZtcQualityWork(text, works),
		});
	}
	const summary = {
		checkedAt: snapshot.checkedAt,
		totalH13Rows: snapshot.rows.length,
		productionRowsCompared: decisions.length,
		uniqueLabels: new Set(
			decisions.map((row) => `${row.category}:${row.rawWork}`),
		).size,
		assigned: decisions.filter(
			(row) => (row.proposed as { rate: unknown }).rate,
		).length,
		unassigned: decisions.filter(
			(row) => !(row.proposed as { rate: unknown }).rate,
		).length,
		missingSavedRateNowMatched: decisions.filter(
			(row) => !row.savedRate && (row.proposed as { rate: unknown }).rate,
		).length,
		existingRateDifferences: decisions.filter(
			(row) =>
				row.savedRate &&
				(row.proposed as { rate: { rate: string } | null }).rate &&
				Number(row.savedRate) !==
					Number((row.proposed as { rate: { rate: string } }).rate.rate),
		),
		qaDecisions,
		qaRegression,
	};
	writeFileSync(
		resolve(directory, "summary.json"),
		JSON.stringify(summary, null, 2),
	);
	console.log(
		JSON.stringify(
			{
				...summary,
				qaDecisions: qaDecisions.length,
				qaRegression: qaRegression.map(({ text, result }) => ({
					text,
					result,
				})),
			},
			null,
			2,
		),
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : "Audit failed");
	process.exitCode = 1;
});
