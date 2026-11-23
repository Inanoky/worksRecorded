import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderEvalReportHtml } from "@/lib/ai-evals/html-report";
import { normalizeEvalReport } from "@/lib/ai-evals/report-loader";
import {
	formatEvalSelectionSummary,
	selectEvalCases,
} from "./eval-case-selection";
import {
	oceltScenarioCases,
	oceltScenarioProvenance,
} from "./ocelt-scenario-cases";
import {
	productionDiaryCases,
	productionDiaryEnvironment,
	productionDiaryProvenance,
} from "./production-diary-cases";
import { selectProjectDiaryCorpora } from "./project-diary-corpora";
import {
	type DiaryExtractionEvalCase,
	reviewedDiaryCases,
	reviewedDiaryCorpus,
} from "./reviewed-diary-cases";
import {
	assertReviewedDiaryEnvironment,
	configureReviewedDiaryTracing,
	getReviewedDiaryModelSettings,
} from "./reviewed-diary-environment";
import { validateReviewedDiaryCase } from "./reviewed-diary-validators";

type DiaryValidation = ReturnType<typeof validateReviewedDiaryCase>;
type DiaryRunResult = {
	caseId: string;
	projectKey: string;
	latencyMs: number;
	langsmithRunId: string | null;
	langsmithUrl: string | null;
	langsmithError: string | null;
	requestedModel?: string | null;
	actualModel?: string | null;
	deterministic: Pick<DiaryValidation, "status" | "results"> &
		Partial<Omit<DiaryValidation, "status" | "results">>;
	[key: string]: unknown;
};

