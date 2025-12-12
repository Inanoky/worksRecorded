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
      await dispatch(formData);
    } else {
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

function extractHasMedia(formData: FormData): boolean {
  const numMedia = Number(getString(formData, "NumMedia") || "0");
  return Number.isFinite(numMedia) && numMedia > 0;
}

/**
 * Postgres advisory lock per phone:
 * Used ONLY for text messages (media bypasses lock completely).
 */
async function tryAcquirePhoneLock(phone: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${phone})) AS locked
  `;
  return !!rows?.[0]?.locked;
}

async function releasePhoneLock(phone: string): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${phone}))`;
  } catch (e) {
    console.error("❌ Failed to release advisory lock:", e);
  }
}

async function dispatch(formData: FormData) {
  try {
    console.dir(formData, { depth: null });
    const smsStatus = getString(formData, "SmsStatus");
    const from = getString(formData, "From");
    const waId = getString(formData, "WaId");
    const body = (getString(formData, "Body") || "").trim();

    console.log("🔎 Parsed formData:", { smsStatus, from, waId, body });

    if (smsStatus && smsStatus.toLowerCase() !== "received") {
      console.log("📭 Skipping non-received status:", smsStatus);
      return;
    }

    const phone = await normalizePhone(waId, from);
    console.log("📞 Normalized phone:", phone);

    const hasMedia = extractHasMedia(formData);

    // ✅ ONLY throttle text. Media bypasses lock and runs as-is.
    if (!hasMedia) {
      const acquired = await tryAcquirePhoneLock(phone);
      if (!acquired) {
        console.log("⏳ Busy (text) → ignoring:", { phone, body });
        return;
      }

      try {
        await processMessage({ phone, from, formData });
      } finally {
        await releasePhoneLock(phone);
      }

      return;
    }

    // ✅ Media path untouched (no lock, no ignoring)
    await processMessage({ phone, from, formData });
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
  }
}

async function processMessage({
  phone,
  from,
  formData,
}: {
  phone: string;
  from: string;
  formData: FormData;
}) {
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
}
