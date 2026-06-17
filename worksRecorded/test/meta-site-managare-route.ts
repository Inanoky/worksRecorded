/* eslint-disable @typescript-eslint/no-explicit-any */

process.env.META_ACCESS_TOKEN = "test-meta-token";
process.env.WEBHOOK_VERIFY_TOKEN = "test-verify-token";

if (!globalThis.Response) {
  (globalThis as any).Response = class {
    status: number;
    body: unknown;

    constructor(body?: unknown, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status || 200;
    }
  };
}

type TestUser = {
  id: string;
  phone: string;
  role: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  lastSelectedSiteIdforWhatsapp: string;
  organization?: any;
};

type DiaryRecord = {
  id: string;
  userId: string;
  source: "text" | "audio" | "photo";
  createdAt: Date;
  fields: Record<string, unknown>;
};

type ClockEvent = {
  id: string;
  userId: string;
  type: "clock_in" | "clock_out";
  createdAt: Date;
};

type WhatsAppIdentity = {
  id: string;
  phone?: string | null;
  waId?: string | null;
  bsuid?: string | null;
  parentBsuid?: string | null;
  username?: string | null;
  businessPhoneNumberId?: string | null;
  userId?: string | null;
  workerId?: string | null;
  status?: string | null;
};

const testState = {
  users: [] as TestUser[],
  identities: [] as WhatsAppIdentity[],
  diaryRecords: [] as DiaryRecord[],
  clockEvents: [] as ClockEvent[],
};

const TestRequest =
  globalThis.Request ||
  class {
    url: string;
    private init?: RequestInit;

    constructor(url: string, init?: RequestInit) {
      this.url = url;
      this.init = init;
    }

    async json() {
      return JSON.parse(String(this.init?.body || "{}"));
    }
  };

function nextId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
}

const prismaMock = {
  whatsappTextLock: {
    deleteMany: jest.fn(async () => ({ count: 1 })),
    create: jest.fn(async () => ({ id: nextId("lock") })),
  },
  workers: {
    findFirst: jest.fn(async () => null),
  },
  whatsAppIdentity: {
    findFirst: jest.fn(async ({ where }: any) => {
      const clauses = Array.isArray(where?.OR) ? where.OR : [];
      const found = testState.identities.find((identity) =>
        clauses.some((clause: any) => {
          const sameBusiness =
            !clause.businessPhoneNumberId ||
            clause.businessPhoneNumberId === identity.businessPhoneNumberId;
          return (
            sameBusiness &&
            ((clause.bsuid && clause.bsuid === identity.bsuid) ||
              (clause.parentBsuid && clause.parentBsuid === identity.parentBsuid) ||
              (clause.phone && clause.phone === identity.phone))
          );
        })
      );
      if (!found) return null;
      return {
        ...found,
        user: found.userId ? testState.users.find((u) => u.id === found.userId) || null : null,
        worker: null,
      };
    }),
    create: jest.fn(async ({ data }: any) => {
      const created = { id: nextId("wa_identity"), ...data };
      testState.identities.push(created);
      return {
        ...created,
        user: created.userId ? testState.users.find((u) => u.id === created.userId) || null : null,
        worker: null,
      };
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const index = testState.identities.findIndex((identity) => identity.id === where?.id);
      if (index === -1) throw new Error("identity not found");
      testState.identities[index] = { ...testState.identities[index], ...data };
      const updated = testState.identities[index];
      return {
        ...updated,
        user: updated.userId ? testState.users.find((u) => u.id === updated.userId) || null : null,
        worker: null,
      };
    }),
  },
  user: {
    findFirst: jest.fn(async ({ where }: any) => {
      const phones = Array.isArray(where?.OR)
        ? where.OR.map((clause: any) => clause.phone)
        : [where?.phone];
      const found = testState.users.find((u) => phones.includes(u.phone));
      if (!found) return null;
      return {
        ...found,
        organization: {
          id: found.organizationId,
          name: "BUVCONSULT",
          sites: [{ id: found.lastSelectedSiteIdforWhatsapp, name: "Test Site" }],
        },
      };
    }),
  },
};

jest.mock("@/lib/utils/db", () => ({
  prisma: prismaMock,
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
  runWithMetaReplyContext: async (_ctx: any, fn: () => Promise<unknown>) => fn(),
}));

jest.mock("@/lib/utils/whatsapp-helpers/handling-roles-routes/worker", () => ({
  handleWorkerRoute: jest.fn(async () => undefined),
}));



jest.mock("@/server/actions/META/RoutingHandlers/metaImageHandler", () => ({
  sendToGpt: jest.fn(async () => undefined),
}));

jest.mock("@/app/api/webhook/meta/webhook/helperes", () => ({
  getSession: jest.fn(async () => null),
  startSession: jest.fn(async () => undefined),
  updateSession: jest.fn(async () => undefined),
  deleteSession: jest.fn(async () => undefined),
}));

