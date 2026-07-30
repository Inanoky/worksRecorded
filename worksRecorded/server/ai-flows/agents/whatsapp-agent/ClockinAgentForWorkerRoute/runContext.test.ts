import { buildAiRunContext } from "@/server/ai-flows/ai-run-context";
import {
  buildWorkerSenderTraceContext,
  getWorkerAgentRunContext,
  getWorkerSenderTraceMetadata,
  getWorkerSenderTraceTags,
  runWithWorkerAgentEvalContext,
  setWorkerSenderTraceContext,
} from "./runContext";

describe("worker sender trace context", () => {
  it("derives sender metadata from worker full name", () => {
    const senderContext = buildWorkerSenderTraceContext({
      fullName: "Jānis Bērziņš",
    });

    expect(senderContext).toEqual({
      senderFirstName: "Jānis",
      senderLastName: "Bērziņš",
      senderName: "Jānis Bērziņš",
      senderInitials: "JB",
      senderLabel: "Jānis Bērziņš",
    });
    expect(getWorkerSenderTraceMetadata(senderContext)).toEqual(senderContext);
    expect(getWorkerSenderTraceTags(senderContext)).toEqual(["sender:Jānis Bērziņš"]);
  });

  it("adds sender context to the active worker run context", async () => {
    await runWithWorkerAgentEvalContext(
      {
        threadId: "worker-1",
        traceMetadata: { caseId: "worker-case" },
        traceTags: ["worker-eval"],
      },
      async () => {
        const senderContext = buildWorkerSenderTraceContext({
          firstName: "Jānis",
          lastName: "Bērziņš",
        });

        expect(setWorkerSenderTraceContext(senderContext)).toBe(true);
        expect(getWorkerAgentRunContext()).toMatchObject(senderContext);
      },
    );
  });

  it("passes sanitized sender tag and visible run name to LangSmith config", () => {
    const senderContext = buildWorkerSenderTraceContext({
      fullName: "Jānis Bērziņš",
    });
    const aiContext = buildAiRunContext({
      flow: "whatsapp-worker",
      threadId: "worker-1",
      workerId: "worker-1",
      channel: "whatsapp",
      runName: `WhatsAppWorkerAgent - ${senderContext.senderLabel}`,
      metadata: getWorkerSenderTraceMetadata(senderContext),
      tags: getWorkerSenderTraceTags(senderContext),
    });

    expect(aiContext.runName).toBe("WhatsAppWorkerAgent - Jānis Bērziņš");
    expect(aiContext.metadata).toMatchObject({
      senderFirstName: "Jānis",
      senderLastName: "Bērziņš",
      senderName: "Jānis Bērziņš",
      senderInitials: "JB",
      senderLabel: "Jānis Bērziņš",
    });
    expect(aiContext.tags).toEqual(
      expect.arrayContaining(["flow:whatsapp-worker", "sender:J_nis-B_rzi__"]),
    );
  });
});
