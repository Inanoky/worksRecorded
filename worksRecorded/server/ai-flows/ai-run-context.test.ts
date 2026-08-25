import type { RunnableConfig } from "@langchain/core/runnables";
import {
  buildAiRunContext,
  getBisMaterialsAgentThreadId,
  getOrchestratingThreadId,
  getSiteDiaryAgentThreadId,
  getSiteManagerThreadId,
  getTimesheetsAgentThreadId,
  getWorkerThreadId,
  summarizeForTrace,
} from "./ai-run-context";

describe("AI run context helpers", () => {
  it("builds stable checkpoint thread IDs for the main workflows", () => {
    expect(getOrchestratingThreadId("site-1", "user-1")).toBe(
      "orchestrating-agent-v2:site-1:user-1",
    );
    expect(getOrchestratingThreadId(null, "user-1")).toBe(
      "orchestrating-agent-v2:no-site:user-1",
    );
    expect(getSiteManagerThreadId("site-1", "user-1")).toBe("siteManager:site-1:user-1");
    expect(getSiteManagerThreadId(undefined, "user-1")).toBe("siteManager:no-site:user-1");
    expect(getWorkerThreadId("worker-1")).toBe("worker-1");
    expect(getSiteDiaryAgentThreadId("site-1")).toBe("site-1_SiteDiaryAgent");
    expect(getTimesheetsAgentThreadId("site-1")).toBe("site-1_Timesheets-agent");
    expect(getBisMaterialsAgentThreadId("site-1")).toBe("site-1_BisMaterialsAgent");
  });

  it("builds trace tags and metadata without undefined values", () => {
    const context = buildAiRunContext({
      flow: "dashboard-chat",
      threadId: "thread-1",
      siteId: "site 1",
      userId: "user-1",
      channel: "dashboard",
      model: "gpt-test",
      metadata: {
        kept: "yes",
        skipped: undefined,
      },
      tags: ["custom tag"],
    });

    expect(context.runName).toBe("OrchestratingAgentV2");
    expect(context.threadId).toBe("thread-1");
    expect(context.tags).toEqual([
      "works-recorded",
      "flow:dashboard-chat",
      "channel:dashboard",
      "site:site-1",
      "user:user-1",
      "custom-tag",
    ]);
    expect(context.metadata).toEqual({
      app: "works-recorded",
      flow: "dashboard-chat",
      channel: "dashboard",
      threadId: "thread-1",
      siteId: "site 1",
      userId: "user-1",
      workerId: null,
      model: "gpt-test",
      kept: "yes",
    });
    expect(context.runnableConfig).toEqual({
      runName: "OrchestratingAgentV2",
      tags: context.tags,
      metadata: context.metadata,
    });
  });

  it("allows a trace run name override without changing metadata or tags", () => {
    const context = buildAiRunContext({
      flow: "whatsapp-site-manager",
      threadId: "thread-1",
      runName: "WhatsAppSiteManagerAgent - Anna Bērziņa",
      userId: "user-1",
      tags: ["sender:Anna Bērziņa"],
      metadata: { senderLabel: "Anna Bērziņa" },
    });

    expect(context.runName).toBe("WhatsAppSiteManagerAgent - Anna Bērziņa");
    expect(context.runnableConfig.runName).toBe("WhatsAppSiteManagerAgent - Anna Bērziņa");
    expect(context.tags).toEqual(expect.arrayContaining([
      "flow:whatsapp-site-manager",
      "sender:Anna-B_rzi_a",
    ]));
    expect(context.metadata).toMatchObject({
      flow: "whatsapp-site-manager",
      senderLabel: "Anna Bērziņa",
      userId: "user-1",
    });
  });

  it("preserves parent callbacks and configurable state for nested trace spans", () => {
    const callbacks = [{ name: "parent-callback" }] as unknown as RunnableConfig["callbacks"];
    const context = buildAiRunContext({
      flow: "structured-site-diary-save",
      threadId: "site-diary-thread",
      tags: ["child-tag"],
      metadata: { childValue: "yes" },
      parentConfig: {
        callbacks,
        configurable: { thread_id: "parent-thread" },
        tags: ["parent-tag"],
        metadata: { parentValue: "yes" },
      },
    });

    expect(context.runnableConfig.callbacks).toBe(callbacks);
    expect(context.runnableConfig.configurable).toEqual({ thread_id: "parent-thread" });
    expect(context.tags).toEqual(expect.arrayContaining(["parent-tag", "child-tag"]));
    expect(context.metadata).toMatchObject({
      parentValue: "yes",
      childValue: "yes",
      threadId: "site-diary-thread",
    });
  });

  it("keeps site-manager fast-path children attached to the message trace config", () => {
    const callbacks = [{ name: "message-callback" }] as unknown as RunnableConfig["callbacks"];
    const messageContext = buildAiRunContext({
      flow: "whatsapp-site-manager",
      threadId: "siteManager:site-1:user-1",
      runName: "WhatsApp Text - Anna",
      siteId: "site-1",
      userId: "user-1",
      channel: "whatsapp",
      metadata: {
        workflowId: "whatsapp-site-manager:text",
        workflowName: "WhatsApp site-manager text",
        messageType: "text",
        mediaPurpose: "unknown",
        whatsappMessageId: "wamid.1",
        questionPreview: "Šodien betonējām pamatus.",
        senderLabel: "Anna",
      },
      tags: ["sender:Anna", "workflow:whatsapp-site-manager:text", "message-type:text"],
    });

    const childContext = buildAiRunContext({
      flow: "structured-site-diary-save",
      threadId: "structured-site-diary-save:site-1:user-1",
      runName: "Structured Save - WhatsApp Text - Anna",
      siteId: "site-1",
      userId: "user-1",
      channel: "tool",
      metadata: {
        executionPath: "fast-path",
        fastPathOutcome: "save",
      },
      tags: ["execution-path:fast-path"],
      parentConfig: {
        ...messageContext.runnableConfig,
        callbacks,
      },
    });

    expect(childContext.runnableConfig.callbacks).toBe(callbacks);
    expect(childContext.tags).toEqual(expect.arrayContaining([
      "flow:whatsapp-site-manager",
      "flow:structured-site-diary-save",
      "sender:Anna",
      "workflow:whatsapp-site-manager:text",
      "message-type:text",
      "execution-path:fast-path",
    ]));
    expect(childContext.metadata).toMatchObject({
      workflowId: "whatsapp-site-manager:text",
      workflowName: "WhatsApp site-manager text",
      messageType: "text",
      mediaPurpose: "unknown",
      whatsappMessageId: "wamid.1",
      questionPreview: "Šodien betonējām pamatus.",
      senderLabel: "Anna",
      flow: "structured-site-diary-save",
      channel: "tool",
      executionPath: "fast-path",
      fastPathOutcome: "save",
    });
  });

  it("summarizes text for trace metadata", () => {
    expect(summarizeForTrace("  hello\n\nworld  ")).toBe("hello world");
    expect(summarizeForTrace("abcdef", 4)).toBe("abcd...");
    expect(summarizeForTrace(null)).toBe("");
  });
});
