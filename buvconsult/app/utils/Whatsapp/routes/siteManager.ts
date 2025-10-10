
import { getString } from "@/app/utils/Whatsapp/shared/helpers";
import { sendMessage } from "@/app/utils/Whatsapp/shared/twillio";
import { handleProjectSelector } from "@/app/utils/Whatsapp/shared/projectSelector";
import { handleImage } from "@/app/utils/Whatsapp/shared/handleImage";
import { handleAudio } from "@/app/utils/Whatsapp/shared/handleAudio";
import { handleText } from "@/app/utils/Whatsapp/shared/handleText";
import talkToWhatsappAgent from "@/componentsFrontend/AI/Whatsapp/agent";
import { AgentFn } from "@/app/utils/Whatsapp/shared/types";
import { prisma } from "@/app/utils/db"; // ⬅️ need prisma
import { getUserFirstNameById } from "@/server/actions/whatsapp-actions";

const currentAgent: AgentFn = (input, siteId, userId) =>
  talkToWhatsappAgent(input, siteId, userId);

export async function handleSiteManagerRoute(args: {
  from: string | null;
  formData: FormData;
  user: any;
}) {
  const { from, formData, user } = args;

  const userName = await getUserFirstNameById(user.id);

  const body = (getString(formData, "Body") || "").trim();
  const numMedia = parseInt(getString(formData, "NumMedia") || "0", 10) || 0;

  // 1) Project selector can reply & exit early
  const handledSelection = await handleProjectSelector({ user, body, to: from, username: userName });
  if (handledSelection) return;

  // 2) Check if schema exists for selected site
  if (!user.lastSelectedSiteIdforWhatsapp) {
    await sendMessage(
      from,
      `Hello ${userName}! Please first select a project. Type 'Change' to see the project list.`
    );
    return;
  }

  const settings = await prisma.sitediarysettings.findUnique({
    where: { siteId: user.lastSelectedSiteIdforWhatsapp },
  });

  if (!settings || !settings.schema) {
    await sendMessage(
      from,
      `Hello ${userName}! Please first upload site schema in the project settings menu. Contact project admin.`
    );
    return;
  }

  // 3) Media path
  if (numMedia > 0) {
    const img = await handleImage({
      formData,
      numMedia,
      user,
      to: from,
      body,
      agent: currentAgent,
    });
    if (img) return;

    const aud = await handleAudio({
      formData,
      user,
      to: from,
      agent: currentAgent,
    });
    if (aud) return;

    await sendMessage(from, "Received your message!");
    return;
  }

  // 4) Text-only
  await handleText({ body, user, to: from, agent: currentAgent });
}
