const structuredInvokeMock = jest.fn();
const withStructuredOutputMock = jest.fn(() => ({ invoke: structuredInvokeMock }));
const saveSiteDiaryRecordMock = jest.fn();
const getConfigMock = jest.fn();
const systemPromptMock = jest.fn();
const recordTraceMock = jest.fn();
const getSiteDiaryToolContextMock = jest.fn();
const setSavedConfirmationRecordsMock = jest.fn();
const getBisConnectionStatusMock = jest.fn();
const readBisMaterialRecordsMock = jest.fn();
const readSiteDiaryBisStatusesMock = jest.fn();
const archiveAndReplaceSiteDiaryBatchMock = jest.fn();
const getSiteDiaryCorrectionTargetMock = jest.fn();
const startSiteDiaryCorrectionMock = jest.fn();
const mockBuildAiRunContext = jest.fn((args) => {
  const runName = args.runName ?? "SiteDiaryStructuredSave";
  const tags = ["works-recorded", `flow:${args.flow}`, ...(args.tags ?? [])];
  const metadata = { ...(args.metadata ?? {}) };

  return {
    runName,
    threadId: args.threadId,
    tags,
    metadata,
    runnableConfig: {
      configurable: { thread_id: "test-thread" },
      runName,
      tags,
      metadata,
    },
  };
});

jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    withStructuredOutput: withStructuredOutputMock,
  })),
}));

jest.mock("@langchain/langgraph/prebuilt", () => ({
  ToolNode: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@/server/actions/site-diary-actions", () => ({
  getConfig: getConfigMock,
  saveSiteDiaryRecord: saveSiteDiaryRecordMock,
  archiveAndReplaceSiteDiaryBatch: archiveAndReplaceSiteDiaryBatchMock,
  getSiteDiaryCorrectionTarget: getSiteDiaryCorrectionTargetMock,
  startSiteDiaryCorrection: startSiteDiaryCorrectionMock,
}));

jest.mock("@/flows/default-construction/backend/site-manager-agent/prompts", () => ({
  systemPromptSaveToDatabaseFunction: systemPromptMock,
}));

jest.mock("@/flows/default-construction/backend/site-manager-agent/structuredSaveTrace", () => ({
  recordStructuredSaveTrace: recordTraceMock,
}));

jest.mock("@/flows/default-construction/backend/site-manager-agent/runContext", () => ({
  fastPathTraceConfig: jest.fn((metadata) => ({
    metadata,
    tags: [`execution-path:${metadata.executionPath}`],
  })),
  getSiteManagerAgentRunContext: jest.fn(() => ({
    evalRecordMetadata: { evaluationId: "eval-1" },
    traceMetadata: { scenario: "unit-test" },
    traceTags: ["site-diary-test"],
	    metrics: {
	      executionPath: "legacy-agent",
	      fastPathMode: "off",
	      timings: {},
	      modelCalls: [],
	      toolCalls: [],
	    },
	    senderFirstName: "Anna",
	    senderLastName: "Bērziņa",
	    senderName: "Anna Bērziņa",
	    senderInitials: "AB",
	    senderLabel: "Anna Bērziņa",
	  })),
  recordSiteManagerModelCall: jest.fn(),
  recordSiteManagerTiming: jest.fn(),
  recordSiteManagerToolCall: jest.fn(),
	  getSiteManagerSenderTraceMetadata: jest.fn(() => ({
	    senderFirstName: "Anna",
	    senderLastName: "Bērziņa",
	    senderName: "Anna Bērziņa",
	    senderInitials: "AB",
	    senderLabel: "Anna Bērziņa",
	  })),
	  getSiteManagerSenderTraceTags: jest.fn(() => ["sender:Anna Bērziņa"]),
}));

jest.mock("./siteDiaryToolContext", () => ({
  getSiteDiaryToolContext: getSiteDiaryToolContextMock,
  getSiteManagerToolContext: getSiteDiaryToolContextMock,
  setSiteManagerSavedConfirmationRecords: setSavedConfirmationRecordsMock,
}));

jest.mock("@/server/ai-flows/agents/bis-support-agent/tools", () => ({
  getBisConnectionStatus: getBisConnectionStatusMock,
  readBisMaterialRecords: readBisMaterialRecordsMock,
  readSiteDiaryBisStatuses: readSiteDiaryBisStatusesMock,
}));

