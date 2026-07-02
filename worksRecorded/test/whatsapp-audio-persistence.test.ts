const uploadFilesMock = jest.fn();
const createMock = jest.fn();
const updateMock = jest.fn();
const transactionMock = jest.fn();

jest.mock("uploadthing/server", () => ({
  UTApi: jest.fn().mockImplementation(() => ({
    uploadFiles: uploadFilesMock,
  })),
}));

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    $transaction: transactionMock,
    sitediaryrecords: {
      create: createMock,
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

jest.mock("@/server/actions/shared-actions", () => ({
  getOrganizationIdByUserId: jest.fn(async () => "org-1"),
  getOrganizationIdByWorkerId: jest.fn(async () => "org-worker-1"),
  orgCheck: jest.fn(),
}));

jest.mock("@/server/actions/whatsapp-actions", () => ({
  getUserFullNameById: jest.fn(async () => "Test Manager"),
  getWorkerFullNameById: jest.fn(async () => "Test Worker"),
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/helpers", () => {
  const actual = jest.requireActual("@/lib/utils/whatsapp-helpers/shared/helpers");
  return {
    ...actual,
    fetchWhatsAppMediaAsBuffer: jest.fn(async () => Buffer.from("test audio bytes")),
  };
});

import { storeWhatsAppAudioFromUrl } from "@/lib/utils/whatsapp-helpers/shared/handleAudio";
import { saveSiteDiaryRecord } from "@/server/actions/site-diary-actions";
import { injectSiteManagerToolCallContext } from "@/server/ai-flows/agents/whatsapp-agent/toolCallContext";
import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

const META_AUDIO_URL =
  "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=meta-audio-001&source=webhook";
const UPLOADTHING_AUDIO_URL = "https://ut.test.ufs.sh/f/voice.ogg";

describe("WhatsApp audio URL persistence integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        id: "record-1",
        originalAudioUrl: data.originalAudioUrl ?? null,
      }),
    );
    updateMock.mockImplementation(({ data, where }) =>
      Promise.resolve({
        ...data,
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
    uploadFilesMock.mockResolvedValue({
      data: { ufsUrl: UPLOADTHING_AUDIO_URL },
    });
  });

  it("persists UploadThing ufsUrl from upload, never the Meta webhook download URL", async () => {
    const { originalAudioUrl } = await storeWhatsAppAudioFromUrl(META_AUDIO_URL, "audio/ogg");

    expect(originalAudioUrl).toBe(UPLOADTHING_AUDIO_URL);
    expect(originalAudioUrl).not.toBe(META_AUDIO_URL);

    const toolCall = {
      name: "save_to_database",
      args: {
        question: "save diary",
        siteId: "site-1",
        userId: "user-1",
        date: "08-06-2026",
        originalUserComment: "Test transcript",
        originalAudioUrl: META_AUDIO_URL,
      },
      type: "tool_call",
      id: "call-1",
    };

    await runWithWhatsappSourceContext({ originalAudioUrl }, async () => {
      injectSiteManagerToolCallContext(toolCall, {
        sourceComment: "Test Manager : Test transcript",
        userId: "user-1",
        siteId: "site-1",
        originalAudioUrl,
      });

      await saveSiteDiaryRecord({
        rows: [{ Location: "Site A", Works: "Concrete pour" }],
        userId: "user-1",
        siteId: "site-1",
        originalUserComment: "Test transcript",
      });
    });

    expect(toolCall.args).not.toHaveProperty("originalAudioUrl");

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        originalAudioUrl: UPLOADTHING_AUDIO_URL,
      }),
      select: expect.any(Object),
    });
    expect(createMock.mock.calls[0][0].data.originalAudioUrl).not.toBe(META_AUDIO_URL);
  });
});
