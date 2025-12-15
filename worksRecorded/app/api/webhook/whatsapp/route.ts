"use server";

import { after } from "next/server";
import { prisma } from "@/lib/utils/db";
import { getString, normalizePhone } from "../../../../lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "../../../../lib/utils/whatsapp-helpers/shared/twillio";
import { handleWorkerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/worker";
import { handleProjectManagerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/project-manager-route";
import { handleSiteManagerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route";

const DEBUG_SYNC = true;

// safety: auto-clear stuck locks older than this
const LOCK_TTL_MS = 90_000;

function isUniqueViolation(e: any) {
  return e?.code === "P2002";
}

async function cleanupStaleLock(phone: string) {
  const cutoff = new Date(Date.now() - LOCK_TTL_MS);
  await prisma.whatsappTextLock.deleteMany({
    where: { phone, lockedAt: { lt: cutoff } },
  });
}

async function tryAcquireTextLock(phone: string, messageSid?: string | null) {
  await cleanupStaleLock(phone);

  try {
    await prisma.whatsappTextLock.create({
      data: { phone, messageSid: messageSid || undefined },
    });
    return true;
  } catch (e: any) {
    if (isUniqueViolation(e)) return false;
    throw e;
  }
}

async function releaseTextLock(phone: string) {
  await prisma.whatsappTextLock.deleteMany({ where: { phone } });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    console.log("📥 [/api/webhook/whatsapp] webhook hit");

    if (DEBUG_SYNC) {
      console.log("🐞 DEBUG_SYNC = true → running dispatch inline");
      await dispatch(formData);
    } else {
      console.log("⏭️ Using after() to defer work");
      after(() => dispatch(formData));
    }

    return new Response("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("❌ POST error:", err);
    return new Response("<Response></Response>", {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

async function dispatch(formData: FormData) {
  let lockHeld = false;
  let lockPhone: string | null = null;

  try {
    console.dir(formData, { depth: null });

    const smsStatus = getString(formData, "SmsStatus");
    const from = getString(formData, "From");
    const waId = getString(formData, "WaId");
    const body = (getString(formData, "Body") || "").trim();

    const numMediaRaw = getString(formData, "NumMedia");
    const numMedia = Number(numMediaRaw || "0");
    const isText = !Number.isNaN(numMedia) ? numMedia === 0 : true;

    const messageSid = getString(formData, "MessageSid") || getString(formData, "SmsMessageSid") || null;

    console.log("🔎 Parsed formData:", {
      smsStatus,
      from,
      waId,
      body,
      numMediaRaw,
      numMedia,
      isText,
      messageSid,
    });

    if (smsStatus && smsStatus.toLowerCase() !== "received") {
      console.log("📭 Skipping non-received status:", smsStatus);
      return;
    }

    const phone = await normalizePhone(waId, from);
    console.log("📞 Normalized phone:", phone);

    // TEXT ONLY: enforce per-phone lock (DB row)
    if (isText) {
      const acquired = await tryAcquireTextLock(phone, messageSid);
      if (!acquired) {
        console.log("🔒 Text lock busy → replying 'Please wait…' and skipping", { phone, messageSid });
        await sendMessage(from, "Please wait…");
        return;
      }
      lockHeld = true;
      lockPhone = phone;
      console.log("🔓 Text lock acquired", { phone, messageSid });
    } else {
      console.log("🖼️ Media message → no lock (allowed to spam)");
    }

    // Worker route
    const worker = await prisma.workers.findFirst({ where: { phone } });
    console.log("👷 Worker found?", !!worker);
    if (worker) {
      console.log("➡️ Orchestrating → WORKER route");
      await handleWorkerRoute({ phone, formData });
      console.log("✅ WORKER route handled");
      return;
    }

    // User lookup
    const user = await prisma.user.findFirst({
      where: { phone },
      include: {
        organization: {
          include: {
            sites: true,
          },
        },
      },
    });

    console.log("👤 User found?", !!user);

    if (!user) {
      console.log("🚫 No user for this phone. Sending rejection.");
      await sendMessage(from, "Sorry, this phone number is not registered. Please contact admin.");
      return;
    }

    const role = (user.role || "").trim().toLowerCase();
    console.log("🎭 User role:", role);

    if (role === "project manager") {
      console.log("➡️ Orchestrating → PROJECT MANAGER route");
      await handleProjectManagerRoute({ from, formData, user });
      console.log("✅ PROJECT MANAGER route handled");
      return;
    }

    console.log("➡️ Orchestrating → SITE MANAGER route (default)");
    await handleSiteManagerRoute({ from, formData, user });
    console.log("✅ SITE MANAGER route handled");
  } catch (err) {
    console.error("❌ dispatch error:", err);
    const from = getString(formData, "From");
    if (from) {
      try {
        await sendMessage(from, "Sorry, an error occurred processing your message.");
      } catch (e) {
        console.error("❌ Failed to send error message:", e);
      }
    }
  } finally {
    if (lockHeld && lockPhone) {
      await releaseTextLock(lockPhone);
      console.log("🔓 Text lock released", { phone: lockPhone });
    }
  }
}
