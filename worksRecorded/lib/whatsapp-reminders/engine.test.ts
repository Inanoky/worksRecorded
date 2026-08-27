const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  workers: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  site: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  sitediaryrecords: {
    findFirst: jest.fn(),
  },
  whatsappReminderLog: {
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@/lib/utils/db", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/production-flow/config-server", () => ({
  getMergedProductionFlowConfigs: jest.fn(async () => []),
}));

jest.mock("@/lib/observability/perf", () => ({
  logPerfEvent: jest.fn(),
}));

import {
  runScheduledWhatsappReminders,
  sendManualWhatsappReminder,
} from "@/lib/whatsapp-reminders/engine";

function resetMocks() {
  jest.clearAllMocks();
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockPrisma.workers.findMany.mockResolvedValue([]);
  mockPrisma.workers.findUnique.mockResolvedValue(null);
  mockPrisma.site.findFirst.mockResolvedValue(null);
  mockPrisma.site.findMany.mockResolvedValue([]);
  mockPrisma.sitediaryrecords.findFirst.mockResolvedValue(null);
  mockPrisma.whatsappReminderLog.create.mockResolvedValue({ id: "log-1" });
  mockPrisma.whatsappReminderLog.update.mockImplementation(async (_args) => ({
    id: "log-1",
    status: _args.data.status,
    reason: _args.data.reason,
  }));
  process.env.META_ACCESS_TOKEN = "token";
  process.env.META_PHONE_NUMBER_ID = "phone-number-id";
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ messages: [{ id: "wamid.1" }] }),
  })) as jest.Mock;
}

describe("whatsapp reminder engine", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("sends a scheduled reminder when enabled, due, in hours, and no diary exists", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        organizationId: "org-1",
        phone: "+37124885690",
        timezone: "Europe/Riga",
        reminderTime: new Date("1970-01-01T08:00:00.000Z"),
        reminderText: "Lūdzu aizpildi dienas atskaiti",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
    ]);
    mockPrisma.site.findFirst.mockResolvedValue({ id: "site-1" });

    const result = await runScheduledWhatsappReminders({
      now: new Date("2026-01-05T06:05:00.000Z"),
    });

    expect(result.sent).toBe(1);
    expect(mockPrisma.whatsappReminderLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dedupeKey: "scheduled:user:user-1:2026-01-05",
          status: "pending",
        }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockPrisma.whatsappReminderLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "sent",
          metaMessageId: "wamid.1",
        }),
      }),
    );
  });

  it("logs a scheduled skip when the diary already exists", async () => {
    mockPrisma.workers.findMany.mockResolvedValue([
      {
        id: "worker-1",
        organizationId: "org-1",
        siteId: "site-1",
        phone: "+37124885690",
        timezone: "Europe/Riga",
        reminderTime: new Date("1970-01-01T08:00:00.000Z"),
        reminderText: "Lūdzu aizpildi dienas atskaiti",
      },
    ]);
    mockPrisma.sitediaryrecords.findFirst.mockResolvedValue({ id: "record-1" });

    const result = await runScheduledWhatsappReminders({
      now: new Date("2026-01-05T06:05:00.000Z"),
    });

    expect(result.skipped).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockPrisma.whatsappReminderLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "skipped",
          reason: "diary_already_submitted",
        }),
      }),
    );
  });

  it("normalizes an invalid scheduled timezone and records the fallback", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        organizationId: "org-1",
        phone: "+37124885690",
        timezone: "Bad/Timezone",
        reminderTime: new Date("1970-01-01T08:00:00.000Z"),
        reminderText: "Lūdzu aizpildi dienas atskaiti",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
    ]);
    mockPrisma.site.findFirst.mockResolvedValue({ id: "site-1" });

    const result = await runScheduledWhatsappReminders({
      now: new Date("2026-01-05T06:05:00.000Z"),
    });

    expect(result.sent).toBe(1);
    expect(mockPrisma.whatsappReminderLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          timezone: "Europe/Riga",
          reason: "invalid_timezone_fallback",
        }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("logs a holiday skip and does not call Meta when Latvian holidays are enabled", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        organizationId: "org-1",
        phone: "+37124885690",
        timezone: "Europe/Riga",
        reminderTime: new Date("1970-01-01T08:00:00.000Z"),
        reminderText: "Lūdzu aizpildi dienas atskaiti",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
    ]);
    mockPrisma.site.findFirst.mockResolvedValue({ id: "site-1" });

    const result = await runScheduledWhatsappReminders({
      now: new Date("2026-05-01T05:05:00.000Z"),
      latvianPublicHolidaysEnabled: true,
    });

    expect(result.skipped).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockPrisma.whatsappReminderLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "skipped",
          reason: "holiday",
        }),
      }),
    );
  });

  it("blocks an otherwise due reminder just outside local business hours", async () => {
    mockPrisma.workers.findMany.mockResolvedValue([
      {
        id: "worker-1",
        organizationId: "org-1",
        siteId: "site-1",
        phone: "+37124885690",
        timezone: "Europe/Riga",
        reminderTime: new Date("1970-01-01T18:00:00.000Z"),
        reminderText: "Lūdzu aizpildi dienas atskaiti",
      },
    ]);

    const result = await runScheduledWhatsappReminders({
      now: new Date("2026-01-05T16:01:00.000Z"),
    });

    expect(result.skipped).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockPrisma.whatsappReminderLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "skipped",
          reason: "outside_business_hours",
        }),
      }),
    );
  });

  it("manual reminders are logged and do not require scheduled enablement", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      phone: "+37124885690",
      timezone: "Europe/Riga",
      reminderTime: null,
      reminderText: "Default text",
      lastSelectedSiteIdforWhatsapp: "site-1",
    });
    mockPrisma.site.findFirst.mockResolvedValue({ id: "site-1" });

    await expect(
      sendManualWhatsappReminder({
        targetType: "user",
        targetId: "user-1",
        reminderText: "Manual text",
        now: new Date("2026-01-05T20:00:00.000Z"),
      }),
    ).resolves.toEqual({ ok: true, logId: "log-1" });

    expect(mockPrisma.whatsappReminderLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "manual",
          status: "pending",
        }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("manual failures update the log before throwing", async () => {
    mockPrisma.workers.findUnique.mockResolvedValue({
      id: "worker-1",
      organizationId: "org-1",
      siteId: "site-1",
      phone: null,
      timezone: "Europe/Riga",
      reminderTime: null,
      reminderText: "Default text",
    });

    await expect(
      sendManualWhatsappReminder({
        targetType: "worker",
        targetId: "worker-1",
      }),
    ).rejects.toThrow("invalid_phone");

    expect(mockPrisma.whatsappReminderLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "skipped",
          reason: "invalid_phone",
        }),
      }),
    );
  });
});
