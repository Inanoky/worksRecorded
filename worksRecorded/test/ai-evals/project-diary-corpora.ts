import ocelt from "@/test/fixtures/ai-evals/ocelt-project-diary.json";
import sbstomme from "@/test/fixtures/ai-evals/sbstomme-hus-k-project-diary.json";
import waterfront from "@/test/fixtures/ai-evals/stoneandtree-waterfront-project-diary.json";
import { ReviewedDiaryCorpusSchema } from "./reviewed-diary-cases";

export const projectDiaryCorpora = {
	ocelt: ReviewedDiaryCorpusSchema.parse(ocelt),
	"sbstomme-hus-k": ReviewedDiaryCorpusSchema.parse(sbstomme),
	"stoneandtree-waterfront": ReviewedDiaryCorpusSchema.parse(waterfront),
};

export function selectProjectDiaryCorpora(argv: string[]) {
	if (
		argv.filter((arg) => arg === "--project" || arg.startsWith("--project="))
			.length > 1
	)
		throw new Error("Select --project only once.");
	const index = argv.indexOf("--project");
	const inline = argv.find((arg) => arg.startsWith("--project="));
	if (index < 0 && !inline) return null;
	const key = inline?.slice("--project=".length) ?? argv[index + 1];
	if (!key || key.startsWith("--"))
		throw new Error("--project requires a project key or all.");
	if (key === "all") return Object.values(projectDiaryCorpora);
	if (!Object.hasOwn(projectDiaryCorpora, key))
		throw new Error(
			`Unknown diary project ${key}. Use ${Object.keys(projectDiaryCorpora).join(", ")} or all.`,
		);
	return [projectDiaryCorpora[key as keyof typeof projectDiaryCorpora]];
}
