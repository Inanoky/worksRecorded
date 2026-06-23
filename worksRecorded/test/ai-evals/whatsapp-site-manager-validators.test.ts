import { whatsappSiteManagerEvalCases } from "./whatsapp-site-manager-cases";
import { validateWhatsappSiteManagerRecord } from "./whatsapp-site-manager-validators";

describe("WhatsApp site-manager eval validators", () => {
  const evalCase = whatsappSiteManagerEvalCases[0];
  const impliedWorkerCase = whatsappSiteManagerEvalCases.find(
    (item) => item.id === "latvian-wall-plaster-hours-implied-one-worker",
  );

  function impliedWorkerRecord(workersInvolved: number | null) {
    return {
      id: "record-1",
      siteId: "site-1",
      userId: "user-1",
      workerId: null,
      Location: "2 stāvs",
      Works: "Apmetums",
      Comments: "Apmestas sienas 2. stāvā, 4 h.",
      originalUserComment: "Test Manager : Šodien apmestas sienas 2 stāvā, 4h",
      originalAudioUrl: null,
      WorkersInvolved: workersInvolved,
      TimeInvolved: 4,
      createdAt: new Date("2026-06-23T00:00:00.000Z"),
    };
  }

  it("passes a saved record that preserves the text webhook facts", () => {
    const result = validateWhatsappSiteManagerRecord({
      evalCase,
      siteId: "site-1",
      userId: "user-1",
      record: {
        id: "record-1",
        siteId: "site-1",
        userId: "user-1",
        workerId: null,
        Location: "3 stāvs",
        Works: "Finishing",
        Comments: "Ieklātas grīdas",
        originalUserComment: "Test Manager : Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
        originalAudioUrl: null,
        WorkersInvolved: 2,
        TimeInvolved: 3,
        createdAt: new Date("2026-06-23T00:00:00.000Z"),
      },
    });

    expect(result.status).toBe("pass");
    expect(result.heuristic.status).toBe("pass");
  });

  it("fails when the saved record loses core quantities", () => {
    const result = validateWhatsappSiteManagerRecord({
      evalCase,
      siteId: "site-1",
      userId: "user-1",
      record: {
        id: "record-1",
        siteId: "site-1",
        userId: "user-1",
        workerId: null,
        Location: "Project",
        Works: "Notes",
        Comments: "Darbi objektā",
        originalUserComment: "Darbi objektā",
        originalAudioUrl: null,
        WorkersInvolved: null,
        TimeInvolved: null,
        createdAt: new Date("2026-06-23T00:00:00.000Z"),
      },
    });

    expect(result.status).toBe("fail");
    expect(result.heuristic.status).toBe("fail");
  });

  it("fails when worker count only appears in free text but structured WorkersInvolved is wrong", () => {
    const result = validateWhatsappSiteManagerRecord({
      evalCase,
      siteId: "site-1",
      userId: "user-1",
      record: {
        id: "record-1",
        siteId: "site-1",
        userId: "user-1",
        workerId: null,
        Location: "Project",
        Works: "Finishing",
        Comments: "Ieklātas grīdas 3. stāvā, 2 cilvēki, 3 h.",
        originalUserComment: "Test Manager : Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
        originalAudioUrl: null,
        WorkersInvolved: 0,
        TimeInvolved: 3,
        createdAt: new Date("2026-06-23T00:00:00.000Z"),
      },
    });

    expect(result.status).toBe("fail");
    expect(result.results.find((item) => item.name === "workers-involved")?.status).toBe("fail");
    expect(result.results.find((item) => item.name === "workers-involved")?.message).toBe(
      "WorkersInvolved must be 2; got 0.",
    );
  });

  it("passes when a work report without explicit worker count infers one worker", () => {
    if (!impliedWorkerCase) throw new Error("Missing implied worker eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: impliedWorkerCase,
      siteId: "site-1",
      userId: "user-1",
      record: impliedWorkerRecord(1),
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "workers-involved")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "time-involved")?.status).toBe("pass");
  });

  it.each([null, 0])(
    "fails implied worker case when WorkersInvolved is %s",
    (workersInvolved) => {
      if (!impliedWorkerCase) throw new Error("Missing implied worker eval case");

      const result = validateWhatsappSiteManagerRecord({
        evalCase: impliedWorkerCase,
        siteId: "site-1",
        userId: "user-1",
        record: impliedWorkerRecord(workersInvolved),
      });

      expect(result.status).toBe("fail");
      expect(result.results.find((item) => item.name === "workers-involved")?.status).toBe("fail");
    },
  );

  it("fails if an audio record stores an expiring Meta lookaside URL", () => {
    const result = validateWhatsappSiteManagerRecord({
      evalCase,
      siteId: "site-1",
      userId: "user-1",
      record: {
        id: "record-1",
        siteId: "site-1",
        userId: "user-1",
        workerId: null,
        Location: "3 stāvs",
        Works: "Finishing",
        Comments: "Ieklātas grīdas",
        originalUserComment: "Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
        originalAudioUrl:
          "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=test",
        WorkersInvolved: 2,
        TimeInvolved: 3,
        createdAt: new Date("2026-06-23T00:00:00.000Z"),
      },
    });

    expect(result.status).toBe("fail");
    expect(result.results.find((item) => item.name === "no-meta-audio-url")?.status).toBe("fail");
  });
});
