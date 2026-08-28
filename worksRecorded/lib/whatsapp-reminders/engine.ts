import { Prisma } from "@prisma/client";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { logPerfEvent } from "@/lib/observability/perf";
import { getMergedProductionFlowConfigs } from "@/lib/production-flow/config-server";
import { normalizeInternationalPhoneForWhatsApp } from "@/lib/utils/phone/international-phone";
import { prisma } from "@/lib/utils/db";
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
  ReminderHolidayCalendar,
} from "@/lib/whatsapp-reminders/time";

export type WhatsappReminderTargetType = "user" | "worker";
export type WhatsappReminderSource = "scheduled" | "manual";
export type WhatsappReminderStatus = "pending" | "sent" | "skipped" | "failed";

type ReminderTarget = {
  targetType: WhatsappReminderTargetType;
  id: string;
  organizationId: string | null;
  phone: string | null;
  timezone: string | null;
  reminderTime: Date | null;
  reminderText: string | null;
  siteId: string | null;
  lastSelectedSiteIdforWhatsapp?: string | null;
};

type ReminderLogBase = {
  targetType: WhatsappReminderTargetType;
  targetId: string;
  organizationId: string | null;
  siteId: string | null;
  localDate: string | null;
  timezone: string | null;
  scheduledHHmm: string | null;
  source: WhatsappReminderSource;
  recipientPhoneMasked?: string | null;
  reason?: string | null;
};

type MetaReminderResult = {
  status: number;
  messageId: string | null;
  responseSummary: string | null;
};

const REMINDER_TEMPLATE_NAME = "reminder_custom";

export function maskReminderPhone(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 4) return digits;
  return `***${digits.slice(-4)}`;
}

export function buildScheduledReminderDedupeKey(args: {
  targetType: WhatsappReminderTargetType;
  targetId: string;
  localDate: string;
}) {
  return `scheduled:${args.targetType}:${args.targetId}:${args.localDate}`;
}

function summarizeMetaResponse(raw: string) {
  return raw.slice(0, 1000);
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function sendMetaReminderTemplate(
  to: string,
  variableText: string,
): Promise<MetaReminderResult> {
  const token = process.env.META_ACCESS_TOKEN;
  const businessPhoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !businessPhoneNumberId) {
    throw new Error("missing_meta_env");
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
    {
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
          name: REMINDER_TEMPLATE_NAME,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: variableText }],
            },
          ],
        },
      }),
    },
  );

  const responseText = await response.text().catch(() => "");
  let messageId: string | null = null;

  try {
    const parsed = JSON.parse(responseText) as {
      messages?: Array<{ id?: unknown }>;
    };
    const id = parsed.messages?.[0]?.id;
    messageId = typeof id === "string" ? id : null;
  } catch {
    messageId = null;
  }

  if (!response.ok) {
    throw new Error(`meta_send_failed:${response.status}:${summarizeMetaResponse(responseText)}`);
  }

  return {
    status: response.status,
    messageId,
    responseSummary: summarizeMetaResponse(responseText),
  };
}

