import { mockPrisma, mockCreate, mockTalkToWhatsappAgent } from "@/tests/mocks";
import { POST } from "@/app/api/webhook/whatsapp/route";

function form(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

describe("WhatsApp webhook POST", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
    process.env.TWILIO_AUTH_TOKEN = "tok";
    process.env.OPENAI_API_KEY = "sk-xxx";
  });

  test("returns 200 immediately and rejects unknown user", async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/webhook/whatsapp", {
      method: "POST",
      body: form({
        From: "whatsapp:+37120001122",
        WaId: "37120001122",
        SmsStatus: "received",
        Body: "hello",
        NumMedia: "0",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<Response></Response>");

    // Wait for microtasks to complete
    await new Promise(process.nextTick);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "whatsapp:+37120001122",
        body: expect.stringMatching(/not registered/i),
      })
    );
  });

  test("known user with selected site → routes text to AI and replies", async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "user-1",
      firstName: "Slava",
      lastSelectedSiteIdforWhatsapp: "site-1",
      Site: [],
      phone: "37120001122",
    });

    mockTalkToWhatsappAgent.mockResolvedValueOnce("AI REPLY");

    const req = new Request("http://localhost/api/webhook/whatsapp", {
      method: "POST",
      body: form({
        From: "whatsapp:+37120001122",
        WaId: "37120001122",
        SmsStatus: "received",
        Body: "Some message",
        NumMedia: "0",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Wait for microtasks to complete
    await new Promise(process.nextTick);

    expect(mockTalkToWhatsappAgent).toHaveBeenCalledWith(
      "Some message",
      "site-1",
      "user-1"
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "whatsapp:+37120001122",
        body: "AI REPLY",
      })
    );
  });
});