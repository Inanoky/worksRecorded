const createManyMock = jest.fn();
const createManyAndReturnMock = jest.fn();
const createMock = jest.fn();
const updateMock = jest.fn();
const transactionMock = jest.fn();
const updateManyMock = jest.fn();
const photosFindManyMock = jest.fn();
const siteDiaryFindManyMock = jest.fn();
let createdRowIndex = 0;

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    $transaction: transactionMock,
    photos: {
      findMany: photosFindManyMock,
    },
    sitediaryrecords: {
      create: createMock,
      createMany: createManyMock,
      createManyAndReturn: createManyAndReturnMock,
      update: updateMock,
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

function buildCreatedRow(row: any, index = createdRowIndex++) {
  return {
    ...row,
    id: `record-${index + 1}`,
    siteId: row.siteId ?? null,
    userId: row.userId ?? null,
    workerId: row.workerId ?? null,
    Location: row.Location ?? null,
    Works: row.Works ?? null,
    Comments: row.Comments ?? null,
    originalUserComment: row.originalUserComment ?? null,
    originalAudioUrl: row.originalAudioUrl ?? null,
    Amounts: row.Amounts ?? null,
    WorkersInvolved: row.WorkersInvolved ?? null,
    TimeInvolved: row.TimeInvolved ?? null,
    createdAt: new Date(`2026-06-23T00:00:0${index}.000Z`),
  };
}

function expectSuccessfulSave(result: unknown, count: number) {
  expect(result).toEqual(
    expect.objectContaining({
      ok: true,
      count,
      recordIds: expect.any(Array),
      records: expect.any(Array),
    }),
  );
  expect((result as any).recordIds).toHaveLength(count);
  expect((result as any).records).toHaveLength(count);
}

describe("saveSiteDiaryRecord originalAudioUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createdRowIndex = 0;
    createManyMock.mockResolvedValue({ count: 1 });
    createManyAndReturnMock.mockResolvedValue([]);
    createMock.mockImplementation(({ data }) => Promise.resolve(buildCreatedRow(data)));
    updateMock.mockImplementation(({ data, where }) =>
      Promise.resolve({
        ...buildCreatedRow(data),
        id: where.id,
      }),
    );
    transactionMock.mockImplementation((callback) =>
      callback({
        sitediaryrecords: {
          create: createMock,
          update: updateMock,
        },
      }),
    );
    updateManyMock.mockResolvedValue({ count: 1 });
    photosFindManyMock.mockResolvedValue([]);
    siteDiaryFindManyMock.mockResolvedValue([]);
  });

  it("stores originalAudioUrl from WhatsApp source context in sitediaryrecords create data", async () => {
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

    expectSuccessfulSave(result, 1);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        siteId: "site-1",
        originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
        originalUserComment: "Test Manager : Concrete pour",
      }),
      select: expect.any(Object),
    });
  });

  it("does not convert missing numeric fields to zero", async () => {
    const result = await saveSiteDiaryRecord({
      rows: [
        {
          Location: "Site A",
          Works: "Concrete pour",
          Amounts: null,
          WorkersInvolved: null,
          TimeInvolved: null,
        },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "Concrete pour",
    });

    expectSuccessfulSave(result, 1);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        Amounts: null,
        WorkersInvolved: null,
        TimeInvolved: null,
      }),
      select: expect.any(Object),
    });
  });

  it("normalizes blank and invalid numeric fields to null", async () => {
    await saveSiteDiaryRecord({
      rows: [
        {
          Location: "Site A",
          Works: "Concrete pour",
          Amounts: "",
          WorkersInvolved: undefined,
          TimeInvolved: "not-a-number",
        },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "Concrete pour",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        Amounts: null,
        WorkersInvolved: null,
        TimeInvolved: null,
      }),
      select: expect.any(Object),
    });
  });

  it("preserves explicit numeric values for amounts, workers, and hours", async () => {
    const result = await saveSiteDiaryRecord({
      rows: [
        {
          Location: "Site A",
          Works: "Concrete pour",
          Amounts: "5",
          WorkersInvolved: "2",
          TimeInvolved: "3",
        },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "Concrete pour",
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        count: 1,
        records: [
          expect.objectContaining({
            WorkersInvolved: 2,
            TimeInvolved: 3,
          }),
        ],
      }),
    );
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        Amounts: 5,
        WorkersInvolved: 2,
        TimeInvolved: 3,
      }),
      select: expect.any(Object),
    });
  });

  it("repairs numeric fields when create returns a mismatched persisted value", async () => {
    createMock.mockImplementationOnce(({ data }) =>
      Promise.resolve({
        ...buildCreatedRow(data),
        WorkersInvolved: 0,
      }),
    );
    updateMock.mockImplementationOnce(({ data }) =>
      Promise.resolve({
        ...buildCreatedRow({
          Location: "Site A",
          Works: "Concrete pour",
          ...data,
        }),
        id: "record-1",
      }),
    );

    const result = await saveSiteDiaryRecord({
      rows: [
        {
          Location: "Site A",
          Works: "Concrete pour",
          WorkersInvolved: "2",
          TimeInvolved: "3",
        },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "Concrete pour",
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        records: [
          expect.objectContaining({
            WorkersInvolved: 2,
            TimeInvolved: 3,
          }),
        ],
      }),
    );
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "record-1" },
      data: {
        Amounts: null,
        WorkersInvolved: 2,
        TimeInvolved: 3,
      },
      select: expect.any(Object),
    });
  });

  it("fails loudly when numeric repair still returns a mismatched value", async () => {
    createMock.mockImplementationOnce(({ data }) =>
      Promise.resolve({
        ...buildCreatedRow(data),
        WorkersInvolved: 0,
      }),
    );
    updateMock.mockImplementationOnce(({ data }) =>
      Promise.resolve({
        ...buildCreatedRow(data),
        id: "record-1",
        WorkersInvolved: 0,
      }),
    );

    const result = await saveSiteDiaryRecord({
      rows: [
        {
          Location: "Site A",
          Works: "Concrete pour",
          WorkersInvolved: "2",
        },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "Concrete pour",
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        message: "Numeric persistence mismatch for WorkersInvolved: expected 2, got 0",
      }),
    );
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

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        originalAudioUrl: "https://ut.test.ufs.sh/f/explicit-voice.ogg",
      }),
      select: expect.any(Object),
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

    expectSuccessfulSave(result, 1);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        originalAudioUrl: undefined,
      }),
      select: expect.any(Object),
    });
  });

  it("creates all valid rows instead of updating an audio placeholder", async () => {
    const result = await runWithWhatsappSourceContext(
      { originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg" },
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

    expectSuccessfulSave(result, 2);
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        Location: "Site A",
        Works: "Concrete pour",
        originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
      }),
      select: expect.any(Object),
    });
    expect(createMock).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        Location: "Site B",
        Works: "Painting",
        originalAudioUrl: undefined,
      }),
      select: expect.any(Object),
    });
  });

  it("does not block repeated saves inside the same audio context", async () => {
    const first = await runWithWhatsappSourceContext(
      {
        originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
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

    expectSuccessfulSave(first.firstResult, 1);
    expectSuccessfulSave(first.secondResult, 1);
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        Location: "Site A",
        Works: "Concrete pour",
        originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
      }),
    );
    expect(createMock.mock.calls[1][0].data).toEqual(
      expect.objectContaining({
        Location: "Site B",
        Works: "Painting",
        originalAudioUrl: undefined,
      }),
    );
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
