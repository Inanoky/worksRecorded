"use server";

import { after } from "next/server";
import { prisma } from "@/lib/utils/db";
import { getString, normalizePhone } from "../../../../lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "../../../../lib/utils/whatsapp-helpers/shared/twillio";
import { handleWorkerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/worker";
import { handleProjectManagerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/project-manager-route";
import { handleSiteManagerRoute } from "../../../../lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route";

// Toggle this to true while debugging to run synchronously
const DEBUG_SYNC = true;

// // Kristap Route
// const OVERRIDE_INCOMING = "37120000000";
// const OVERRIDE_TARGET   = "37124885690";


// // Test
// const OVERRIDE_INCOMING = "37124885690";
// const OVERRIDE_TARGET   = "37120000000";


// Production
const OVERRIDE_INCOMING = "37129955255";
const OVERRIDE_TARGET   = "37126714739";


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

    console.log("🔎 Parsed formData:", { smsStatus, from, waId, body });

    if (smsStatus && smsStatus.toLowerCase() !== "received") {
      console.log("📭 Skipping non-received status:", smsStatus);
      return;
    }

    const normalized = await normalizePhone(waId, from);
    const isOverride = normalized === OVERRIDE_INCOMING;

    // For routing decisions (worker, logs, etc.)
    const phone = isOverride ? OVERRIDE_TARGET : normalized;

    if (isOverride) {
      console.log(`🔀 Override active: incoming ${normalized} -> using user for ${phone}`);
    } else {
      console.log("📞 Normalized phone:", phone);
    }

    // Worker route lookup can continue to use the routing `phone`
    const worker = await prisma.workers.findFirst({ where: { phone } });
    console.log("👷 Worker found?", !!worker);
    if (worker) {
      console.log("➡️ Orchestrating → WORKER route");
      await handleWorkerRoute({ phone, formData });
      console.log("✅ WORKER route handled");
      return;
    }

    // ⬇️ ADJUSTED USER LOOKUP
    // If override detected → search by OVERRIDE_TARGET; else by actual normalized phone
    const lookupPhone = isOverride ? OVERRIDE_TARGET : normalized;
    console.log("🔍 User lookup phone:", lookupPhone);

    let user = await prisma.user.findFirst({
      where: { phone: lookupPhone },
      include: { Site: true },
    });



    console.log("👤 User found?", !!user);

    if (!user) {
      console.log("🚫 No user for this phone. Sending rejection.");
      await sendMessage(from, "Sorry, this phone number is not registered. Please contact admin.");
      return;
    }

    // --- Override data in DATABASE based on override flag
    try {
      if (isOverride) {
        // Using override → set Marcis (site manager) and copy siteManagerSelect -> lastSelected
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: "Marcis",
            lastName: "Gedrovics",
            role: "site manager",
            lastSelectedSiteIdforWhatsapp: user.siteManagerSelectIdforWhatsapp ?? null,
          },
          include: { Site: true },
        });
        console.log("🛠️ DB updated (override): Marcis / site manager with lastSelected from siteManagerSelect.");
      } else {
        // No override → set Kristaps (project manager) and clear lastSelected
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: "Kristaps",
            lastName: "Ratnieks",
            role: "project manager",
            lastSelectedSiteIdforWhatsapp: user.siteManagerSelectIdforWhatsapp ?? null,
          },
          include: { Site: true },
        });
        console.log("🛠️ DB updated (no override): Kristaps / project manager; lastSelected cleared.");
      }
    } catch (e) {
      console.error("❌ Failed to update user fields in DB:", e);
      // continue routing even if update fails
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
