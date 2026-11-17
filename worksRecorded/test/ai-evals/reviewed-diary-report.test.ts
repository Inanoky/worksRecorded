import { renderEvalReportHtml } from "@/lib/ai-evals/html-report";
import { normalizeEvalReport } from "@/lib/ai-evals/report-loader";
import {
	reviewedDiaryCases,
	reviewedDiaryCorpus,
} from "./reviewed-diary-cases";
import { validateReviewedDiaryCase } from "./reviewed-diary-validators";

it("keeps exact reviewed-record failures visible in the existing AI eval report section", () => {
	const evalCase = reviewedDiaryCases[0];
	const rows = evalCase.expectedRecords.map((row) => ({
		...row,
		comment: row.reviewedComment,
	}));
	rows[0].amount = 999;
	const run = normalizeEvalReport({
		runId: "local-normalizer-test",
		flow: "diary-reviewed",
		summary: { deterministicFailures: 1 },
		results: [
			{
				caseId: evalCase.id,
				langsmithRunId: "trace-run",
				langsmithUrl:
					"https://smith.langchain.com/o/org/projects/p/project/r/trace-run",
				turnIndex: 0,
				inputPreview: evalCase.sourceText,
				answer: JSON.stringify(rows),
				deterministic: validateReviewedDiaryCase(
					evalCase,
					rows,
					reviewedDiaryCorpus.project.positions,
				),
				structuredSaveTrace: [
					{
						expectedRecords: evalCase.expectedRecords,
						mappedRows: rows,
						persistedRecords: [],
					},
				],
			},
		],
	});
	expect(run.status).toBe("fail");
	expect(run.items[0].failedValidators.map((check) => check.name)).toContain(
		"expected-record:1",
	);
	expect(run.items[0].input).toBe(evalCase.sourceText);
	expect(run.items[0].artifacts.langsmithRunId).toBe("trace-run");
	expect(renderEvalReportHtml(run)).toContain(
		'href="https://smith.langchain.com/o/org/projects/p/project/r/trace-run"',
	);
	expect(run.items[0].artifacts.structuredSaveTrace).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				persistedRecords: [],
				expectedRecords: evalCase.expectedRecords,
			}),
		]),
	);
});
