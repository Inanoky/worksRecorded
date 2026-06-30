import type { AiFlowName } from "@/server/ai-flows/ai-run-context";

export type AiContextMemoryScope = "user-site" | "worker" | "project" | "structured-run";
export type AiContextToolMode = "read-only" | "write-capable" | "structured-save";
export type AiContextMutationRisk = "none" | "low" | "medium" | "high";

export type AiContextPolicy = {
  flow: AiFlowName;
  label: string;
  threadIdPattern: string;
  memoryScope: AiContextMemoryScope;
  memoryScopeLabel: string;
  contextSources: string[];
  toolMode: AiContextToolMode;
  toolModeLabel: string;
  mutationRisk: AiContextMutationRisk;
  resetExplanation: string;
  notes?: string;
};

export const AI_CONTEXT_POLICIES = {
  "dashboard-chat": {
    flow: "dashboard-chat",
    label: "Dashboard chat",
    threadIdPattern: "orchestrating-agent-v2:<siteId-or-no-site>:<userId>",
    memoryScope: "user-site",
    memoryScopeLabel: "One dashboard user inside one project",
    contextSources: [
      "system prompt",
      "user message",
      "attachments",
      "native file context",
      "tool outputs",
      "checkpoint history",
    ],
    toolMode: "write-capable",
    toolModeLabel: "Read tools plus save/web/python tools",
    mutationRisk: "medium",
    resetExplanation:
      "Clears dashboard chat checkpoint memory for this user and project. Business records are not deleted.",
  },
  "whatsapp-site-manager": {
    flow: "whatsapp-site-manager",
    label: "WhatsApp site manager",
    threadIdPattern: "siteManager:<siteId-or-no-site>:<userId>",
    memoryScope: "user-site",
    memoryScopeLabel: "One WhatsApp manager inside one selected project",
    contextSources: [
      "system prompt",
      "WhatsApp message",
      "selected site",
      "injected app context",
      "tool outputs",
      "checkpoint history",
    ],
    toolMode: "write-capable",
    toolModeLabel: "Site diary save/read tools",
    mutationRisk: "high",
    resetExplanation:
      "Clears WhatsApp site-manager checkpoint memory for this user and project. Saved site diary records are not deleted.",
  },
  "whatsapp-worker": {
    flow: "whatsapp-worker",
    label: "WhatsApp worker",
    threadIdPattern: "<workerId>",
    memoryScope: "worker",
    memoryScopeLabel: "One worker WhatsApp conversation",
    contextSources: [
      "system prompt",
      "WhatsApp message",
      "worker status",
      "injected app context",
      "tool outputs",
      "checkpoint history",
    ],
    toolMode: "write-capable",
    toolModeLabel: "Clock-in and worker diary tools",
    mutationRisk: "high",
    resetExplanation:
      "Clears worker agent checkpoint memory for this worker. Timelogs and diary records are not deleted.",
  },
  "structured-site-diary-save": {
    flow: "structured-site-diary-save",
    label: "Structured site diary save",
    threadIdPattern: "nested run inside site-manager/tool execution",
    memoryScope: "structured-run",
    memoryScopeLabel: "Single structured save operation",
    contextSources: ["source comment", "schema prompt", "injected app context", "structured model output"],
    toolMode: "structured-save",
    toolModeLabel: "Writes normalized site diary rows",
    mutationRisk: "high",
    resetExplanation:
      "Structured save traces are not reset directly from the AI Context page. Reset the parent conversation checkpoint if needed.",
  },
  "structured-worker-diary-save": {
    flow: "structured-worker-diary-save",
    label: "Structured worker diary save",
    threadIdPattern: "nested run inside worker/tool execution",
    memoryScope: "structured-run",
    memoryScopeLabel: "Single structured worker diary operation",
    contextSources: ["source comment", "schema prompt", "injected worker context", "structured model output"],
    toolMode: "structured-save",
    toolModeLabel: "Writes normalized worker diary rows",
    mutationRisk: "high",
    resetExplanation:
      "Structured save traces are not reset directly from the AI Context page. Reset the parent worker checkpoint if needed.",
  },
  "site-diary-agent": {
    flow: "site-diary-agent",
    label: "Site diary read agent",
    threadIdPattern: "<siteId>_SiteDiaryAgent",
    memoryScope: "project",
    memoryScopeLabel: "Project-level specialist memory",
    contextSources: ["specialist system prompt", "delegated question", "database reads", "checkpoint history"],
    toolMode: "read-only",
    toolModeLabel: "Reads site diary records",
    mutationRisk: "none",
    resetExplanation:
      "Clears site diary specialist checkpoint memory for this project. Site diary records are not deleted.",
    notes:
      "Project-level specialist memory is reused across delegated dashboard questions for the same site.",
  },
  "timesheets-agent": {
    flow: "timesheets-agent",
    label: "Timesheets read agent",
    threadIdPattern: "<siteId>_Timesheets-agent",
    memoryScope: "project",
    memoryScopeLabel: "Project-level specialist memory",
    contextSources: ["specialist system prompt", "delegated question", "database reads", "checkpoint history"],
    toolMode: "read-only",
    toolModeLabel: "Reads timesheets and worker hours",
    mutationRisk: "none",
    resetExplanation:
      "Clears timesheets specialist checkpoint memory for this project. Timelogs and worker records are not deleted.",
    notes:
      "Project-level specialist memory is reused across delegated dashboard questions for the same site.",
  },
  "bis-materials-agent": {
    flow: "bis-materials-agent",
    label: "BIS materials read agent",
    threadIdPattern: "<siteId>_BisMaterialsAgent",
    memoryScope: "project",
    memoryScopeLabel: "Project-level specialist memory",
    contextSources: ["specialist system prompt", "delegated question", "database reads", "checkpoint history"],
    toolMode: "read-only",
    toolModeLabel: "Reads BIS material records",
    mutationRisk: "none",
    resetExplanation:
      "Clears BIS materials specialist checkpoint memory for this project. BIS material records are not deleted.",
    notes:
      "Project-level specialist memory is reused across delegated dashboard questions for the same site.",
  },
} satisfies Record<AiFlowName, AiContextPolicy>;

export function getAiContextPolicy(flow: AiFlowName): AiContextPolicy {
  return AI_CONTEXT_POLICIES[flow];
}
