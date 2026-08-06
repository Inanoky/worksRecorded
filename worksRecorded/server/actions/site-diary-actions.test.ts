const createManyMock = jest.fn();
const createManyAndReturnMock = jest.fn();
const createMock = jest.fn();
const updateMock = jest.fn();
const transactionMock = jest.fn();
const updateManyMock = jest.fn();
const siteFindManyMock = jest.fn();
const siteFindUniqueMock = jest.fn();
const productionFlowConfigOverrideFindManyMock = jest.fn();
const flowAssignmentFindUniqueMock = jest.fn();
const photosFindManyMock = jest.fn();
const bisMaterialFindManyMock = jest.fn();
const siteDiaryFindManyMock = jest.fn();
const batchCreateMock = jest.fn();
const batchFindFirstMock = jest.fn();
const batchFindUniqueMock = jest.fn();
const batchUpdateManyMock = jest.fn();
const correctionAuditFindUniqueMock = jest.fn();
const correctionAuditCreateMock = jest.fn();
const correctionSessionFindUniqueMock = jest.fn();
const correctionSessionDeleteManyMock = jest.fn();
const revalidatePathMock = jest.fn();
let createdRowIndex = 0;

jest.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    $transaction: transactionMock,
    site: {
      findMany: siteFindManyMock,
      findUnique: siteFindUniqueMock,
    },
    productionFlowConfigOverride: {
      findMany: productionFlowConfigOverrideFindManyMock,
    },
    flowAssignment: {
      findUnique: flowAssignmentFindUniqueMock,
    },
    photos: {
      findMany: photosFindManyMock,
    },
    bISmaterialRecords: {
      findMany: bisMaterialFindManyMock,
    },
    sitediaryrecords: {
      create: createMock,
      createMany: createManyMock,
      createManyAndReturn: createManyAndReturnMock,
      update: updateMock,
      updateMany: updateManyMock,
      findMany: siteDiaryFindManyMock,
    },
    siteDiarySaveBatch: {
      create: batchCreateMock,
      findFirst: batchFindFirstMock,
      findUnique: batchFindUniqueMock,
      updateMany: batchUpdateManyMock,
    },
    siteDiaryCorrectionAudit: {
      findUnique: correctionAuditFindUniqueMock,
      create: correctionAuditCreateMock,
    },
    siteDiaryCorrectionSession: {
      findUnique: correctionSessionFindUniqueMock,
      deleteMany: correctionSessionDeleteManyMock,
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

import {
  archiveAndReplaceSiteDiaryBatch,
  copySiteDiaryRecordsToProject,
  getPhotosByDate,
  getSiteDiaryMediaOnlyDays,
  getSiteDiaryProjectCopyTargets,
  saveSiteDiaryRecord,
} from "./site-diary-actions";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "./shared-actions";
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
    evalMetadata: row.evalMetadata ?? null,
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
    (requireUser as jest.Mock).mockResolvedValue({ id: "user-1" });
    (orgCheck as jest.Mock).mockImplementation((_userId: string, siteId: string) => {
      if (siteId === "site-1") return Promise.resolve({ id: "site-1", name: "Source", organizationId: "org-1" });
      if (siteId === "site-2") return Promise.resolve({ id: "site-2", name: "Target", organizationId: "org-1" });
      if (siteId === "site-other-org") {
        return Promise.resolve({ id: "site-other-org", name: "Other", organizationId: "org-2" });
      }
      return Promise.resolve(false);
    });
    siteFindManyMock.mockResolvedValue([]);
    siteFindUniqueMock.mockResolvedValue({ organizationId: "org-1" });
    productionFlowConfigOverrideFindManyMock.mockResolvedValue([]);
    flowAssignmentFindUniqueMock.mockResolvedValue(null);
    createManyMock.mockResolvedValue({ count: 1 });
    createManyAndReturnMock.mockResolvedValue([]);
    createMock.mockImplementation(({ data }) => Promise.resolve(buildCreatedRow(data)));
    batchCreateMock.mockResolvedValue({ id: "batch-1" });
    batchFindFirstMock.mockResolvedValue({
      id: "batch-1",
      siteId: "site-1",
      userId: "user-1",
      sourceMessageId: "wamid.original",
      originalText: "Original report",
      status: "active",
    });
    batchFindUniqueMock.mockResolvedValue(null);
    batchUpdateManyMock.mockResolvedValue({ count: 1 });
    correctionAuditFindUniqueMock.mockResolvedValue(null);
    correctionAuditCreateMock.mockResolvedValue({ id: "audit-1" });
    correctionSessionFindUniqueMock.mockResolvedValue(null);
    correctionSessionDeleteManyMock.mockResolvedValue({ count: 0 });
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
          findMany: siteDiaryFindManyMock,
          update: updateMock,
          updateMany: updateManyMock,
        },
        siteDiarySaveBatch: {
          create: batchCreateMock,
          findFirst: batchFindFirstMock,
          updateMany: batchUpdateManyMock,
        },
        siteDiaryCorrectionAudit: {
          create: correctionAuditCreateMock,
        },
        siteDiaryCorrectionSession: {
          deleteMany: correctionSessionDeleteManyMock,
        },
      }),
    );
    updateManyMock.mockResolvedValue({ count: 1 });
    photosFindManyMock.mockResolvedValue([]);
    bisMaterialFindManyMock.mockResolvedValue([]);
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
        evalMetadata: undefined,
      }),
      select: expect.any(Object),
    });
  });

  it("saves a comment-only row without work or location", async () => {
    const result = await saveSiteDiaryRecord({
      rows: [
        {
          Date: "2026-07-18T00:00:00.000Z",
          Location: null,
          Works: null,
          Comments: "Samontētas 3 sienas.",
          Units: "gab.",
          Amounts: 3,
        },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "Assembled 3 walls",
    });

    expectSuccessfulSave(result, 1);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        Location: undefined,
        Works: undefined,
        Comments: "Samontētas 3 sienas.",
        Units: "gab.",
        Amounts: 3,
      }),
      select: expect.any(Object),
    });
  });

  it("rejects rows without meaningful diary content", async () => {
    const result = await saveSiteDiaryRecord({
      rows: [
        { Date: "2026-07-18T00:00:00.000Z" },
        { Units: "gab." },
        { Amounts: "not-a-number" },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "",
    });

    expect(result).toEqual({ ok: false, message: "No records to insert" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("stores eval metadata only when provided", async () => {
    const evalMetadata = {
      isEval: true,
      flow: "whatsapp-site-manager",
      runId: "run-1",
      caseId: "case-1",
      messageId: "wamid.eval.run-1.case-1",
      createdBy: "ai-eval-runner",
    };

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
      evalMetadata,
    });

    expectSuccessfulSave(result, 1);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        evalMetadata,
      }),
      select: expect.any(Object),
    });
    expect((result as any).records[0].evalMetadata).toEqual(evalMetadata);
    expect((result as any).normalizedInsertRows[0].evalMetadata).toEqual(evalMetadata);
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

  it("returns site diary photos from the media dialog and keeps audio records", async () => {
    const progressPhoto = {
      id: "photo-progress",
      Date: new Date("2026-06-08T10:00:00.000Z"),
      URL: "https://ut.test.ufs.sh/f/progress.jpg",
      fileUrl: "https://ut.test.ufs.sh/f/progress.jpg",
      Comment: "Wall progress",
      Location: "Site A",
      siteId: "site-1",
      userId: "user-1",
    };
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
    photosFindManyMock.mockResolvedValue([progressPhoto]);
    siteDiaryFindManyMock.mockResolvedValue(audioRows);

    const result = await getPhotosByDate({
      siteId: "site-1",
      startISO: "2026-06-08T00:00:00.000Z",
      endISO: "2026-06-09T00:00:00.000Z",
    });

    expect(result).toEqual({
      photos: [progressPhoto],
      audioRecords: audioRows,
    });
    expect(photosFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        siteId: "site-1",
        AND: [
          {
            OR: [{ mediaPurpose: null }, { mediaPurpose: "site_diary" }],
          },
        ],
      }),
    }));
    expect(bisMaterialFindManyMock).not.toHaveBeenCalled();
  });
});