jest.mock("@/server/ai-flows/ai-run-context", () => ({
  buildAiRunContext: mockBuildAiRunContext,
  summarizeForTrace: jest.fn((value) => value),
}));

jest.mock("@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext", () => ({
  getWhatsappSourceContext: jest.fn(() => ({
    originalAudioUrl: null,
    messageId: "wamid.test-correction",
  })),
}));

import {
  bisConnectionStatusTool,
  bisMaterialRecordsTool,
  extractAndSaveSiteDiary,
  replaceLastSiteDiaryBatchOperation,
  siteDiaryBisStatusesTool,
  siteDiaryToDatabaseTool,
} from "@/flows/default-construction/backend/site-manager-agent/tools";

const toolInput = {
  question: "poured 12.5 m3 concrete",
  date: "08-06-2026",
};

const trustedContext = {
  siteId: "site-1",
  userId: "user-1",
  originalUserComment: "Manager Name : poured concrete",
};

const siteConfig = {
  Location: {
    Type: "textInput",
    DisplayName: "Area",
  },
  Works: {
    Type: "dropdown",
    DisplayName: "Activity",
    DropDownOptions: { concrete: "Concrete pour" },
  },
  Amounts: {
    Type: "float",
    DisplayName: "Quantity",
  },
  Units: {
    Type: "dropdown",
    DisplayName: "Mrv",
    DropDownOptions: {
      m3: "m3",
      hour: "hour",
    },
  },
  WorkersInvolved: {
    Type: "float",
    DisplayName: "Workers",
    customSettings: { integer: true },
  },
  TimeInvolved: {
    Type: "float",
    DisplayName: "Hours",
  },
};

