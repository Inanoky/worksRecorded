import { isAiEvalUiEnabled } from "./local-gate";

describe("local AI eval UI gate", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("enables the eval UI only when ENABLE_LOCAL_AI_EVAL_UI is true", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      ENABLE_LOCAL_AI_EVAL_UI: "true",
    };

    expect(isAiEvalUiEnabled()).toBe(true);
  });

  it("disables the eval UI when the flag is missing", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      ENABLE_LOCAL_AI_EVAL_UI: undefined,
    };

    expect(isAiEvalUiEnabled()).toBe(false);
  });

  it("disables the eval UI when the flag is not exactly true", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      ENABLE_LOCAL_AI_EVAL_UI: "false",
    };

    expect(isAiEvalUiEnabled()).toBe(false);
  });
});
