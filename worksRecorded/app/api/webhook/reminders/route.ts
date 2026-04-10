import { NextResponse } from "next/server";
import { prisma } from "@/lib/utils/db";

const DEFAULT_TIMEZONE = "Europe/Riga";

function normalizeRecipientPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

function getHHmmInTimezone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getTargetHHmm(reminderTime: Date | null | undefined, timeZone: string) {
  if (!reminderTime) return null;
  return getHHmmInTimezone(reminderTime, timeZone);
}

async function sendMetaTextMessage(to: string, body: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const businessPhoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !businessPhoneNumberId) {
    throw new Error("Missing META_ACCESS_TOKEN or META_PHONE_NUMBER_ID");
  }

  const res = await fetch(`https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      text: { body },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Meta send failed (${res.status}): ${errorBody}`);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const [users, workers] = await Promise.all([
    prisma.user.findMany({
      where: { remindersEnabled: true },
      select: {
        id: true,
        phone: true,
        timezone: true,
        reminderTime: true,
        reminderText: true,
      },
    }),
    prisma.workers.findMany({
      where: { remindersEnabled: true },
      select: {
        id: true,
        phone: true,
        timezone: true,
        reminderTime: true,
        reminderText: true,
      },
    }),
  ]);

  const results: Array<{ target: string; kind: "user" | "worker"; ok: boolean; error?: string }> = [];

  for (const user of users) {
    const timezone = user.timezone || DEFAULT_TIMEZONE;
    const nowHHmm = getHHmmInTimezone(now, timezone);
    const targetHHmm = getTargetHHmm(user.reminderTime, timezone);
    const recipient = normalizeRecipientPhone(user.phone);

    if (!recipient || !targetHHmm || targetHHmm !== nowHHmm) continue;

    const text = user.reminderText?.trim();
    if (!text) {
      results.push({ target: user.id, kind: "user", ok: false, error: "missing_reminder_text" });
      continue;
    }

    try {
      await sendMetaTextMessage(recipient, text);
      results.push({ target: user.id, kind: "user", ok: true });
    } catch (error: any) {
      results.push({ target: user.id, kind: "user", ok: false, error: error?.message || "send_failed" });
    }
  }

  for (const worker of workers) {
    const timezone = worker.timezone || DEFAULT_TIMEZONE;
    const nowHHmm = getHHmmInTimezone(now, timezone);
    const targetHHmm = getTargetHHmm(worker.reminderTime, timezone);
    const recipient = normalizeRecipientPhone(worker.phone);

    if (!recipient || !targetHHmm || targetHHmm !== nowHHmm) continue;

    const text = worker.reminderText?.trim();
    if (!text) {
      results.push({ target: worker.id, kind: "worker", ok: false, error: "missing_reminder_text" });
      continue;
    }

    try {
      await sendMetaTextMessage(recipient, text);
      results.push({ target: worker.id, kind: "worker", ok: true });
    } catch (error: any) {
      results.push({ target: worker.id, kind: "worker", ok: false, error: error?.message || "send_failed" });
    }
  }

  return NextResponse.json({ ok: true, checkedUsers: users.length, checkedWorkers: workers.length, results });
}
