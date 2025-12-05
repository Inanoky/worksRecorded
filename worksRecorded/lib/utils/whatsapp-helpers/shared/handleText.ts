import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/twillio";
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
  const reply = await agent(body, user.lastSelectedSiteIdforWhatsapp, user.id);
  await sendMessage(to, reply);
}