async function reserveScheduledLog(args: ReminderLogBase & { dedupeKey: string }) {
  try {
    return await prisma.whatsappReminderLog.create({
      data: {
        targetType: args.targetType,
        targetId: args.targetId,
        organizationId: args.organizationId,
        siteId: args.siteId,
        localDate: args.localDate,
        timezone: args.timezone,
        scheduledHHmm: args.scheduledHHmm,
        dedupeKey: args.dedupeKey,
        source: args.source,
        status: "pending",
        reason: args.reason ?? null,
        recipientPhoneMasked: args.recipientPhoneMasked,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return null;
    throw error;
  }
}

async function createManualLog(args: ReminderLogBase) {
  return await prisma.whatsappReminderLog.create({
    data: {
      targetType: args.targetType,
      targetId: args.targetId,
      organizationId: args.organizationId,
      siteId: args.siteId,
      localDate: args.localDate,
      timezone: args.timezone,
      scheduledHHmm: args.scheduledHHmm,
      source: args.source,
      status: "pending",
      reason: args.reason ?? null,
      recipientPhoneMasked: args.recipientPhoneMasked,
    },
    select: { id: true },
  });
}

async function finishReminderLog(
  logId: string,
  args: {
    status: WhatsappReminderStatus;
    reason?: string | null;
    meta?: MetaReminderResult | null;
    errorMessage?: string | null;
    sentAt?: Date | null;
  },
) {
  return await prisma.whatsappReminderLog.update({
    where: { id: logId },
    data: {
      status: args.status,
      reason: args.reason ?? null,
      metaMessageId: args.meta?.messageId ?? null,
      metaStatus: args.meta?.status ?? null,
      metaResponseSummary: args.meta?.responseSummary ?? null,
      errorMessage: args.errorMessage?.slice(0, 1000) ?? null,
      sentAt: args.sentAt ?? null,
    },
    select: { id: true, status: true, reason: true },
  });
}

async function getExcludedReminderOrganizationIds() {
  return Array.from(
    new Set(
      (await getMergedProductionFlowConfigs())
        .filter((config) => config.enabled && config.flowModuleKey === FLOW_MODULE_KEYS.ZTC_PRODUCTION)
        .flatMap((config) => config.organizationIds),
    ),
  );
}

async function getScheduledReminderTargets(): Promise<ReminderTarget[]> {
  const excludedOrganizationIds = await getExcludedReminderOrganizationIds();
  const [users, workers] = await Promise.all([
    prisma.user.findMany({
      where: {
        remindersEnabled: true,
        organizationId: { notIn: excludedOrganizationIds },
      },
      select: {
        id: true,
        organizationId: true,
        phone: true,
        timezone: true,
        reminderTime: true,
        reminderText: true,
        lastSelectedSiteIdforWhatsapp: true,
      },
    }),
    prisma.workers.findMany({
      where: {
        remindersEnabled: true,
        organizationId: { notIn: excludedOrganizationIds },
      },
      select: {
        id: true,
        organizationId: true,
        siteId: true,
        phone: true,
        timezone: true,
        reminderTime: true,
        reminderText: true,
      },
    }),
  ]);

  return [
    ...users.map((user) => ({
      targetType: "user" as const,
      id: user.id,
      organizationId: user.organizationId,
      phone: user.phone,
      timezone: user.timezone,
      reminderTime: user.reminderTime,
      reminderText: user.reminderText,
      siteId: null,
      lastSelectedSiteIdforWhatsapp: user.lastSelectedSiteIdforWhatsapp,
    })),
    ...workers.map((worker) => ({
      targetType: "worker" as const,
      id: worker.id,
      organizationId: worker.organizationId,
      phone: worker.phone,
      timezone: worker.timezone,
      reminderTime: worker.reminderTime,
      reminderText: worker.reminderText,
      siteId: worker.siteId,
    })),
  ];
}

async function getManualReminderTarget(
  targetType: WhatsappReminderTargetType,
  targetId: string,
): Promise<ReminderTarget | null> {
  if (targetType === "user") {
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        organizationId: true,
        phone: true,
        timezone: true,
        reminderTime: true,
        reminderText: true,
        lastSelectedSiteIdforWhatsapp: true,
      },
    });

    if (!user) return null;

    return {
      targetType,
      id: user.id,
      organizationId: user.organizationId,
      phone: user.phone,
      timezone: user.timezone,
      reminderTime: user.reminderTime,
      reminderText: user.reminderText,
      siteId: null,
      lastSelectedSiteIdforWhatsapp: user.lastSelectedSiteIdforWhatsapp,
    };
  }

  const worker = await prisma.workers.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      organizationId: true,
      siteId: true,
      phone: true,
      timezone: true,
      reminderTime: true,
      reminderText: true,
    },
  });

  if (!worker) return null;

  return {
    targetType,
    id: worker.id,
    organizationId: worker.organizationId,
    phone: worker.phone,
    timezone: worker.timezone,
    reminderTime: worker.reminderTime,
    reminderText: worker.reminderText,
    siteId: worker.siteId,
  };
}

async function resolveTargetSiteIds(target: ReminderTarget) {
  if (!target.organizationId) return { siteIds: [], primarySiteId: target.siteId };

  if (target.targetType === "worker") {
    return {
      siteIds: target.siteId ? [target.siteId] : [],
      primarySiteId: target.siteId,
    };
  }

  if (target.lastSelectedSiteIdforWhatsapp) {
    const selectedSite = await prisma.site.findFirst({
      where: {
        id: target.lastSelectedSiteIdforWhatsapp,
        organizationId: target.organizationId,
      },
      select: { id: true },
    });

    if (selectedSite) {
      return {
        siteIds: [selectedSite.id],
        primarySiteId: selectedSite.id,
      };
    }
  }

  const sites = await prisma.site.findMany({
    where: { organizationId: target.organizationId },
    select: { id: true },
  });

  return {
    siteIds: sites.map((site) => site.id),
    primarySiteId: null,
  };
}

