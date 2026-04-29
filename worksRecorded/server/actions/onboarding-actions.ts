"use server";

import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { updateOrganizationLanguage } from "@/server/actions/shared-actions";

function readTourFlags(tour: unknown): Record<string, unknown> {
  if (!tour || typeof tour !== "object" || Array.isArray(tour)) return {};
  return tour as Record<string, unknown>;
}

export async function completeOnboardingLanguage(language: "en" | "lv") {
  const user = await requireUser();

  await updateOrganizationLanguage(language);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { userTour: true },
  });

  const current = readTourFlags(dbUser?.userTour);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      userTour: {
        ...current,
        onboardingLanguageSelected: true,
      },
    },
  });

  return { ok: true };
}

export async function sendFirstProjectWelcomeTemplateIfNeeded(args: { siteId: string; projectName: string }) {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, userTour: true },
  });

  const current = readTourFlags(dbUser?.userTour);
  if (current.whatsappWelcomeSent) return { ok: true, skipped: true };

  if (!args.projectName?.trim()) return { ok: false, skipped: true, reason: "missing-project-name" };

  const to = dbUser?.phone?.replace(/\D/g, "") ?? "";
  if (!to) return { ok: false, skipped: true, reason: "missing-phone" };

  const token = process.env.META_ACCESS_TOKEN;
  const businessPhoneNumberId = process.env.META_PHONE_NUMBER_ID;
  if (!token || !businessPhoneNumberId) return { ok: false, skipped: true, reason: "missing-meta-env" };

  const onboardingText = "Jūs varat sākt šajā čatā ar balsi stāstīt, kas notika būvobjektā, un ziņas tiks saglabātas jūsu projektā :";

  const res = await fetch(`https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: "onboarding_template_lv",
        language: { code: "en" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: onboardingText },
            { type: "text", text: args.projectName },
          ],
        }],
      },
    }),
  });

  if (res.ok) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        userTour: { ...current, whatsappWelcomeSent: true },
        lastSelectedSiteIdforWhatsapp: args.siteId,
      },
    });
  }

  return { ok: res.ok, skipped: false };
}
