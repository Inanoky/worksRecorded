const transcriptionCreateMock = jest.fn();
const uploadSourceAudioMock = jest.fn();
const talkToClockInAgentMock = jest.fn();
const sendMessageMock = jest.fn();

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    workers: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/helpers", () => ({
  fetchWhatsAppMediaAsBuffer: jest.fn(async () => Buffer.from("worker audio bytes")),
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/handleImage", () => ({
  handleImage: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/handleAudio", () => ({
  inferAudioExtension: jest.fn(() => "ogg"),
  uploadSourceAudio: uploadSourceAudioMock,
}));

jest.mock("@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/agent", () => ({
  __esModule: true,
  default: talkToClockInAgentMock,
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
  sendMessage: sendMessageMock,
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

import { prisma } from "@/lib/utils/db";
import { handleWorkerMessage } from "./worker-route";
import { fetchWhatsAppMediaAsBuffer } from "@/lib/utils/whatsapp-helpers/shared/helpers";

describe("handleWorkerMessage audio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai";
    (prisma.workers.findFirst as jest.Mock).mockResolvedValue({
      id: "worker-1",
      phone: "37120000002",
      siteId: "site-1",
      name: "Test",
      surname: "Worker",
    });
    uploadSourceAudioMock.mockResolvedValue("https://ut.test/worker-voice.ogg");
    transcriptionCreateMock.mockResolvedValue({ text: "Worker transcript" });
    talkToClockInAgentMock.mockResolvedValue("Worker AI response");
  });

  it("passes uploaded sourceAudioUrl to the worker agent", async () => {
    const formData = new FormData();
    formData.set("From", "whatsapp:+37120000002");
    formData.set("NumMedia", "1");
    formData.set("MediaUrl0", "https://meta.test/worker-audio.ogg");
    formData.set("MediaContentType0", "audio/ogg");

    await handleWorkerMessage("37120000002", formData);

    expect(prisma.workers.findFirst).toHaveBeenCalledWith({
      where: { phone: "37120000002" },
    });
    expect(fetchWhatsAppMediaAsBuffer).toHaveBeenCalledWith("https://meta.test/worker-audio.ogg");
    expect(uploadSourceAudioMock).toHaveBeenCalledWith(expect.any(Buffer), "audio/ogg");
    expect(transcriptionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-transcribe",
      }),
    );
    expect(talkToClockInAgentMock).toHaveBeenCalledWith(
      "Worker transcript",
      "worker-1",
      "https://ut.test/worker-voice.ogg",
    );
    expect(sendMessageMock).toHaveBeenCalledWith(
      "whatsapp:+37120000002",
      "Worker AI response",
    );
  });
});
