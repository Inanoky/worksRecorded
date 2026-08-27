import { NextResponse } from "next/server";
import { runScheduledWhatsappReminders } from "@/lib/whatsapp-reminders/engine";

function isAuthorized(req: Request) {
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) return false;
  if (querySecret && querySecret === expectedSecret) return true;
  return authHeader === `Bearer ${expectedSecret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScheduledWhatsappReminders({
    latvianPublicHolidaysEnabled:
      process.env.WHATSAPP_REMINDER_LATVIAN_HOLIDAYS_ENABLED === "true",
  });

  return NextResponse.json(result, {
    status: result.failed ? 207 : 200,
  });
}
