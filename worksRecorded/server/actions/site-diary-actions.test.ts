const createManyMock = jest.fn();
const updateMock = jest.fn();

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    sitediaryrecords: {
      createMany: createManyMock,
      update: updateMock,
    },
  },
}));

jest.mock("@/lib/utils/requireUser", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/server/actions/BIS/service", () => ({
  requireBisAccessTokenForSite: jest.fn(),
  getBisBaseUrl: jest.fn(),
}));

jest.mock("@/server/actions/BIS/TestBisEnv/relay", () => ({
  bisFetch: jest.fn(),
}));

jest.mock("./shared-actions", () => ({
  getOrganizationIdByUserId: jest.fn(async () => "org-1"),
  getOrganizationIdByWorkerId: jest.fn(async () => "org-worker-1"),
  orgCheck: jest.fn(),
}));

jest.mock("./whatsapp-actions", () => ({
  getUserFullNameById: jest.fn(async () => "Test Manager"),
  getWorkerFullNameById: jest.fn(async () => "Test Worker"),
}));

import { saveSiteDiaryRecord } from "./site-diary-actions";
import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

describe("saveSiteDiaryRecord originalAudioUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createManyMock.mockResolvedValue({ count: 1 });
  });

  it("stores originalAudioUrl from WhatsApp source context in sitediaryrecords createMany data", async () => {
    const result = await runWithWhatsappSourceContext(
      { originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg" },
      () =>
        saveSiteDiaryRecord({
          rows: [
            {
              Date: "2026-06-08T12:00:00.000Z",
              Location: "Site A",
              Works: "Concrete pour",
              Comments: "Done",
              Amounts: "2",
              WorkersInvolved: "3",
              TimeInvolved: "4",
            },
          ],
          userId: "user-1",
          siteId: "site-1",
          originalUserComment: "Concrete pour",
        }),
    );

    expect(result).toEqual({ ok: true, count: 1 });
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "user-1",
          siteId: "site-1",
          originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
          originalUserComment: "Test Manager : Concrete pour",
        }),
      ],
    });
  });

  it("prefers explicit originalAudioUrl over WhatsApp source context", async () => {
    await runWithWhatsappSourceContext(
      { originalAudioUrl: "https://ut.test.ufs.sh/f/context-voice.ogg" },
      () =>
        saveSiteDiaryRecord({
          rows: [
            {
              Location: "Site A",
              Works: "Concrete pour",
            },
          ],
          userId: "user-1",
          siteId: "site-1",
          originalUserComment: "Concrete pour",
          originalAudioUrl: "https://ut.test.ufs.sh/f/explicit-voice.ogg",
        }),
    );

    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          originalAudioUrl: "https://ut.test.ufs.sh/f/explicit-voice.ogg",
        }),
      ],
    });
  });

  it("rejects expiring Meta audio URLs at save time", async () => {
    const result = await saveSiteDiaryRecord({
      rows: [
        {
          Location: "Site A",
          Works: "Concrete pour",
        },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "Concrete pour",
      originalAudioUrl:
        "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=test",
    });

    expect(result).toEqual({ ok: true, count: 1 });
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          originalAudioUrl: undefined,
        }),
      ],
    });
  });

  it("updates skeleton record instead of creating new when originalAudioRecordId is in context", async () => {
    updateMock.mockResolvedValue({ id: "pending-1" });

    const result = await runWithWhatsappSourceContext(
      { originalAudioRecordId: "pending-1" },
      () =>
        saveSiteDiaryRecord({
          rows: [
            {
              Location: "Site A",
              Works: "Concrete pour",
            },
            {
              Location: "Site B",
              Works: "Painting",
            },
          ],
          userId: "user-1",
          siteId: "site-1",
          originalUserComment: "Work log",
        }),
    );

    expect(result).toEqual({ ok: true, count: 2 });
    
    // First row should be updated
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "pending-1" },
      data: expect.objectContaining({
        Location: "Site A",
        Works: "Concrete pour",
      }),
    });

    // Second row should be created
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          Location: "Site B",
          Works: "Painting",
        }),
      ],
    });
  });
});