describe("site diary project copy actions", () => {
  const sourceRecord = {
    id: "record-1",
    userId: "user-1",
    workerId: "worker-1",
    siteId: "site-1",
    organizationId: "org-1",
    Date: new Date("2026-07-20T08:00:00.000Z"),
    Date_Custom_1: new Date("2026-07-20T09:00:00.000Z"),
    Date_Custom_2: new Date("2026-07-20T17:00:00.000Z"),
    Location: "Stāvs 1",
    Location_Custom_1: "Zona A",
    Location_Custom_2: "Sekcija B",
    Works: "Betonēšana",
    Works_Custom_1: "Papilddarbi",
    Works_Custom_2: "Koeficients",
    Comments: "Pabeigts",
    Comments_Custom_1: "Komentārs 1",
    Comments_Custom_2: "Komentārs 2",
    originalUserComment: "Jānis : Betonēšana",
    originalAudioUrl: "https://ut.test.ufs.sh/f/audio.ogg",
    Units: "m3",
    Amounts: 12,
    WorkersInvolved: 3,
    TimeInvolved: 8,
    Photos: ["https://ut.test.ufs.sh/f/photo.jpg"],
    BISId: "bis-1",
    bisStatus: "submitted",
    saveBatchId: "batch-1",
    archivedAt: new Date("2026-07-21T00:00:00.000Z"),
    archiveReason: "test",
    archivedByMessageId: "wamid.test",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createdRowIndex = 0;
    (requireUser as jest.Mock).mockResolvedValue({ id: "user-1" });
    (orgCheck as jest.Mock).mockImplementation((_userId: string, siteId: string) => {
      if (siteId === "site-1") return Promise.resolve({ id: "site-1", name: "Source", organizationId: "org-1" });
      if (siteId === "site-2") return Promise.resolve({ id: "site-2", name: "Target", organizationId: "org-1" });
      if (siteId === "site-other-org") {
        return Promise.resolve({ id: "site-other-org", name: "Other", organizationId: "org-2" });
      }
      return Promise.resolve(false);
    });
    siteFindManyMock.mockResolvedValue([]);
    siteFindUniqueMock.mockResolvedValue({ organizationId: "org-1" });
    productionFlowConfigOverrideFindManyMock.mockResolvedValue([]);
    flowAssignmentFindUniqueMock.mockResolvedValue(null);
    siteDiaryFindManyMock.mockResolvedValue([sourceRecord]);
    createMock.mockImplementation(({ data }) => Promise.resolve(buildCreatedRow(data)));
    transactionMock.mockImplementation((callback) =>
      callback({
        sitediaryrecords: {
          create: createMock,
          findMany: siteDiaryFindManyMock,
        },
      }),
    );
  });

  it("lists only same-organization target projects and excludes the current project", async () => {
    siteFindManyMock.mockResolvedValue([
      { id: "site-2", name: "Target", description: "Target description", subdirectory: "target" },
    ]);

    const targets = await getSiteDiaryProjectCopyTargets("site-1");

    expect(targets).toEqual([
      { id: "site-2", name: "Target", description: "Target description", subdirectory: "target" },
    ]);
    expect(siteFindManyMock).toHaveBeenCalledWith({
      where: { organizationId: "org-1", id: { not: "site-1" } },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, description: true, subdirectory: true },
    });
  });

  it("returns no project copy targets when the organization has no other projects", async () => {
    siteFindManyMock.mockResolvedValue([]);

    await expect(getSiteDiaryProjectCopyTargets("site-1")).resolves.toEqual([]);
  });

  it("copies selected records to another same-organization project and clears external lineage", async () => {
    const result = await copySiteDiaryRecordsToProject({
      sourceSiteId: "site-1",
      targetSiteId: "site-2",
      recordIds: ["record-1"],
    });

    expect(result).toEqual({ count: 1, recordIds: ["record-1"], targetSiteId: "site-2" });
    expect(siteDiaryFindManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["record-1"] }, siteId: "site-1", archivedAt: null },
      select: expect.any(Object),
    });
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        workerId: "worker-1",
        siteId: "site-2",
        organizationId: "org-1",
        Date: sourceRecord.Date,
        Date_Custom_1: sourceRecord.Date_Custom_1,
        Date_Custom_2: sourceRecord.Date_Custom_2,
        Location: "Stāvs 1",
        Works: "Betonēšana",
        Comments: "Pabeigts",
        originalUserComment: "Jānis : Betonēšana",
        originalAudioUrl: "https://ut.test.ufs.sh/f/audio.ogg",
        Units: "m3",
        Amounts: 12,
        WorkersInvolved: 3,
        TimeInvolved: 8,
        Photos: ["https://ut.test.ufs.sh/f/photo.jpg"],
        BISId: null,
        bisStatus: null,
        saveBatchId: null,
        archivedAt: null,
        archiveReason: null,
        archivedByMessageId: null,
      }),
      select: { id: true },
    });
  });

  it("rejects copying to a project in a different organization", async () => {
    await expect(
      copySiteDiaryRecordsToProject({
        sourceSiteId: "site-1",
        targetSiteId: "site-other-org",
        recordIds: ["record-1"],
      }),
    ).rejects.toThrow("Target project must belong to the same organization");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects selected records that do not belong to the source project", async () => {
    siteDiaryFindManyMock.mockResolvedValueOnce([sourceRecord]);

    await expect(
      copySiteDiaryRecordsToProject({
        sourceSiteId: "site-1",
        targetSiteId: "site-2",
        recordIds: ["record-1", "record-other-site"],
      }),
    ).rejects.toThrow("Some selected records were not found in the source project");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects ZTC project copy attempts", async () => {
    await expect(
      copySiteDiaryRecordsToProject({
        sourceSiteId: "site-1",
        targetSiteId: "site-2",
        recordIds: ["record-1"],
        flowId: "ztc",
      }),
    ).rejects.toThrow("Copying ZTC site diary records to another project is not supported.");
    expect(orgCheck).not.toHaveBeenCalled();
  });
});