describe("save_to_database site diary tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getConfigMock.mockResolvedValue(siteConfig);
    systemPromptMock.mockResolvedValue("Extract site diary records");
    getSiteDiaryToolContextMock.mockReturnValue(trustedContext);
  });

  it("exposes only extraction fields and keeps date optional", () => {
    expect(siteDiaryToDatabaseTool.name).toBe("save_to_database");

    const schema = siteDiaryToDatabaseTool.schema as any;
    expect(Object.keys(schema.shape)).toEqual(["question", "date"]);
    expect(schema.shape.date.description).toContain("Omit it when no date was specified");
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ question: "save" }).success).toBe(true);
    expect(schema.safeParse(toolInput).success).toBe(true);
    expect(
      schema.parse({
        question: "save",
        userId: "attacker-user",
        siteId: "attacker-site",
        originalUserComment: "forged source",
      }),
    ).toEqual({ question: "save" });
  });

  it("ignores model-supplied identity fields and uses trusted app context", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [{ Area: "Building A", Activity: "Concrete pour", Quantity: 1 }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    await siteDiaryToDatabaseTool.invoke({
      ...toolInput,
      userId: "attacker-user",
      siteId: "attacker-site",
      originalUserComment: "forged source",
    } as any);

    expect(saveSiteDiaryRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        siteId: "site-1",
        originalUserComment: "Manager Name : poured concrete",
      }),
    );
  });

  it("extracts the question, maps real config fields, and saves with trusted context", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [
        { Area: "Building A", Activity: "Concrete pour", Quantity: 12.5, Mrv: "m3" },
      ],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({
      ok: true,
      count: 1,
      recordIds: ["record-1"],
      records: [{
        id: "record-1",
        Date: new Date("2026-06-08T00:00:00.000Z"),
        Location: "Building A",
        Works: "Concrete pour",
        Comments: "Concrete poured",
        Amounts: 12.5,
        Units: "m3",
        WorkersInvolved: 2,
        TimeInvolved: 4,
      }],
      normalizedInsertRows: [{ Location: "Building A" }],
    });

    const result = await siteDiaryToDatabaseTool.invoke(toolInput);

    const [messages, runnableConfig] = structuredInvokeMock.mock.calls[0];
    expect(messages[0].content).toContain(toolInput.question);
    expect(messages[0].content).toContain(toolInput.date);
    expect(messages[0].content).not.toContain(trustedContext.originalUserComment);
    expect(messages[1].content).toContain(trustedContext.siteId);
    expect(runnableConfig).toEqual(expect.objectContaining({
      configurable: { thread_id: "test-thread" },
      runName: "SiteDiaryStructuredSave - Anna Bērziņa",
      tags: expect.arrayContaining(["sender:Anna Bērziņa", "site-diary-test"]),
      metadata: expect.objectContaining({
        fastPathOutcome: "save",
        senderFirstName: "Anna",
        senderLastName: "Bērziņa",
        senderName: "Anna Bērziņa",
        senderInitials: "AB",
        senderLabel: "Anna Bērziņa",
      }),
    }));
    expect(mockBuildAiRunContext).toHaveBeenCalledWith(
      expect.objectContaining({
        runName: "SiteDiaryStructuredSave - Anna Bērziņa",
        metadata: expect.objectContaining({
          senderFirstName: "Anna",
          senderLastName: "Bērziņa",
          senderName: "Anna Bērziņa",
          senderInitials: "AB",
          senderLabel: "Anna Bērziņa",
        }),
        tags: expect.arrayContaining(["sender:Anna Bērziņa"]),
      }),
    );
    expect(saveSiteDiaryRecordMock).toHaveBeenCalledWith({
      rows: [
        { Location: "Building A", Works: "Concrete pour", Amounts: 12.5, Units: "m3" },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "Manager Name : poured concrete",
      evalMetadata: { evaluationId: "eval-1" },
    });
    expect(recordTraceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rawRecords: [
          { Area: "Building A", Activity: "Concrete pour", Quantity: 12.5, Mrv: "m3" },
        ],
        mappedRows: [
          { Location: "Building A", Works: "Concrete pour", Amounts: 12.5, Units: "m3" },
        ],
      }),
    );
    expect(result).toBe(
      "Saved 1 site diary record(s) successfully. Record IDs: record-1.",
    );
    expect(setSavedConfirmationRecordsMock).toHaveBeenLastCalledWith([{
      Date: new Date("2026-06-08T00:00:00.000Z"),
      Location: "Building A",
      Works: "Concrete pour",
      Comments: "Concrete poured",
      Units: "m3",
      Amounts: 12.5,
      WorkersInvolved: 2,
      TimeInvolved: 4,
    }]);
  });

  it.each([
    ["No records to insert", "No records to insert"],
    ["Database unavailable", "Database unavailable"],
  ])("returns a clear failure when persistence reports %s", async (message, expected) => {
    structuredInvokeMock.mockResolvedValue({
      records: [{ Area: null, Activity: null, Quantity: null }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: false, message });

    const result = await siteDiaryToDatabaseTool.invoke(toolInput);

    expect(result).toBe(`Failed to save site diary entry. Reason: ${expected}`);
    expect(result).not.toContain("successfully");
  });

  it("uses the extracted record count when persistence omits count", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [
        { Area: "Building A", Activity: "Concrete pour", Quantity: 12.5 },
        { Area: "Building B", Activity: "Concrete pour", Quantity: 7 },
      ],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({
      ok: true,
      recordIds: ["record-1", "record-2"],
    });

    const result = await siteDiaryToDatabaseTool.invoke(toolInput);

    expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toHaveLength(2);
    expect(result).toBe(
      "Saved 2 site diary record(s) successfully. Record IDs: record-1, record-2.",
    );
  });

  it("defaults a missing date in the backend", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-01T21:30:00.000Z"));
    structuredInvokeMock.mockResolvedValue({
      records: [{ Area: "Building A", Activity: "Concrete pour", Quantity: 1 }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    try {
      await siteDiaryToDatabaseTool.invoke({ question: "poured concrete" });
    } finally {
      jest.useRealTimers();
    }

    const [messages] = structuredInvokeMock.mock.calls[0];
    expect(messages[0].content).toContain("Date is : 02-07-2026");
  });

  it("normalizes an invented zero amount to null when the source has no quantity", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [{ Area: "Floor 2", Activity: "Concrete pour", Quantity: 0 }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    await siteDiaryToDatabaseTool.invoke({
      question: "Šodien apmestas sienas 2 stāvā, 4h",
    });

    expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0].Amounts).toBeNull();
  });

  it("moves a model-misplaced hour amount to TimeInvolved", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [{
        Area: "Pamati",
        Activity: "Concrete pour",
        Quantity: 9.5,
        Mrv: "hour",
        Hours: null,
      }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    await siteDiaryToDatabaseTool.invoke({
      question: "Veikta smilts piebēršana pamatiem ar Bobcat operatoru, 9,5 stundas.",
    });

    expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
      expect.objectContaining({
        Amounts: null,
        Units: null,
        TimeInvolved: 9.5,
      }),
    );
  });

  it("preserves decimal hours mapped to TimeInvolved", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [{
        Area: "Pamati",
        Activity: "Concrete pour",
        Quantity: null,
        Mrv: null,
        Hours: 9.5,
      }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    await siteDiaryToDatabaseTool.invoke({
      question: "Veikta smilts piebēršana pamatiem ar Bobcat operatoru, 9,5 stundas.",
    });

    expect(saveSiteDiaryRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            Amounts: null,
            Units: null,
            TimeInvolved: 9.5,
          }),
        ],
        evalMetadata: { evaluationId: "eval-1" },
      }),
    );
  });

  it.each([
    ["9,5 stundas", 9.5, 9.5],
    ["9.5h", 9.5, 9.5],
    ["9:15", 9.25, 9.25],
    ["9h15", 9.15, 9.25],
    ["9 h 15 min", 9.15, 9.25],
    ["9.15 stundas", 9.15, 9.25],
    ["9.50 stundas", 9.5, 9.8333],
  ])("normalizes human duration input %s to decimal hours", async (durationText, modelHours, expectedHours) => {
    structuredInvokeMock.mockResolvedValue({
      records: [{
        Area: "Pamati",
        Activity: "Concrete pour",
        Quantity: null,
        Mrv: null,
        Hours: modelHours,
      }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    await siteDiaryToDatabaseTool.invoke({
      question: `Veikta smilts piebēršana pamatiem, ${durationText}.`,
    });

    expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0].TimeInvolved).toBe(expectedHours);
  });

  it("nulls invented default workers and hours when the source has no labor evidence", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [{
        Area: "Project",
        Activity: "Concrete pour",
        Quantity: null,
        Mrv: null,
        Workers: 1,
        Hours: 1,
      }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    await siteDiaryToDatabaseTool.invoke({
      question: "Pievieno BIS sistēmā, ka šodien iztīrījām telpu.",
    });

    expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
      expect.objectContaining({
        WorkersInvolved: null,
        TimeInvolved: null,
      }),
    );
  });

  it("preserves explicit one worker and one hour from source evidence", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [{
        Area: "Project",
        Activity: "Concrete pour",
        Quantity: null,
        Mrv: null,
        Workers: 1,
        Hours: 1,
      }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    await siteDiaryToDatabaseTool.invoke({
      question: "Iztīrīta telpa, 1 cilvēks, 1 stunda.",
    });

    expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
      expect.objectContaining({
        WorkersInvolved: 1,
        TimeInvolved: 1,
      }),
    );
  });

  it("preserves source-supported quantities and decimal hours", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [{
        Area: "Pamati",
        Activity: "Concrete pour",
        Quantity: 20,
        Mrv: "m3",
        Hours: 9.5,
      }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    await siteDiaryToDatabaseTool.invoke({
      question: "Piebērti 20 m3 smilts, 9,5 stundas.",
    });

    expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
      expect.objectContaining({
        Amounts: 20,
        Units: "m3",
        TimeInvolved: 9.5,
      }),
    );
  });

  it("nulls context numbers mapped to Amounts", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [{
        Area: "2 stāvs",
        Activity: "Concrete pour",
        Quantity: 2,
        Mrv: null,
        Workers: 2,
        Hours: 4,
      }],
    });
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

    await siteDiaryToDatabaseTool.invoke({
      question: "Šodien apmestas sienas 2 stāvā, 2 cilvēki, 4h",
    });

    const [, runnableConfig] = structuredInvokeMock.mock.calls[0];
    expect(runnableConfig).toEqual(expect.objectContaining({
      runName: "SiteDiaryStructuredSave - Anna Bērziņa",
      tags: expect.arrayContaining(["sender:Anna Bērziņa", "site-diary-test"]),
      metadata: expect.objectContaining({
        senderLabel: "Anna Bērziņa",
      }),
    }));
    expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
      expect.objectContaining({
        Amounts: null,
        Units: null,
        WorkersInvolved: 2,
        TimeInvolved: 4,
      }),
    );
    expect(runnableConfig.metadata).not.toHaveProperty("siteDiaryValidationWarningCount");
  });

  it("fast-path fallback does not persist", async () => {
    structuredInvokeMock.mockResolvedValue({
      action: "fallback",
      language: "lv",
      records: [],
      intentReason: "question",
      intentConfidence: 0.99,
    });

    const result = await extractAndSaveSiteDiary({
      question: "Vai darbi ir pabeigti?",
      allowFallback: true,
    });

    expect(result.action).toBe("fallback");
    expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
  });

  it("returns correction intent without creating a new diary row", async () => {
    structuredInvokeMock.mockResolvedValue({
      action: "correct_existing_report",
      language: "lv",
      records: [],
      intentReason: "The complete sentence asks to change the previous record",
      intentConfidence: 0.98,
    });

    const result = await extractAndSaveSiteDiary({
      question: "Izmaini daudzumu iepriekšējā ierakstā uz 10",
      allowFallback: true,
    });

    expect(result).toMatchObject({ action: "correct_existing_report", count: 0 });
    expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
  });

  it("returns clarification intent without creating a new diary row", async () => {
    structuredInvokeMock.mockResolvedValue({
      action: "clarify",
      language: "lv",
      records: [],
      intentReason: "The standalone wording is ambiguous",
      intentConfidence: 0.55,
    });

    const result = await extractAndSaveSiteDiary({
      question: "Salabo",
      allowFallback: true,
    });

    expect(result).toMatchObject({ action: "clarify", count: 0 });
    expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
  });

  it("shadow extraction returns a save decision without persisting", async () => {
    structuredInvokeMock.mockResolvedValue({
      action: "save_new_report",
      language: "en",
      records: [{ Area: "Building A", Activity: "Concrete pour", Quantity: 2 }],
      intentReason: "completed work",
      intentConfidence: 0.99,
    });

    const result = await extractAndSaveSiteDiary({
      question: "Completed concrete pour today",
      allowFallback: true,
      persist: false,
    });

    expect(result).toMatchObject({ action: "save_new_report", language: "en", ok: true, count: 1 });
    expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
  });

  it("does not execute without trusted app context", async () => {
    getSiteDiaryToolContextMock.mockReturnValue(undefined);

    const result = await siteDiaryToDatabaseTool.invoke(toolInput);

    expect(result).toBe(
      "Failed to save site diary entry. Reason: Trusted site diary context is unavailable",
    );
    expect(structuredInvokeMock).not.toHaveBeenCalled();
    expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
  });
});

