"use server";

import { after } from "next/server";
import { prisma } from "@/lib/utils/db";
import {
  getString,
  normalizePhone,
} from "../../../../lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "../../../../lib/utils/whatsapp-helpers/shared/twillio";
import { handleWorkerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/worker";
import { handleProjectManagerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/project-manager-route";
import { handleSiteManagerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route";

const DEBUG_SYNC = true;

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

async function tryAcquirePhoneTextLock(phone: string): Promise<boolean> {
  // Postgres advisory lock (no schema needed). If DB isn't Postgres, we fail open.
  try {
    const rows = await prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(hashtext(${phone})::bigint) AS locked
    `;
    return !!rows?.[0]?.locked;
  } catch (e) {
    console.warn("⚠️ Advisory lock not available (failing open):", e);
    return true;
  }
}

async function releasePhoneTextLock(phone: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      SELECT pg_advisory_unlock(hashtext(${phone})::bigint)
    `;
  } catch (e) {
    console.warn("⚠️ Advisory unlock failed (ignored):", e);
  }
}

async function dispatch(formData: FormData) {
  let phoneForUnlock: string | null = null;
  let lockHeld = false;

  try {
    console.dir(formData, { depth: null });

    const smsStatus = getString(formData, "SmsStatus");
    const from = getString(formData, "From");
    const waId = getString(formData, "WaId");
    const body = (getString(formData, "Body") || "").trim();
    const numMediaRaw = getString(formData, "NumMedia");
    const numMedia = Number(numMediaRaw || "0");
    const isText = !Number.isNaN(numMedia) ? numMedia === 0 : true;

    console.log("🔎 Parsed formData:", {
      smsStatus,
      from,
      waId,
      body,
      numMedia,
      isText,
    });

    if (smsStatus && smsStatus.toLowerCase() !== "received") {
      console.log("📭 Skipping non-received status:", smsStatus);
      return;
    }

    const phone = await normalizePhone(waId, from);
    console.log("📞 Normalized phone:", phone);

    // TEXT ONLY: enforce per-phone lock
    if (isText) {
      phoneForUnlock = phone;

      const acquired = await tryAcquirePhoneTextLock(phone);
      if (!acquired) {
        console.log("🔒 Text lock busy → replying 'Please wait…' and skipping");
        await sendMessage(from, "Please wait…");
        return;
      }

      lockHeld = true;
      console.log("🔓 Text lock acquired");
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
      await sendMessage(
        from,
        "Sorry, this phone number is not registered. Please contact admin."
      );
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
    if (lockHeld && phoneForUnlock) {
      await releasePhoneTextLock(phoneForUnlock);
      console.log("🔓 Text lock released");
    }
  }
}
