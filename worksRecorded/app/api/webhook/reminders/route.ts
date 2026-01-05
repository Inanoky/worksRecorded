import Twilio from "twilio";
import { NextResponse } from "next/server";

const TEMPLATE_SID = "HXa0a9f156fbea11cbf9b046126ca0d2a5";
const FROM = "whatsapp:+13135131153";

export const REMINDERS = [
  { toE164: "+37124885690" },
];

const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

async function sendWhatsAppTemplate(toE164: string, var1: string) {
  const to = toE164.startsWith("whatsapp:") ? toE164 : `whatsapp:${toE164}`;

  return client.messages.create({
    from: FROM,
    to,
    contentSid: TEMPLATE_SID,
    contentVariables: JSON.stringify({
      1: var1,
    }),
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const text = "Kindly reminder to complete site diary for today!";
  const results: any[] = [];

  for (const r of REMINDERS) {
    try {
      await sendWhatsAppTemplate(r.toE164, text);
      results.push({ to: r.toE164, ok: true });
    } catch (e: any) {
      results.push({
        to: r.toE164,
        ok: false,
        error: e?.message || "send_failed",
      });
    }
  }

  return NextResponse.json({ ok: true, count: REMINDERS.length, results });
}