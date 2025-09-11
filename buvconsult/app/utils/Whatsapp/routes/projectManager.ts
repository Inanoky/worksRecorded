// app/utils/Whatsapp/routes/projectManager.ts
"use server";

import { prisma } from "@/app/utils/db";
import { sendMessage } from "@/app/utils/Whatsapp/shared/twillio";
import { getString } from "@/app/utils/Whatsapp/shared/helpers";
import { handleProjectSelector } from "@/app/utils/Whatsapp/shared/projectSelector";
import { handleAudio } from "@/app/utils/Whatsapp/shared/handleAudio";
import { handleText } from "@/app/utils/Whatsapp/shared/handleText";
import talkToProjectDiaryAgent from "@/componentsFrontend/AI/ProjectDiary/agent";
import { AgentFn } from "@/app/utils/Whatsapp/shared/types";
import { getUserFirstNameById } from "@/app/actions/whatsappActions";

const projectDiaryAgent: AgentFn = async (input, siteId, userId) => {
  if (!siteId) {
    return "No project selected. Reply with a number from the list or type 'Change' to pick again.";
  }
  const out = await talkToProjectDiaryAgent(input, siteId, userId); // string | null
  return out ?? "Ok.";
};




export async function handleProjectManagerRoute(args: {
  from: string | null;
  formData: FormData;
  user: any;
}) {
  const { from, formData, user } = args;

  const userName = await getUserFirstNameById(user.id);

  const body = (getString(formData, "Body") || "").trim();
  const numMedia = parseInt(getString(formData, "NumMedia") || "0", 10) || 0;

  // Ensure project selected
  const handledSelection = await handleProjectSelector({ user, body, to: from, username: userName });
  if (handledSelection) return;

  // Re-check selected site
  const refreshed = await prisma.user.findUnique({
    where: { id: user.id },
    select: { lastSelectedSiteIdforWhatsapp: true },
  });
  const siteId = refreshed?.lastSelectedSiteIdforWhatsapp ?? null;

  // Media path (audio only for now)
  if (numMedia > 0) {
    const handledAud = await handleAudio({ formData, user, to: from, agent: projectDiaryAgent });
    if (handledAud) return;
    await sendMessage(from, "Received your message!");
    return;
  }

  // Text path
  await handleText({ body, user, to: from, agent: projectDiaryAgent });
}