describe("getSiteDiaryMediaOnlyDays", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    photosFindManyMock.mockResolvedValue([]);
    bisMaterialFindManyMock.mockResolvedValue([]);
    siteDiaryFindManyMock.mockResolvedValue([]);
  });

  it("returns grouped photo-only days when no diary records exist for the date", async () => {
    photosFindManyMock.mockResolvedValue([
      {
        Date: new Date("2026-06-08T10:00:00.000Z"),
        Comment: "Wall photo",
        Location: "Site A",
      },
      {
        Date: new Date("2026-06-08T15:00:00.000Z"),
        Comment: "Second wall photo",
        Location: "Site A",
      },
      {
        Date: new Date("2026-06-07T09:00:00.000Z"),
        Comment: "Foundation photo",
        Location: "Site B",
      },
    ]);
    siteDiaryFindManyMock.mockResolvedValue([]);

    const result = await getSiteDiaryMediaOnlyDays("site-1", {
      flowId: "default",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });

    expect(result).toEqual([
      expect.objectContaining({
        key: "2026-06-08",
        photoCount: 2,
        latestPhotoDate: new Date("2026-06-08T15:00:00.000Z"),
      }),
      expect.objectContaining({
        key: "2026-06-07",
        photoCount: 1,
      }),
    ]);
    expect(photosFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          siteId: "site-1",
          OR: [
            { AND: [{ URL: { not: null } }, { URL: { not: "" } }] },
            { AND: [{ fileUrl: { not: null } }, { fileUrl: { not: "" } }] },
          ],
        }),
      }),
    );
  });

  it("returns photo counts for dates that already have diary records", async () => {
    photosFindManyMock.mockResolvedValue([
      {
        Date: new Date("2026-06-08T10:00:00.000Z"),
        Comment: "Wall photo",
        Location: "Site A",
      },
      {
        Date: new Date("2026-06-09T10:00:00.000Z"),
        Comment: "Roof photo",
        Location: "Site B",
      },
    ]);
    siteDiaryFindManyMock.mockResolvedValue([
      {
        Date: new Date("2026-06-08T12:00:00.000Z"),
        Date_Custom_1: null,
      },
    ]);

    const result = await getSiteDiaryMediaOnlyDays("site-1", {
      flowId: "default",
    });

    expect(result).toEqual([
      expect.objectContaining({
        key: "2026-06-09",
        photoCount: 1,
        hasDiaryRecords: false,
      }),
      expect.objectContaining({
        key: "2026-06-08",
        photoCount: 1,
        hasDiaryRecords: true,
      }),
    ]);
  });

  it("counts only persisted site diary photos for photo-only day summaries", async () => {
    photosFindManyMock.mockResolvedValue([
      {
        Date: new Date("2026-06-08T10:00:00.000Z"),
        URL: "https://ut.test.ufs.sh/f/progress.jpg",
        fileUrl: "https://ut.test.ufs.sh/f/progress.jpg",
        Comment: "Wall progress",
        Location: "Site A",
      },
    ]);
    siteDiaryFindManyMock.mockResolvedValue([]);

    const result = await getSiteDiaryMediaOnlyDays("site-1", {
      flowId: "default",
    });

    expect(result).toEqual([
      expect.objectContaining({
        key: "2026-06-08",
        photoCount: 1,
        searchableText: "Wall progress Site A",
      }),
    ]);
    expect(result).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "2026-06-07",
        }),
      ]),
    );
    expect(photosFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        siteId: "site-1",
        AND: [
          {
            OR: [{ mediaPurpose: null }, { mediaPurpose: "site_diary" }],
          },
        ],
      }),
    }));
    expect(bisMaterialFindManyMock).not.toHaveBeenCalled();
  });

  it("omits invoice-only days because warehouse invoice photos are not queried", async () => {
    photosFindManyMock.mockResolvedValue([]);
    siteDiaryFindManyMock.mockResolvedValue([]);

    const result = await getSiteDiaryMediaOnlyDays("site-1", {
      flowId: "default",
    });

    expect(result).toEqual([]);
    expect(photosFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: [
          {
            OR: [{ mediaPurpose: null }, { mediaPurpose: "site_diary" }],
          },
        ],
      }),
    }));
  });

  it("applies date range and valid-url filters to the photo query", async () => {
    photosFindManyMock.mockResolvedValue([]);
    siteDiaryFindManyMock.mockResolvedValue([]);

    await getSiteDiaryMediaOnlyDays("site-1", {
      flowId: "default",
      dateFrom: "2026-06-08",
      dateTo: "2026-06-09",
    });

    const photoWhere = photosFindManyMock.mock.calls[0][0].where;
    expect(photoWhere.OR).toEqual([
      { AND: [{ URL: { not: null } }, { URL: { not: "" } }] },
      { AND: [{ fileUrl: { not: null } }, { fileUrl: { not: "" } }] },
    ]);
    expect(photoWhere.AND).toEqual([
      {
        OR: [{ mediaPurpose: null }, { mediaPurpose: "site_diary" }],
      },
    ]);
    expect(photoWhere.Date.gte).toBeInstanceOf(Date);
    expect(photoWhere.Date.lte).toBeInstanceOf(Date);
    expect(photoWhere.Date.gte.getFullYear()).toBe(2026);
    expect(photoWhere.Date.gte.getMonth()).toBe(5);
    expect(photoWhere.Date.gte.getDate()).toBe(8);
    expect(photoWhere.Date.lte.getFullYear()).toBe(2026);
    expect(photoWhere.Date.lte.getMonth()).toBe(5);
    expect(photoWhere.Date.lte.getDate()).toBe(9);
  });
});

