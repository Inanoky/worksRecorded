import { renderEvalReportHtml } from "@/lib/ai-evals/html-report";
import { normalizeEvalReport } from "@/lib/ai-evals/report-loader";
import {
	reviewedDiaryCases,
	reviewedDiaryCorpus,
} from "./reviewed-diary-cases";
import { validateReviewedDiaryCase } from "./reviewed-diary-validators";

function failedReport() {
	const evalCase = reviewedDiaryCases[0];
	const rows = evalCase.expectedRecords.map((row) => ({
		...row,
		comment: row.reviewedComment,
	}));
	rows[0].amount = 999;
	return normalizeEvalReport({
		runId: "html-unit-test",
		flow: "diary-reviewed",
		startedAt: "2026-11-13T08:00:00.000Z",
		databaseWrites: false,
		summary: { deterministicFailures: 1 },
		results: [
			{
				caseId: evalCase.id,
				inputPreview: evalCase.sourceText,
				requestedModel: "test-model",
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
						stages: [
							{
								phase: "checker",
								repair: false,
								result: {
									verdict: "needs_model_repair",
									reason: "Jāatjauno aprēķinātais apjoms",
								},
							},
						],
					},
				],
			},
		],
	});
}

it("shows the original input, reviewed rows, generated rows and exact failures", () => {
	const html = renderEvalReportHtml(failedReport());
	const page = new DOMParser().parseFromString(html, "text/html");
	expect(page.querySelector(".source")?.textContent).toBe(
		reviewedDiaryCases[0].sourceText,
	);
	expect(page.querySelectorAll("tbody tr")).toHaveLength(8);
	expect(page.body.textContent).toContain("Sagaidāmie ieraksti (4)");
	expect(page.body.textContent).toContain("Ģenerētie ieraksti (4)");
	expect(page.body.textContent).toContain("expected-record:1");
	expect(page.body.textContent).toContain("999");
	expect(page.body.textContent).toContain("Datubāzes rakstīšana ir izslēgta");
	expect(page.body.textContent).toContain("Europe/Riga");
	expect(page.body.textContent).toContain("Jāatjauno aprēķinātais apjoms");
});

it("shows request timing and unknown usage for a timed-out model call without executing model data", () => {
	const run = failedReport();
	run.items[0].artifacts.modelCalls = [
		{
			purpose: "fast-path-extraction",
			model: "test-model",
			totalTokens: null,
			diagnostics: {
				outcome: "timeout",
				phase: "waiting_for_headers",
				clientRequestId: "client-local",
				requestId: null,
				httpStatus: null,
				headersMs: null,
				firstBodyByteMs: null,
				bodyCompleteMs: null,
				serverProcessingMs: null,
				errorName: "SiteManagerAiTimeoutError",
				errorCode: '<script>alert("error")</script>',
			},
		},
	];
	const page = new DOMParser().parseFromString(
		renderEvalReportHtml(run),
		"text/html",
	);
	const diagnostic = page.querySelector(".model-diagnostics");
	expect(diagnostic?.textContent).toContain("waiting_for_headers");
	expect(diagnostic?.textContent).toContain("client-local");
	expect(diagnostic?.textContent).toContain("nav datu");
	expect(diagnostic?.querySelectorAll("script")).toHaveLength(0);
});

