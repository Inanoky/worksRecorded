import Twilio from "twilio";
import { NextResponse } from "next/server";



export const REMINDERS = [
  { toE164: "+37124885690", text: "Reminder: send today’s works + hours." },

];

const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const from = process.env.TWILIO_WHATSAPP_FROM!; // e.g. "whatsapp:+14155238886"

async function sendWhatsApp(toE164: string, body: string) {
  const to = toE164.startsWith("whatsapp:") ? toE164 : `whatsapp:${toE164}`;
  return client.messages.create({ from, to, body });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: any[] = [];

  for (const r of REMINDERS) {
    try {
      await sendWhatsApp(r.toE164, r.text);
      results.push({ to: r.toE164, ok: true });
    } catch (e: any) {
      results.push({ to: r.toE164, ok: false, error: e?.message || "send_failed" });
    }
  }

  return NextResponse.json({ ok: true, count: REMINDERS.length, results });
}