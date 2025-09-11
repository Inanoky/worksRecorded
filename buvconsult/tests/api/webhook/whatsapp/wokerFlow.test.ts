// tests/api/webhook/whatsapp/wokerFlow.test.ts
import { handleWorkerMessage } from "@/app/utils/clockInOut/workersFlow";

// Mock Twilio so each instantiation returns a client with a stable
// messages.create function.  The create mock is exposed via
// twilio.createMock, avoiding TDZ issues.
jest.mock("twilio", () => {
  const createMock = jest.fn();
  const twilioMock: any = jest.fn(() => ({
    messages: {
      create: createMock,
    },
  }));
  twilioMock.createMock = createMock;
  return twilioMock;
});

// Mock the clock‑in/out agent
jest.mock("@/components/AI/ClockInOut/agent", () => jest.fn());

// Mock OpenAI (default export and the named toFile helper)
jest.mock("openai", () => {
  const OpenAI = jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: jest.fn(),
      },
    },
  }));
  return {
    __esModule: true,
    default: OpenAI,
    toFile: jest.fn().mockResolvedValue("mock-file"),
  };
});

import { prisma } from "@/app/utils/db";
import talkToClockInAgent from "@/componentsFrontend/AI/ClockInOut/agent";
import OpenAI from "openai";
import twilio from "twilio";

// Helper to build a minimal FormData-like object
const makeFakeFormData = (fields: Record<string, string>): FormData =>
  ({
    get: (key: string) => (key in fields ? fields[key] : null),
  } as unknown as FormData);

describe("handleWorkerMessage (simplified mocks)", () => {
  // Silence console output during the tests
  beforeAll(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = "ACXXX";
    process.env.TWILIO_AUTH_TOKEN = "AUTHXXX";
    process.env.OPENAI_API_KEY = "sk-test";
  });

  it("handles the case where no worker exists", async () => {
    (prisma.workers.findFirst as jest.Mock).mockResolvedValue(null);
    const formData = makeFakeFormData({
      Body: "hi",
      From: "whatsapp:+371111111",
      NumMedia: "0",
    });
    await handleWorkerMessage("123", formData);
    expect(talkToClockInAgent).not.toHaveBeenCalled();
    const twilioCreate = (twilio as any).createMock as jest.Mock;
    expect(twilioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "whatsapp:+371111111",
        body: "Worker not found in system.",
      }),
    );
  });

  it("forwards text messages when a worker exists", async () => {
    (prisma.workers.findFirst as jest.Mock).mockResolvedValue({ id: "w1" });
    (talkToClockInAgent as jest.Mock).mockResolvedValue("AI response");
    const formData = makeFakeFormData({
      Body: "On site",
      From: "whatsapp:+371222222",
      NumMedia: "0",
    });
    await handleWorkerMessage("555", formData);
    expect(talkToClockInAgent).toHaveBeenCalledWith("On site", "w1");
    {
      const twilioCreate = (twilio as any).createMock as jest.Mock;
      expect(twilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "whatsapp:+371222222",
          body: "AI response",
        }),
      );
    }
  });

  it("transcribes audio and sends the transcription to the agent", async () => {
    (prisma.workers.findFirst as jest.Mock).mockResolvedValue({ id: "w2" });
    (talkToClockInAgent as jest.Mock).mockResolvedValue("OK");
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn().mockResolvedValue({ text: "clocking in now" }),
        },
      },
    }));
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }) as unknown as typeof fetch;
    const formData = makeFakeFormData({
      Body: "",
      From: "whatsapp:+371333333",
      NumMedia: "1",
      MediaUrl0: "http://example.com/audio.ogg",
      MediaContentType0: "audio/ogg",
    });
    await handleWorkerMessage("777", formData);
    expect(talkToClockInAgent).toHaveBeenCalledWith("clocking in now", "w2");
    {
      const twilioCreate = (twilio as any).createMock as jest.Mock;
      expect(twilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "whatsapp:+371333333",
          body: "OK",
        }),
      );
    }
  });

  it("falls back to the body when transcription fails", async () => {
    (prisma.workers.findFirst as jest.Mock).mockResolvedValue({ id: "w3" });
    (talkToClockInAgent as jest.Mock).mockResolvedValue("AI resp");
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn().mockRejectedValue(new Error("transcription error")),
        },
      },
    }));
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: async () => new Uint8Array([4, 5]).buffer,
    }) as unknown as typeof fetch;
    const formData = makeFakeFormData({
      Body: "manual note",
      From: "whatsapp:+371444444",
      NumMedia: "1",
      MediaUrl0: "http://example.com/voice.ogg",
      MediaContentType0: "audio/ogg",
    });
    await handleWorkerMessage("999", formData);
    expect(talkToClockInAgent).toHaveBeenCalledWith("manual note", "w3");
    {
      const twilioCreate = (twilio as any).createMock as jest.Mock;
      expect(twilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "whatsapp:+371444444",
          body: "AI resp",
        }),
      );
    }
  });

  it("sends a generic error message on exception", async () => {
    (prisma.workers.findFirst as jest.Mock).mockRejectedValue(new Error("DB error"));
    const formData = makeFakeFormData({
      Body: "whatever",
      From: "whatsapp:+371555555",
      NumMedia: "0",
    });
    await handleWorkerMessage("000", formData);
    {
      const twilioCreate = (twilio as any).createMock as jest.Mock;
      expect(twilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "whatsapp:+371555555",
          body: "Error processing message.",
        }),
      );
    }
  });
});
