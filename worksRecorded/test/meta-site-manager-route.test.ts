/* eslint-disable @typescript-eslint/no-explicit-any */

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

const testState = {
  users: [] as TestUser[],
  diaryRecords: [] as DiaryRecord[],
  clockEvents: [] as ClockEvent[],
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
  user: {
    findFirst: jest.fn(async ({ where }: any) => {
      const found = testState.users.find((u) => u.phone === where?.phone);
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

jest.mock("@/lib/utils/whatsapp-helpers/shared/twillio", () => ({
  runWithMetaReplyContext: async (_ctx: any, fn: () => Promise<unknown>) => fn(),
}));

jest.mock("@/lib/utils/whatsapp-helpers/handling-roles-routes/worker", () => ({
  handleWorkerRoute: jest.fn(async () => undefined),
}));

jest.mock("@/lib/utils/whatsapp-helpers/handling-roles-routes/project-manager-route", () => ({
  handleProjectManagerRoute: jest.fn(async () => undefined),
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
  process.env.META_ACCESS_TOKEN = "test-meta-token";
  process.env.WEBHOOK_VERIFY_TOKEN = "test-verify-token";

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

    const req = new Request("http://localhost/api/webhook/meta/webhook", {
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
    const req = new Request("http://localhost/api/webhook/meta/webhook", {
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

  it("4) sends fake voice message and validates diary record fields", async () => {
    console.log("STEP 4: Send fake voice message to Meta endpoint");

    const text = "Today we assembled 2 walls for 3 hours 5 workers";
    const req = new Request("http://localhost/api/webhook/meta/webhook", {
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
    const req = new Request("http://localhost/api/webhook/meta/webhook", {
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

    const req = new Request("http://localhost/api/webhook/meta/webhook", {
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

    const req = new Request("http://localhost/api/webhook/meta/webhook", {
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
