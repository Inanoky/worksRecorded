import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import selection from "@/test/fixtures/ai-evals/project-diary-selection.json";
import {
	buildProjectDiaryCorpus,
	type DiaryProjectSnapshot,
	diaryFingerprint,
} from "./project-diary-corpus-builder";

async function main() {
	const inputIndex = process.argv.indexOf("--input");
	const directoryIndex = process.argv.indexOf("--output-dir");
	if (
		inputIndex < 0 ||
		directoryIndex < 0 ||
		!process.argv[inputIndex + 1] ||
		!process.argv[directoryIndex + 1]
	)
		throw new Error(
			"Use --input <private Supabase snapshot.json> --output-dir <new fixture directory>.",
		);
	const raw = JSON.parse(
		await readFile(process.argv[inputIndex + 1], "utf8"),
	) as { rows: DiaryProjectSnapshot[] } | DiaryProjectSnapshot[];
	const snapshots = Array.isArray(raw) ? raw : raw.rows;
	if (!Array.isArray(snapshots))
		throw new Error("Expected project snapshot rows.");
	const directory = path.resolve(process.argv[directoryIndex + 1]);
	await mkdir(directory, { recursive: true });
	for (const chosen of selection) {
		const snapshot = snapshots.find(
			(item) => diaryFingerprint(item.siteId) === chosen.siteFingerprint,
		);
		if (!snapshot) throw new Error(`Missing snapshot for ${chosen.key}`);
		const corpus = buildProjectDiaryCorpus(snapshot, chosen);
		const file = path.join(directory, `${chosen.key}-project-diary.json`);
		const exists = await access(file).then(
			() => true,
			() => false,
		);
		if (exists)
			throw new Error(
				`Refusing to overwrite an existing reference: ${file}. Import into a new review directory.`,
			);
		await writeFile(file, JSON.stringify(corpus, null, 2));
		console.log(
			`${chosen.key}: ${corpus.cases.length} cases, ${corpus.referenceCandidates.length} review candidates`,
		);
	}
}

main().catch((error) => {
	console.error(
		error instanceof Error ? error.message : "Corpus import failed",
	);
	process.exitCode = 1;
});
