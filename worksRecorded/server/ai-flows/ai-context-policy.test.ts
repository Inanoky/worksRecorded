import { AI_CONTEXT_POLICIES, getAiContextPolicy } from "./ai-context-policy";
import { AI_FLOW_NAMES } from "./ai-run-context";

describe("AI context policies", () => {
  it("defines a context policy for every AI flow", () => {
    expect(Object.keys(AI_CONTEXT_POLICIES).sort()).toEqual([...AI_FLOW_NAMES].sort());
  });

  it("describes dashboard chat as user-site memory with write-capable tools", () => {
    const policy = getAiContextPolicy("dashboard-chat");

    expect(policy).toMatchObject({
      label: "Dashboard chat",
      threadIdPattern: "orchestrating-agent-v2:<siteId-or-no-site>:<userId>",
      memoryScope: "user-site",
      toolMode: "write-capable",
      mutationRisk: "medium",
    });
    expect(policy.contextSources).toEqual(
      expect.arrayContaining([
        "system prompt",
        "user message",
        "attachments",
        "tool outputs",
        "checkpoint history",
      ]),
    );
    expect(policy.resetExplanation).toContain("Business records are not deleted");
  });

  it("describes WhatsApp write-capable flows with injected app context", () => {
    expect(getAiContextPolicy("whatsapp-site-manager")).toMatchObject({
      threadIdPattern: "siteManager:<siteId-or-no-site>:<userId>",
      memoryScope: "user-site",
      toolMode: "write-capable",
      mutationRisk: "high",
    });
    expect(getAiContextPolicy("whatsapp-site-manager").contextSources).toContain(
      "injected app context",
    );

    expect(getAiContextPolicy("whatsapp-worker")).toMatchObject({
      threadIdPattern: "<workerId>",
      memoryScope: "worker",
      toolMode: "write-capable",
      mutationRisk: "high",
    });
    expect(getAiContextPolicy("whatsapp-worker").contextSources).toContain(
      "injected app context",
    );
  });

  it("marks specialist agents as project-level read-only memory", () => {
    for (const flow of ["site-diary-agent", "timesheets-agent", "bis-materials-agent"] as const) {
      const policy = getAiContextPolicy(flow);

      expect(policy).toMatchObject({
        memoryScope: "project",
        toolMode: "read-only",
        mutationRisk: "none",
      });
      expect(policy.notes).toContain("Project-level specialist memory");
    }
  });
});
