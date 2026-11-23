import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
	projectDiaryCorpora,
	selectProjectDiaryCorpora,
} from "./project-diary-corpora";
import { validateReviewedDiaryCase } from "./reviewed-diary-validators";

it("contains original full-message references from three independent projects", () => {
	expect(
		Object.values(projectDiaryCorpora).map((corpus) => corpus.cases.length),
	).toEqual([8, 14, 9]);
	expect(
		Object.values(projectDiaryCorpora).map(
			(corpus) => corpus.project.positions.length,
		),
	).toEqual([52, 21, 0]);
	for (const corpus of Object.values(projectDiaryCorpora)) {
		expect(
			corpus.cases.every((item) => item.sourceKind === "full-message"),
		).toBe(true);
		const raw = JSON.stringify(corpus);
		expect(raw).not.toMatch(
			/kp_[a-z0-9]+|wamid\.|\+371\d{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu,
		);
		for (const item of corpus.cases) {
			const rows = item.expectedRecords.map((row) => ({
				...row,
				comment: row.reviewedComment,
			}));
			expect(
				validateReviewedDiaryCase(
					item,
					rows.reverse(),
					corpus.project.positions,
				).status,
			).toBe("pass");
		}
	}
});

it("rejects another project's catalog even when reference field values otherwise match", () => {
	const corpus = projectDiaryCorpora["sbstomme-hus-k"];
	const item = corpus.cases.find((item) =>
		item.expectedRecords.some((row) => row.forma2PositionId),
	);
	if (!item) throw new Error("Missing Forma2 reference");
	const rows = item.expectedRecords.map((row) => ({
		...row,
		comment: row.reviewedComment,
	}));
	const result = validateReviewedDiaryCase(
		item,
		rows,
		projectDiaryCorpora.ocelt.project.positions,
	);
	expect(
		result.results.find((check) => check.name === "catalog-position-scope")
			?.status,
	).toBe("fail");
	for (const corpus of Object.values(projectDiaryCorpora))
		for (const row of corpus.cases.flatMap((item) => item.expectedRecords))
			if (row.forma2PositionId)
				expect(
					row.forma2PositionId.startsWith(`pos:${corpus.project.key}:`),
				).toBe(true);
});

it("does not invent Forma2 labels for Waterfront or score disputed reference candidates", () => {
	const corpus = projectDiaryCorpora["stoneandtree-waterfront"];
	expect(
		corpus.cases
			.flatMap((item) => item.expectedRecords)
			.every((row) => row.forma2PositionId === null),
	).toBe(true);
	expect(
		corpus.referenceCandidates.some((item) =>
			item.issues.includes("delivery-and-installation-need-separate-review"),
		),
	).toBe(true);
	const selected = selectProjectDiaryCorpora(["--project", "all"])?.flatMap(
		(item) => item.cases.map((item) => item.id),
	);
	expect(selected).toHaveLength(31);
	expect(selected?.some((id) => id.includes("-review-"))).toBe(false);
	expect(() => selectProjectDiaryCorpora(["--project", "__proto__"])).toThrow(
		"Unknown diary project",
	);
});

it.each(["all", "sbstomme-hus-k", "stoneandtree-waterfront"])(
	"lists project %s without model credentials or database access",
	(project) => {
		const result = spawnSync(
			process.execPath,
			[
				"--import",
				"tsx",
				"test/ai-evals/run-project-diary-eval.ts",
				"--project",
				project,
				"--dry-run",
			],
			{
				cwd: path.resolve(__dirname, "../.."),
				encoding: "utf8",
				timeout: 15000,
				env: {
					...process.env,
					RUN_AI_EVALS: "false",
					OPENAI_API_KEY: "",
					DATABASE_URL: "postgresql://invalid:invalid@invalid/eval",
				},
			},
		);
		expect(result.status).toBe(0);
		expect(result.stdout).toContain(
			`Selected ${project === "all" ? 31 : project === "sbstomme-hus-k" ? 14 : 9}/`,
		);
		expect(result.stderr).not.toContain("invalid/eval");
	},
);

it("verifies all eight historical Ocelt inputs against exact source-batch fingerprints", () => {
	const legacy = JSON.parse(
		readFileSync(
			path.join(
				process.cwd(),
				"test/fixtures/ai-evals/ocelt-reviewed-diary.json",
			),
			"utf8",
		),
	);
	expect(
		legacy.cases.every(
			(item: { sourceKind: string }) => item.sourceKind === "full-message",
		),
	).toBe(true);
	const audit = JSON.parse(
		readFileSync(
			path.join(
				process.cwd(),
				"test/fixtures/ai-evals/ocelt-source-audit.json",
			),
			"utf8",
		),
	);
	expect(audit.cases).toHaveLength(8);
	for (const item of audit.cases) {
		expect(item.exactInputMatch).toBe(true);
		expect(
			item.rowChecks.every(
				(row: { differentFields: string[]; positionMatches: boolean }) =>
					!row.differentFields.length && row.positionMatches,
			),
		).toBe(true);
	}
});
