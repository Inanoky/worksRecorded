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
