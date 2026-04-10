"use server"

import { prisma } from "@/lib/utils/db";
import { Resend } from "resend";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json"

import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";






const ORG_CODE = "org_ed664b1eedd";

// NOTE: don't log your API key
const hasKey = Boolean(process.env.RESEND_API_KEY);
if (!hasKey) {
  console.warn("[inviteUserByEmail] RESEND_API_KEY is missing in env.");
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an org-scoped Kinde signup link to the given email.
 * Adds debug logs for troubleshooting.
 */
export async function inviteUserByEmail(formData: FormData) {
  try {
    const emailRaw = formData.get("email");
    console.log("[inviteUserByEmail] raw email from formData:", emailRaw);

    const email = String(emailRaw || "").trim().toLowerCase();
    if (!email) {
      console.warn("[inviteUserByEmail] missing email");
      return { ok: false, message: "Email is required" };
    }

    const link = `https://worksrecorded.com/api/auth/register?org_code=${ORG_CODE}&login_hint=${encodeURIComponent(
      email
    )}`;

    console.log("[inviteUserByEmail] prepared link:", link);
    console.log("[inviteUserByEmail] from domain:", "no-reply@buvconsult.com");
    console.log("[inviteUserByEmail] has RESEND_API_KEY:", hasKey);

    // TIP: Resend requires a verified sending domain (DNS DKIM set up).
    // If domain isn't verified, you'll typically get 403 or a descriptive error.

    const result = await resend.emails.send({
      from: 'BUVCONSULT <invite@no-reply.buvconsult.com>',
      to: email,
      subject: "WorksRecorded – Invitation to join",
      html: `
        <p>You have been invited to join <b>WorksRecorded</b>.</p>
        <p><a href="${link}">Click here to create your account</a></p>
        <p>If the button does not work, copy and paste this link:</p>
        <p>${link}</p>
      `,
    });

    // Resend returns `{ id?: string, error?: any }`
    console.log("[inviteUserByEmail] resend.emails.send() result:", result);

    if ((result as any)?.error) {
      console.error("[inviteUserByEmail] Resend error payload:", (result as any).error);
      return {
        ok: false,
        message:
          (result as any).error?.message ||
          (result as any).error ||
          "Resend returned an error",
      };
    }

    const messageId = (result as any)?.id ?? "(no id)";
    console.log("[inviteUserByEmail] email queued successfully. id:", messageId);

    return { ok: true };
  } catch (err: any) {
    // Log as much as possible without leaking secrets
    console.error("[inviteUserByEmail] exception name:", err?.name);
    console.error("[inviteUserByEmail] exception message:", err?.message);
    console.error("[inviteUserByEmail] exception stack:", err?.stack);

    // Some SDK/network libs expose response details like this:
    if (err?.status) console.error("[inviteUserByEmail] http status:", err.status);
    if (err?.response) {
      try {
        const body = await err.response.text?.();
        console.error("[inviteUserByEmail] http response body:", body);
      } catch {
        // ignore if not readable
      }
    }

    return { ok: false, message: err?.message ?? "Failed to send email" };
  }
}



export async function getUserData(orgId){


   const users = await prisma.user.findMany({

        where: {organizationId : orgId},
        select: {
            id: true,
            email : true,
            firstName : true,
            lastName : true,
            phone : true,
            role : true,
            status: true,
            reminderTime: true,
            remindersEnabled: true,
            reminderText: true,

        }
    })

    return  users


}

export async function editUserData( id, data){


    await prisma.user.update({

        where: {id },
        data
        
    })

    return  "Success"


}


export async function saveTemporaryUser(email: string, organizationId: string) {
  console.log("[saveTemporaryUser] called with:", { email, organizationId });

  try {
    await prisma.user.create({
      data: {

        id: crypto.randomUUID(),       
        email: email,
        firstName: "",           // placeholder
        lastName: "",            // placeholder
        profileImage: "",        // placeholder
        organizationId: organizationId,
        status: "pending",
      },
    });

    console.log("[saveTemporaryUser] success:", { email, organizationId });
    return { ok: true };
  } catch (e: any) {
    console.log("[saveTemporaryUser] error:", e?.message);
    return { ok: false, message: e?.message ?? "Failed to save temporary user" };
  }
}


//--------------Settings mode----------------

export type SiteDiaryMode = "sorting" | "nosorting";

function buildConfig(mode: SiteDiaryMode) {
  const config = structuredClone(defaultConfig);

  if (!config.AIpromptToUse) {
    config.AIpromptToUse = {
      Type: "noRender",
      Client: "DEPROM",
    };
  }

  config.AIpromptToUse.Client =
    mode === "sorting" ? "DEPROM" : "NoSorting";

  return config;
}

export async function getSiteDiaryMode(siteId: string) {
  const user = await requireUser();
  await orgCheck(user.id, siteId);

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      siteDiaryMode: true,
      siteDiaryRecordsMap: true,
    },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  return {
    mode: (site.siteDiaryMode as SiteDiaryMode | null) ?? "sorting",
    config: site.siteDiaryRecordsMap,
  };
}

