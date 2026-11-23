import { JSDOM } from "jsdom";
import { projectDiaryCorpora } from "./project-diary-corpora";
import { renderProjectDiaryCorpusReview } from "./project-diary-review-report";

it("shows source messages, reference rows, actual periods and unscored candidates without claiming an AI run", () => {
	const page = new JSDOM(
		renderProjectDiaryCorpusReview(Object.values(projectDiaryCorpora)),
	).window.document;
	expect(page.body.textContent).toContain("Modeļi nav palaisti");
	expect(page.body.textContent).toContain("2026-09-16 – 2026-10-16");
	expect(page.body.textContent).toContain("2026-08-17 – 2026-09-11");
	expect(page.querySelectorAll("article")).toHaveLength(31);
	expect(page.querySelectorAll("details")).toHaveLength(56);
	expect(page.body.textContent).toContain("duration-not-stated-in-message");
	expect(page.body.textContent).toContain("journal-work-selection");
	expect(page.body.textContent).toContain(
		"Jāpārbauda: ieraksta un kataloga mērvienības atšķiras.",
	);
});

it("escapes untrusted transcripts and reference comments without loading remote content", () => {
	const corpus = JSON.parse(JSON.stringify(projectDiaryCorpora.ocelt));
	corpus.cases[0].sourceText = '<script>alert("input")</script>';
	corpus.cases[0].expectedRecords[0].reviewedComment =
		'<img src="https://example.test/secret">';
	const page = new JSDOM(renderProjectDiaryCorpusReview([corpus])).window
		.document;
	expect(page.querySelectorAll("script,img,iframe,link")).toHaveLength(0);
	expect(page.body.textContent).toContain('<script>alert("input")</script>');
});
