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
if (typeof Request === "undefined") {
  (globalThis as any).Request = class TestRequest {};
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

function installRouteMocks(args?: {
  mediaInfo?: { url?: string; mime_type?: string } | null;
  claimError?: Error;
  routeError?: Error;
  ztcRole?: "worker" | "quality";
  recoveryError?: Error;
  mediaError?: Error;
}) {
  const handleSiteManagerRoute = args?.routeError
    ? jest.fn().mockRejectedValue(args.routeError)
    : jest.fn().mockResolvedValue(undefined);
  const handleWorkerRoute = jest.fn().mockResolvedValue(undefined);

  const claimedMessageIds = new Set<string>();
  const prisma = {
    metaInboundMessage: {
      create: jest.fn(async ({ data }: any) => {
        if (args?.claimError) throw args.claimError;
        if (claimedMessageIds.has(data.messageId)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        claimedMessageIds.add(data.messageId);
        return data;
      }),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn(async ({ where }: any) => {
        claimedMessageIds.delete(where.messageId);
        return { count: 1 };
      }),
    },
    whatsappTextLock: {
      create: jest.fn().mockResolvedValue({ id: "lock-1" }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    workers: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue(1),
    ztcInboundMediaBatch: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: args?.recoveryError
        ? jest.fn().mockRejectedValue(args.recoveryError)
        : jest.fn().mockResolvedValue({}),
    },
  };

  const resolvedIdentity = {
    identity: { id: "identity-1" },
    user: {
      id: "user-1",
      phone: "37120000001",
      lastSelectedSiteIdforWhatsapp: "site-1",
    },
    worker: args?.ztcRole ? {
      id: "ztc-worker-1", organizationId: "ztc-org", siteId: "ztc-site",
      phone: "37120000001", name: "Test", surname: "Worker", role: args.ztcRole,
    } : null,
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
  jest.doMock("@/flows/default-construction/backend", () => ({
    handleSiteManagerRoute,
  }));
  jest.doMock("@/flows/tgem-invoice-approval/backend", () => ({
    handleTgemInvoiceWhatsappRoute: jest.fn(),
  }));
  jest.doMock("@/flows/default-production/backend", () => ({
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
  const sendMetaGraphMessage = jest.fn().mockResolvedValue(undefined);
  jest.doMock("@/lib/utils/whatsapp-helpers/meta/sender", () => ({
    sendMetaContactRequest: jest.fn(),
    sendMetaGraphMessage,
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
  const handleZtcWorkerRoute = args?.routeError
    ? jest.fn().mockRejectedValue(args.routeError) : jest.fn().mockResolvedValue(undefined);
  const handleZtcQualityRoute = args?.routeError
    ? jest.fn().mockRejectedValue(args.routeError) : jest.fn().mockResolvedValue(undefined);
  jest.doMock("@/flows/ztc-production/backend", () => ({
    handleZtcWorkerRoute,
    handleZtcQualityRoute,
    isZtcQualityWorkerRole: jest.fn().mockReturnValue(args?.ztcRole === "quality"),
    ZTC_ORGANIZATION_ID: "ztc-org",
  }));
  jest.doMock("@/lib/production-flow/runtime-server", () => ({
    resolveAdvancedProductionWorkflowContextForWorker: jest.fn().mockResolvedValue(
      args?.ztcRole ? { organizationId: "ztc-org", siteId: "ztc-site" } : null,
    ),
  }));
  jest.doMock("@/lib/flows/resolve-flow-module-server", () => ({
    resolveFlowModuleKeyForRuntime: jest.fn().mockResolvedValue(
      args?.ztcRole ? "ztc-production" : "default-construction",
    ),
  }));
  jest.doMock("@/lib/flows/worker-runtime-server", () => ({
    resolveWorkerFlowRuntime: jest.fn().mockResolvedValue(args?.ztcRole ? {
      flowModuleKey: "ztc-production",
      productionConfig: {
        flowModuleKey: "ztc-production",
        strategies: { whatsappWorker: "ztc-worker-v1", whatsappQuality: "ztc-quality-v1" },
      },
    } : null),
  }));

  const mediaInfo = args?.mediaInfo === undefined
    ? { url: "https://meta.test/audio.ogg", mime_type: "audio/ogg" }
    : args.mediaInfo;

  const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url === `${graphBaseUrl}/meta-audio-media-site-manager-001`) {
      if (args?.mediaError) throw args.mediaError;
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
    sendMetaGraphMessage,
    handleZtcWorkerRoute,
    handleZtcQualityRoute,
  };
}

describe("Meta webhook audio replay", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
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

  it("keeps the request arrival time across preprocessing and multiple messages", async () => {
    const mocks = installRouteMocks();
    const { getWhatsappSourceContext } = await import("@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext");
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");
    const fixture = JSON.parse(JSON.stringify(siteManagerAudioFixture));
    const messages = fixture.entry[0].changes[0].value.messages;
    messages.push({ ...messages[0], id: "wamid.second-in-same-request" });
    const startedAt = Date.now();
    let now = startedAt;
    const clock = jest.spyOn(Date, "now").mockImplementation(() => now);
    const contexts: Array<{ webhookStartedAtMs?: number; messageId?: string | null }> = [];
    mocks.handleSiteManagerRoute.mockImplementation(async () => {
      contexts.push({ ...getWhatsappSourceContext() });
      now += 80_000;
    });
    try {
      await POST({ json: async () => { now += 30_000; return fixture; } } as Request);
      expect(contexts).toEqual([
        expect.objectContaining({ webhookStartedAtMs: startedAt, messageId: "wamid.site-manager-audio-001" }),
        expect.objectContaining({ webhookStartedAtMs: startedAt, messageId: "wamid.second-in-same-request" }),
      ]);
      expect(getWhatsappSourceContext().webhookStartedAtMs).toBeUndefined();
    } finally {
      clock.mockRestore();
    }
  });

  it("replays a WhatsApp PDF document with its filename into media FormData", async () => {
    const mocks = installRouteMocks({
      mediaInfo: {
        url: "https://meta.test/invoice.pdf",
        mime_type: "application/pdf",
      },
    });
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");
    const documentFixture = JSON.parse(JSON.stringify(siteManagerAudioFixture));
    const message = documentFixture.entry[0].changes[0].value.messages[0];
    message.type = "document";
    message.document = {
      id: "meta-audio-media-site-manager-001",
      filename: "supplier-invoice.pdf",
      mime_type: "application/pdf",
      caption: "Rēķins",
    };
    delete message.audio;

    const res = await POST({
      json: async () => documentFixture,
    } as Request);

    expect(res.status).toBe(200);
    expect(mocks.handleSiteManagerRoute).toHaveBeenCalledTimes(1);
    const formData = mocks.handleSiteManagerRoute.mock.calls[0][0].formData as FormData;
    expect(formData.get("Body")).toBe("Rēķins");
    expect(formData.get("NumMedia")).toBe("1");
    expect(formData.get("MediaUrl0")).toBe("https://meta.test/invoice.pdf");
    expect(formData.get("MediaContentType0")).toBe("application/pdf");
    expect(formData.get("MediaFilename0")).toBe("supplier-invoice.pdf");
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

  it("processes duplicate and concurrent claims only once", async () => {
    const mocks = installRouteMocks();
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");
    const request = () => ({ json: async () => siteManagerAudioFixture } as Request);

    const responses = await Promise.all([POST(request()), POST(request())]);
    const retry = await POST(request());

    expect([...responses, retry].map((response) => response.status)).toEqual([200, 200, 200]);
    expect(mocks.handleSiteManagerRoute).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.metaInboundMessage.update).toHaveBeenCalledTimes(1);
  });

  it("processes different Meta message IDs independently", async () => {
    const mocks = installRouteMocks();
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");
    const secondFixture = JSON.parse(JSON.stringify(siteManagerAudioFixture));
    secondFixture.entry[0].changes[0].value.messages[0].id = "wamid.site-manager-audio-002";

    await POST({ json: async () => siteManagerAudioFixture } as Request);
    await POST({ json: async () => secondFixture } as Request);

    expect(mocks.handleSiteManagerRoute).toHaveBeenCalledTimes(2);
  });

  it("does not claim delivery-status webhooks", async () => {
    const mocks = installRouteMocks();
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");
    const statusFixture = JSON.parse(JSON.stringify(siteManagerAudioFixture));
    const value = statusFixture.entry[0].changes[0].value;
    delete value.messages;
    value.statuses = [{ id: "wamid.outbound-001", status: "delivered" }];

    const response = await POST({ json: async () => statusFixture } as Request);

    expect(response.status).toBe(200);
    expect(mocks.prisma.metaInboundMessage.create).not.toHaveBeenCalled();
  });

  it("returns 500 without routing when the durable claim fails", async () => {
    const mocks = installRouteMocks({ claimError: new Error("database unavailable") });
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");

    const response = await POST({ json: async () => siteManagerAudioFixture } as Request);

    expect(response.status).toBe(500);
    expect(mocks.handleSiteManagerRoute).not.toHaveBeenCalled();
  });

  it("records processing failures and suppresses their retries", async () => {
    const mocks = installRouteMocks({ routeError: new Error("route failed") });
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");

    await POST({ json: async () => siteManagerAudioFixture } as Request);
    await POST({ json: async () => siteManagerAudioFixture } as Request);

    expect(mocks.handleSiteManagerRoute).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.metaInboundMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { messageId: "wamid.site-manager-audio-001" },
        data: expect.objectContaining({ status: "failed", lastError: "route failed" }),
      }),
    );
  });

  it.each(["worker", "quality"] as const)("sends one Latvian fallback for a ZTC %s failure and retains the message", async (ztcRole) => {
    const mocks = installRouteMocks({ ztcRole, routeError: new Error("LLM unavailable") });
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");
    const { ZTC_TECHNICAL_FAILURE_REPLY } = await import("@/flows/ztc-production/backend/message-recovery");
    const fixture = JSON.parse(JSON.stringify(siteManagerAudioFixture));
    const message = fixture.entry[0].changes[0].value.messages[0];
    message.type = "text";
    message.text = { body: "Sāku darbu" };
    delete message.audio;
    await POST({ json: async () => fixture } as Request);
    await POST({ json: async () => fixture } as Request);
    expect(mocks.sendMetaGraphMessage).toHaveBeenCalledTimes(1);
    expect(mocks.sendMetaGraphMessage).toHaveBeenCalledWith(expect.objectContaining({
      body: { text: { body: ZTC_TECHNICAL_FAILURE_REPLY } },
    }));
    expect(mocks.prisma.ztcInboundMediaBatch.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      mode: "ztc_recovery", items: expect.objectContaining({ message }),
    }) });
    expect(mocks.prisma.metaInboundMessage.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "failed", lastError: "LLM unavailable" }),
    }));
    expect(ztcRole === "worker" ? mocks.handleZtcWorkerRoute : mocks.handleZtcQualityRoute).toHaveBeenCalledTimes(1);
  });

  it("retains the original ZTC audio ID and replies when media preprocessing fails", async () => {
    const mocks = installRouteMocks({ ztcRole: "worker", mediaError: new Error("Meta media down") });
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");
    await POST({ json: async () => siteManagerAudioFixture } as Request);
    expect(mocks.prisma.ztcInboundMediaBatch.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      items: expect.objectContaining({ message: expect.objectContaining({
        audio: expect.objectContaining({ id: "meta-audio-media-site-manager-001" }),
      }) }),
    }) });
    expect(mocks.sendMetaGraphMessage).toHaveBeenCalledTimes(1);
    expect(mocks.handleZtcWorkerRoute).not.toHaveBeenCalled();
    expect(mocks.prisma.metaInboundMessage.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "failed" }),
    }));
  });

  it("allows Meta to retry a ZTC message when recovery storage is unavailable", async () => {
    const mocks = installRouteMocks({ ztcRole: "worker", recoveryError: new Error("recovery storage unavailable") });
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");
    const first = await POST({ json: async () => siteManagerAudioFixture } as Request);
    expect(first.status).toBe(500);
    expect(mocks.prisma.metaInboundMessage.deleteMany).toHaveBeenCalledWith({
      where: { messageId: "wamid.site-manager-audio-001", status: "processing" },
    });
    expect(mocks.handleZtcWorkerRoute).not.toHaveBeenCalled();
    mocks.prisma.ztcInboundMediaBatch.create.mockResolvedValueOnce({});
    const retry = await POST({ json: async () => siteManagerAudioFixture } as Request);
    expect(retry.status).toBe(200);
    expect(mocks.handleZtcWorkerRoute).toHaveBeenCalledTimes(1);
  });

  it("does not create ZTC recovery entries for construction messages", async () => {
    const mocks = installRouteMocks();
    const { POST } = await import("@/app/api/webhook/meta/webhook/route");
    await POST({ json: async () => siteManagerAudioFixture } as Request);
    expect(mocks.prisma.ztcInboundMediaBatch.create).not.toHaveBeenCalled();
  });
});
