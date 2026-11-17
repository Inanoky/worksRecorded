import { automaticallyAssignForma2Sources } from "@/flows/default-construction/backend/forma2-auto-assignment";
import { getCurrentForma2WorkSelections } from "@/flows/default-construction/backend/forma2-data-read";
import { getSiteManagerAgentRunContext } from "@/flows/default-construction/backend/site-manager-agent/runContext";
import { extractAndSaveSiteDiary } from "@/flows/default-construction/backend/site-manager-agent/tools";
import { reviewedDiaryCases } from "./reviewed-diary-cases";
import { executeReviewedDiaryCase } from "./reviewed-diary-execution";

jest.mock("@/flows/default-construction/backend/forma2-data-read", () => ({
  getCurrentForma2WorkSelections: jest.fn(),
}));
jest.mock(
  "@/flows/default-construction/backend/forma2-auto-assignment",
  () => ({ automaticallyAssignForma2Sources: jest.fn() }),
);
jest.mock(
  "@/flows/default-construction/backend/site-manager-agent/tools",
  () => ({ extractAndSaveSiteDiary: jest.fn() }),
);
jest.mock("openai", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => ({ responses: { parse: jest.fn() } })),
}));
const originalClone = globalThis.structuredClone;
beforeAll(() => {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
});
afterAll(() => {
  globalThis.structuredClone = originalClone;
});
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(getCurrentForma2WorkSelections)
    .mockReturnValue({ positionByWorkKey: new Map(), workOptions: [] });
  jest.mocked(automaticallyAssignForma2Sources).mockResolvedValue([]);
});
it("passes only frozen project input to the existing extractor/checker without leaking gold answers or backdated labels", async () => {
  const evalCase = structuredClone(reviewedDiaryCases[0]);
  evalCase.expectedRecords[0].reviewedComment = "GOLD_ANSWER_MUST_NOT_LEAK";
  let isEval = false;
  jest.mocked(extractAndSaveSiteDiary).mockImplementation(async () => {
    isEval =
      getSiteManagerAgentRunContext()?.evalRecordMetadata?.isEval === true;
    return { ok: false, rows: [] } as never;
  });
  await executeReviewedDiaryCase(evalCase, {
    siteId: "eval-site",
    userId: "eval-user",
    runId: "eval-run",
  });
  const input = jest.mocked(extractAndSaveSiteDiary).mock.calls[0][0];
  expect(input).toMatchObject({
    question: evalCase.sourceText,
    persist: false,
    validateBeforeReturning: true,
    requestedDate: "12-11-2026",
  });
  expect(JSON.stringify(input)).not.toContain("GOLD_ANSWER_MUST_NOT_LEAK");
  expect(isEval).toBe(true);
  expect(automaticallyAssignForma2Sources).not.toHaveBeenCalled();
});
it("resolves the generated journal selection to a stable Forma2 ID before scoring", async () => {
  const evalCase = reviewedDiaryCases.find(
    (item) => item.id === "ocelt-1113-pe100-od63-trench",
  );
  if (!evalCase) throw new Error("Missing reference case");
  const expected = evalCase.expectedRecords[0];
  jest.mocked(getCurrentForma2WorkSelections).mockReturnValue({
    positionByWorkKey: new Map([
      [expected.work.toLocaleLowerCase("lv"), expected.forma2PositionId],
    ]),
    workOptions: [expected.work],
  });
  jest.mocked(extractAndSaveSiteDiary).mockResolvedValue({
    ok: true,
    rows: [
      {
        Works: expected.work,
        Date: expected.dateISO,
        Amounts: 60.87,
        Units: "m",
      },
    ],
  } as never);
  const output = await executeReviewedDiaryCase(evalCase, {
    siteId: "eval-site",
    userId: "eval-user",
    runId: "eval-run",
  });
  expect(output.rows[0]).toMatchObject({
    forma2PositionId: expected.forma2PositionId,
    amount: 60.87,
    workers: null,
    hours: null,
  });
});
