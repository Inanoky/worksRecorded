import { getAiContextPolicy, type AiContextPolicy } from "@/server/ai-flows/ai-context-policy";
import {
  type AiFlowName,
  getBisMaterialsAgentThreadId,
  getOrchestratingThreadId,
  getSiteDiaryAgentThreadId,
  getSiteManagerThreadId,
  getTimesheetsAgentThreadId,
  getWorkerThreadId,
} from "@/server/ai-flows/ai-run-context";

export type AiContextThreadCandidate = {
  id: string;
  label: string;
  flowName: AiFlowName;
  flow: string;
  owner: string;
  resettable: boolean;
  contextPolicy: AiContextPolicy;
};

export type AiContextWorkerCandidate = {
  id: string;
  name: string | null;
  surname: string | null;
  phone: string | null;
};

export function buildAiContextThreadCandidates(
  siteId: string,
  userId: string,
  workers: AiContextWorkerCandidate[],
): AiContextThreadCandidate[] {
  const workerThreads = workers.map((worker) => {
    const fullName = [worker.name, worker.surname].filter(Boolean).join(" ").trim();
    const flowName = "whatsapp-worker" as const;
    return {
      id: getWorkerThreadId(worker.id),
      label: fullName || worker.phone || worker.id,
      flowName,
      flow: "WhatsApp worker",
      owner: "Worker",
      resettable: true,
      contextPolicy: getAiContextPolicy(flowName),
    };
  });

  return [
    {
      id: getOrchestratingThreadId(siteId, userId),
      label: "Dashboard generic chat",
      flowName: "dashboard-chat",
      flow: "Dashboard chat",
      owner: "Current user",
      resettable: true,
      contextPolicy: getAiContextPolicy("dashboard-chat"),
    },
    {
      id: getSiteManagerThreadId(siteId, userId),
      label: "WhatsApp site manager",
      flowName: "whatsapp-site-manager",
      flow: "WhatsApp site manager",
      owner: "Current user",
      resettable: true,
      contextPolicy: getAiContextPolicy("whatsapp-site-manager"),
    },
    {
      id: getSiteDiaryAgentThreadId(siteId),
      label: "Site diary read agent",
      flowName: "site-diary-agent",
      flow: "Specialist read agent",
      owner: "Project",
      resettable: true,
      contextPolicy: getAiContextPolicy("site-diary-agent"),
    },
    {
      id: getTimesheetsAgentThreadId(siteId),
      label: "Timesheets read agent",
      flowName: "timesheets-agent",
      flow: "Specialist read agent",
      owner: "Project",
      resettable: true,
      contextPolicy: getAiContextPolicy("timesheets-agent"),
    },
    {
      id: getBisMaterialsAgentThreadId(siteId),
      label: "BIS materials read agent",
      flowName: "bis-materials-agent",
      flow: "Specialist read agent",
      owner: "Project",
      resettable: true,
      contextPolicy: getAiContextPolicy("bis-materials-agent"),
    },
    ...workerThreads,
  ];
}
