import "server-only";
import type { AgentFn } from "@/lib/utils/whatsapp-helpers/shared/types";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import { prepareDiaryReviewScope } from "./diary-review-queue";
import { getSiteManagerAgentRunContext } from "./site-manager-agent/runContext";

export function withDiaryIntakePilot(legacy: AgentFn): AgentFn {
  return async (input, siteId, userId, audioUrl) => {
    const source = getWhatsappSourceContext();
    const scope = await prepareDiaryReviewScope({
      siteId: siteId ?? undefined,
      userId: userId ?? undefined,
      organizationId: null,
      senderPhone: source.senderPhone,
      sourceMessageId: source.messageId,
      isEval:
        getSiteManagerAgentRunContext()?.evalRecordMetadata?.isEval === true,
    });
    if (!scope) return legacy(input, siteId, userId, audioUrl);
    const { processDiaryIntake } = await import("./diary-intake");
    return processDiaryIntake(scope, input, audioUrl, source.receivedAt);
  };
}
