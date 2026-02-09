"use server";

import { prisma } from "@/lib/utils/db";
import { sendMessage } from "./twillio";

/**
 * Reusable "project selection" flow for WhatsApp routes.
 * - If user sends "change" → clears selection and sends the project list.
 * - If user has no selection:
 *    - If they reply with a valid number → select that site, confirm, and return handled=true
 *    - Else → send the project list prompt and return handled=true
 * - If user already has a selection → return handled=false (caller continues normal flow)
 */
export async function handleProjectSelector(args: {
  user: any;
  body: string;
  to: string | null;
  username: string | null;
}): Promise<boolean> {
  const { user, body, to, username } = args;
  const text = (body || "").trim().toLowerCase();

  const userName = username

  console.log("📌 [handleProjectSelector] called with:", {
    userId: user?.id,
    role: user?.role,
    currentSelection: user?.lastSelectedSiteIdforWhatsapp,
    body,
    normalizedText: text,
    to,
    siteCount:  user?.organization?.sites.length ?? 0,
  });

  // 1) Explicit change command
  if (text === "change") {
    console.log("🔄 User requested to change project selection.");
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSelectedSiteIdforWhatsapp: null },
    });
    console.log("✅ Cleared lastSelectedSiteIdforWhatsapp for user:", user.id);

    const msg = await buildProjectListPrompt(user, `Hello ${userName}! You have cleared your project selection.`);
    console.log("📤 Sending project list after change:", msg);
    await sendMessage(to, msg);
    return true;
  }

  // 2) No active selection → either select by number or prompt
  if (!user.lastSelectedSiteIdforWhatsapp) {
    console.log("❗ User has no current project selection.");
    const n = parseInt(body, 10);
    const isValid = Number.isFinite(n) && n >= 1 && n <=  user?.organization?.sites.length;
    console.log("🔎 Parsed selection:", { n, isValid });

    if (isValid) {
      const selected =  user?.organization?.sites[n - 1];
      console.log("✅ User selected valid project:", {
        projectId: selected.id,
        projectName: selected.name,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastSelectedSiteIdforWhatsapp: selected.id },
      });

      const msg = `${userName}, You are now talking to project "${selected.name}". To change the project, type "Change".`;
      console.log("📤 Sending confirmation:", msg);
      await sendMessage(to, msg);
      return true;
    }

    console.log("⚠️ Invalid selection. Sending project list.");
    const msg = await buildProjectListPrompt(user, `Hi ${user.firstName || ""}!`);
    console.log("📤 Sending project list:", msg);
    await sendMessage(to, msg);
    return true;
  }

  // 3) Already selected → nothing to do here
  console.log("➡️ User already has project selected:", user.lastSelectedSiteIdforWhatsapp);
  return false;
}

/** Builds a numbered project list message for the user. */
export async function buildProjectListPrompt(
  user: any,
  prefix = "Please choose your project:"
) {
  const siteList = ( user?.organization?.sites || [])
    .map((s: any, i: number) => `${i + 1} - ${s.name}`)
    .join("\n");

  const result = `${prefix}\nBelow is list of your projects. Please, reply with the project number you want to report to. For example "1" :\n${siteList}`;
  console.log("📝 [buildProjectListPrompt] Generated prompt:", result);
  return result;
}