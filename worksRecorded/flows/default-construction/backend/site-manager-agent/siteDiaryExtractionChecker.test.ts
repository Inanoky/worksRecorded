const mockInvoke = jest.fn();
const mockWithStructuredOutput = jest.fn(() => ({ invoke: mockInvoke }));

jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn(() => ({
    withStructuredOutput: mockWithStructuredOutput,
  })),
}));

import { ChatOpenAI } from "@langchain/openai";
import {
  buildSiteDiaryExtractionCheckerMessages,
  invokeSiteDiaryExtractionChecker,
  serializeRowsForSiteDiaryChecker,
  siteDiaryExtractionCheckerModel,
} from "./siteDiaryExtractionChecker";

describe("site diary extraction checker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoke.mockReset();
    mockWithStructuredOutput.mockClear();
  });

  it("accepts one clear task", async () => {
    mockInvoke.mockResolvedValue({
      parsed: {
        verdict: "accept",
        reason: "Viens skaidrs darbs.",
        badSplitSignals: [],
        repairInstructions: "",
        expectedRecordCount: 1,
      },
      raw: { response_metadata: { model_name: "gpt-test-checker" } },
    });

    const result = await invokeSiteDiaryExtractionChecker({
      originalMessage: "Šodien apmestas sienas 2. stāvā, 4h.",
      language: "lv",
      rows: [{
        Works: "Apmetums",
        Location: "2. stāvs",
        Comments: "Apmestas sienas.",
        TimeInvolved: 4,
      }],
    });

    expect(result.parsed.verdict).toBe("accept");
    expect(ChatOpenAI).toHaveBeenCalledWith({
      model: siteDiaryExtractionCheckerModel,
      reasoning: { effort: "medium" },
    });
  });

  it("accepts many clear full-day tasks", async () => {
    mockInvoke.mockResolvedValue({
      parsed: {
        verdict: "accept",
        reason: "Katram ierakstam ir atsevišķs avota darbs.",
        badSplitSignals: [],
        repairInstructions: "",
        expectedRecordCount: 4,
      },
      raw: {},
    });

    const result = await invokeSiteDiaryExtractionChecker({
      originalMessage: "Durvis 2h. Sienas 3h. Ievestas smiltis 20 m3. Laiks saulains.",
      language: "lv",
      rows: [
        { Works: "Durvis", TimeInvolved: 2 },
        { Works: "Sienas", TimeInvolved: 3 },
        { Works: "Materiālu piegāde", Amounts: 20, Units: "m3" },
        { Works: "Piezīmes", Comments: "Laiks saulains." },
      ],
    });

    expect(result.parsed).toEqual(expect.objectContaining({
      verdict: "accept",
      expectedRecordCount: 4,
    }));
  });

  it("rejects one machinery/operator job split into multiple rows", async () => {
    mockInvoke.mockResolvedValue({
      parsed: {
        verdict: "retry",
        reason: "Viena frēzēšanas darbība sadalīta tehnikā un operatorā.",
        badSplitSignals: ["machinery/operator split", "sub-action rows"],
        repairInstructions: "Apvieno frēzēšanu, tehniku un operatoru vienā darbu ierakstā.",
        expectedRecordCount: 1,
      },
      raw: {},
    });

    const result = await invokeSiteDiaryExtractionChecker({
      originalMessage: "Asfalta frēzēšana ar frēzi un operatoru, darbs pabeigts.",
      language: "lv",
      rows: [
        { Works: "Asfalta frēzēšana", Comments: "Frēzēts asfalts." },
        { Works: "Tehnika", Comments: "Frēze strādāja." },
        { Works: "Piezīmes", Comments: "Operators veica darbu." },
      ],
    });

    expect(result.parsed.verdict).toBe("retry");
    expect(result.parsed.expectedRecordCount).toBe(1);
    expect(result.parsed.repairInstructions).toContain("Apvieno");
  });

  it("rejects shared-hours rows that were split unsafely", async () => {
    mockInvoke.mockResolvedValue({
      parsed: {
        verdict: "retry",
        reason: "Kopējās stundas nav sadalāmas pa atsevišķiem darbiem.",
        badSplitSignals: ["shared total hours"],
        repairInstructions: "Saglabā kā vienu kopsavilkuma ierakstu ar kopējām 12 stundām.",
        expectedRecordCount: 1,
      },
      raw: {},
    });

    const result = await invokeSiteDiaryExtractionChecker({
      originalMessage: "Ūdens trubas plus kanalizācija, ūdens radiatori, divpadsmit stundas.",
      language: "lv",
      rows: [
        { Works: "Ūdens trubas", TimeInvolved: 12 },
        { Works: "Kanalizācija", TimeInvolved: 12 },
        { Works: "Radiatori", TimeInvolved: 12 },
      ],
    });

    expect(result.parsed.verdict).toBe("retry");
    expect(result.parsed.badSplitSignals).toContain("shared total hours");
  });

  it("accepts the existing two-explicit-work case", async () => {
    mockInvoke.mockResolvedValue({
      parsed: {
        verdict: "accept",
        reason: "Divi darbi ar atsevišķām vietām un stundām.",
        badSplitSignals: [],
        repairInstructions: "",
        expectedRecordCount: 2,
      },
      raw: {},
    });

    const result = await invokeSiteDiaryExtractionChecker({
      originalMessage: "Šodien 1. stāvā uzstādītas durvis, 2h un 2. stāvā nokrāsotas sienas, 3h.",
      language: "lv",
      rows: [
        { Works: "Durvis", Location: "1. stāvs", TimeInvolved: 2 },
        { Works: "Sienu krāsošana", Location: "2. stāvs", TimeInvolved: 3 },
      ],
    });

    expect(result.parsed.verdict).toBe("accept");
    expect(result.parsed.expectedRecordCount).toBe(2);
  });

  it("serializes only relevant public row fields for review", () => {
    const serialized = serializeRowsForSiteDiaryChecker([
      {
        id: "hidden",
        Works: "Durvis",
        Location: "1. stāvs",
        Comments: "Uzstādītas durvis.",
        Amounts: 5,
        Units: "pcs",
        WorkersInvolved: 2,
        TimeInvolved: 3,
      },
    ]);

    expect(serialized).toContain("Record 1");
    expect(serialized).toContain("Works: Durvis");
    expect(serialized).toContain("TimeInvolved: 3");
    expect(serialized).not.toContain("hidden");
  });

  it("prompts the checker to judge real jobs rather than machinery or sub-actions", () => {
    const messages = buildSiteDiaryExtractionCheckerMessages({
      originalMessage: "Frēzēšana ar tehniku un operatoru.",
      language: "lv",
      rows: [
        { Works: "Frēzēšana" },
        { Works: "Tehnika" },
      ],
    });
    const system = String(messages[0].content);
    const human = String(messages[1].content);

    expect(system).toContain("real separate diary events/jobs");
    expect(system).toContain("machinery/tools/operators/sub-actions");
    expect(human).toContain("Original WhatsApp message");
    expect(human).toContain("Record 2");
  });
});
