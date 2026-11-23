import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { oceltScenarioCases } from "./ocelt-scenario-cases";
import { projectDiaryCorpora } from "./project-diary-corpora";
import {
	buildProjectDiaryMessageOverview,
	renderProjectDiaryMessageList,
} from "./project-diary-message-export";
import { renderProjectDiaryCorpusReview } from "./project-diary-review-report";
import { reviewedDiaryCorpus } from "./reviewed-diary-cases";

async function main() {
	const directory = path.resolve(".ai-eval-results");
	await mkdir(directory, { recursive: true });
	const file = path.join(directory, "diary-project-corpus-review.html");
	const messageFile = path.join(
		directory,
		"diary-project-original-messages.txt",
	);
	const comparisonFile = path.join(
		directory,
		"diary-project-comparison-cases.json",
	);
	const corpora = Object.values(projectDiaryCorpora);
	const overview = buildProjectDiaryMessageOverview(
		corpora,
		oceltScenarioCases,
		reviewedDiaryCorpus.project,
	);
	await Promise.all([
		writeFile(file, renderProjectDiaryCorpusReview(corpora)),
		writeFile(messageFile, renderProjectDiaryMessageList(overview)),
		writeFile(comparisonFile, JSON.stringify(overview, null, 2)),
	]);
	console.log(`Reference review HTML: ${file}`);
	console.log(`Original messages: ${messageFile}`);
	console.log(`Comparison cases JSON: ${comparisonFile}`);
	console.log("No model calls, database access or WhatsApp sends.");
}

main().catch((error) => {
	console.error(
		error instanceof Error ? error.message : "Corpus review failed",
	);
	process.exitCode = 1;
});
