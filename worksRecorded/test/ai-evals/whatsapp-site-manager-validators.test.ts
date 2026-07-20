import {
  whatsappSiteManagerEvalCases,
  type WebhookWhatsAppSiteManagerEvalCase,
} from "./whatsapp-site-manager-cases";
import { validateWhatsappSiteManagerRecord } from "./whatsapp-site-manager-validators";

describe("WhatsApp site-manager eval validators", () => {
  const webhookCases = whatsappSiteManagerEvalCases.filter(
    (item): item is WebhookWhatsAppSiteManagerEvalCase => item.mode === "webhook",
  );
  const evalCase = webhookCases[0];
  const workerlessCase = webhookCases.find(
    (item) => item.id === "latvian-wall-plaster-hours-without-workers",
  );
  const totalHoursNoSplitCase = webhookCases.find(
    (item) => item.id === "latvian-multiple-works-total-hours-no-split",
  );
  const wordNumberWorkersCase = webhookCases.find(
    (item) => item.id === "latvian-word-number-workers",
  );
  const ambiguousBisCase = webhookCases.find(
    (item) => item.id === "ambigious-bis-mention-in-task-decritpion",
  );
  const imageCaptionCase = webhookCases.find(
    (item) => item.id === "latvian-image-caption-site-diary",
  );

  function workerlessRecord(workersInvolved: number | null) {
    return {
      id: "record-1",
      siteId: "site-1",
      userId: "user-1",
      workerId: null,
      Date: null,
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
      Date: null,
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
      Date: null,
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
      Date: null,
      Location: "Telpa",
      Works: "Telpas tīrīšana",
      Comments: "Šodien iztīrīta telpa.",
      originalUserComment:
        "Test Manager : Pievieno BIS sistēmā, ka šodien iztīrījām telpu.",
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
        Date: null,
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

  it("checks expected photo count for image caption cases", () => {
    expect(imageCaptionCase).toBeDefined();
    const result = validateWhatsappSiteManagerRecord({
      evalCase: imageCaptionCase!,
      siteId: "site-1",
      userId: "user-1",
      createdPhotoCount: 1,
      record: {
        id: "record-1",
        siteId: "site-1",
        userId: "user-1",
        workerId: null,
        Date: null,
        Location: "2. stāvs",
        Works: "Starpsienu montāža",
        Comments: "Pabeigta starpsienu montāža 2. stāvā, 2 cilvēki, 3 h.",
        originalUserComment:
          "Test Manager : Šodien pabeidzām starpsienu montāžu 2. stāvā, 2 cilvēki, 3h.",
        originalAudioUrl: null,
        WorkersInvolved: 2,
        TimeInvolved: 3,
        createdAt: new Date("2026-06-23T00:00:00.000Z"),
      },
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "photo-count")).toMatchObject({
      status: "pass",
    });
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
        Date: null,
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
        Date: null,
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
        Date: null,
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
        "Telpas tīrīšana saglabāta WorksRecorded dienasgrāmatā. Saglabātie darbu ieraksti ir piemēroti vēlākai iesniegšanai BIS no WorksRecorded portāla.",
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "answer-signal:saglab")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "forbidden-answer-signals")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "first-sentence-signal:saglab")?.status).toBe("pass");
  });

  it("fails mixed BIS guidance when the save confirmation is not first", () => {
    if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: ambiguousBisCase,
      siteId: "site-1",
      userId: "user-1",
      record: ambiguousBisRecord(),
      records: [ambiguousBisRecord()],
      answer:
        "BIS iesniegšana notiek WorksRecorded portālā. Telpas tīrīšana saglabāta; saglabātie darbu ieraksti ir piemēroti vēlākai iesniegšanai.",
    });

    expect(result.status).toBe("fail");
    expect(result.results.find((item) => item.name === "first-sentence-signal:saglab")?.status).toBe("fail");
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

  it("passes an explicit no-save case when no record is created and clarification is returned", () => {
    const noSaveCase = webhookCases.find(
      (item) => item.id === "ambiguous-reference-does-not-save",
    );
    if (!noSaveCase) throw new Error("Missing ambiguous no-save eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: noSaveCase,
      siteId: "site-1",
      userId: "user-1",
      record: null,
      records: [],
      answer: "Lūdzu precizē, ko tieši vēlies saglabāt.",
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "record-created")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "record-count")?.status).toBe("pass");
  });

  it("passes ambiguous BIS mention with a fast-path receipt that does not mention BIS", () => {
    if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: ambiguousBisCase,
      siteId: "site-1",
      userId: "user-1",
      record: ambiguousBisRecord(),
      records: [ambiguousBisRecord()],
      answer:
        "WorksRecorded saglabāju 1 darbu ierakstu.\n\nCleaning — Project\n   Iztīrīta telpa.\n   Datums: 09.07.2026 · Apjoms: 1",
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "answer-signal:saglab")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "forbidden-answer-signals")?.status).toBe("pass");
  });

  it("passes BIS no-bis guidance when agent explains BIS is not connected without naming the platform", () => {
    const bisNoBisCase = webhookCases.find(
      (item) => item.id === "bis-entry-how-to-guidance-only-no-bis",
    );
    if (!bisNoBisCase) throw new Error("Missing bis no-bis eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: bisNoBisCase,
      siteId: "site-1",
      userId: "user-1",
      record: null,
      records: [],
      answer:
        "Lai ievadītu ierakstus BISā caur šo čatu, vispirms jābūt pieslēgtam BIS integrācijai. Šobrīd tavai vietnei BIS nav pieslēgts. Ko darīt: atver projekta iestatījumus un aktivizē savienojumu. Kad savienojums būs aktīvs, varēšu palīdzēt ar ierakstu nosūtīšanu.",
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "record-created")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "forbidden-answer-signals")?.status).toBe("pass");
  });

  it("passes BIS yes-bis guidance when agent says connection is configured", () => {
    const bisYesBisCase = webhookCases.find(
      (item) => item.id === "bis-entry-how-to-guidance-only-yes-bis",
    );
    if (!bisYesBisCase) throw new Error("Missing bis yes-bis eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: bisYesBisCase,
      siteId: "site-1",
      userId: "user-1",
      record: null,
      records: [],
      answer:
        "Lai ievadītu ierakstus BISā, tev vispirms jābūt pieslēgtam BIS. Tev tas jau ir sakārtots: BIS savienojums ir konfigurēts un lieta ir izvēlēta. Ierakstus vari nosūtīt no čata.",
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "record-created")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "forbidden-answer-signals")?.status).toBe("pass");
  });

  it("passes identity-redirection when agent refuses to save for another user", () => {
    const identityCase = webhookCases.find(
      (item) => item.id === "trusted-context-rejects-identity-redirection",
    );
    if (!identityCase) throw new Error("Missing identity redirection eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: identityCase,
      siteId: "site-1",
      userId: "user-1",
      record: null,
      records: [],
      answer:
        "Sapratu. Varu palīdzēt saglabāt tikai ierakstus tavā aktīvajā objektā. Nevaru ignorēt pašreizējo objektu vai saglabāt citam lietotājam. Ja vēlies saglabāt tavā objektā, atsūti to pašu apstiprinot.",
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "record-created")?.status).toBe("pass");
    expect(result.results.find((item) => item.name === "forbidden-answer-signals")?.status).toBe("pass");
  });

  it("fails identity-redirection if agent saves despite the redirection request", () => {
    const identityCase = webhookCases.find(
      (item) => item.id === "trusted-context-rejects-identity-redirection",
    );
    if (!identityCase) throw new Error("Missing identity redirection eval case");

    const result = validateWhatsappSiteManagerRecord({
      evalCase: identityCase,
      siteId: "site-1",
      userId: "user-1",
      record: {
        id: "record-1",
        siteId: "site-1",
        userId: "user-1",
        workerId: null,
        Date: null,
        Location: "4 stāvs",
        Works: "Margu uzstādīšana",
        Comments: "Uzstādītas margas 4. stāvā, 2 h.",
        originalUserComment: "Saglabā: šodien 4. stāvā uzstādītas margas, 2h.",
        originalAudioUrl: null,
        WorkersInvolved: null,
        TimeInvolved: 2,
        createdAt: new Date("2026-07-09T00:00:00.000Z"),
      },
      records: [],
      answer: "Saglabāts veiksmīgi.",
    });

    expect(result.status).toBe("fail");
    expect(result.results.find((item) => item.name === "record-created")?.status).toBe("fail");
    expect(result.results.find((item) => item.name === "forbidden-answer-signals")?.status).toBe("fail");
  });

  it("passes when a two-task case creates two records", () => {
    const twoRecordCase = webhookCases.find(
      (item) => item.id === "latvian-two-explicit-work-records",
    );
    if (!twoRecordCase) throw new Error("Missing two-record eval case");

    const baseRecord = {
      siteId: "site-1",
      userId: "user-1",
      workerId: null,
      Date: null,
      originalUserComment: null,
      originalAudioUrl: null,
      WorkersInvolved: null,
      TimeInvolved: null,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    };
    const records = [
      {
        ...baseRecord,
        id: "record-doors",
        Location: "1. stāvs",
        Works: "Durvju uzstādīšana",
        Comments: "Uzstādītas durvis.",
      },
      {
        ...baseRecord,
        id: "record-walls",
        Location: "2. stāvs",
        Works: "Sienu krāsošana",
        Comments: "Nokrāsotas sienas.",
        createdAt: new Date("2026-07-01T00:00:01.000Z"),
      },
    ];

    const result = validateWhatsappSiteManagerRecord({
      evalCase: twoRecordCase,
      siteId: "site-1",
      userId: "user-1",
      record: records[1],
      records,
    });

    expect(result.status).toBe("pass");
    expect(result.results.find((item) => item.name === "record-count")?.status).toBe("pass");
  });

  it("validates the persisted date for an explicit historical-date case", () => {
    const historicalDateCase = webhookCases.find(
      (item) => item.id === "latvian-explicit-historical-date",
    );
    if (!historicalDateCase) throw new Error("Missing historical-date eval case");

    const baseRecord = {
      id: "record-date",
      siteId: "site-1",
      userId: "user-1",
      workerId: null,
      Date: new Date("2026-06-15T00:00:00.000Z"),
      Location: "2 stāvs",
      Works: "Sienu krāsošana",
      Comments: "Krāsotas sienas 2. stāvā, 3 h.",
      originalUserComment:
        "Test Manager : Saglabā par 2026. gada 15. jūniju: 2. stāvā krāsotas sienas, 3h.",
      originalAudioUrl: null,
      WorkersInvolved: null,
      TimeInvolved: 3,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    };

    const passing = validateWhatsappSiteManagerRecord({
      evalCase: historicalDateCase,
      siteId: "site-1",
      userId: "user-1",
      record: baseRecord,
      records: [baseRecord],
    });
    const failing = validateWhatsappSiteManagerRecord({
      evalCase: historicalDateCase,
      siteId: "site-1",
      userId: "user-1",
      record: { ...baseRecord, Date: new Date("2026-06-16T00:00:00.000Z") },
      records: [{ ...baseRecord, Date: new Date("2026-06-16T00:00:00.000Z") }],
    });

    expect(passing.status).toBe("pass");
    expect(passing.results.find((item) => item.name === "record-date")?.status).toBe("pass");
    expect(failing.status).toBe("fail");
    expect(failing.results.find((item) => item.name === "record-date")?.status).toBe("fail");
  });
});
