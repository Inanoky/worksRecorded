"use client";

import { sendGTMEvent } from "@next/third-parties/google";

const trackedLeadIds = new Set<string>();

export function trackGenerateLeadOnce(leadId: string) {
  if (!leadId || trackedLeadIds.has(leadId)) return false;

  trackedLeadIds.add(leadId);
  sendGTMEvent({
    event: "generate_lead",
    eventModel: {
      currency: "EUR",
      event_id: leadId,
      event_name: "generate_lead",
      transaction_id: leadId,
      value: 1,
    },
  });

  return true;
}
