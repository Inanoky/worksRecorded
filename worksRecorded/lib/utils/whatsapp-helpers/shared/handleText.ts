import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/sender";
import { AgentFn } from "./types";

/**
 * Handle plain text by calling an injected agent.
 */
export async function handleText(args: {
  body: string;
  user: any;
  to: string | null;
  agent: AgentFn; // <- inject agent here
}) {
  const { body, user, to, agent } = args;
  try {
    const reply = await agent(body, user.lastSelectedSiteIdforWhatsapp, user.id);
    await sendMessage(to, reply);
  } catch (error) {
    console.error("[handleText] agent invocation failed", error);
    await sendMessage(to, "WorkRecorded: Sorry, there was a temporary issue. Please send your message one more time.");
  }
}
