#!/usr/bin/env bun
import path from "node:path";
import { existsSync } from "node:fs";

type Step = {
  name: string;
  command: string[];
  optional?: boolean;
};

type StepResult = {
  name: string;
  ok: boolean;
  code: number;
  optional: boolean;
};

const projectRoot = path.resolve(import.meta.dir, "..");
const localJestBin = path.join(projectRoot, "node_modules", "jest", "bin", "jest.js");
const jestCommand = existsSync(localJestBin)
  ? ["bun", "run", localJestBin]
  : ["bun", "x", "jest"];

const steps: Step[] = [
  {
    name: "Unit tests (Jest)",
    command: [...jestCommand, "--config", "jest.config.js", "test/unit", "--runInBand"],
  },
  {
    name: "Integration contract tests (Jest, requires BASE_URL)",
    command: [...jestCommand, "--config", "jest.config.js", "test/integration", "--runInBand"],
  },
  {
    name: "Smoke tests (non-invasive HTTP sweep)",
    command: ["bun", "run", "test/app-smoke-tests.ts"],
    optional: true,
  },
  {
    name: "E2E tests (Playwright)",
    command: ["bun", "x", "playwright", "test", "test/e2e", "--config", "playwright.config.ts"],
    optional: true,
  },
];

function icon(ok: boolean, optional: boolean) {
  if (ok) return "✅";
  return optional ? "⚠️" : "❌";
}

async function runStep(step: Step): Promise<StepResult> {
  console.log(`\n▶ ${step.name}`);
  console.log(`   $ ${step.command.join(" ")}`);

  const proc = Bun.spawn(step.command, {
    cwd: projectRoot,
    stdout: "inherit",
    stderr: "inherit",
  });

  const code = await proc.exited;
  const ok = code === 0;

  console.log(`${icon(ok, Boolean(step.optional))} ${step.name} ${ok ? "passed" : `failed (exit ${code})`}`);

  return { name: step.name, ok, code, optional: Boolean(step.optional) };
}

async function main() {
  console.log("🚀 Running full test pipeline from test/startTest.ts");

  const results: StepResult[] = [];
  for (const step of steps) {
    const result = await runStep(step);
    results.push(result);

    if (!result.ok && !result.optional) {
      console.log("\nStopping due to required test failure.");
      break;
    }
  }

  const requiredFailures = results.filter((r) => !r.ok && !r.optional);
  const optionalFailures = results.filter((r) => !r.ok && r.optional);

  console.log("\n================ Test Summary ================");
  for (const r of results) {
    console.log(`${icon(r.ok, r.optional)} ${r.name}`);
  }

  if (optionalFailures.length > 0) {
    console.log(`\n⚠️ Optional suites failed: ${optionalFailures.map((x) => x.name).join(", ")}`);
  }

  if (requiredFailures.length > 0) {
    console.log(`\n❌ Required suites failed: ${requiredFailures.map((x) => x.name).join(", ")}`);
    process.exit(1);
  }

  console.log("\n✅ Required suites passed.");
}

main().catch((error) => {
  console.error("❌ startTest runner crashed", error);
  process.exit(1);
});
