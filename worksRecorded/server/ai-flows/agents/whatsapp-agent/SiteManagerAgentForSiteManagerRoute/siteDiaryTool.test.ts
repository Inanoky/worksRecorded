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
  })),
  recordSiteManagerModelCall: jest.fn(),
  recordSiteManagerTiming: jest.fn(),
  recordSiteManagerToolCall: jest.fn(),
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
  buildAiRunContext: jest.fn(() => ({
    runnableConfig: { configurable: { thread_id: "test-thread" }, metadata: {} },
  })),
  summarizeForTrace: jest.fn((value) => value),
}));

jest.mock("@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext", () => ({
  getWhatsappSourceContext: jest.fn(() => ({ originalAudioUrl: null })),
}));

import {
  bisConnectionStatusTool,
  bisMaterialRecordsTool,
  extractAndSaveSiteDiary,
  siteDiaryBisStatusesTool,
  siteDiaryToDatabaseTool,
} from "@/flows/default-construction/backend/site-manager-agent/tools";

const toolInput = {
  question: "internal save instruction",
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
        { Area: "Building A", Activity: "Concrete pour", Quantity: 12.5 },
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
      metadata: expect.objectContaining({ fastPathOutcome: "save" }),
    }));
    expect(saveSiteDiaryRecordMock).toHaveBeenCalledWith({
      rows: [
        { Location: "Building A", Works: "Concrete pour", Amounts: 12.5 },
      ],
      userId: "user-1",
      siteId: "site-1",
      originalUserComment: "Manager Name : poured concrete",
      evalMetadata: { evaluationId: "eval-1" },
    });
    expect(recordTraceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rawRecords: [
          { Area: "Building A", Activity: "Concrete pour", Quantity: 12.5 },
        ],
        mappedRows: [
          { Location: "Building A", Works: "Concrete pour", Amounts: 12.5 },
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

  it("fast-path fallback does not persist", async () => {
    structuredInvokeMock.mockResolvedValue({
      action: "fallback",
      language: "lv",
      records: [],
    });

    const result = await extractAndSaveSiteDiary({
      question: "Vai darbi ir pabeigti?",
      allowFallback: true,
    });

    expect(result.action).toBe("fallback");
    expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
  });

  it("shadow extraction returns a save decision without persisting", async () => {
    structuredInvokeMock.mockResolvedValue({
      action: "save",
      language: "en",
      records: [{ Area: "Building A", Activity: "Concrete pour", Quantity: 2 }],
    });

    const result = await extractAndSaveSiteDiary({
      question: "Completed concrete pour today",
      allowFallback: true,
      persist: false,
    });

    expect(result).toMatchObject({ action: "save", language: "en", ok: true, count: 1 });
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
