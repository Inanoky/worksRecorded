import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { reviewedDiaryCases } from "./reviewed-diary-cases";

const run = (...args: string[]) =>
  spawnSync(
    process.execPath,
    ["--import", "tsx", "test/ai-evals/run-reviewed-diary-eval.ts", ...args],
    {
      cwd: path.resolve(__dirname, "../.."),
      encoding: "utf8",
      timeout: 15000,
      env: {
        ...process.env,
        RUN_AI_EVALS: "false",
        OPENAI_API_KEY: "",
        DATABASE_URL: "postgresql://invalid:invalid@invalid/eval",
        AI_EVAL_SITE_ID: "",
        AI_EVAL_USER_ID: "",
      },
    },
  );
it("validates the frozen corpus without model credentials or a reachable database", () => {
  const result = run("--dry-run");
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Selected 8/8 cases");
});
it("selects only the two clear multi-work requests", () => {
  const result = run("--list", "--tag", "multi-work");
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Selected 2/8 cases");
  expect(result.stdout).toContain("four-earthworks-calculation");
  expect(result.stdout).toContain("six-sewer-activities");
});
it("requires explicit live-eval opt-in before importing any database or model execution", () => {
  const result = run("--case", "ocelt-1113-pp-sewer-d200");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("RUN_AI_EVALS=true");
  expect(result.stderr).not.toContain("invalid/eval");
});

it.each([false, true])(
  "writes inspectable JSON and HTML even when execution fails: %s",
  (fails) => {
    const directory = mkdtempSync(
      path.join(tmpdir(), "reviewed-diary-runner-"),
    );
    const evalCase = reviewedDiaryCases[0];
    const rows = evalCase.expectedRecords.map((row) => ({
      ...row,
      comment: row.reviewedComment,
    }));
    const output = {
      rows,
      rawRows: [],
      extractionSucceeded: true,
      metrics: {
        modelCalls: [],
        aggregateTokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      },
    };
    const mockedModule = fails
      ? 'export async function executeReviewedDiaryCase() { throw new Error("Mock execution failed"); }'
      : `export async function executeReviewedDiaryCase() { return ${JSON.stringify(output)}; }`;
    const moduleUrl = `data:text/javascript,${encodeURIComponent(mockedModule)}`;
    const loader = path.join(directory, "executor-mock.mjs");
    writeFileSync(
      loader,
      `import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.includes("reviewed-diary-execution")) return { url: ${JSON.stringify(moduleUrl)}, shortCircuit: true };
  if (specifier === "openai" || specifier.includes("lib/utils/db")) throw new Error("Unexpected live dependency in mocked CLI test");
  return nextResolve(specifier, context);
} });`,
    );
    try {
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--import",
          loader,
          "test/ai-evals/run-reviewed-diary-eval.ts",
          "--case",
          evalCase.id,
          "--results-dir",
          directory,
        ],
        {
          cwd: path.resolve(__dirname, "../.."),
          encoding: "utf8",
          timeout: 15000,
          env: {
            ...process.env,
            RUN_AI_EVALS: "true",
            OPENAI_API_KEY: "unit-test-key",
            DATABASE_URL: "postgresql://invalid:invalid@invalid/eval",
            AI_EVAL_ALLOW_SINGLE_DB: "false",
          },
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(fails ? 1 : 0);
      const jsonName = readdirSync(directory).find((file) =>
        file.endsWith(".json"),
      );
      expect(jsonName).toBeDefined();
      const report = JSON.parse(
        readFileSync(path.join(directory, jsonName as string), "utf8"),
      );
      expect(report.databaseWrites).toBe(false);
      expect(report.results[0].deterministic.status).toBe(
        fails ? "fail" : "pass",
      );
      expect(
        report.results[0].structuredSaveTrace[0].expectedRecords,
      ).toHaveLength(4);
      const html = readFileSync(
        path.join(directory, "diary-reviewed-latest.html"),
        "utf8",
      );
      expect(html).toContain("Sagaidāmie ieraksti (4)");
      expect(html).toContain(
        fails ? "Mock execution failed" : "Ģenerētie ieraksti (4)",
      );
      expect(
        readFileSync(
          path.join(
            directory,
            (jsonName as string).replace(/\.json$/, ".html"),
          ),
          "utf8",
        ),
      ).toBe(html);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
