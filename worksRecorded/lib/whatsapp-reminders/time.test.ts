import fs from "node:fs";
import path from "node:path";
import {
  getLatvianPublicHolidayCalendar,
  getLocalDayUtcRange,
  getReminderNonWorkingReason,
  getReminderLocalParts,
  getTimeOnlyHHmm,
  isReminderWorkingDay,
  isReminderDueNow,
  isWithinReminderBusinessWindow,
  normalizeReminderTimezone,
} from "@/lib/whatsapp-reminders/time";

describe("whatsapp reminder time helpers", () => {
  it("normalizes valid, invalid, and missing timezones", () => {
    expect(normalizeReminderTimezone("Europe/Riga")).toEqual({
      timeZone: "Europe/Riga",
      fallbackUsed: false,
    });
    expect(normalizeReminderTimezone("Not/AZone")).toEqual({
      timeZone: "Europe/Riga",
      fallbackUsed: true,
    });
    expect(normalizeReminderTimezone(null)).toEqual({
      timeZone: "Europe/Riga",
      fallbackUsed: true,
    });
  });

  it("reads reminder time as UTC time-only semantics", () => {
    expect(getTimeOnlyHHmm(new Date("1970-01-01T08:30:00.000Z"))).toBe("08:30");
  });

  it("allows a weekday Riga time inside the business window", () => {
    const parts = getReminderLocalParts(new Date("2026-01-05T06:15:00.000Z"), "Europe/Riga");

    expect(parts.localDate).toBe("2026-01-05");
    expect(parts.hhmm).toBe("08:15");
    expect(isWithinReminderBusinessWindow(parts)).toBe(true);
  });

  it("blocks weekend and after-hours local times", () => {
    const saturday = getReminderLocalParts(new Date("2026-01-03T08:00:00.000Z"), "Europe/Riga");
    const late = getReminderLocalParts(new Date("2026-01-05T19:15:00.000Z"), "Europe/Riga");

    expect(isWithinReminderBusinessWindow(saturday)).toBe(false);
    expect(isWithinReminderBusinessWindow(late)).toBe(false);
  });

  it("handles exact business-hour boundaries", () => {
    const before = getReminderLocalParts(new Date("2026-01-05T05:59:00.000Z"), "Europe/Riga");
    const start = getReminderLocalParts(new Date("2026-01-05T06:00:00.000Z"), "Europe/Riga");
    const end = getReminderLocalParts(new Date("2026-01-05T16:00:00.000Z"), "Europe/Riga");
    const after = getReminderLocalParts(new Date("2026-01-05T16:01:00.000Z"), "Europe/Riga");

    expect(isWithinReminderBusinessWindow(before)).toBe(false);
    expect(isWithinReminderBusinessWindow(start)).toBe(true);
    expect(isWithinReminderBusinessWindow(end)).toBe(true);
    expect(isWithinReminderBusinessWindow(after)).toBe(false);
  });

  it("keeps a reminder due for the cron window only", () => {
    const atStart = getReminderLocalParts(new Date("2026-01-05T06:00:00.000Z"), "Europe/Riga");
    const at14 = getReminderLocalParts(new Date("2026-01-05T06:14:00.000Z"), "Europe/Riga");
    const at19 = getReminderLocalParts(new Date("2026-01-05T06:19:00.000Z"), "Europe/Riga");
    const at20 = getReminderLocalParts(new Date("2026-01-05T06:20:00.000Z"), "Europe/Riga");
    const before = getReminderLocalParts(new Date("2026-01-05T05:59:00.000Z"), "Europe/Riga");

    expect(isReminderDueNow(atStart, "08:00")).toBe(true);
    expect(isReminderDueNow(at14, "08:00")).toBe(true);
    expect(isReminderDueNow(at19, "08:00")).toBe(true);
    expect(isReminderDueNow(at20, "08:00")).toBe(false);
    expect(isReminderDueNow(before, "08:00")).toBe(false);
  });

  it("builds Riga local day ranges across winter and summer offsets", () => {
    const winter = getLocalDayUtcRange("2026-01-05", "Europe/Riga");
    const summer = getLocalDayUtcRange("2026-07-06", "Europe/Riga");

    expect(winter.start.toISOString()).toBe("2026-01-04T22:00:00.000Z");
    expect(winter.end.toISOString()).toBe("2026-01-05T22:00:00.000Z");
    expect(summer.start.toISOString()).toBe("2026-07-05T21:00:00.000Z");
    expect(summer.end.toISOString()).toBe("2026-07-06T21:00:00.000Z");
  });

  it("builds Riga local day ranges on DST transition dates", () => {
    const startsDst = getLocalDayUtcRange("2026-03-29", "Europe/Riga");
    const endsDst = getLocalDayUtcRange("2026-10-25", "Europe/Riga");

    expect(startsDst.start.toISOString()).toBe("2026-03-28T22:00:00.000Z");
    expect(startsDst.end.toISOString()).toBe("2026-03-29T21:00:00.000Z");
    expect(endsDst.start.toISOString()).toBe("2026-10-24T21:00:00.000Z");
    expect(endsDst.end.toISOString()).toBe("2026-10-25T22:00:00.000Z");
  });

  it("keeps Vercel UTC cron coverage broad enough for Riga winter and summer hours", () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons: Array<{ path: string; schedule: string }> };
    const reminderCron = vercelConfig.crons.find((cron) => cron.path === "/api/webhook/reminders");

    expect(reminderCron?.schedule).toBe("*/15 5-16 * * 1-5");
    expect(getReminderLocalParts(new Date("2026-01-05T06:00:00.000Z"), "Europe/Riga").hhmm).toBe("08:00");
    expect(getReminderLocalParts(new Date("2026-01-05T16:00:00.000Z"), "Europe/Riga").hhmm).toBe("18:00");
    expect(getReminderLocalParts(new Date("2026-07-06T05:00:00.000Z"), "Europe/Riga").hhmm).toBe("08:00");
    expect(getReminderLocalParts(new Date("2026-07-06T15:00:00.000Z"), "Europe/Riga").hhmm).toBe("18:00");
  });

  it("treats holidays as optional local-date rules", () => {
    const calendar = getLatvianPublicHolidayCalendar(2026, 2026);

    expect(isReminderWorkingDay("2026-05-01", "Europe/Riga")).toBe(true);
    expect(isReminderWorkingDay("2026-05-01", "Europe/Riga", calendar)).toBe(false);
    expect(getReminderNonWorkingReason("2026-05-01", "Europe/Riga", calendar)).toBe("holiday");
    expect(getReminderNonWorkingReason("2026-12-26", "Europe/Riga", calendar)).toBe("weekend");
    expect(getReminderNonWorkingReason("2026-05-05", "Europe/Riga", calendar)).toBe(null);
  });
});
