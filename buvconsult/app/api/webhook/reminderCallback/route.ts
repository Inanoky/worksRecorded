// app/api/webhook/reminderCallback/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import twilio from "twilio";

const prisma = new PrismaClient();
const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

// --- tiny helpers ---
function maskPhone(p?: string | null) {
  if (!p) return "";
  const s = String(p);
  return s.length <= 4 ? "****" : "*".repeat(s.length - 4) + s.slice(-4);
}
function hhmm(d: Date) {
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}
function fmtLocal(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date);
}
function toWhatsApp(phone: string) {
  const trimmed = phone.replace(/\s+/g, "");
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
}

// Build next occurrence of user's HH:mm in given tz
function nextOccurrenceFromTimeOnly(timeOnly: Date, tz: string): Date {
  const hh = timeOnly.getHours();
  const mm = timeOnly.getMinutes();

  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const y = parts.year, m = parts.month, d = parts.day;

  const localTarget = new Date(`${y}-${m}-${d}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00`);
  const localNow = new Date(`${y}-${m}-${d}T${parts.hour}:${parts.minute}:00`);
  const sendAtLocal = localTarget <= localNow ? new Date(localTarget.getTime() + 86400000) : localTarget;

  const localParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(sendAtLocal).map(p => [p.type, p.value])
  );

  return new Date(Date.UTC(
    Number(localParts.year), Number(localParts.month) - 1, Number(localParts.day),
    Number(localParts.hour), Number(localParts.minute), Number(localParts.second)
  ));
}

function buildReminderMessage(sites: { name: string; reminders: string | null }[]) {
  return sites
    .filter(s => s.reminders && s.reminders.trim().length > 0)
    .map(s => `Reminder for site ${s.name} is ${s.reminders!.trim()}`)
    .join("\n");
}

// --- handler ---
export async function GET() {
  const started = new Date();
  console.log("[reminderCallback] START", started.toISOString(), "Europe/Riga:", fmtLocal(started, "Europe/Riga"));

  try {
    // 1) Filter users
    console.log("[reminderCallback] Querying users…");
    const users = await prisma.user.findMany({
      where: {
        phone: { not: null },
        remindersEnabled: true,
        reminderTime: { not: null },
        role: "site manager",
      },
      select: {
        id: true,
        phone: true,
        reminderTime: true,
        timezone: true,
        organizationId: true,
      },
    });
    console.log(`[reminderCallback] Users passing filters: ${users.length}`);

    const results: {
      userId: string;
      to: string;
      scheduledAt: string | null;
      status: "scheduled" | "skipped" | "error";
      reason?: string;
      messagePreview?: string;
    }[] = [];

    // 2) Per user: fetch Sites by organizationId, filter reminders != null
    for (const u of users) {
      if (!u.organizationId) {
        console.log(`[user ${u.id}] SKIP: no organizationId`);
        results.push({ userId: u.id, to: u.phone!, scheduledAt: null, status: "skipped", reason: "No organizationId" });
        continue;
      }

      const tz = u.timezone?.trim() || "Europe/Riga";
      const rt = u.reminderTime as Date;

      console.log(`[user ${u.id}] phone=${maskPhone(u.phone)} org=${u.organizationId} tz=${tz} reminder=${hhmm(rt)}`);

      // Fetch sites for this org; exclude null reminders at DB level
      const sites = await prisma.site.findMany({
        where: {
          organizationId: u.organizationId,
          reminders: { not: null },
        },
        select: { name: true, reminders: true },
      });

      console.log(`[user ${u.id}] sitesFound=${sites.length}`);

      if (sites.length === 0) {
        console.log(`[user ${u.id}] SKIP: no site reminders`);
        results.push({
          userId: u.id, to: u.phone!, scheduledAt: null, status: "skipped", reason: "No site reminders",
        });
        continue;
      }

      const body = buildReminderMessage(sites);
      if (!body) {
        console.log(`[user ${u.id}] SKIP: empty message after trim`);
        results.push({
          userId: u.id, to: u.phone!, scheduledAt: null, status: "skipped", reason: "Empty message",
        });
        continue;
      }

      const sendAt = nextOccurrenceFromTimeOnly(rt, tz);
      const leadMs = sendAt.getTime() - Date.now();
      const toWhats = toWhatsApp(u.phone!);

      console.log(
        `[user ${u.id}] sendAtUTC=${sendAt.toISOString()} sendAtLocal=${fmtLocal(sendAt, tz)} leadMs=${leadMs} to=${toWhats}`
      );

      // Twilio needs >= 15 min lead time
      if (leadMs < 15 * 60 * 1000) {
        console.log(`[user ${u.id}] SKIP: lead time < 15min`);
        results.push({
          userId: u.id,
          to: u.phone!,
          scheduledAt: sendAt.toISOString(),
          status: "skipped",
          reason: "Less than 15 minutes to scheduled time",
          messagePreview: body.slice(0, 120),
        });
        continue;
      }

      try {
        // 3) Schedule WhatsApp message via Messaging Service
        await client.messages.create({
          to: toWhats, // IMPORTANT: WhatsApp format
          body,
          messagingServiceSid: process.env.TWILIO_MSG_SERVICE_SID!, // must be enabled for WhatsApp
          scheduleType: "fixed",
          sendAt: sendAt.toISOString(),
        });

        console.log(`[user ${u.id}] OK: scheduled via Twilio`);
        results.push({
          userId: u.id,
          to: u.phone!,
          scheduledAt: sendAt.toISOString(),
          status: "scheduled",
          messagePreview: body.slice(0, 120),
        });
      } catch (e: any) {
        console.error(`[user ${u.id}] ERROR Twilio:`, e?.message || e);
        results.push({
          userId: u.id,
          to: u.phone!,
          scheduledAt: sendAt.toISOString(),
          status: "error",
          reason: e?.message || "Twilio error",
          messagePreview: body.slice(0, 120),
        });
      }
    }

    const finished = new Date();
    console.log(
      `[reminderCallback] DONE processed=${users.length} scheduled=${results.filter(r=>r.status==="scheduled").length} skipped=${results.filter(r=>r.status==="skipped").length} errors=${results.filter(r=>r.status==="error").length} durationMs=${finished.getTime()-started.getTime()}`
    );

    return NextResponse.json({
      ok: true,
      processedUsers: users.length,
      scheduled: results.filter(r => r.status === "scheduled").length,
      skipped: results.filter(r => r.status === "skipped").length,
      errors: results.filter(r => r.status === "error").length,
      results,
    });
  } catch (err: any) {
    console.error("[reminderCallback] ERROR:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

// If your cron calls POST instead of GET:
export const POST = GET;
