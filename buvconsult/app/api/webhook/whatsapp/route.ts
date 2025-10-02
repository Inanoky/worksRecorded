"use server";

import { after } from "next/server";
import { prisma } from "@/app/utils/db";
import { getString, normalizePhone } from "../../../utils/Whatsapp/shared/helpers";
import { sendMessage } from "../../../utils/Whatsapp/shared/twillio";
import { handleWorkerRoute } from "../../../utils/Whatsapp/routes/worker";
import { handleProjectManagerRoute } from "../../../utils/Whatsapp/routes/projectManager";
import { handleSiteManagerRoute } from "../../../utils/Whatsapp/routes/siteManager";

// Toggle this to true while debugging to run synchronously
const DEBUG_SYNC = true;


// Special routing override
//nothing
// const OVERRIDE_INCOMING = "37129955255";
// const OVERRIDE_TARGET   = "37126714739";

const OVERRIDE_INCOMING = "37129955255"
const OVERRIDE_TARGET   = "37126714739"



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


    const normalized = await normalizePhone(waId, from); //This is modified temporary override for testing

    // const phone = await normalizePhone(waId, from); - this is original

        // --- Special routing override

      const phone = normalized === OVERRIDE_INCOMING ? OVERRIDE_TARGET : normalized; //This is modified temporary override for testing

      if (normalized === OVERRIDE_INCOMING) {
      console.log(`🔀 Override active: incoming ${normalized} -> using user for ${phone}`);
    } else {
      console.log("📞 Normalized phone:", phone); 
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
    let user = await prisma.user.findFirst({
      where: { phone },
      include: { Site: true },
    });
    console.log("👤 User found?", !!user);

    if (!user) {
      console.log("🚫 No user for this phone. Sending rejection.");
      await sendMessage(from, "Sorry, this phone number is not registered. Please contact admin.");
      return;
    }

    // --- Temporary user field override for testing

    try {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: "Marcis",
          lastName: "Gedrovics",
          lastSelectedSiteIdforWhatsapp: user.siteManagerSelectIdforWhatsapp ?? null,
          role: "site manager"
        },
        include: { Site: true },
      });
      console.log("🛠️ User fields updated per override.");
    } catch (e) {
      console.error("❌ Failed to update user fields:", e);
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
