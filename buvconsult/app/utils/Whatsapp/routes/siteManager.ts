import { getString } from "@/app/utils/Whatsapp/shared/helpers";
import { sendMessage } from "@/app/utils/Whatsapp/shared/twillio";
import { handleProjectSelector } from "@/app/utils/Whatsapp/shared/projectSelector";
import { handleImage } from "@/app/utils/Whatsapp/shared/handleImage";
import { handleAudio } from "@/app/utils/Whatsapp/shared/handleAudio";
import { handleText } from "@/app/utils/Whatsapp/shared/handleText";
import talkToWhatsappAgent from "@/components/AI/Whatsapp/agent"; // <- current agent
import { AgentFn } from "@/app/utils/Whatsapp/shared/types";

const currentAgent: AgentFn = (input, siteId, userId) =>
  talkToWhatsappAgent(input, siteId, userId);

export async function handleSiteManagerRoute(args: {
  from: string | null;
  formData: FormData;
  user: any;
}) {
  const { from, formData, user } = args;

  const body = (getString(formData, "Body") || "").trim();
  const numMedia = parseInt(getString(formData, "NumMedia") || "0", 10) || 0;

  // 1) Project selector can reply & exit early
  const handledSelection = await handleProjectSelector({ user, body, to: from });
  if (handledSelection) return;

  // 2) Media path
  if (numMedia > 0) {
    const img = await handleImage({ formData, numMedia, user, to: from, body, agent: currentAgent });
    if (img) return;

    const aud = await handleAudio({ formData, user, to: from, agent: currentAgent });
    if (aud) return;

    await sendMessage(from, "Received your message!");
    return;
  }

  // 3) Text-only
  await handleText({ body, user, to: from, agent: currentAgent });
}
