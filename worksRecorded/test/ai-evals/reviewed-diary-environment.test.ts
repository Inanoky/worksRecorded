import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  assertReviewedDiaryEnvironment,
  getReviewedDiaryModelSettings,
  reviewedDiaryScope,
} from "./reviewed-diary-environment";

describe("frozen diary eval environment", () => {
  const original = process.env;
  beforeEach(() => {
    process.env = {
      ...original,
      RUN_AI_EVALS: "true",
      OPENAI_API_KEY: "unit-test-key",
      AI_EVAL_ALLOW_SINGLE_DB: "false",
      DATABASE_URL: "postgresql://invalid:invalid@invalid/eval",
    };
  });
  afterEach(() => {
    process.env = original;
  });

  it("requires explicit model-run opt-in", () => {
    process.env.RUN_AI_EVALS = "false";
    expect(assertReviewedDiaryEnvironment).toThrow("RUN_AI_EVALS=true");
  });

  it("requires model credentials", () => {
    process.env.OPENAI_API_KEY = "";
    expect(assertReviewedDiaryEnvironment).toThrow("OPENAI_API_KEY");
  });

  it("maps GPT-6.1 Sol High to its exact model, reasoning and Responses API settings", () => {
    process.env.AI_EVAL_AGENT_MODEL = "gpt-6.1-sol";
    process.env.AI_EVAL_REASONING_EFFORT = "high";
    expect(getReviewedDiaryModelSettings()).toEqual({
      model: "gpt-6.1-sol",
      reasoningEffort: "high",
      useResponsesApi: true,
    });
  });

  it("rejects invalid reasoning settings before model calls", () => {
    process.env.AI_EVAL_REASONING_EFFORT = "invalid";
    expect(getReviewedDiaryModelSettings).toThrow("AI_EVAL_REASONING_EFFORT");
  });

  it("configures the checker independently with GPT-6.1 Sol High", () => {
    process.env.AI_EVAL_CHECKER_MODEL = "gpt-6.1-sol";
    process.env.AI_EVAL_CHECKER_REASONING_EFFORT = "high";
    expect(getReviewedDiaryModelSettings("checker")).toEqual({
      model: "gpt-6.1-sol",
      reasoningEffort: "high",
      useResponsesApi: true,
    });
    process.env.AI_EVAL_CHECKER_REASONING_EFFORT = "invalid";
    expect(() => getReviewedDiaryModelSettings("checker")).toThrow(
      "AI_EVAL_CHECKER_REASONING_EFFORT",
    );
  });

  it("uses synthetic identities even when business IDs are configured", () => {
    process.env.AI_EVAL_SITE_ID = "business-project";
    process.env.AI_EVAL_USER_ID = "business-user";
    expect(assertReviewedDiaryEnvironment()).toEqual(reviewedDiaryScope);
    expect(reviewedDiaryScope.siteId).toMatch(/^eval:/);
    expect(reviewedDiaryScope.userId).toMatch(/^eval:/);
  });

  it.each([
    ["diary-reviewed", 0, "frozen corpus, no database"],
    ["whatsapp-site-manager", 1, "AI_EVAL_ALLOW_SINGLE_DB=true"],
  ])("preserves the correct guard for %s", (flow, status, message) => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "./test/ai-evals/server-only-register.mjs",
        "--import",
        "tsx",
        "test/ai-evals/assert-eval-environment.ts",
        "--flow",
        flow,
      ],
      {
        cwd: path.resolve(__dirname, "../.."),
        encoding: "utf8",
        timeout: 15000,
        env: {
          ...process.env,
          AI_EVAL_SITE_ID: "unit-test-site",
          AI_EVAL_USER_ID: "unit-test-user",
        },
      },
    );
    expect(result.status).toBe(status);
    expect(result.stdout + result.stderr).toContain(message);
    expect(result.stderr).not.toContain("Can't reach database");
  });
});