describe("replace_last_site_diary_batch correction operation", () => {
  const correctionTarget = {
    batch: {
      id: "batch-1",
      originalText: "Šodien salabojām durvis 2. stāvā, 5 gab., 2h.",
    },
    records: [{ id: "old-1", BISId: null, Date: new Date("2026-06-20T00:00:00.000Z") }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getConfigMock.mockResolvedValue(siteConfig);
    systemPromptMock.mockResolvedValue("Extract site diary records");
    getSiteDiaryToolContextMock.mockReturnValue(trustedContext);
    getSiteDiaryCorrectionTargetMock.mockResolvedValue(correctionTarget);
    structuredInvokeMock.mockResolvedValue({
      records: [{ Area: "2 stāvs", Activity: "Repair works", Quantity: 10 }],
    });
    archiveAndReplaceSiteDiaryBatchMock.mockResolvedValue({
      ok: true,
      idempotent: false,
      oldCount: 1,
      count: 1,
      records: [
        {
          id: "new-1",
          siteId: "site-1",
          userId: "user-1",
          Location: "2 stāvs",
          Works: "Repair works",
          Amounts: 10,
        },
      ],
    });
  });

  it("propagates evalMetadata from run context to archiveAndReplaceSiteDiaryBatch", async () => {
    await replaceLastSiteDiaryBatchOperation({
      correction: "Izmaini daudzumu uz 10 gab.",
      language: "lv",
    });

    expect(archiveAndReplaceSiteDiaryBatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ evalMetadata: { evaluationId: "eval-1" } }),
    );
  });

  it("passes the target record date into correction extraction", async () => {
    await replaceLastSiteDiaryBatchOperation({
      correction: "Izmaini daudzumu uz 10 gab.",
      language: "lv",
    });

    const [messages] = structuredInvokeMock.mock.calls[0];
    expect(messages[0].content).toContain("Date is : 20-06-2026");
    expect(messages[1].content).toContain("today is : 20-06-2026");
  });

  it("forces replacement rows to keep the target record date", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [{ Area: "2 stāvs", Activity: "Repair works", Quantity: 10, Date: "2026-07-21T00:00:00.000Z" }],
    });

    await replaceLastSiteDiaryBatchOperation({
      correction: "Izmaini daudzumu uz 10 gab.",
      language: "lv",
    });

    expect(archiveAndReplaceSiteDiaryBatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            Date: new Date("2026-06-20T00:00:00.000Z"),
          }),
        ],
      }),
    );
  });

  it("records a structured save trace after a successful correction", async () => {
    await replaceLastSiteDiaryBatchOperation({
      correction: "Izmaini daudzumu uz 10 gab.",
      language: "lv",
    });

    expect(recordTraceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "site-1",
        userId: "user-1",
        date: "20-06-2026",
        mappedRows: [
          expect.objectContaining({
            Date: new Date("2026-06-20T00:00:00.000Z"),
          }),
        ],
        persistedRecords: expect.arrayContaining([
          expect.objectContaining({ id: "new-1" }),
        ]),
      }),
    );
  });

  it("does not record a trace when the correction fails", async () => {
    archiveAndReplaceSiteDiaryBatchMock.mockResolvedValue({
      ok: false,
      reason: "no-eligible-batch",
    });

    await replaceLastSiteDiaryBatchOperation({
      correction: "Izmaini daudzumu uz 10 gab.",
      language: "lv",
    });

    expect(recordTraceMock).not.toHaveBeenCalled();
  });

  it("returns replaced status with new record count on success", async () => {
    const result = await replaceLastSiteDiaryBatchOperation({
      correction: "Izmaini daudzumu uz 10 gab.",
      language: "lv",
    });

    expect(result).toMatchObject({
      kind: "site_diary_correction",
      status: "replaced",
      oldRecordCount: 1,
      newRecordCount: 1,
    });
  });
});