describe("archiveAndReplaceSiteDiaryBatch correction guardrails", () => {
  const originalRecord = {
    id: "old-1",
    saveBatchId: "batch-1",
    siteId: "site-1",
    userId: "user-1",
    organizationId: "org-1",
    Date: new Date("2026-06-20T00:00:00.000Z"),
    Location: "Site A",
    Works: "Concrete pour",
    Comments: null,
    originalAudioUrl: null,
    BISId: null,
    archivedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createdRowIndex = 0;
    correctionAuditFindUniqueMock.mockResolvedValue(null);
    correctionAuditCreateMock.mockResolvedValue({ id: "audit-1" });
    correctionSessionFindUniqueMock.mockResolvedValue(null);
    correctionSessionDeleteManyMock.mockResolvedValue({ count: 0 });
    batchFindFirstMock.mockImplementation(({ where }) => {
      if ((where.id === undefined || where.id === "batch-1") && where.siteId === "site-1" && where.userId === "user-1" && where.status === "active") {
        return Promise.resolve({
          id: "batch-1",
          siteId: "site-1",
          userId: "user-1",
          sourceMessageId: "wamid.original",
          originalText: "Original report",
          status: "active",
        });
      }
      return Promise.resolve(null);
    });
    batchCreateMock.mockResolvedValue({ id: "batch-2" });
    batchUpdateManyMock.mockResolvedValue({ count: 1 });
    siteDiaryFindManyMock.mockImplementation(({ where }) => {
      if (where.saveBatchId === "batch-1" && where.siteId === "site-1" && where.userId === "user-1" && where.archivedAt === null) {
        return Promise.resolve([originalRecord]);
      }
      return Promise.resolve([]);
    });
    createMock.mockImplementation(({ data }) => Promise.resolve(buildCreatedRow(data)));
    updateManyMock.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation((callback) =>
      callback({
        sitediaryrecords: {
          create: createMock,
          findMany: siteDiaryFindManyMock,
          updateMany: updateManyMock,
        },
        siteDiarySaveBatch: {
          create: batchCreateMock,
          findFirst: batchFindFirstMock,
          updateMany: batchUpdateManyMock,
        },
        siteDiaryCorrectionAudit: {
          create: correctionAuditCreateMock,
        },
        siteDiaryCorrectionSession: {
          deleteMany: correctionSessionDeleteManyMock,
        },
      }),
    );
  });

  it("locks and archives correction records by save batch, site, and user", async () => {
    const result = await archiveAndReplaceSiteDiaryBatch({
      siteId: "site-1",
      userId: "user-1",
      correctionMessageId: "wamid.correction",
      correctionText: "Izmaini daudzumu uz 10 gab.",
      rows: [{ Date: originalRecord.Date, Location: "Site A", Works: "Concrete pour", Amounts: 10 }],
    });

    expect(result).toEqual(expect.objectContaining({ ok: true, count: 1, oldCount: 1 }));
    expect(siteDiaryFindManyMock).toHaveBeenCalledWith({
      where: { saveBatchId: "batch-1", siteId: "site-1", userId: "user-1", archivedAt: null },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { saveBatchId: "batch-1", siteId: "site-1", userId: "user-1", archivedAt: null },
      data: expect.objectContaining({ archiveReason: "whatsapp-correction" }),
    });
    expect(batchUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "batch-1", siteId: "site-1", userId: "user-1", status: "active" },
      data: expect.objectContaining({ status: "archived", replacementBatchId: "batch-2" }),
    });
  });

  it("refuses a correction target that no longer belongs to the trusted site and user", async () => {
    batchFindFirstMock.mockImplementation(({ where }) => {
      if (where.id === "batch-1") {
        return Promise.resolve({
          id: "batch-1",
          siteId: "other-site",
          userId: "other-user",
          sourceMessageId: "wamid.original",
          originalText: "Original report",
          status: "active",
        });
      }
      return Promise.resolve(null);
    });

    const result = await archiveAndReplaceSiteDiaryBatch({
      siteId: "site-1",
      userId: "user-1",
      correctionMessageId: "wamid.correction",
      correctionText: "Izmaini daudzumu uz 10 gab.",
      rows: [{ Date: originalRecord.Date, Location: "Site A", Works: "Concrete pour", Amounts: 10 }],
    });

    expect(result).toEqual({ ok: false, reason: "no-eligible-batch" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("keeps BIS-linked correction rows blocked", async () => {
    siteDiaryFindManyMock.mockResolvedValueOnce([{ ...originalRecord, BISId: "bis-1" }]);

    const result = await archiveAndReplaceSiteDiaryBatch({
      siteId: "site-1",
      userId: "user-1",
      correctionMessageId: "wamid.correction",
      correctionText: "Izmaini daudzumu uz 10 gab.",
      rows: [{ Date: originalRecord.Date, Location: "Site A", Works: "Concrete pour", Amounts: 10 }],
    });

    expect(result).toEqual({ ok: false, reason: "bis-linked" });
    expect(createMock).not.toHaveBeenCalled();
  });
});