async function hasDiaryRecordForLocalDate(args: {
  siteIds: string[];
  localDate: string;
  timezone: string;
}) {
  if (!args.siteIds.length) return false;

  const range = getLocalDayUtcRange(args.localDate, args.timezone);
  const existing = await prisma.sitediaryrecords.findFirst({
    where: {
      siteId: { in: args.siteIds },
      archivedAt: null,
      Date: {
        gte: range.start,
        lt: range.end,
      },
    },
    select: { id: true },
  });

  return Boolean(existing);
}

async function sendAndUpdateLog(args: {
  logId: string;
  logBase: ReminderLogBase;
  recipient: string | null;
  text: string | null;
  skipDiaryCheck?: boolean;
  siteIds: string[];
  now: Date;
}) {
  if (!args.recipient) {
    return await finishReminderLog(args.logId, {
      status: "skipped",
      reason: "invalid_phone",
    });
  }

  if (!args.text) {
    return await finishReminderLog(args.logId, {
      status: "skipped",
      reason: "missing_reminder_text",
    });
  }

  if (!args.skipDiaryCheck && args.logBase.localDate && args.logBase.timezone) {
    const hasDiary = await hasDiaryRecordForLocalDate({
      siteIds: args.siteIds,
      localDate: args.logBase.localDate,
      timezone: args.logBase.timezone,
    });

    if (hasDiary) {
      return await finishReminderLog(args.logId, {
        status: "skipped",
        reason: "diary_already_submitted",
      });
    }
  }

  try {
    const meta = await sendMetaReminderTemplate(args.recipient, args.text);
    return await finishReminderLog(args.logId, {
      status: "sent",
      reason: "sent",
      meta,
      sentAt: args.now,
    });
  } catch (error: any) {
    return await finishReminderLog(args.logId, {
      status: "failed",
      reason: error?.message === "missing_meta_env" ? "missing_meta_env" : "meta_send_failed",
      errorMessage: error?.message ?? "send_failed",
    });
  }
}

