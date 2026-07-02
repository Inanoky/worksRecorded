import { whatsappSiteManagerEvalCases } from "./whatsapp-site-manager-cases";
import { validateWhatsappSiteManagerRecord } from "./whatsapp-site-manager-validators";

describe("WhatsApp site-manager eval validators", () => {
  const evalCase = whatsappSiteManagerEvalCases[0];
  const workerlessCase = whatsappSiteManagerEvalCases.find(
    (item) => item.id === "latvian-wall-plaster-hours-without-workers",
  );
  const totalHoursNoSplitCase = whatsappSiteManagerEvalCases.find(
    (item) => item.id === "latvian-multiple-works-total-hours-no-split",
  );
  const wordNumberWorkersCase = whatsappSiteManagerEvalCases.find(
    (item) => item.id === "latvian-word-number-workers",
  );
  const ambiguousBisCase = whatsappSiteManagerEvalCases.find(
    (item) => item.id === "ambigious-bis-mention-in-task-decritpion",
  );

  function workerlessRecord(workersInvolved: number | null) {
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

  function totalHoursNoSplitRecord() {
    return {
      id: "record-1",
      siteId: "site-1",
      userId: "user-1",
      workerId: null,
      Location: "Project",
      Works: "Ūdens trubas, kanalizācija un radiatori",
      Comments: "Ūdens trubas plus kanalizācija, ūdens radiatori, divpadsmit stundas.",
      originalUserComment:
        "Test Manager : Ūdens trubas plus kanalizācija, ūdens radiatori, divpadsmit stundas.",
      originalAudioUrl: null,
      WorkersInvolved: null,
      TimeInvolved: 12,
      createdAt: new Date("2026-06-23T00:00:00.000Z"),
    };
  }

  function wordNumberWorkersRecord(workersInvolved: number | null) {
    return {
      id: "record-1",
      siteId: "site-1",
      userId: "user-1",
      workerId: null,
      Location: "1 stāvs",
      Works: "Pārseguma paneļu montāža",
      Comments: "Montēti pārseguma paneļi 1. stāvā, trīs strādnieki, 6 h.",
      originalUserComment:
        "Test Manager : Šodien montēti pārseguma paneļi 1 stāvā, trīs strādnieki, 6h",
      originalAudioUrl: null,
      WorkersInvolved: workersInvolved,
      TimeInvolved: 6,
      createdAt: new Date("2026-06-23T00:00:00.000Z"),
    };
  }

  function ambiguousBisRecord() {
    return {
      id: "record-1",
      siteId: "site-1",
      userId: "user-1",
      workerId: null,
      Location: "Objekts",
      Works: "Uzkopšanas darbi",
      Comments: "Tiek veikti objekta uzkopšanas darbi.",
      originalUserComment:
        "Test Manager : izveido ierakstu priekš BIS sistēmas par to, ka tiek veikti objekta uzkopšans darbi",
      originalAudioUrl: null,
      WorkersInvolved: null,
      TimeInvolved: null,
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

  it("passes when a work report without an explicit worker count stores null", () => {
    if (!workerlessCase) throw new Error("Missing workerless eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: workerlessCase,
      siteId: "site-1",
      userId: "user-1",
      record: workerlessRecord(null),
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "workers-involved")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "time-involved")?.status).toBe("pass");
  });

  it("fails when a worker-less report is assigned an invented worker count", () => {
    if (!workerlessCase) throw new Error("Missing workerless eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: workerlessCase,
      siteId: "site-1",
      userId: "user-1",
      record: workerlessRecord(1),
    });

    expect(result.status).toBe("fail");
    expect(result.results.find((item) => item.name === "workers-involved")?.status).toBe("fail");
  });

  it("passes when multiple works with one total duration stay as one record", () => {
    if (!totalHoursNoSplitCase) throw new Error("Missing total hours no-split eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: totalHoursNoSplitCase,
      siteId: "site-1",
      userId: "user-1",
      record: totalHoursNoSplitRecord(),
      records: [totalHoursNoSplitRecord()],
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "record-count")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "workers-involved")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "time-involved")?.status).toBe("pass");
  });

  it("passes when Latvian word-number worker count is extracted", () => {
    if (!wordNumberWorkersCase) throw new Error("Missing word-number workers eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: wordNumberWorkersCase,
      siteId: "site-1",
      userId: "user-1",
      record: wordNumberWorkersRecord(3),
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "workers-involved")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "time-involved")?.status).toBe("pass");
  });

  it("fails word-number worker case when the saved count is wrong", () => {
    if (!wordNumberWorkersCase) throw new Error("Missing word-number workers eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: wordNumberWorkersCase,
      siteId: "site-1",
      userId: "user-1",
      record: wordNumberWorkersRecord(1),
    });

    expect(result.status).toBe("fail");
    expect(result.results.find((item) => item.name === "workers-involved")?.status).toBe("fail");
    expect(result.results.find((item) => item.name === "workers-involved")?.message).toBe(
      "WorkersInvolved must be 3; got 1.",
    );
  });

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

  it("passes ambiguous BIS mention when cleaning work is saved and answer separates BIS submission", () => {
    if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: ambiguousBisCase,
      siteId: "site-1",
      userId: "user-1",
      record: ambiguousBisRecord(),
      records: [ambiguousBisRecord()],
      answer:
        "Krišjāni, informācija saglabāta kā objekta dienasgrāmatas ieraksts. BIS iesniegšanu vari veikt WorksRecorded portālā.",
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "answer-signal:saglab")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "forbidden-answer-signals")?.status).toBe("pass");
  });

  it("fails ambiguous BIS mention if answer claims BIS submission was completed", () => {
    if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: ambiguousBisCase,
      siteId: "site-1",
      userId: "user-1",
      record: ambiguousBisRecord(),
      records: [ambiguousBisRecord()],
      answer:
        "Ieraksts saglabāts un BIS ieraksts izveidots.",
    });

    expect(result.status).toBe("fail");
    expect(result.results.find((item) => item.name === "forbidden-answer-signals")?.status).toBe("fail");
  });

  it("fails ambiguous BIS mention if no site diary record is created", () => {
    if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: ambiguousBisCase,
      siteId: "site-1",
      userId: "user-1",
      record: null,
      records: [],
      answer:
        "BIS ierakstus vari pievienot WorksRecorded portālā.",
    });

    expect(result.status).toBe("fail");
    expect(result.results.find((item) => item.name === "record-created")?.status).toBe("fail");
  });
});