jest.mock("@/app/api/webhook/meta/webhook/ZTC/ztc-workflow", () => ({
  handleZtcWorkerRoute: jest.fn(async () => undefined),
  ZTC_ORGANIZATION_ID: "org_ztc",
}));

jest.mock("@/lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route", () => ({
  handleSiteManagerRoute: jest.fn(async ({ formData, user }: any) => {
    const body = String(formData.get("Body") || "").trim();
    const mediaType = String(formData.get("MediaContentType0") || "").toLowerCase();

    if (body.toLowerCase() === "clock in") {
      testState.clockEvents.push({
        id: nextId("clock"),
        userId: user.id,
        type: "clock_in",
        createdAt: new Date(),
      });
      return;
    }

    if (body.toLowerCase() === "clock out") {
      testState.clockEvents.push({
        id: nextId("clock"),
        userId: user.id,
        type: "clock_out",
        createdAt: new Date(),
      });
      return;
    }

    if (mediaType.startsWith("audio/")) {
      testState.diaryRecords.push({
        id: nextId("diary"),
        userId: user.id,
        source: "audio",
        createdAt: new Date(),
        fields: {
          transcript: body || "transcribed text",
          activitySummary: "parsed",
          workersInvolved: 5,
          durationHours: 3,
          unitsCompleted: 2,
        },
      });
      return;
    }

    if (mediaType.startsWith("image/")) {
      testState.diaryRecords.push({
        id: nextId("diary"),
        userId: user.id,
        source: "photo",
        createdAt: new Date(),
        fields: {
          comment: body,
          photoUrl: "https://example.com/test-photo.jpg",
          activitySummary: "parsed",
          workersInvolved: 5,
          durationHours: 3,
          unitsCompleted: 2,
        },
      });
      return;
    }

    testState.diaryRecords.push({
      id: nextId("diary"),
      userId: user.id,
      source: "text",
      createdAt: new Date(),
      fields: {
        message: body,
        activitySummary: "parsed",
        workersInvolved: 5,
        durationHours: 3,
        unitsCompleted: 2,
      },
    });
  }),
}));

import { POST } from "@/app/api/webhook/meta/webhook/route";
import { handleSiteManagerRoute } from "@/lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route";