export async function runScheduledWhatsappReminders(args: {
  now?: Date;
  holidayCalendar?: ReminderHolidayCalendar | null;
  latvianPublicHolidaysEnabled?: boolean;
} = {}) {
  const now = args.now ?? new Date();
  const holidayCalendar = getReminderHolidayCalendar(args, now);
  const targets = await getScheduledReminderTargets();
  const results: Array<{
    targetType: WhatsappReminderTargetType;
    targetId: string;
    status: WhatsappReminderStatus | "not_due" | "duplicate";
    reason?: string | null;
  }> = [];

  for (const target of targets) {
    const normalizedTimezone = normalizeReminderTimezone(target.timezone);
    const timezone = normalizedTimezone.timeZone;
    const localParts = getReminderLocalParts(now, timezone);
    const scheduledHHmm = getTimeOnlyHHmm(target.reminderTime);

    if (scheduledHHmm && !isReminderDueNow(localParts, scheduledHHmm)) {
      results.push({
        targetType: target.targetType,
        targetId: target.id,
        status: "not_due",
      });
      continue;
    }

    const recipient = normalizeInternationalPhoneForWhatsApp(target.phone);
    const sites = await resolveTargetSiteIds(target);
    const logBase: ReminderLogBase = {
      targetType: target.targetType,
      targetId: target.id,
      organizationId: target.organizationId,
      siteId: sites.primarySiteId,
      localDate: localParts.localDate,
      timezone,
      scheduledHHmm,
      source: "scheduled",
      recipientPhoneMasked: maskReminderPhone(target.phone),
      reason: normalizedTimezone.fallbackUsed ? "invalid_timezone_fallback" : null,
    };
    const dedupeKey = buildScheduledReminderDedupeKey({
      targetType: target.targetType,
      targetId: target.id,
      localDate: localParts.localDate,
    });
    const log = await reserveScheduledLog({ ...logBase, dedupeKey });

    if (!log) {
      results.push({
        targetType: target.targetType,
        targetId: target.id,
        status: "duplicate",
      });
      continue;
    }

    if (!scheduledHHmm) {
      const finished = await finishReminderLog(log.id, {
        status: "skipped",
        reason: "missing_reminder_time",
      });
      results.push({
        targetType: target.targetType,
        targetId: target.id,
        status: finished.status as WhatsappReminderStatus,
        reason: finished.reason,
      });
      continue;
    }

    if (!isReminderWorkingDay(localParts.localDate, timezone, holidayCalendar)) {
      const finished = await finishReminderLog(log.id, {
        status: "skipped",
        reason: getReminderNonWorkingReason(localParts.localDate, timezone, holidayCalendar),
      });
      results.push({
        targetType: target.targetType,
        targetId: target.id,
        status: finished.status as WhatsappReminderStatus,
        reason: finished.reason,
      });
      continue;
    }

    if (!isWithinReminderBusinessWindow(localParts)) {
      const finished = await finishReminderLog(log.id, {
        status: "skipped",
        reason: "outside_business_hours",
      });
      results.push({
        targetType: target.targetType,
        targetId: target.id,
        status: finished.status as WhatsappReminderStatus,
        reason: finished.reason,
      });
      continue;
    }

    if (!sites.siteIds.length) {
      const finished = await finishReminderLog(log.id, {
        status: "skipped",
        reason: "missing_site",
      });
      results.push({
        targetType: target.targetType,
        targetId: target.id,
        status: finished.status as WhatsappReminderStatus,
        reason: finished.reason,
      });
      continue;
    }

    const finished = await sendAndUpdateLog({
      logId: log.id,
      logBase,
      recipient,
      text: target.reminderText?.trim() || null,
      siteIds: sites.siteIds,
      now,
    });
    results.push({
      targetType: target.targetType,
      targetId: target.id,
      status: finished.status as WhatsappReminderStatus,
      reason: finished.reason,
    });
  }

  const sent = results.filter((result) => result.status === "sent").length;
  const skipped = results.filter((result) => result.status === "skipped").length;
  const failed = results.filter((result) => result.status === "failed").length;

  logPerfEvent({
    route: "whatsapp-reminders",
    category: "action",
    status: failed ? 207 : 200,
    extra: {
      event: "whatsapp_reminders_run",
      targetCount: targets.length,
      sent,
      skipped,
      failed,
      duplicate: results.filter((result) => result.status === "duplicate").length,
      notDue: results.filter((result) => result.status === "not_due").length,
    },
  });

  return {
    ok: failed === 0,
    checked: targets.length,
    sent,
    skipped,
    failed,
    results,
  };
}

export async function sendManualWhatsappReminder(args: {
  targetType: WhatsappReminderTargetType;
  targetId: string;
  reminderText?: string | null;
  now?: Date;
}) {
  const target = await getManualReminderTarget(args.targetType, args.targetId);
  if (!target) {
    throw new Error("Reminder target not found");
  }

  const now = args.now ?? new Date();
  const normalizedTimezone = normalizeReminderTimezone(target.timezone);
  const timezone = normalizedTimezone.timeZone;
  const localParts = getReminderLocalParts(now, timezone);
  const scheduledHHmm = getTimeOnlyHHmm(target.reminderTime);
  const sites = await resolveTargetSiteIds(target);
  const logBase: ReminderLogBase = {
    targetType: target.targetType,
    targetId: target.id,
    organizationId: target.organizationId,
    siteId: sites.primarySiteId,
    localDate: localParts.localDate,
    timezone,
    scheduledHHmm,
    source: "manual",
    recipientPhoneMasked: maskReminderPhone(target.phone),
    reason: normalizedTimezone.fallbackUsed ? "invalid_timezone_fallback" : null,
  };
  const log = await createManualLog(logBase);
  const recipient = normalizeInternationalPhoneForWhatsApp(target.phone);
  const text = args.reminderText?.trim() || target.reminderText?.trim() || null;
  const finished = await sendAndUpdateLog({
    logId: log.id,
    logBase,
    recipient,
    text,
    skipDiaryCheck: true,
    siteIds: sites.siteIds,
    now,
  });

  if (finished.status !== "sent") {
    throw new Error(finished.reason ?? "failed_send_reminder");
  }

  return { ok: true, logId: log.id };
}

function getReminderHolidayCalendar(
  args: {
    holidayCalendar?: ReminderHolidayCalendar | null;
    latvianPublicHolidaysEnabled?: boolean;
  },
  now: Date,
) {
  if (args.holidayCalendar) return args.holidayCalendar;
  if (!args.latvianPublicHolidaysEnabled) return null;

  const year = now.getUTCFullYear();
  return getLatvianPublicHolidayCalendar(year - 1, year + 1);
}
