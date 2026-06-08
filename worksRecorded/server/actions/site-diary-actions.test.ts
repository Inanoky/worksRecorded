const createManyMock = jest.fn();
const updateManyMock = jest.fn();
const photosFindManyMock = jest.fn();
const siteDiaryFindManyMock = jest.fn();

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    photos: {
      findMany: photosFindManyMock,
    },
    sitediaryrecords: {
      createMany: createManyMock,
      updateMany: updateManyMock,
      findMany: siteDiaryFindManyMock,
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

import { getPhotosByDate, saveSiteDiaryRecord } from "./site-diary-actions";
import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

describe("saveSiteDiaryRecord originalAudioUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createManyMock.mockResolvedValue({ count: 1 });
    updateManyMock.mockResolvedValue({ count: 1 });
    photosFindManyMock.mockResolvedValue([]);
    siteDiaryFindManyMock.mockResolvedValue([]);
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
    updateManyMock.mockResolvedValue({ count: 1 });

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
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "pending-1", Works: "Processing voice message..." },
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

  it("does not overwrite a skeleton record after the audio context has already been consumed", async () => {
    const first = await runWithWhatsappSourceContext(
      {
        originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
        originalAudioRecordId: "pending-1",
      },
      async () => {
        const firstResult = await saveSiteDiaryRecord({
          rows: [{ Location: "Site A", Works: "Concrete pour" }],
          userId: "user-1",
          siteId: "site-1",
          originalUserComment: "Work log",
        });
        const secondResult = await saveSiteDiaryRecord({
          rows: [{ Location: "Site B", Works: "Painting" }],
          userId: "user-1",
          siteId: "site-1",
          originalUserComment: "Duplicate tool call",
        });

        return { firstResult, secondResult };
      },
    );

    expect(first.firstResult).toEqual({ ok: true, count: 1 });
    expect(first.secondResult).toEqual({
      ok: true,
      count: 0,
      message: "Audio diary already saved",
    });
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("returns photos and same-day audio diary records for the media dialog", async () => {
    const photoRows = [
      {
        id: "photo-1",
        Date: new Date("2026-06-08T10:00:00.000Z"),
        URL: "https://ut.test.ufs.sh/f/photo.jpg",
        fileUrl: "https://ut.test.ufs.sh/f/photo.jpg",
        Comment: "Wall photo",
        Location: "Site A",
        siteId: "site-1",
        userId: "user-1",
      },
    ];
    const audioRows = [
      {
        id: "record-1",
        Date: new Date("2026-06-08T11:00:00.000Z"),
        Location: "Site A",
        Works: "Concrete pour",
        originalUserComment: "Test Manager : poured concrete",
        originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
        siteId: "site-1",
        userId: "user-1",
        workerId: null,
      },
    ];
    photosFindManyMock.mockResolvedValue(photoRows);
    siteDiaryFindManyMock.mockResolvedValue(audioRows);

    const result = await getPhotosByDate({
      siteId: "site-1",
      startISO: "2026-06-08T00:00:00.000Z",
      endISO: "2026-06-09T00:00:00.000Z",
    });

    expect(result).toEqual({ photos: photoRows, audioRecords: audioRows });
    expect(siteDiaryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          siteId: "site-1",
          AND: [{ originalAudioUrl: { not: null } }, { originalAudioUrl: { not: "" } }],
        }),
      }),
    );
  });
});
