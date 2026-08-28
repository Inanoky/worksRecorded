"use server"

import { prisma } from "@/lib/utils/db";
import { Prisma } from "@prisma/client";
import { Resend } from "resend";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json"
import { sendManualWhatsappReminder } from "@/lib/whatsapp-reminders/engine";
import { z } from "zod";

import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";






const ORG_CODE = "org_ed664b1eedd";

// NOTE: don't log your API key
const hasKey = Boolean(process.env.RESEND_API_KEY);
if (!hasKey) {
  console.warn("[inviteUserByEmail] RESEND_API_KEY is missing in env.");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const inviteEmailSchema = z.string().trim().email("Invalid email").transform((value) => value.toLowerCase());

/**
 * Sends an org-scoped Kinde signup link to the given email.
 * Adds debug logs for troubleshooting.
 */
export async function inviteUserByEmail(formData: FormData) {
  try {
    const emailRaw = formData.get("email");
    const organizationId = String(formData.get("organizationId") || "").trim();
    console.log("[inviteUserByEmail] raw email from formData:", emailRaw);
    const parsedEmail = inviteEmailSchema.safeParse(String(emailRaw || ""));
    if (!parsedEmail.success) return { ok: false, message: "Please provide a valid email" };
    const email = parsedEmail.data;
    if (!organizationId) return { ok: false, message: "Organization is required" };

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingUser) {
      return { ok: false, message: "User with this email already exists" };
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

    const created = await saveTemporaryUser(email, organizationId);
    if (!created.ok) {
      return { ok: false, message: created.message ?? "Invitation was sent, but saving user failed" };
    }

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
    const parsedEmail = inviteEmailSchema.safeParse(email);
    if (!parsedEmail.success) {
      return { ok: false, message: "Please provide a valid email" };
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: parsedEmail.data, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingUser) {
      return { ok: false, message: "User with this email already exists" };
    }

    await prisma.user.create({
      data: {

        id: crypto.randomUUID(),       
        email: parsedEmail.data,
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

  const roleRows = workers.length
    ? await prisma.$queryRaw<Array<{ id: string; role: string | null }>>`
        SELECT id, role FROM "workers" WHERE id IN (${Prisma.join(workers.map((worker) => worker.id))})
      `
    : [];
  const roleByWorkerId = new Map(roleRows.map((row) => [row.id, row.role]));

  return {
    workers: workers.map((worker) => ({
      ...worker,
      role: roleByWorkerId.get(worker.id) ?? null,
    })),
    projects,
  };
}

export async function updateWorkerOrganizationSettings(
  workerId: string,
  data: {
    siteId?: string | null;
    name?: string | null;
    surname?: string | null;
    role?: string | null;
    phone?: string | null;
    reminderTime?: Date | null;
    remindersEnabled?: boolean;
    reminderText?: string | null;
    timezone?: string | null;
  }
) {
  const { role, ...workerData } = data;
  await prisma.workers.update({
    where: { id: workerId },
    data: workerData,
  });

  if (role !== undefined) {
    await prisma.$executeRaw`
      UPDATE "workers" SET role = ${role} WHERE id = ${workerId}
    `;
  }

  return { ok: true };
}

export async function createOrganizationWorker(data: {
  organizationId: string;
  siteId?: string | null;
  name: string;
  surname?: string | null;
  phone?: string | null;
  role?: string | null;
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

  if (data.role?.trim()) {
    await prisma.$executeRaw`
      UPDATE "workers" SET role = ${data.role.trim()} WHERE id = ${created.id}
    `;
  }

  return { ok: true, id: created.id };
}

export async function deleteOrganizationWorker(workerId: string) {
  const worker = await prisma.workers.findUnique({
    where: { id: workerId },
    select: { id: true },
  });

  if (!worker) {
    return { ok: true };
  }

  await prisma.$transaction([
    prisma.whatsAppIdentity.updateMany({
      where: { workerId },
      data: { workerId: null },
    }),
    prisma.workers.update({
      where: { id: workerId },
      data: {
        organizationId: null,
        siteId: null,
        phone: null,
        isClockedIn: false,
        remindersEnabled: false,
        reminderTime: null,
        reminderText: null,
        timezone: null,
      },
    }),
  ]);

  await prisma.$executeRaw`
    UPDATE "workers" SET role = NULL WHERE id = ${workerId}
  `;

  await prisma.$executeRaw`
    UPDATE "workers" SET "personalId" = NULL WHERE id = ${workerId}
  `;

  return { ok: true };
}

export async function deleteOrganizationUser(userId: string) {
  await prisma.user.delete({
    where: { id: userId },
  });

  return { ok: true };
}

export async function sendManualReminder(args: {
  targetType: "user" | "worker";
  targetId: string;
  reminderText?: string | null;
}) {
  return await sendManualWhatsappReminder(args);
}

export async function getWhatsappReminderLogs(
  orgId: string,
  filters?: {
    status?: string | null;
    targetType?: string | null;
    take?: number | null;
  },
) {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { organizationId: true },
  });

  if (!dbUser?.organizationId || dbUser.organizationId !== orgId) {
    throw new Error("Unauthorized");
  }

  const take = Math.min(Math.max(filters?.take ?? 50, 1), 100);
  const logs = await prisma.whatsappReminderLog.findMany({
    where: {
      organizationId: orgId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.targetType ? { targetType: filters.targetType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const userIds = logs
    .filter((log) => log.targetType === "user")
    .map((log) => log.targetId);
  const workerIds = logs
    .filter((log) => log.targetType === "worker")
    .map((log) => log.targetId);
  const siteIds = logs
    .map((log) => log.siteId)
    .filter((siteId): siteId is string => Boolean(siteId));

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const workers = workerIds.length
    ? await prisma.workers.findMany({
        where: { id: { in: workerIds } },
        select: { id: true, name: true, surname: true },
      })
    : [];
  const sites = siteIds.length
    ? await prisma.site.findMany({
        where: { id: { in: siteIds }, organizationId: orgId },
        select: { id: true, name: true },
      })
    : [];

  const userNameById = new Map(
    users.map((target) => [
      target.id,
      [target.firstName, target.lastName].filter(Boolean).join(" ") || target.email,
    ]),
  );
  const workerNameById = new Map(
    workers.map((target) => [
      target.id,
      [target.name, target.surname].filter(Boolean).join(" ") || target.id,
    ]),
  );
  const siteNameById = new Map(sites.map((site) => [site.id, site.name]));

  return logs.map((log) => ({
    id: log.id,
    targetType: log.targetType,
    targetId: log.targetId,
    targetName:
      log.targetType === "user"
        ? userNameById.get(log.targetId) ?? log.targetId
        : workerNameById.get(log.targetId) ?? log.targetId,
    siteName: log.siteId ? siteNameById.get(log.siteId) ?? log.siteId : null,
    localDate: log.localDate,
    timezone: log.timezone,
    scheduledHHmm: log.scheduledHHmm,
    source: log.source,
    status: log.status,
    reason: log.reason,
    recipientPhoneMasked: log.recipientPhoneMasked,
    metaMessageId: log.metaMessageId,
    metaStatus: log.metaStatus,
    errorMessage: log.errorMessage,
    sentAt: log.sentAt?.toISOString() ?? null,
    createdAt: log.createdAt.toISOString(),
  }));
}