async function main() {
	const productionReplay = process.argv.includes("--production-replay");
	const oceltScenarios = process.argv.includes("--ocelt-scenarios");
	const ocelt = process.argv.includes("--ocelt");
	const projects = selectProjectDiaryCorpora(process.argv);
	if (
		[productionReplay, oceltScenarios, ocelt, projects].filter(Boolean).length >
		1
	)
		throw new Error(
			"Choose only one of --production-replay, --ocelt-scenarios, --ocelt or --project.",
		);
	const cases: DiaryExtractionEvalCase[] = projects
		? projects.flatMap((corpus) => corpus.cases)
		: ocelt
			? [
					...reviewedDiaryCases.filter((evalCase) =>
						evalCase.tags.includes("ocelt"),
					),
					...oceltScenarioCases,
				]
			: oceltScenarios
				? oceltScenarioCases
				: productionReplay
					? productionDiaryCases
					: reviewedDiaryCases;
	const selection = selectEvalCases({ cases });
	console.log(
		projects
			? `Projektu oriģinālo ziņu kvalitātes etalons: ${projects.map((corpus) => corpus.project.key).join(", ")}`
			: ocelt
				? "Ocelt: pārskatītie piemēri un jaunie vairāku darbu scenāriji:"
				: oceltScenarios
					? "Ocelt jaunie vairāku darbu scenāriji:"
					: productionReplay
						? "Produkcijas dienasgrāmatas plūsmas regresiju kopa:"
						: "Pārskatīto dienasgrāmatas ierakstu/Forma2 eval kopa:",
	);
	for (const line of formatEvalSelectionSummary(selection)) console.log(line);
	if (process.argv.includes("--dry-run") || process.argv.includes("--list")) {
		for (const evalCase of selection.selectedCases)
			console.log(
				`${evalCase.id}: ${evalCase.expectedRecords.length} sagaidāmie ieraksti; ${evalCase.sourceText.slice(0, 100)}`,
			);
		return;
	}
	const { siteId, userId } = assertReviewedDiaryEnvironment();
	const modelSettings = getReviewedDiaryModelSettings();
	const checkerSettings = getReviewedDiaryModelSettings("checker");
	console.log(
		`Extractor model: ${modelSettings.model ?? "default"}; reasoning: ${modelSettings.reasoningEffort ?? "medium"}`,
	);
	console.log(
		`Checker model: ${checkerSettings.model ?? "default"}; reasoning: ${checkerSettings.reasoningEffort ?? "medium"}`,
	);
	const tracing = configureReviewedDiaryTracing();
	const langsmith = tracing.enabled ? await import("langsmith") : null;
	const traceable = tracing.enabled
		? (await import("langsmith/traceable")).traceable
		: null;
	const tracingClient = langsmith ? new langsmith.Client() : null;
	const awaitCallbacks = tracing.enabled
		? (await import("@langchain/core/callbacks/promises")).awaitAllCallbacks
		: null;
	console.log(
		`LangSmith tracing: ${tracing.enabled ? tracing.project : "disabled (use --trace)"}`,
	);
	const { executeReviewedDiaryCase } = await import(
		"./reviewed-diary-execution"
	);
	const projectLabel = projects
		? projects.length === 1
			? projects[0].project.key
			: "all"
		: null;
	const runId = `${projects ? `projects-${projectLabel}` : ocelt ? "ocelt" : oceltScenarios ? "ocelt-scenarios" : productionReplay ? "production" : "reviewed"}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
	const startedAt = new Date().toISOString();
	const results: DiaryRunResult[] = [];
	for (const evalCase of selection.selectedCases) {
		const corpus = projects?.find((candidate) =>
			candidate.cases.some((item) => item.id === evalCase.id),
		);
		const projectKey = corpus?.project.key ?? "ocelt";
		const isOceltScenario = oceltScenarioCases.some(
			(scenario) => scenario.id === evalCase.id,
		);
		const matchForma2 = !(projects || productionReplay || isOceltScenario);
		const started = Date.now();
		const langsmithRunId = langsmith?.uuid7() ?? null;
		try {
			const execute = async (_input: {
				sourceText: string;
				receivedDateISO: string;
			}) => {
				const result = await executeReviewedDiaryCase(evalCase, {
					siteId: projects ? `eval:diary-project:${projectKey}` : siteId,
					userId: projects ? `eval:diary-project:${projectKey}:user` : userId,
					...(corpus ? { project: corpus.project } : {}),
					runId,
					trace: tracing.enabled,
					matchForma2,
					...(productionReplay
						? {
								environment: productionDiaryEnvironment(evalCase),
								matchForma2: false,
							}
						: {}),
				});
				const deterministic = validateReviewedDiaryCase(
					evalCase,
					result.rows,
					corpus?.project.positions ?? reviewedDiaryCorpus.project.positions,
				);
				if (!result.extractionSucceeded) {
					deterministic.results.push({
						name: "extraction-succeeded",
						status: "fail",
						severity: "critical",
						message: String(
							result.steps?.findLast((step) => step.phase === "failure")
								?.reason ??
								result.extractionMessage ??
								"Extractor/checker neatgrieza droši saglabājamu rezultātu.",
						),
					});
					deterministic.status = "fail";
					deterministic.criticalFailures += 1;
				}
				return {
					caseId: evalCase.id,
					projectKey,
					sourceKind:
						evalCase.sourceKind ??
						(isOceltScenario ? "derived-scenario" : "production-replay"),
					corpusKind: projects
						? "project-reference"
						: isOceltScenario
							? "derived-scenario"
							: productionReplay
								? "production-replay"
								: "reviewed",
					forma2AssignmentMode: matchForma2
						? "automatic-assignment"
						: "configured-works-only",
					turnIndex: 0,
					inputPreview: evalCase.sourceText,
					answer: JSON.stringify(result.rows),
					createdRecordIds: [],
					actualModel:
						result.metrics.modelCalls[0] &&
						"actualModel" in result.metrics.modelCalls[0]
							? result.metrics.modelCalls[0].actualModel
							: null,
					requestedModel: result.metrics.modelCalls[0]?.model ?? null,
					latencyMs: Date.now() - started,
					deterministic,
					...result.metrics,
					structuredSaveTrace: [
						{
							rawRecords: result.rawRows,
							mappedRows: result.rows,
							expectedRecords: evalCase.expectedRecords,
							persistedRecords: [],
							stages: result.steps ?? [],
						},
					],
				};
			};
			const result =
				traceable && tracingClient && langsmithRunId
					? await traceable(execute, {
							id: langsmithRunId,
							name: `DiaryReviewedEval: ${evalCase.id}`,
							project_name: tracing.project ?? undefined,
							client: tracingClient,
							tags: ["ai-eval", "diary-reviewed", ...evalCase.tags],
							metadata: {
								evalRunId: runId,
								evalCaseId: evalCase.id,
								flow: "diary-reviewed",
								projectKey,
								databaseWrites: false,
							},
						})({
							sourceText: evalCase.sourceText,
							receivedDateISO: evalCase.receivedDateISO,
						})
					: await execute({
							sourceText: evalCase.sourceText,
							receivedDateISO: evalCase.receivedDateISO,
						});
			results.push({
				...result,
				langsmithRunId,
				langsmithUrl: null as string | null,
				langsmithError: null as string | null,
			});
			console.log(
				`[${result.deterministic.status.toUpperCase()}] ${evalCase.id}`,
			);
		} catch (error) {
			results.push({
				caseId: evalCase.id,
				projectKey,
				turnIndex: 0,
				inputPreview: evalCase.sourceText,
				answer: "",
				latencyMs: Date.now() - started,
				langsmithRunId,
				langsmithUrl: null as string | null,
				langsmithError: null as string | null,
				structuredSaveTrace: [
					{
						expectedRecords: evalCase.expectedRecords,
						mappedRows: [],
						persistedRecords: [],
					},
				],
				deterministic: {
					status: "fail",
					results: [
						{
							name: "execution",
							status: "fail",
							severity: "critical",
							message:
								error instanceof Error ? error.message : "Execution failed",
						},
					],
				},
			});
			console.log(`[FAIL] ${evalCase.id}`);
		}
		if (tracingClient && langsmithRunId) {
			const result = results[results.length - 1];
			try {
				await awaitCallbacks?.();
				await tracingClient.awaitPendingTraceBatches();
				result.langsmithUrl = await tracingClient.getRunUrl({
					runId: langsmithRunId,
				});
				console.log(`LangSmith: ${result.langsmithUrl}`);
			} catch (error) {
				result.langsmithError =
					error instanceof Error ? error.message : "Trace upload failed";
				console.error(
					`LangSmith trace unavailable for ${evalCase.id}: ${result.langsmithError}`,
				);
			}
		}
	}
	const failures = results.filter(
		(result) => result.deterministic.status === "fail",
	).length;
	const totalMs = results.reduce((sum, result) => sum + result.latencyMs, 0);
	const report = {
		runId,
		flow: "diary-reviewed",
		engine: "site-diary-extractor-checker",
		projectDatasetVersions: projects?.map((corpus) => ({
			projectKey: corpus.project.key,
			snapshotDate: corpus.provenance.snapshotDate,
			fingerprint: createHash("sha256")
				.update(
					JSON.stringify({ project: corpus.project, cases: corpus.cases }),
				)
				.digest("hex"),
		})),
		model:
			results.find((result) => "requestedModel" in result)?.requestedModel ??
			null,
		requestedModel:
			results.find((result) => "requestedModel" in result)?.requestedModel ??
			null,
		actualModels: [
			...new Set(
				results.flatMap((result) =>
					"actualModel" in result && result.actualModel
						? [result.actualModel]
						: [],
				),
			),
		],
		startedAt,
		finishedAt: new Date().toISOString(),
		databaseWrites: false,
		extractorModelSettings: modelSettings,
		checkerModelSettings: checkerSettings,
		whatsappReplies: false,
		langsmith: tracing,
		corpusProvenance: projects
			? projects.map((corpus) => ({
					projectKey: corpus.project.key,
					...corpus.provenance,
				}))
			: ocelt
				? {
						kind: "reviewed-and-derived-scenarios",
						reviewed: reviewedDiaryCorpus.provenance,
						scenarios: oceltScenarioProvenance,
					}
				: oceltScenarios
					? oceltScenarioProvenance
					: productionReplay
						? productionDiaryProvenance
						: reviewedDiaryCorpus.provenance,
		forma2AssignmentMode: projects
			? "configured-works-only"
			: ocelt
				? "per-case"
				: productionReplay || oceltScenarios
					? "configured-works-only"
					: "automatic-assignment",
		summary: {
			cases: results.length,
			deterministicFailures: failures,
			deterministicCriticalFailures: failures,
		},
		projectSummaries: projects?.map((corpus) => {
			const items = results.filter(
				(item) => item.projectKey === corpus.project.key,
			);
			return {
				projectKey: corpus.project.key,
				organization: corpus.provenance.organization,
				project: corpus.provenance.project,
				cases: items.length,
				passed: items.filter((item) => item.deterministic.status === "pass")
					.length,
				failed: items.filter((item) => item.deterministic.status === "fail")
					.length,
				forma2Positions: corpus.project.positions.length,
				referenceCandidates: corpus.referenceCandidates.length,
				fieldQuality: items.reduce<
					Record<string, { correct: number; total: number }>
				>((summary, item) => {
					if (!item.deterministic.quality) return summary;
					for (const [field, counts] of Object.entries(
						item.deterministic.quality.fields,
					)) {
						const current = summary[field] ?? { correct: 0, total: 0 };
						summary[field] = {
							correct: current.correct + counts.correct,
							total: current.total + counts.total,
						};
					}
					return summary;
				}, {}),
			};
		}),
		latency: { totalMs, averageMs: totalMs / results.length },
		results,
	};
	const directoryIndex = process.argv.indexOf("--results-dir");
	if (directoryIndex >= 0 && !process.argv[directoryIndex + 1]) {
		throw new Error("--results-dir requires a value.");
	}
	const directory = path.resolve(
		directoryIndex >= 0
			? process.argv[directoryIndex + 1]
			: path.join(process.cwd(), ".ai-eval-results"),
	);
	await mkdir(directory, { recursive: true });
	const file = path.join(directory, `diary-reviewed-${runId}.json`);
	await writeFile(file, JSON.stringify(report, null, 2));
	const html = renderEvalReportHtml(
		normalizeEvalReport(report, path.basename(file)),
	);
	const htmlFile = file.replace(/\.json$/, ".html");
	const latestHtmlFile = path.join(
		directory,
		projects
			? `diary-projects-${projectLabel}-latest.html`
			: ocelt
				? "diary-ocelt-latest.html"
				: oceltScenarios
					? "diary-ocelt-scenarios-latest.html"
					: productionReplay
						? "diary-production-latest.html"
						: "diary-reviewed-latest.html",
	);
	await writeFile(htmlFile, html);
	await writeFile(latestHtmlFile, html);
	console.log(`Report: ${file}`);
	console.log(`HTML: ${htmlFile}`);
	console.log(`Latest HTML: ${latestHtmlFile}`);
	if (failures || results.some((result) => result.langsmithError))
		process.exitCode = 1;
}
main().catch((error) => {
	console.error(
		error instanceof Error ? error.message : "Reviewed diary eval failed",
	);
	process.exitCode = 1;
});
