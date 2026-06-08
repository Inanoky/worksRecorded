const transcriptionCreateMock = jest.fn();
const storeWhatsAppAudioFromUrlMock = jest.fn();
const talkToClockInAgentMock = jest.fn();
const sendMessageMock = jest.fn();

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    workers: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/handleImage", () => ({
  handleImage: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/handleAudio", () => ({
  inferAudioExtension: jest.fn(() => "ogg"),
  storeWhatsAppAudioFromUrl: storeWhatsAppAudioFromUrlMock,
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
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

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
    storeWhatsAppAudioFromUrlMock.mockResolvedValue({
      buffer: Buffer.from("worker audio bytes"),
      originalAudioUrl: "https://ut.test.ufs.sh/f/worker-voice.ogg",
    });
    transcriptionCreateMock.mockResolvedValue({ text: "Worker transcript" });
    talkToClockInAgentMock.mockImplementation(async () => {
      expect(getWhatsappSourceContext().originalAudioUrl).toBe("https://ut.test.ufs.sh/f/worker-voice.ogg");
      return "Worker AI response";
    });
  });

  it("stores uploaded sourceAudioUrl in app context and calls the worker agent without it", async () => {
    const formData = new FormData();
    formData.set("From", "whatsapp:+37120000002");
    formData.set("NumMedia", "1");
    formData.set("MediaUrl0", "https://meta.test/worker-audio.ogg");
    formData.set("MediaContentType0", "audio/ogg");

    await handleWorkerMessage("37120000002", formData);

    expect(prisma.workers.findFirst).toHaveBeenCalledWith({
      where: { phone: "37120000002" },
    });
    expect(storeWhatsAppAudioFromUrlMock).toHaveBeenCalledWith(
      "https://meta.test/worker-audio.ogg",
      "audio/ogg",
      { workerId: "worker-1", siteId: "site-1" }
    );
    expect(transcriptionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-transcribe",
      }),
    );
    expect(talkToClockInAgentMock).toHaveBeenCalledWith(
      "Worker transcript",
      "worker-1",
    );
    expect(sendMessageMock).toHaveBeenCalledWith(
      "whatsapp:+37120000002",
      "Worker AI response",
    );
  });
});
