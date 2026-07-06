const structuredInvokeMock = jest.fn();
const withStructuredOutputMock = jest.fn(() => ({ invoke: structuredInvokeMock }));
const saveSiteDiaryRecordMock = jest.fn();
const getConfigMock = jest.fn();
const systemPromptMock = jest.fn();
const recordTraceMock = jest.fn();
const getSiteDiaryToolContextMock = jest.fn();
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
  getSiteManagerAgentRunContext: jest.fn(() => ({
    evalRecordMetadata: { evaluationId: "eval-1" },
    traceMetadata: { scenario: "unit-test" },
    traceTags: ["site-diary-test"],
  })),
}));

jest.mock("./siteDiaryToolContext", () => ({
  getSiteDiaryToolContext: getSiteDiaryToolContextMock,
  getSiteManagerToolContext: getSiteDiaryToolContextMock,
}));

jest.mock("@/server/ai-flows/agents/bis-support-agent/tools", () => ({
  getBisConnectionStatus: getBisConnectionStatusMock,
  readBisMaterialRecords: readBisMaterialRecordsMock,
  readSiteDiaryBisStatuses: readSiteDiaryBisStatusesMock,
}));

jest.mock("@/server/ai-flows/ai-run-context", () => ({
  buildAiRunContext: jest.fn(() => ({
    runnableConfig: { configurable: { thread_id: "test-thread" } },
  })),
  summarizeForTrace: jest.fn((value) => value),
}));

jest.mock("@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext", () => ({
  getWhatsappSourceContext: jest.fn(() => ({ originalAudioUrl: null })),
}));

import {
  bisConnectionStatusTool,
  bisMaterialRecordsTool,
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
      records: [{ id: "record-1" }],
      normalizedInsertRows: [{ Location: "Building A" }],
    });

    const result = await siteDiaryToDatabaseTool.invoke(toolInput);

    const [messages, runnableConfig] = structuredInvokeMock.mock.calls[0];
    expect(messages[0].content).toContain(toolInput.question);
    expect(messages[0].content).toContain(toolInput.date);
    expect(messages[0].content).not.toContain(trustedContext.originalUserComment);
    expect(messages[1].content).toContain(trustedContext.siteId);
    expect(runnableConfig).toEqual({ configurable: { thread_id: "test-thread" } });
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
