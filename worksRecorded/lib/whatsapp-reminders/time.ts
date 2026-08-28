export const DEFAULT_REMINDER_TIMEZONE = "Europe/Riga";
export const REMINDER_DUE_WINDOW_MINUTES = 20;
export const REMINDER_BUSINESS_START_MINUTE = 8 * 60;
export const REMINDER_BUSINESS_END_MINUTE = 18 * 60;

export type NormalizedReminderTimezone = {
  timeZone: string;
  fallbackUsed: boolean;
};

export type ReminderLocalParts = {
  localDate: string;
  hhmm: string;
  weekday: number;
  minutes: number;
};

export type ReminderHolidayCalendar = {
  name?: string;
  dates: ReadonlySet<string> | readonly string[];
};

const LATVIAN_FIXED_PUBLIC_HOLIDAY_MONTH_DAYS = [
  "01-01",
  "05-01",
  "05-04",
  "06-23",
  "06-24",
  "11-18",
  "12-24",
  "12-25",
  "12-26",
  "12-31",
] as const;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatLocalDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

function addDaysToLocalDate(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function getWesternEasterSundayLocalDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return formatLocalDate(year, month, day);
}

function getLocalDateWeekday(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

function isWeekendLocalDate(localDate: string) {
  const weekday = getLocalDateWeekday(localDate);
  return weekday === 6 || weekday === 7;
}

function addObservedNextMondayForWeekendHoliday(dates: Set<string>, localDate: string) {
  const weekday = getLocalDateWeekday(localDate);
  if (weekday === 6) {
    dates.add(addDaysToLocalDate(localDate, 2));
  }
  if (weekday === 7) {
    dates.add(addDaysToLocalDate(localDate, 1));
  }
}

export function normalizeReminderTimezone(value: string | null | undefined): NormalizedReminderTimezone {
  const candidate = value?.trim();

  if (candidate) {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: candidate }).format(new Date(0));
      return { timeZone: candidate, fallbackUsed: false };
    } catch {
      return { timeZone: DEFAULT_REMINDER_TIMEZONE, fallbackUsed: true };
    }
  }

  return { timeZone: DEFAULT_REMINDER_TIMEZONE, fallbackUsed: true };
}

export function getLatvianPublicHolidayCalendar(
  startYear: number,
  endYear: number,
): ReminderHolidayCalendar {
  const dates = new Set<string>();

  for (let year = startYear; year <= endYear; year += 1) {
    for (const monthDay of LATVIAN_FIXED_PUBLIC_HOLIDAY_MONTH_DAYS) {
      dates.add(`${year}-${monthDay}`);
    }

    const easterSunday = getWesternEasterSundayLocalDate(year);
    dates.add(addDaysToLocalDate(easterSunday, -2));
    dates.add(easterSunday);
    dates.add(addDaysToLocalDate(easterSunday, 1));
    addObservedNextMondayForWeekendHoliday(dates, `${year}-05-04`);
    addObservedNextMondayForWeekendHoliday(dates, `${year}-11-18`);
  }

  return {
    name: "latvian_public_holidays",
    dates,
  };
}

function hasHoliday(calendar: ReminderHolidayCalendar | null | undefined, localDate: string) {
  if (!calendar) return false;
  if (Array.isArray(calendar.dates)) return calendar.dates.includes(localDate);
  return (calendar.dates as ReadonlySet<string>).has(localDate);
}

export function getReminderNonWorkingReason(
  localDate: string,
  _timeZone: string,
  calendar?: ReminderHolidayCalendar | null,
) {
  if (isWeekendLocalDate(localDate)) return "weekend";
  if (hasHoliday(calendar, localDate)) return "holiday";
  return null;
}

export function isReminderWorkingDay(
  localDate: string,
  timeZone: string,
  calendar?: ReminderHolidayCalendar | null,
) {
  return getReminderNonWorkingReason(localDate, timeZone, calendar) == null;
}

function getDateTimeParts(date: Date, timeZone: string) {
  const normalized = normalizeReminderTimezone(timeZone);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: normalized.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const byType = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: Number(byType.hour),
    minute: Number(byType.minute),
    second: Number(byType.second),
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const normalized = normalizeReminderTimezone(timeZone);
  const parts = getDateTimeParts(date, normalized.timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return Math.round((asUtc - date.getTime()) / 60000);
}

function localDateTimeToUtc(
  localDate: string,
  timeZone: string,
  hour: number,
  minute: number,
) {
  const [year, month, day] = localDate.split("-").map(Number);
  const initialUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const initialOffset = getTimeZoneOffsetMinutes(initialUtc, timeZone);
  const adjustedUtc = new Date(initialUtc.getTime() - initialOffset * 60000);
  const adjustedOffset = getTimeZoneOffsetMinutes(adjustedUtc, timeZone);

  if (adjustedOffset === initialOffset) {
    return adjustedUtc;
  }

  return new Date(initialUtc.getTime() - adjustedOffset * 60000);
}

export function getReminderLocalParts(date: Date, timeZone: string): ReminderLocalParts {
  const normalized = normalizeReminderTimezone(timeZone);
  const parts = getDateTimeParts(date, normalized.timeZone);
  const hour = parts.hour === 24 ? 0 : parts.hour;
  const minute = parts.minute;
  const localDate = `${String(parts.year).padStart(4, "0")}-${pad2(parts.month)}-${pad2(parts.day)}`;

  return {
    localDate,
    hhmm: `${pad2(hour)}:${pad2(minute)}`,
    weekday: getLocalDateWeekday(localDate),
    minutes: hour * 60 + minute,
  };
}

export function getTimeOnlyHHmm(reminderTime: Date | string | null | undefined) {
  if (!reminderTime) return null;
  const date = new Date(reminderTime);
  if (Number.isNaN(date.getTime())) return null;

  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export function hhmmToMinutes(hhmm: string | null | undefined) {
  if (!hhmm || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(hhmm)) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isWithinReminderBusinessWindow(parts: ReminderLocalParts) {
  return (
    parts.weekday >= 1 &&
    parts.weekday <= 5 &&
    parts.minutes >= REMINDER_BUSINESS_START_MINUTE &&
    parts.minutes <= REMINDER_BUSINESS_END_MINUTE
  );
}

export function isReminderDueNow(
  nowParts: ReminderLocalParts,
  targetHHmm: string | null | undefined,
  dueWindowMinutes = REMINDER_DUE_WINDOW_MINUTES,
) {
  const targetMinutes = hhmmToMinutes(targetHHmm);
  if (targetMinutes == null) return false;

  const elapsedMinutes = nowParts.minutes - targetMinutes;
  return elapsedMinutes >= 0 && elapsedMinutes < dueWindowMinutes;
}

export function getLocalDayUtcRange(localDate: string, timeZone: string) {
  const normalized = normalizeReminderTimezone(timeZone);
  const [year, month, day] = localDate.split("-").map(Number);
  const start = localDateTimeToUtc(localDate, normalized.timeZone, 0, 0);
  const nextLocalDate = new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
  const end = localDateTimeToUtc(nextLocalDate, normalized.timeZone, 0, 0);

  return { start, end };
}
