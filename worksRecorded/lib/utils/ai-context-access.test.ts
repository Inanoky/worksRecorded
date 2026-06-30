import { hasAiContextAccess, hasAiEvalAccess } from "./ai-context-access";

describe("AI context access helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AI_CONTEXT_ALLOWED_USER_IDS: "user-1,user-2",
      SUPERADMIN: "super-1",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("allows AI Context for allowed users and superadmin", () => {
    expect(hasAiContextAccess("user-1")).toBe(true);
    expect(hasAiContextAccess("super-1")).toBe(true);
    expect(hasAiContextAccess("other")).toBe(false);
  });

  it("allows AI Evals only for AI_CONTEXT_ALLOWED_USER_IDS", () => {
    expect(hasAiEvalAccess("user-1")).toBe(true);
    expect(hasAiEvalAccess("user-2")).toBe(true);
    expect(hasAiEvalAccess("super-1")).toBe(false);
    expect(hasAiEvalAccess("other")).toBe(false);
  });
});