describe("direct BIS read tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSiteDiaryToolContextMock.mockReturnValue(trustedContext);
    getBisConnectionStatusMock.mockResolvedValue({ status: "ready" });
    readBisMaterialRecordsMock.mockResolvedValue({ count: 0, records: [] });
    readSiteDiaryBisStatusesMock.mockResolvedValue({ count: 0, records: [] });
  });

  it("reads connection state with trusted identity and no model-supplied arguments", async () => {
    expect(Object.keys((bisConnectionStatusTool.schema as any).shape)).toEqual([]);

    const result = await bisConnectionStatusTool.invoke({
      siteId: "attacker-site",
      userId: "attacker-user",
    } as any);

    expect(getBisConnectionStatusMock).toHaveBeenCalledWith(
      { siteId: "site-1", userId: "user-1" },
      { connectionOverride: undefined },
    );
    expect(JSON.parse(String(result))).toEqual({ status: "ready" });
  });

  it("passes validated material and diary filters to regular read functions", async () => {
    await bisMaterialRecordsTool.invoke({ search: "Concrete", limit: 5 });
    await siteDiaryBisStatusesTool.invoke({ submission: "sent", search: "walls", limit: 3 });

    expect(readBisMaterialRecordsMock).toHaveBeenCalledWith(
      { siteId: "site-1", userId: "user-1" },
      { search: "Concrete", limit: 5 },
    );
    expect(readSiteDiaryBisStatusesMock).toHaveBeenCalledWith(
      { siteId: "site-1", userId: "user-1" },
      { submission: "sent", search: "walls", limit: 3 },
    );
  });

  it("does not read BIS data without trusted site-manager context", async () => {
    getSiteDiaryToolContextMock.mockReturnValue(undefined);

    const result = await bisConnectionStatusTool.invoke({});

    expect(result).toContain("trusted site-manager context is unavailable");
    expect(getBisConnectionStatusMock).not.toHaveBeenCalled();
  });
});
