"use server";

import { after } from "next/server";
import { prisma } from "@/lib/utils/db";
import { getString, normalizePhone } from "../../../../lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "../../../../lib/utils/whatsapp-helpers/shared/twillio";
import { handleWorkerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/worker";
import { handleProjectManagerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/project-manager-route";
import { handleSiteManagerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route";

// Toggle this to true while debugging to run synchronously

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
  try {
    console.dir(formData, { depth: null });
    const smsStatus = getString(formData, "SmsStatus");
    const from = getString(formData, "From");
    const waId = getString(formData, "WaId");
    const body = (getString(formData, "Body") || "").trim();

    console.log("🔎 Parsed formData:", {
      smsStatus,
      from,
      waId,
      body,
    });

    if (smsStatus && smsStatus.toLowerCase() !== "received") {
      console.log("📭 Skipping non-received status:", smsStatus);
      return;
    }

    const phone = await normalizePhone(waId, from);
    console.log("📞 Normalized phone:", phone);

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
      include: { Site: true },
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
  }
}