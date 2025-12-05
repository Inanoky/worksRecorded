"use server";

import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { revalidatePath } from "next/cache";

// Helpers
function getISOWeekKey(date = new Date()) {
  // Build ISO week key "YYYY-Www" (weeks start Monday)
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday in current week decides the year
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${tmp.getUTCFullYear()}-W${pad(weekNo)}`;
}

export async function getPreviousISOWeekKey(baseDate = new Date()) {
  const d = new Date(baseDate);
  // Move to Monday of this week
  const day = d.getDay() || 7; // Mon=1..Sun=7
  d.setDate(d.getDate() - (day - 1));
  // Go to previous Monday then plus 3 to get Thu for ISO-year calc stability
  d.setDate(d.getDate() - 7 + 3);
  // Rebuild key via helper using that Thursday
  return getISOWeekKey(d);
}

export type WeeklyTarget = { amounts: number; units: string };
export type TargetsJson = {
  byWeek?: Record<string, WeeklyTarget>;
  records?: Record<string, WeeklyTarget>;
};

export async function getTargetData(siteId: string): Promise<TargetsJson | null> {
  await requireUser();
  const settings = await prisma.sitediarysettings.findUnique({
    where: { siteId },
    select: { targets: true },
  });
  console.dir(`from actions ${JSON.stringify(settings?.targets)}`)
  return (settings?.targets as TargetsJson) ?? null;
}

export async function saveTargetData(siteId: string, target: WeeklyTarget) {
  const user = await requireUser();

  const existing = await prisma.sitediarysettings.findUnique({
    where: { siteId },
    select: { targets: true, id: true },
  });

  const weekKey = getISOWeekKey(new Date());
  const prev = (existing?.targets as TargetsJson) ?? {};
  const byWeek = { ...(prev.byWeek ?? {}) };
  byWeek[weekKey] = target;

  const merged: TargetsJson = { ...prev, byWeek };

  await prisma.sitediarysettings.upsert({
    where: { siteId },
    create: {
      siteId,
      userId: user.id,
      targets: merged as any,
    },
    update: {
      targets: merged as any,
    },
  });

  revalidatePath(`/dashboard/sites/${siteId}/invoices`);
}

/** Optional: save a fixed record for any week (e.g., on week roll-over) */
export async function saveTargetRecord(siteId: string, weekKey: string, target: WeeklyTarget) {
  const user = await requireUser();

  const existing = await prisma.sitediarysettings.findUnique({
    where: { siteId },
    select: { targets: true },
  });

  const prev = (existing?.targets as TargetsJson) ?? {};
  const records = { ...(prev.records ?? {}) };
  records[weekKey] = target;

  const merged: TargetsJson = { ...prev, records };

  await prisma.sitediarysettings.upsert({
    where: { siteId },
    create: {
      siteId,
      userId: user.id,
      targets: merged as any,
    },
    update: {
      targets: merged as any,
    },
  });

  revalidatePath(`/dashboard/sites/${siteId}/invoices`);
}

/** Form-action wrapper for client component */
export async function saveTargetDataForm(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const raw = String(formData.get("targets") ?? "{}");
  let parsed: WeeklyTarget;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Support direct amounts/units fields too
    parsed = {
      amounts: Number(formData.get("amounts") ?? 0),
      units: String(formData.get("units") ?? ""),
    };
  }
  await saveTargetData(siteId, parsed);
}

/** Convenience getters for UI */
export async function getCurrentWeekKey() {
  return getISOWeekKey(new Date());
}
export async function getPrevWeekKey() {
  return getPreviousISOWeekKey(new Date());
}
