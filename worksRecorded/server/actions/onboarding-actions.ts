"use server";

import { prisma } from "@/lib/utils/db";
import { getPhoneDigits, normalizeInternationalPhoneForWhatsApp } from "@/lib/utils/phone/international-phone";
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
  console.log("[onboarding-whatsapp] start", { userId: user.id, siteId: args.siteId, projectName: args.projectName });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      phone: true,
      userTour: true,
      organization: { select: { orgLanguage: true } },
    },
  });

  const current = readTourFlags(dbUser?.userTour);
  if (current.whatsappWelcomeSent) {
    console.log("[onboarding-whatsapp] skip: already-sent", { userId: user.id });
    return { ok: true, skipped: true, reason: "already-sent" };
  }

  if (!args.projectName?.trim()) {
    console.log("[onboarding-whatsapp] skip: missing-project-name", { userId: user.id, siteId: args.siteId });
    return { ok: false, skipped: true, reason: "missing-project-name" };
  }

  const phoneDigits = getPhoneDigits(dbUser?.phone);
  if (!phoneDigits) {
    console.log("[onboarding-whatsapp] skip: missing-phone", { userId: user.id });
    return { ok: false, skipped: true, reason: "missing-phone" };
  }

  const to = normalizeInternationalPhoneForWhatsApp(dbUser?.phone);
  if (!to) {
    console.log("[onboarding-whatsapp] skip: invalid-phone", { userId: user.id, phoneDigits });
    return { ok: false, skipped: true, reason: "invalid-phone" };
  }

  const token = process.env.META_ACCESS_TOKEN;
  const businessPhoneNumberId = process.env.META_PHONE_NUMBER_ID;
  if (!token || !businessPhoneNumberId) {
    console.log("[onboarding-whatsapp] skip: missing-meta-env", {
      hasAccessToken: Boolean(token),
      hasPhoneNumberId: Boolean(businessPhoneNumberId),
    });
    return { ok: false, skipped: true, reason: "missing-meta-env" };
  }

  const orgLanguage = dbUser?.organization?.orgLanguage === "lv" ? "lv" : "en";

const onboardingText =
  orgLanguage === "lv"
    ? "Lai mainītu projektu, rakstiet “Projekts”. Vari sūtīt ziņas par to, kas notiek objektā, kā arī bildes.  Tavs projekts :"
    : "To change project write here “Change”. Your project : ";
  
  
  
  
    const templateName = orgLanguage === "lv" ? "onboarding_template_lv" : "onboarding_template_en";

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: onboardingText },
          { type: "text", text: args.projectName },
        ],
      }],
    },
  };

  console.log("[onboarding-whatsapp] sending", {
    userId: user.id,
    siteId: args.siteId,
    to,
    templateName,
    orgLanguage,
  });

  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[onboarding-whatsapp] fetch-error", { userId: user.id, siteId: args.siteId, error });
    return { ok: false, skipped: false, reason: "fetch-error" };
  }

  const responseText = await res.text();
  console.log("[onboarding-whatsapp] response", {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    body: responseText,
  });

  if (res.ok) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        userTour: { ...current, whatsappWelcomeSent: true },
        lastSelectedSiteIdforWhatsapp: args.siteId,
      },
    });
    console.log("[onboarding-whatsapp] success-marked-sent", { userId: user.id, siteId: args.siteId });
  }

  return { ok: res.ok, skipped: false, reason: res.ok ? "sent" : "meta-api-error" };
}
