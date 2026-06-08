import siteManagerAudioFixture from "./fixtures/meta-webhook/audio-message.site-manager.json";

const graphBaseUrl = "https://graph.facebook.com/v18.0";

class TestResponse {
  status: number;
  headers: Record<string, string>;
  private body: unknown;
  ok: boolean;
  statusText: string;

  constructor(body: unknown, init?: ResponseInit) {
    this.body = body;
    this.status = init?.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = this.ok ? "OK" : "Error";
    this.headers = {};
  }

  async json() {
    return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
  }

  async text() {
    return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
  }
}

if (typeof Response === "undefined") {
  (globalThis as any).Response = TestResponse;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

function installRouteMocks(args?: {
  mediaInfo?: { url?: string; mime_type?: string } | null;
}) {
  const handleSiteManagerRoute = jest.fn().mockResolvedValue(undefined);
  const handleWorkerRoute = jest.fn().mockResolvedValue(undefined);

  const prisma = {
    whatsappTextLock: {
      create: jest.fn().mockResolvedValue({ id: "lock-1" }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    workers: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn(),
  };

  const resolvedIdentity = {
    identity: { id: "identity-1" },
    user: {
      id: "user-1",
      phone: "37120000001",
      lastSelectedSiteIdforWhatsapp: "site-1",
    },
    worker: null,
    webhookIdentity: {
      phone: "37120000001",
      waId: "37120000001",
      bsuid: null,
      parentBsuid: null,
      username: "test_site_manager",
      businessPhoneNumberId: "business-phone-test-001",
      wabaId: "waba-test-001",
    },
    identityKey: "37120000001",
    replyTarget: "37120000001",
    fromForHandlers: "whatsapp:+37120000001",
  };

  jest.doMock("@/lib/utils/db", () => ({ prisma }));
  jest.doMock("@/lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route", () => ({
    handleSiteManagerRoute,
  }));
  jest.doMock("@/lib/utils/whatsapp-helpers/handling-roles-routes/worker", () => ({
    handleWorkerRoute,
  }));
  jest.doMock("@/lib/utils/whatsapp-helpers/meta/identity", () => ({
    extractMetaWebhookIdentity: jest.fn((identityArgs) => ({
      phone: identityArgs.message?.from ?? null,
      waId: identityArgs.message?.from ?? null,
      bsuid: null,
      parentBsuid: null,
      username: "test_site_manager",
      businessPhoneNumberId: identityArgs.businessPhoneNumberId,
      wabaId: identityArgs.value?.metadata?.waba_id ?? null,
    })),
    resolveMetaWhatsAppIdentity: jest.fn().mockResolvedValue(resolvedIdentity),
    applyMetaUserIdUpdate: jest.fn(),
  }));
  jest.doMock("@/lib/utils/whatsapp-helpers/meta/sender", () => ({
    sendMetaContactRequest: jest.fn(),
    sendMetaGraphMessage: jest.fn().mockResolvedValue(undefined),
    buildMetaRecipientPayload: jest.fn((to: string) => ({ to })),
    normalizeMetaPhone: jest.fn((value: string | null | undefined) =>
      value ? String(value).replace(/\D/g, "") : null,
    ),
  }));
  jest.doMock("@/app/api/webhook/meta/webhook/helperes", () => ({
    getSession: jest.fn().mockResolvedValue(null),
    startSession: jest.fn(),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
  }));
  jest.doMock("@/app/api/webhook/meta/webhook/ZTC/ztc-workflow", () => ({
    handleZtcWorkerRoute: jest.fn(),
    ZTC_ORGANIZATION_ID: "ztc-org",
  }));
  jest.doMock("@/app/api/webhook/meta/webhook/ZTC/ztc-quality-workflow", () => ({
    handleZtcQualityRoute: jest.fn(),
    isZtcQualityWorkerRole: jest.fn().mockReturnValue(false),
  }));

  const mediaInfo = args?.mediaInfo === undefined
    ? { url: "https://meta.test/audio.ogg", mime_type: "audio/ogg" }
    : args.mediaInfo;

  const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url === `${graphBaseUrl}/meta-audio-media-site-manager-001`) {
      return mediaInfo ? jsonResponse(mediaInfo) : jsonResponse({}, { status: 200 });
    }

    if (url.includes("/messages") && init?.method === "POST") {
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: true });
  });
  global.fetch = fetchMock as any;

  return {
    fetchMock,
    handleSiteManagerRoute,
    handleWorkerRoute,
    prisma,
  };
}

describe("Meta webhook audio replay", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    (globalThis as any).__processedMetaMessages = new Map<string, number>();
    process.env = {
      ...originalEnv,
      META_ACCESS_TOKEN: "test-token",
      WEBHOOK_VERIFY_TOKEN: "test-verify",
      OPENAI_API_KEY: "test-openai",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("replays a site-manager audio webhook into audio FormData", async () => {
    const mocks = installRouteMocks();
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");

    const res = await POST({
      json: async () => siteManagerAudioFixture,
    } as Request);

    expect(res.status).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledWith(
      `${graphBaseUrl}/meta-audio-media-site-manager-001`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    expect(mocks.handleWorkerRoute).not.toHaveBeenCalled();
    expect(mocks.handleSiteManagerRoute).toHaveBeenCalledTimes(1);

    const call = mocks.handleSiteManagerRoute.mock.calls[0][0];
    const formData = call.formData as FormData;
    expect(call.from).toBe("whatsapp:+37120000001");
    expect(call.user.id).toBe("user-1");
    expect(formData.get("NumMedia")).toBe("1");
    expect(formData.get("MessageId")).toBe("wamid.site-manager-audio-001");
    expect(formData.get("MediaUrl0")).toBe("https://meta.test/audio.ogg");
    expect(formData.get("MediaContentType0")).toBe("audio/ogg");
    expect(formData.get("MediaProvider0")).toBe("meta");
  });

  it("falls back to the webhook audio URL when Meta media info has no URL", async () => {
    const mocks = installRouteMocks({ mediaInfo: {} });
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");

    const res = await POST({
      json: async () => siteManagerAudioFixture,
    } as Request);

    expect(res.status).toBe(200);
    expect(mocks.handleSiteManagerRoute).toHaveBeenCalledTimes(1);
    const formData = mocks.handleSiteManagerRoute.mock.calls[0][0].formData as FormData;
    expect(formData.get("NumMedia")).toBe("1");
    expect(formData.get("MediaUrl0")).toBe(
      "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=meta-audio-media-site-manager-001&source=webhook&ext=1790000300&hash=test-hash",
    );
    expect(formData.get("MediaContentType0")).toBe("audio/ogg; codecs=opus");
  });
});
