"use server";

import twilio from "twilio";
import { prisma } from "@/lib/utils/db";
import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";


export async function getRemindersData(orgId: string) {
  return await prisma.site.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      reminders: { select: { id: true, reminderText: true, isActive: true } },
    },
    orderBy: { name: "asc" },
  });
}

type Row = {
  siteId: string;
  reminderId: string | null;
  reminderText: string;
  isActive: boolean;
};

export async function getReminderTimes(orgId: string){

  return await prisma.user.findMany({
    where : {organizationId : orgId},
    select : {
      id: true,
      email: true,
      reminderTime : true
    }
  })


}





type SaveRow = {
  siteId: string;
  reminderText: string;
  isActive: boolean;
};



type TimeUpdate = { userId: string; timeHHmm: string; timezone?: string };

function toDateAtHHmmInTz(hhmm: string, tz = "Europe/Riga") {
  // stores as "today at HH:mm" interpreted in tz
  const [H, M] = hhmm.split(":").map(Number);
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const [{ value: y }, , { value: m }, , { value: d }] = fmt.formatToParts(now);
  // "YYYY-MM-DDTHH:mm:00" as local time in tz; JS Date will store UTC instant
  return new Date(`${y}-${m}-${d}T${String(H).padStart(2,"0")}:${String(M).padStart(2,"0")}:00`);
}

export async function saveUserReminderTimes(updates: TimeUpdate[]) {
  if (!updates?.length) return { ok: true, updated: 0 };

  for (const { userId, timeHHmm, timezone } of updates) {
    const tz = timezone || "Europe/Riga";
    const dt = toDateAtHHmmInTz(timeHHmm, tz);
    await prisma.user.update({
      where: { id: userId },
      data: { reminderTime: dt, timezone: tz },
    });
    // optional: keep Twilio schedule in sync
    // try { await scheduleNextForUser(userId); } catch {}
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, updated: updates.length };
}



export async function getDataForReminderTable(orgId){

  console.log(`this is orgId`)

  const data = await prisma.site.findMany({
    where: {organizationId : orgId},
    select: {
      id: true,
      name:true,
      reminders: true
    }
  })

  console.log(`this is data returend : ${data}`)

  return data



}



export async function saveSiteReminders(orgId, rows) {
  const siteIds = rows.map(r => r.siteId);

  const valid = new Set(
    (await prisma.site.findMany({
      where: { id: { in: siteIds }, organizationId: orgId },
      select: { id: true },
    })).map(s => s.id)
  );

  const safeRows = rows
    .filter(r => valid.has(r.siteId))
    .map(r => ({
      siteId: r.siteId,
      reminders: (r.reminder ?? "").trim() || null, // store empty as null
    }));

  await prisma.$transaction(
    safeRows.map(r =>
      prisma.site.update({
        where: { id: r.siteId },
        data: { reminders: r.reminders }, // <-- plural
      })
    )
  );

  revalidatePath("/dashboard/settings");
  return { ok: true, updated: safeRows.length };
}