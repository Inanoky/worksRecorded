import path from "node:path";
import { selectEvalCases } from "./eval-case-selection";
import { whatsappSiteManagerEvalCases } from "./whatsapp-site-manager-cases";

it("keeps all WhatsApp image cases out of ordinary and critical eval runs", () => {
	const images = whatsappSiteManagerEvalCases.filter((evalCase) =>
		evalCase.tags.includes("image"),
	);
	expect(images).toHaveLength(4);
	expect(images.every((evalCase) => evalCase.manualOnly)).toBe(true);
	for (const argv of [[], ["--critical"]]) {
		const selected = selectEvalCases({
			cases: whatsappSiteManagerEvalCases,
			argv,
		});
		expect(
			selected.selectedCases.some(
				(evalCase) =>
					evalCase.tags.includes("image") || evalCase.tags.includes("invoice"),
			),
		).toBe(false);
	}
	const manual = selectEvalCases({
		cases: whatsappSiteManagerEvalCases,
		argv: ["--include-manual", "--tag", "image"],
	});
	expect(manual.selectedCaseIds).toEqual(images.map((evalCase) => evalCase.id));
});

it("isolates mocked and live Meta image tests from default Jest discovery", () => {
	const base = require("../../jest.config.js");
	const manual = require("../../jest.image-extraction.config.js");
	const paths = [
		"meta-image-handler-langsmith.test.ts",
		"meta-image-upload-material-extraction.test.ts",
		"meta-image-real-extraction.eval.test.ts",
	].map((name) => path.join(process.cwd(), "test", name));
	const ignored = (config: typeof base, file: string) =>
		config.testPathIgnorePatterns.some((pattern: string) =>
			new RegExp(pattern.replace("<rootDir>", process.cwd())).test(file),
		);
	for (const file of paths) {
		expect(ignored(base, file)).toBe(true);
		expect(ignored(manual, file)).toBe(false);
	}
	expect(
		ignored(
			base,
			path.join(process.cwd(), "test/ai-evals/eval-case-selection.test.ts"),
		),
	).toBe(false);
});
