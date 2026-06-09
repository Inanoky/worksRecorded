import { NextResponse } from "next/server";
import { prisma } from "@/lib/utils/db";

const DEFAULT_TIMEZONE = "Europe/Riga";
const DEBUG_PREFIX = "[cron:reminders]";
const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";

function normalizeRecipientPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return "n/a";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `***${digits.slice(-4)}`;
}

function getHHmmInTimezone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getTargetHHmm(reminderTime: Date | null | undefined, _timeZone: string) {
  if (!reminderTime) return null;
  // reminderTime is stored as "1970-01-01THH:mm:00.000Z" (time-only semantics).
  // We must read HH:mm in UTC to avoid timezone double-shift.
  const d = new Date(reminderTime);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

async function sendMetaTemplateMessage(to: string, variableText: string) {
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
      type: "template",
      template: {
        name: "reminder_custom",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: variableText }],
          },
        ],
      },
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

  console.log(`${DEBUG_PREFIX} hit`, {
    at: new Date().toISOString(),
    hasSecret: Boolean(secret),
  });

  if (!secret || secret !== process.env.CRON_SECRET) {
    console.warn(`${DEBUG_PREFIX} unauthorized`, {
      hasSecret: Boolean(secret),
      expectedConfigured: Boolean(process.env.CRON_SECRET),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const [users, workers] = await Promise.all([
    prisma.user.findMany({
      where: {
        remindersEnabled: true,
        organizationId: { not: ZTC_ORGANIZATION_ID },
      },
      select: {
        id: true,
        phone: true,
        timezone: true,
        reminderTime: true,
        reminderText: true,
      },
    }),
    prisma.workers.findMany({
      where: {
        remindersEnabled: true,
        organizationId: { not: ZTC_ORGANIZATION_ID },
      },
      select: {
        id: true,
        phone: true,
        timezone: true,
        reminderTime: true,
        reminderText: true,
      },
    }),
  ]);

  console.log(`${DEBUG_PREFIX} loaded targets`, {
    users: users.length,
    workers: workers.length,
    nowUtc: now.toISOString(),
  });

  const results: Array<{ target: string; kind: "user" | "worker"; ok: boolean; error?: string }> = [];

  for (const user of users) {
    const timezone = user.timezone || DEFAULT_TIMEZONE;
    const nowHHmm = getHHmmInTimezone(now, timezone);
    const targetHHmm = getTargetHHmm(user.reminderTime, timezone);
    const recipient = normalizeRecipientPhone(user.phone);

    if (!recipient || !targetHHmm || targetHHmm !== nowHHmm) {
      console.log(`${DEBUG_PREFIX} user skipped`, {
        userId: user.id,
        phone: maskPhone(user.phone),
        timezone,
        nowHHmm,
        targetHHmm,
        hasRecipient: Boolean(recipient),
      });
      continue;
    }

    const text = user.reminderText?.trim();
    if (!text) {
      console.warn(`${DEBUG_PREFIX} user missing reminder text`, {
        userId: user.id,
        phone: maskPhone(user.phone),
      });
      results.push({ target: user.id, kind: "user", ok: false, error: "missing_reminder_text" });
      continue;
    }

    try {
      await sendMetaTemplateMessage(recipient, text);
      console.log(`${DEBUG_PREFIX} user sent`, {
        userId: user.id,
        phone: maskPhone(user.phone),
        timezone,
        nowHHmm,
      });
      results.push({ target: user.id, kind: "user", ok: true });
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} user send failed`, {
        userId: user.id,
        phone: maskPhone(user.phone),
        error: error?.message || "send_failed",
      });
      results.push({ target: user.id, kind: "user", ok: false, error: error?.message || "send_failed" });
    }
  }

  for (const worker of workers) {
    const timezone = worker.timezone || DEFAULT_TIMEZONE;
    const nowHHmm = getHHmmInTimezone(now, timezone);
    const targetHHmm = getTargetHHmm(worker.reminderTime, timezone);
    const recipient = normalizeRecipientPhone(worker.phone);

    if (!recipient || !targetHHmm || targetHHmm !== nowHHmm) {
      console.log(`${DEBUG_PREFIX} worker skipped`, {
        workerId: worker.id,
        phone: maskPhone(worker.phone),
        timezone,
        nowHHmm,
        targetHHmm,
        hasRecipient: Boolean(recipient),
      });
      continue;
    }

    const text = worker.reminderText?.trim();
    if (!text) {
      console.warn(`${DEBUG_PREFIX} worker missing reminder text`, {
        workerId: worker.id,
        phone: maskPhone(worker.phone),
      });
      results.push({ target: worker.id, kind: "worker", ok: false, error: "missing_reminder_text" });
      continue;
    }

    try {
      await sendMetaTemplateMessage(recipient, text);
      console.log(`${DEBUG_PREFIX} worker sent`, {
        workerId: worker.id,
        phone: maskPhone(worker.phone),
        timezone,
        nowHHmm,
      });
      results.push({ target: worker.id, kind: "worker", ok: true });
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} worker send failed`, {
        workerId: worker.id,
        phone: maskPhone(worker.phone),
        error: error?.message || "send_failed",
      });
      results.push({ target: worker.id, kind: "worker", ok: false, error: error?.message || "send_failed" });
    }
  }

  console.log(`${DEBUG_PREFIX} done`, {
    total: results.length,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  });

  return NextResponse.json({ ok: true, checkedUsers: users.length, checkedWorkers: workers.length, results });
}
