"use server";

import { prisma } from "@/app/utils/db";
import { sendMessage } from "./twillio";

/**
 * Project selector with special rule:
 * - If user.firstName === "Marcis", use `siteManagerSelectIdforWhatsapp`
 * - Otherwise, use `lastSelectedSiteIdforWhatsapp`
 */
export async function handleProjectSelector(args: {
  user: any;
  body: string;
  to: string | null;
  username: string | null;
}): Promise<boolean> {
  const { user, body, to, username } = args;
  const text = (body || "").trim().toLowerCase();
  const userName = username;

  const isMarcis =
    (user?.firstName || "").trim().toLowerCase() === "marcis";
  const selectionField = isMarcis
    ? "siteManagerSelectIdforWhatsapp"
    : "lastSelectedSiteIdforWhatsapp";

  console.log("📌 [handleProjectSelector] called with:", {
    userId: user?.id,
    role: user?.role,
    usingSelectionField: selectionField,
    currentSelection: user?.[selectionField],
    body,
    normalizedText: text,
    to,
    siteCount: user?.Site?.length ?? 0,
  });

  // 1) Explicit change command
  if (text === "change") {
    console.log("🔄 User requested to change project selection.");
    await prisma.user.update({
      where: { id: user.id },
      data: { [selectionField]: null } as any,
    });
    console.log(`✅ Cleared ${selectionField} for user:`, user.id);

    const msg = await buildProjectListPrompt(
      user,
      `Hello ${userName}! You have cleared your project selection.`
    );
    console.log("📤 Sending project list after change:", msg);
    await sendMessage(to, msg);
    return true;
  }

  // 2) No active selection → either select by number or prompt
  if (!user?.[selectionField]) {
    console.log("❗ User has no current project selection.");
    const n = parseInt(body, 10);
    const isValid = Number.isFinite(n) && n >= 1 && n <= (user.Site?.length ?? 0);
    console.log("🔎 Parsed selection:", { n, isValid });

    if (isValid) {
      const selected = user.Site[n - 1];
      console.log("✅ User selected valid project:", {
        projectId: selected.id,
        projectName: selected.name,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { [selectionField]: selected.id } as any,
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
  console.log("➡️ User already has project selected:", user?.[selectionField]);
  return false;
}

/** Builds a numbered project list message for the user. */
export async function buildProjectListPrompt(
  user: any,
  prefix = "Please choose your project:"
) {
  const siteList = (user.Site || [])
    .map((s: any, i: number) => `${i + 1} - ${s.name}`)
    .join("\n");

  const result = `${prefix}\nReply with the number:\n${siteList}`;
  console.log("📝 [buildProjectListPrompt] Generated prompt:", result);
  return result;
}