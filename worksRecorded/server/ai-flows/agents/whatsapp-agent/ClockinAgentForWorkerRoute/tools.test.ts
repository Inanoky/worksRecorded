const structuredInvokeMock = jest.fn();
const withStructuredOutputMock = jest.fn(() => ({ invoke: structuredInvokeMock }));
const saveSiteDiaryRecordMock = jest.fn();
const getConfigMock = jest.fn();
const mockBuildAiRunContext = jest.fn((args) => {
  const runName = args.runName ?? "WorkerDiaryStructuredSave";
  const tags = ["works-recorded", `flow:${args.flow}`, ...(args.tags ?? [])];
  const metadata = { ...(args.metadata ?? {}) };

  return {
    runName,
    threadId: args.threadId,
    tags,
    metadata,
    runnableConfig: {
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

jest.mock("@/server/actions/timesheets-actions", () => ({
  clockOutWorker: jest.fn(),
}));

jest.mock("@/server/actions/site-diary-actions", () => ({
  getConfig: getConfigMock,
  saveSiteDiaryRecord: saveSiteDiaryRecordMock,
}));

jest.mock("@/server/actions/shared-actions", () => ({
  getOrganizationLanguageByWorkerId: jest.fn(async () => "Latvian"),
}));

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    workers: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
  getMetaReplyContext: jest.fn(() => null),
  sendClockInCard: jest.fn(),
}));

jest.mock("@/lib/utils/clock-in-link", () => ({
  createClockInToken: jest.fn(() => "clock-token"),
}));

jest.mock("@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext", () => ({
  getWhatsappSourceContext: jest.fn(() => ({
    originalAudioUrl: null,
    messageId: "worker-message-1",
  })),
}));

jest.mock("@/server/ai-flows/ai-run-context", () => ({
  buildAiRunContext: mockBuildAiRunContext,
  summarizeForTrace: jest.fn((value) => value),
}));

jest.mock("./runContext", () => ({
  getWorkerAgentRunContext: jest.fn(() => ({
    evalRecordMetadata: { evaluationId: "worker-eval-1" },
    senderFirstName: "Jānis",
    senderLastName: "Bērziņš",
    senderName: "Jānis Bērziņš",
    senderInitials: "JB",
    senderLabel: "Jānis Bērziņš",
    traceMetadata: { scenario: "worker-unit-test" },
    traceTags: ["worker-test"],
  })),
  getWorkerSenderTraceMetadata: jest.fn((context) => ({
    senderFirstName: context?.senderFirstName,
    senderLastName: context?.senderLastName,
    senderName: context?.senderName,
    senderInitials: context?.senderInitials,
    senderLabel: context?.senderLabel,
  })),
  getWorkerSenderTraceTags: jest.fn((context) =>
    context?.senderLabel ? [`sender:${context.senderLabel}`] : [],
  ),
}));

import { workerDiaryToDatabaseTool } from "./tools";

const siteConfig = {
  Location: {
    Type: "textInput",
    DisplayName: "Area",
  },
  Works: {
    Type: "textInput",
    DisplayName: "Activity",
  },
  Amounts: {
    Type: "float",
    DisplayName: "Quantity",
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

describe("WorkerDiaryToDatabase tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getConfigMock.mockResolvedValue(siteConfig);
    saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });
  });

  it("preserves mapped numeric fields when saving worker diary rows", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [
        {
          Area: "2 stāvs",
          Activity: "Wall plaster",
          Quantity: 2,
          Workers: 2,
          Hours: 4,
        },
      ],
    });

    await workerDiaryToDatabaseTool.invoke({
      question: "Šodien apmestas sienas 2 stāvā, 4h",
      workerId: "worker-1",
      siteId: "site-1",
      date: "2026-07-30T10:00:00.000Z",
      originalUserComment: "Worker Name : Šodien apmestas sienas 2 stāvā, 4h",
    });

    expect(saveSiteDiaryRecordMock).toHaveBeenCalledWith({
      rows: [
        {
          Location: "2 stāvs",
          Works: "Wall plaster",
          Amounts: 2,
          WorkersInvolved: 2,
          TimeInvolved: 4,
        },
      ],
      workerId: "worker-1",
      siteId: "site-1",
      originalUserComment: "Worker Name : Šodien apmestas sienas 2 stāvā, 4h",
      evalMetadata: { evaluationId: "worker-eval-1" },
    });

    expect(mockBuildAiRunContext).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: "structured-worker-diary-save",
        runName: "WorkerDiaryStructuredSave - Jānis Bērziņš",
        tags: expect.arrayContaining(["sender:Jānis Bērziņš", "worker-test"]),
        metadata: expect.objectContaining({
          scenario: "worker-unit-test",
          senderFirstName: "Jānis",
          senderLastName: "Bērziņš",
          senderName: "Jānis Bērziņš",
          senderInitials: "JB",
          senderLabel: "Jānis Bērziņš",
        }),
      }),
    );

    const [, runnableConfig] = structuredInvokeMock.mock.calls[0];
    expect(runnableConfig).toEqual(
      expect.objectContaining({
        runName: "WorkerDiaryStructuredSave - Jānis Bērziņš",
        tags: expect.arrayContaining(["sender:Jānis Bērziņš", "worker-test"]),
        metadata: expect.objectContaining({
          senderFirstName: "Jānis",
          senderLabel: "Jānis Bērziņš",
        }),
      }),
    );
    expect(runnableConfig.metadata).not.toHaveProperty("siteDiaryValidationWarningCount");
  });

  it("keeps explicit worker quantities, completed amounts, and hours", async () => {
    structuredInvokeMock.mockResolvedValue({
      records: [
        {
          Area: "Dz 6",
          Activity: "OSB",
          Quantity: 10,
          Workers: 2,
          Hours: 3,
        },
      ],
    });

    await workerDiaryToDatabaseTool.invoke({
      question: "Dz 6 pabeigti 10 m2 OSB, 2 cilvēki, 3h",
      workerId: "worker-1",
      siteId: "site-1",
      date: "2026-07-30T10:00:00.000Z",
      originalUserComment: "Worker Name : Dz 6 pabeigti 10 m2 OSB, 2 cilvēki, 3h",
    });

    expect(saveSiteDiaryRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [
          {
            Location: "Dz 6",
            Works: "OSB",
            Amounts: 10,
            WorkersInvolved: 2,
            TimeInvolved: 3,
          },
        ],
        evalMetadata: { evaluationId: "worker-eval-1" },
      }),
    );
  });
});