function metaTextPayload(from: string, text: string) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "111111111" },
              messages: [
                {
                  id: nextId("msg"),
                  from,
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function metaTextPayloadWithIdentity(from: string, bsuid: string, text: string) {
  return {
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "111111111" },
              contacts: [
                {
                  wa_id: from,
                  profile: { name: "Username User", username: "@usernameuser" },
                  user_id: bsuid,
                },
              ],
              messages: [
                {
                  id: nextId("msg"),
                  from,
                  from_user_id: bsuid,
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function metaBsuidTextPayload(bsuid: string, text: string) {
  return {
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "111111111" },
              contacts: [
                {
                  profile: { name: "Username User", username: "@usernameuser" },
                  user_id: bsuid,
                },
              ],
              messages: [
                {
                  id: nextId("msg"),
                  from_user_id: bsuid,
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function metaContactPayload(bsuid: string, phone: string) {
  return {
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "111111111" },
              contacts: [{ profile: { name: "Username User" }, user_id: bsuid }],
              messages: [
                {
                  id: nextId("msg"),
                  type: "contacts",
                  from_user_id: bsuid,
                  contacts: [
                    {
                      origin: "contact_request",
                      phones: [{ phone, wa_id: phone.replace(/\D/g, ""), type: "CELL" }],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function metaUserIdUpdatePayload(previousBsuid: string, currentBsuid: string) {
  return {
    entry: [
      {
        changes: [
          {
            field: "user_id_update",
            value: {
              metadata: { phone_number_id: "111111111" },
              user_id_update: [
                {
                  user_id: {
                    previous: previousBsuid,
                    current: currentBsuid,
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function metaAudioPayload(from: string, text: string) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "111111111" },
              messages: [
                {
                  id: nextId("msg"),
                  from,
                  type: "audio",
                  audio: { id: "audio_media_1" },
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function metaImagePayload(from: string, caption: string) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "111111111" },
              messages: [
                {
                  id: nextId("msg"),
                  from,
                  type: "image",
                  image: { id: "img_media_1", caption },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

beforeAll(() => {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const href = String(url);

    if (href.includes("/audio_media_1") || href.includes("/img_media_1")) {
      return {
        ok: true,
        json: async () => ({
          url: "https://example.com/media-file",
          mime_type: href.includes("audio_media_1") ? "audio/ogg" : "image/jpeg",
        }),
      } as Response;
    }

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
      text: async () => "",
    } as Response;
  }) as jest.Mock;
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("Meta webhook -> site manager route flow", () => {
  const fakeUserPhoneDigits = "37120001111";
  const fakeUserPhone = `whatsapp:+${fakeUserPhoneDigits}`;
  const testOrgId = "org_buvconsult";
  let testUserId = "";

  it("1) rejects message from non-existent number", async () => {
    console.log("STEP 1: Send message from non-existent number");

    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaTextPayload("37129990000", "hello")),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const hasRejectMessage = fetchCalls.some(([, init]) => {
      const body = (init as RequestInit | undefined)?.body;
      return typeof body === "string" && body.includes("not registered");
    });

    expect(hasRejectMessage).toBe(true);
    console.log("STEP 1 DONE: app rejected unknown phone number");
  });

  it("2) creates test user role site manager for organization BUVCONSULT", async () => {
    console.log("STEP 2: Create test site manager user in mock DB");

    testUserId = nextId("user");
    testState.users.push({
      id: testUserId,
      phone: fakeUserPhone,
      role: "site manager",
      firstName: "Test",
      lastName: "Manager",
      organizationId: testOrgId,
      lastSelectedSiteIdforWhatsapp: "site_1",
    });

    const created = testState.users.find((u) => u.id === testUserId);
    expect(created).toBeDefined();
    expect(created?.role).toBe("site manager");
    expect(created?.organizationId).toBe(testOrgId);
    console.log("STEP 2 DONE: test user created");
  });

  it("3) sends text to Meta endpoint and validates diary record fields", async () => {
    console.log("STEP 3: Send text message to Meta endpoint");

    const text = "Today we assembled 2 walls for 3 hours 5 workers";
    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaTextPayload(fakeUserPhoneDigits, text)),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const latest = testState.diaryRecords.at(-1);
    expect(latest).toBeDefined();
    expect(latest?.source).toBe("text");
    expect(latest?.fields).toEqual(
      expect.objectContaining({
        message: expect.any(String),
        activitySummary: expect.any(String),
        workersInvolved: expect.any(Number),
        durationHours: expect.any(Number),
        unitsCompleted: expect.any(Number),
      })
    );

    testState.diaryRecords = testState.diaryRecords.filter((r) => r.id !== latest?.id);
    expect(testState.diaryRecords.find((r) => r.id === latest?.id)).toBeUndefined();

    console.log("STEP 3 DONE: text record validated and deleted");
  });

  it("3a) stores BSUID identity when phone payload includes Meta identity fields", async () => {
    const bsuid = "LV.13491208655302741918";
    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaTextPayloadWithIdentity(fakeUserPhoneDigits, bsuid, "phone and bsuid update")),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const identity = testState.identities.find((item) => item.bsuid === bsuid);
    expect(identity).toEqual(
      expect.objectContaining({
        phone: fakeUserPhoneDigits,
        username: "@usernameuser",
        userId: testUserId,
        status: "active",
      })
    );

    const latest = testState.diaryRecords.at(-1);
    expect(latest?.userId).toBe(testUserId);
    testState.diaryRecords = testState.diaryRecords.filter((r) => r.id !== latest?.id);
  });

  it("3b) routes existing user when Meta omits phone and sends only BSUID", async () => {
    const bsuid = "LV.23491208655302741918";
    testState.identities.push({
      id: nextId("wa_identity"),
      businessPhoneNumberId: "111111111",
      phone: fakeUserPhoneDigits,
      bsuid,
      userId: testUserId,
      status: "active",
    });

    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaBsuidTextPayload(bsuid, "BSUID-only update")),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const latest = testState.diaryRecords.at(-1);
    expect(latest).toBeDefined();
    expect(latest?.userId).toBe(testUserId);
    expect(latest?.source).toBe("text");
    expect(handleSiteManagerRoute).toHaveBeenLastCalledWith(
      expect.objectContaining({
        from: `whatsapp:+${fakeUserPhoneDigits}`,
      })
    );
    testState.diaryRecords = testState.diaryRecords.filter((r) => r.id !== latest?.id);
  });

  it("3c) asks for contact info when unknown BSUID has no phone", async () => {
    const bsuid = "LV.999999999999999999";
    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaBsuidTextPayload(bsuid, "hello")),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const pending = testState.identities.find((identity) => identity.bsuid === bsuid);
    expect(pending?.status).toBe("pending");

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const hasContactRequest = fetchCalls.some(([, init]) => {
      const body = (init as RequestInit | undefined)?.body;
      return typeof body === "string" && body.includes("request_contact_info");
    });
    expect(hasContactRequest).toBe(true);
  });

  it("3d) contact-share webhook attaches phone to pending BSUID identity", async () => {
    const bsuid = "LV.888888888888888888";
    testState.identities.push({
      id: nextId("wa_identity"),
      businessPhoneNumberId: "111111111",
      bsuid,
      status: "pending",
    });

    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaContactPayload(bsuid, fakeUserPhoneDigits)),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const updated = testState.identities.find((identity) => identity.bsuid === bsuid);
    expect(updated?.phone).toBe(fakeUserPhoneDigits);
    expect(updated?.userId).toBe(testUserId);
    expect(updated?.status).toBe("active");
  });

  it("3e) user_id_update webhook updates stored BSUID", async () => {
    const previousBsuid = "LV.777777777777777777";
    const currentBsuid = "LV.777777777777777778";
    testState.identities.push({
      id: nextId("wa_identity"),
      businessPhoneNumberId: "111111111",
      bsuid: previousBsuid,
      userId: testUserId,
      status: "active",
    });

    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaUserIdUpdatePayload(previousBsuid, currentBsuid)),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const updated = testState.identities.find((identity) => identity.bsuid === currentBsuid);
    expect(updated?.userId).toBe(testUserId);
  });

  it("4) sends fake voice message and validates diary record fields", async () => {
    console.log("STEP 4: Send fake voice message to Meta endpoint");

    const text = "Today we assembled 2 walls for 3 hours 5 workers";
    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaAudioPayload(fakeUserPhoneDigits, text)),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const latest = testState.diaryRecords.at(-1);
    expect(latest).toBeDefined();
    expect(latest?.source).toBe("audio");
    expect(latest?.fields).toEqual(
      expect.objectContaining({
        transcript: expect.any(String),
        activitySummary: expect.any(String),
        workersInvolved: expect.any(Number),
        durationHours: expect.any(Number),
        unitsCompleted: expect.any(Number),
      })
    );

    testState.diaryRecords = testState.diaryRecords.filter((r) => r.id !== latest?.id);
    expect(testState.diaryRecords.find((r) => r.id === latest?.id)).toBeUndefined();

    console.log("STEP 4 DONE: voice record validated and deleted");
  });

  it("5) sends fake photo with comment and validates diary record fields", async () => {
    console.log("STEP 5: Send fake photo + comment to Meta endpoint");

    const text = "Today we assembled 2 walls for 3 hours 5 workers";
    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaImagePayload(fakeUserPhoneDigits, text)),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const latest = testState.diaryRecords.at(-1);
    expect(latest).toBeDefined();
    expect(latest?.source).toBe("photo");
    expect(latest?.fields).toEqual(
      expect.objectContaining({
        comment: expect.any(String),
        photoUrl: expect.any(String),
        activitySummary: expect.any(String),
        workersInvolved: expect.any(Number),
        durationHours: expect.any(Number),
        unitsCompleted: expect.any(Number),
      })
    );

    testState.diaryRecords = testState.diaryRecords.filter((r) => r.id !== latest?.id);
    expect(testState.diaryRecords.find((r) => r.id === latest?.id)).toBeUndefined();

    console.log("STEP 5 DONE: photo record validated and deleted");
  });

  it("6) sends 'clock in' and checks clock in record exists", async () => {
    console.log("STEP 6: Send 'clock in'");

    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaTextPayload(fakeUserPhoneDigits, "clock in")),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const latestClockIn = [...testState.clockEvents].reverse().find((e) => e.type === "clock_in");
    expect(latestClockIn).toBeDefined();

    console.log("STEP 6 DONE: clock in exists");
  });

  it("7) sends 'clock out' and checks clock out record exists", async () => {
    console.log("STEP 7: Send 'clock out'");

    const req = new TestRequest("http://localhost/api/webhook/meta/webhook", {
      method: "POST",
      body: JSON.stringify(metaTextPayload(fakeUserPhoneDigits, "clock out")),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const latestClockOut = [...testState.clockEvents].reverse().find((e) => e.type === "clock_out");
    expect(latestClockOut).toBeDefined();

    console.log("STEP 7 DONE: clock out exists");
  });

  it("8) deletes clock in/out records", async () => {
    console.log("STEP 8: Delete clock in/out records");

    testState.clockEvents = testState.clockEvents.filter((e) => e.userId !== testUserId);
    const remaining = testState.clockEvents.filter((e) => e.userId === testUserId);

    expect(remaining).toHaveLength(0);
    console.log("STEP 8 DONE: clock records deleted");
  });

  it("9) deletes test user", async () => {
    console.log("STEP 9: Delete test user");

    testState.users = testState.users.filter((u) => u.id !== testUserId);
    const deleted = testState.users.find((u) => u.id === testUserId);

    expect(deleted).toBeUndefined();
    console.log("STEP 9 DONE: test user deleted");
  });
});

beforeEach(() => {
  (global.fetch as jest.Mock).mockClear();
  (handleSiteManagerRoute as jest.Mock).mockClear();
});
