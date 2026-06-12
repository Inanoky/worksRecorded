const uploadFilesMock = jest.fn();
const transcriptionCreateMock = jest.fn();
const sendMessageMock = jest.fn();

jest.mock("uploadthing/server", () => ({
  UTApi: jest.fn().mockImplementation(() => ({
    uploadFiles: uploadFilesMock,
  })),
}));

jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: transcriptionCreateMock,
        },
      },
    })),
    toFile: jest.fn(async (buffer: Buffer, fileName: string) => ({
      buffer,
      name: fileName,
    })),
  };
});

jest.mock("@/lib/utils/whatsapp-helpers/shared/helpers", () => {
  const actual = jest.requireActual("@/lib/utils/whatsapp-helpers/shared/helpers");
  return {
    ...actual,
    fetchWhatsAppMediaAsBuffer: jest.fn(async () => Buffer.from("test audio bytes")),
  };
});

jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
  sendMessage: sendMessageMock,
}));

import { handleAudio, storeWhatsAppAudioFromUrl } from "./handleAudio";
import { fetchWhatsAppMediaAsBuffer } from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

describe("handleAudio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai";
    uploadFilesMock.mockResolvedValue({
      data: { ufsUrl: "https://ut.test.ufs.sh/f/voice.ogg" },
    });
    transcriptionCreateMock.mockResolvedValue({ text: "Test transcript" });
  });

  function audioFormData() {
    const formData = new FormData();
    formData.set("MediaUrl0", "https://meta.test/audio.ogg");
    formData.set("MediaContentType0", "audio/ogg");
    return formData;
  }

  it("downloads the expiring Meta audio URL and uploads it to UploadThing", async () => {
    const stored = await storeWhatsAppAudioFromUrl("https://meta.test/audio.ogg", "audio/ogg");

    expect(fetchWhatsAppMediaAsBuffer).toHaveBeenCalledWith("https://meta.test/audio.ogg");
    expect(uploadFilesMock).toHaveBeenCalledTimes(1);
    expect(uploadFilesMock.mock.calls[0][0][0]).toEqual(
      expect.objectContaining({
        name: expect.stringMatching(/^whatsapp_voice_\d+\.ogg$/),
        type: "audio/ogg",
      }),
    );
    expect(stored).toEqual({
      buffer: Buffer.from("test audio bytes"),
      originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
    });
  });

  it("does not create a diary placeholder record when meta info is provided", async () => {
    const stored = await storeWhatsAppAudioFromUrl("https://meta.test/audio.ogg", "audio/ogg", {
      userId: "user-1",
      siteId: "site-1",
    });

    expect(stored).toEqual({
      buffer: Buffer.from("test audio bytes"),
      originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
    });
  });

  it("returns null when upload response has no ufsUrl to persist", async () => {
    uploadFilesMock.mockResolvedValue({
      data: { appUrl: "https://ut.test/a/voice.ogg" },
    });

    const stored = await storeWhatsAppAudioFromUrl("https://meta.test/audio.ogg", "audio/ogg");

    expect(stored.originalAudioUrl).toBeNull();
  });

  it("never returns the expiring Meta download URL as originalAudioUrl", async () => {
    const metaUrl = "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=test";
    const stored = await storeWhatsAppAudioFromUrl(metaUrl, "audio/ogg");

    expect(stored.originalAudioUrl).toBe("https://ut.test.ufs.sh/f/voice.ogg");
    expect(stored.originalAudioUrl).not.toBe(metaUrl);
  });

  it("uploads source audio, transcribes it, and exposes sourceAudioUrl through app context", async () => {
    const agent = jest.fn(async () => {
      expect(getWhatsappSourceContext().originalAudioUrl).toBe("https://ut.test.ufs.sh/f/voice.ogg");
      return "AI response";
    });

    const handled = await handleAudio({
      formData: audioFormData(),
      user: {
        id: "user-1",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
      to: "whatsapp:+37120000001",
      agent,
    });

    expect(handled).toBe(true);
    expect(fetchWhatsAppMediaAsBuffer).toHaveBeenCalledWith("https://meta.test/audio.ogg");
    expect(uploadFilesMock).toHaveBeenCalledTimes(1);
    expect(transcriptionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-transcribe",
      }),
    );
    expect(agent).toHaveBeenCalledWith(
      "Test transcript",
      "site-1",
      "user-1",
      "https://ut.test.ufs.sh/f/voice.ogg",
    );
    expect(sendMessageMock).toHaveBeenCalledWith(
      "whatsapp:+37120000001",
      expect.stringContaining("Transcription:\nTest transcript"),
    );
  });

  it("continues transcription when UploadThing upload fails and exposes null audio URL through app context", async () => {
    uploadFilesMock.mockResolvedValue({ error: { message: "upload failed" } });
    const agent = jest.fn(async () => {
      expect(getWhatsappSourceContext().originalAudioUrl).toBeNull();
      return "AI response";
    });

    const handled = await handleAudio({
      formData: audioFormData(),
      user: {
        id: "user-1",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
      to: "whatsapp:+37120000001",
      agent,
    });

    expect(handled).toBe(true);
    expect(transcriptionCreateMock).toHaveBeenCalledTimes(1);
    expect(agent).toHaveBeenCalledWith("Test transcript", "site-1", "user-1", null);
  });
});