export async function saveSiteDiaryMode(
  siteId: string,
  mode: SiteDiaryMode
) {
  const user = await requireUser();
  await orgCheck(user.id, siteId);

  const config = buildConfig(mode);

  await prisma.site.update({
    where: { id: siteId },
    data: {
      siteDiaryMode: mode,
      siteDiaryRecordsMap: config,
    },
  });

  return { success: true };
}

export async function getOrganizationWorkers(orgId: string) {
  const projects = await prisma.site.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const siteIds = projects.map((site) => site.id);

  const workers = await prisma.workers.findMany({
    where: {
      OR: [
        { organizationId: orgId },
        ...(siteIds.length ? [{ siteId: { in: siteIds } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      surname: true,
      phone: true,
      siteId: true,
      reminderTime: true,
      remindersEnabled: true,
      reminderText: true,
    },
    orderBy: [{ name: "asc" }, { surname: "asc" }],
  });

  return { workers, projects };
}

export async function updateWorkerOrganizationSettings(
  workerId: string,
  data: {
    siteId?: string | null;
    name?: string | null;
    surname?: string | null;
    phone?: string | null;
    reminderTime?: Date | null;
    remindersEnabled?: boolean;
    reminderText?: string | null;
    timezone?: string | null;
  }
) {
  await prisma.workers.update({
    where: { id: workerId },
    data,
  });

  return { ok: true };
}

export async function createOrganizationWorker(data: {
  organizationId: string;
  siteId?: string | null;
  name: string;
  surname?: string | null;
  phone?: string | null;
}) {
  const created = await prisma.workers.create({
    data: {
      organizationId: data.organizationId,
      siteId: data.siteId ?? null,
      name: data.name.trim(),
      surname: data.surname?.trim() || null,
      phone: data.phone?.trim() || null,
      remindersEnabled: false,
      timezone: "Europe/Riga",
    },
    select: { id: true },
  });

  return { ok: true, id: created.id };
}

export async function deleteOrganizationWorker(workerId: string) {
  await prisma.workers.delete({
    where: { id: workerId },
  });

  return { ok: true };
}

function normalizePhoneForMeta(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

async function sendMetaWhatsAppText(to: string, body: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const businessPhoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !businessPhoneNumberId) {
    throw new Error("Missing META_ACCESS_TOKEN or META_PHONE_NUMBER_ID");
  }

  const res = await fetch(`https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      text: { body },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Meta send failed (${res.status}): ${errorBody}`);
  }
}

export async function sendManualReminder(args: {
  targetType: "user" | "worker";
  targetId: string;
  reminderText?: string | null;
}) {
  const overrideText = args.reminderText?.trim() || null;

  if (args.targetType === "user") {
    const user = await prisma.user.findUnique({
      where: { id: args.targetId },
      select: { phone: true, reminderText: true },
    });

    const to = normalizePhoneForMeta(user?.phone);
    if (!to) throw new Error("User does not have a valid phone number");

    const text = overrideText || user?.reminderText?.trim() || null;
    if (!text) throw new Error("Reminder text is empty. Please set reminder text first.");

    await sendMetaWhatsAppText(to, text);
    return { ok: true };
  }

  const worker = await prisma.workers.findUnique({
    where: { id: args.targetId },
    select: { phone: true, reminderText: true },
  });

  const to = normalizePhoneForMeta(worker?.phone);
  if (!to) throw new Error("Worker does not have a valid phone number");

  const text = overrideText || worker?.reminderText?.trim() || null;
  if (!text) throw new Error("Reminder text is empty. Please set reminder text first.");

  await sendMetaWhatsAppText(to, text);
  return { ok: true };
}