it("explains included and omitted checker prompt parts without executing their text", () => {
	const run = failedReport();
	run.items[0].artifacts.structuredSaveTrace = [
		{
			stages: [
				{
					phase: "checker",
					promptComposition: {
						version: 1,
						profile: "construction",
						sections: [
							{
								id: "mervienibas_buvnieciba",
								title: "Mērvienības",
								description: "Atšķir izmēru no paveiktā apjoma",
								version: 2,
								included: true,
								reason: "Projektā ieslēgts daudzums",
							},
							{
								id: "forma2_piesaiste",
								title: "Forma2",
								description: '<script>alert("part")</script>',
								version: 1,
								included: false,
								reason: "Projektā nav tāmes pozīciju",
							},
						],
					},
				},
			],
		},
	];
	const page = new DOMParser().parseFromString(
		renderEvalReportHtml(run),
		"text/html",
	);
	const parts = page.querySelector(".prompt-composition");
	expect(parts?.querySelectorAll("tbody tr")).toHaveLength(2);
	expect(parts?.textContent).toContain("mervienibas_buvnieciba (v2)");
	expect(parts?.textContent).toContain("Iekļauta");
	expect(parts?.textContent).toContain("Izlaista");
	expect(parts?.textContent).toContain("Projektā nav tāmes pozīciju");
	expect(parts?.textContent).toContain('<script>alert("part")</script>');
	expect(page.querySelector("script")).toBeNull();
});

it("previews only locally registered image filenames", () => {
	const run = failedReport();
	const name = `${"a".repeat(64)}.jpg`;
	(run.raw as Record<string, unknown>).localMedia = [
		{
			url: `https://eval.test/local-media/${name}`,
			path: `/tmp/media/${name}`,
		},
		{ url: "https://example.test/external.jpg", path: "/tmp/external.jpg" },
		{
			url: "https://eval.test/local-media/../../secret.jpg",
			path: "/tmp/secret.jpg",
		},
	];
	const page = new DOMParser().parseFromString(
		renderEvalReportHtml(run),
		"text/html",
	);
	expect(
		[...page.querySelectorAll("img")].map((image) => image.getAttribute("src")),
	).toEqual([`./media/${name}`]);
});

it("links to the exact LangSmith run without accepting arbitrary executable URLs", () => {
	const run = failedReport();
	run.items[0].artifacts.langsmithUrl =
		"https://smith.langchain.com/o/org/projects/p/project/r/run";
	const page = new DOMParser().parseFromString(
		renderEvalReportHtml(run),
		"text/html",
	);
	expect(
		page.querySelector('a[href^="https://smith.langchain.com"]')?.textContent,
	).toContain("LangSmith");
	run.items[0].artifacts.langsmithUrl = "javascript:alert(1)";
	expect(renderEvalReportHtml(run)).not.toContain('href="javascript:');
});

it("escapes untrusted model text and does not load scripts, images or remote assets", () => {
	const run = failedReport();
	run.items[0].input = '</pre><script>alert("input")</script>';
	run.items[0].answer =
		'<img src="https://example.test/image" onerror="alert(1)">';
	run.items[0].failedValidators[0].message =
		"<iframe src='https://example.test'>";
	const html = renderEvalReportHtml(run);
	const page = new DOMParser().parseFromString(html, "text/html");
	expect(page.querySelectorAll("script,img,iframe,link")).toHaveLength(0);
	expect(page.querySelector(".source")?.textContent).toBe(run.items[0].input);
	expect(
		page
			.querySelector('meta[http-equiv="Content-Security-Policy"]')
			?.getAttribute("content"),
	).toContain("default-src 'none'");
});

it("renders older WhatsApp reports with outbound messages and no reviewed-row table", () => {
	const run = normalizeEvalReport({
		flow: "whatsapp-site-manager",
		runId: "legacy-run",
		results: [
			{
				caseId: "legacy-case",
				inputPreview: "Iebetonēti 12 m3",
				answer: "Darbs saglabāts.",
				graphMessages: [
					{ body: { type: "text", text: { body: "Darbs saglabāts." } } },
				],
				deterministic: { status: "pass", results: [] },
			},
		],
	});
	const html = renderEvalReportHtml(run);
	expect(html).toContain("Darbs saglabāts.");
	expect(html).toContain("whatsapp-site-manager");
	expect(html).toContain("Faktiskais modelis: nav apstiprināts");
	expect(html).not.toContain("Sagaidāmie ieraksti");
});
