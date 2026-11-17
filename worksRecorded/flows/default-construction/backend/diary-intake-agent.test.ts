import { MemorySession } from "@openai/agents";
import { intakeContext, intakeDraft } from "@/test/fixtures/diary-intake";
import {
  reviewFunctionCall as call,
  reviewAssistantMessage as message,
  ScriptedReviewModel,
} from "@/test/fixtures/diary-review-model";
import { runDiaryIntakeAgent } from "./diary-intake-agent";

const originalClone = globalThis.structuredClone;
beforeAll(() => {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
});
afterAll(() => {
  globalThis.structuredClone = originalClone;
});
function model(draft = intakeDraft()) {
  return new ScriptedReviewModel([
    [call("read_source_message", {}, { callId: "source" })],
    [call("read_project_context", {}, { callId: "context" })],
    [
      call(
        "search_forma2_positions",
        { query: "beton", offset: 0 },
        { callId: "search" },
      ),
    ],
    [
      call(
        "read_forma2_position",
        { positionId: "concrete" },
        { callId: "position" },
      ),
    ],
    [call("validate_diary_draft", draft, { callId: "validate" })],
    [message(JSON.stringify(draft))],
  ]);
}
it("runs the actual SDK source-to-records tool loop with persistent session and no API requests", async () => {
  const scripted = model();
  const progress = jest.fn();
  const session = new MemorySession();
  const result = await runDiaryIntakeAgent(
    intakeContext(),
    session,
    progress,
    scripted,
  );
  expect(result.draft).toEqual(intakeDraft());
  expect(result.metrics.toolCalls).toBe(5);
  expect(scripted.calls).toHaveLength(6);
  expect(scripted.firstCall?.modelSettings.store).toBe(false);
  expect(JSON.stringify(scripted.calls[1].input)).toContain(
    intakeContext().sourceText,
  );
  expect((await session.getItems()).length).toBeGreaterThan(6);
  scripted.assertComplete();
});
it("rejects final output without mandatory source and project reads", async () => {
  const scripted = new ScriptedReviewModel([
    [message(JSON.stringify(intakeDraft()))],
  ]);
  await expect(
    runDiaryIntakeAgent(
      intakeContext(),
      new MemorySession(),
      async () => {},
      scripted,
    ),
  ).rejects.toThrow("INTAKE_CONTEXT_NOT_READ");
});
it("rejects invalid final quantities even after the model invoked validation", async () => {
  const draft = intakeDraft();
  draft.records[0].quantity.value = 999;
  await expect(
    runDiaryIntakeAgent(
      intakeContext(),
      new MemorySession(),
      async () => {},
      model(draft),
    ),
  ).rejects.toThrow("INTAKE_NUMBER_EVIDENCE");
});
it("never starts a model for oversized source data", async () => {
  const context = intakeContext();
  context.sourceText = "x".repeat(120001);
  const scripted = new ScriptedReviewModel();
  await expect(
    runDiaryIntakeAgent(context, new MemorySession(), async () => {}, scripted),
  ).rejects.toThrow("INTAKE_SOURCE_SIZE");
  expect(scripted.calls).toHaveLength(0);
});

it("creates separate work and shared-labour rows using estimate positions beyond the first page", async () => {
  const context = intakeContext();
  const concrete = context.positions[0];
  context.positions = [
    ...Array.from({ length: 45 }, (_, i) => ({
      ...concrete,
      id: `other-${i}`,
      name: "Mūrēšana",
      sourceRow: i,
    })),
    concrete,
    {
      ...concrete,
      id: "gravel",
      name: "Šķembu iestrāde",
      code: "2.1",
      sourceRow: 47,
    },
  ];
  context.workOptions.push("Šķembu iestrāde");
  context.workPositions["Šķembu iestrāde"] = "gravel";
  context.sourceText =
    "Pamati betonēti 12,5 m3. Iestrādātas šķembas 20 m3. Kopā strādāja 3 cilvēki 4 stundas.";
  const draft = intakeDraft();
  Object.assign(draft.records[0], {
    sourceQuote: "Pamati betonēti 12,5 m3.",
    workers: { value: null, evidence: null },
    hours: { value: null, evidence: null },
  });
  draft.records.push({
    ...draft.records[0],
    work: "Šķembu iestrāde",
    positionId: "gravel",
    sourceQuote: "Iestrādātas šķembas 20 m3.",
    comment: "Šķembu iestrāde.",
    quantity: { value: 20, evidence: "šķembas 20 m3" },
  });
  draft.records.push({
    ...draft.records[0],
    work: "Piezīmes",
    positionId: null,
    sourceQuote: "Kopā strādāja 3 cilvēki 4 stundas.",
    comment: "Kopīgais darba laiks abiem darbiem.",
    unit: null,
    quantity: { value: null, evidence: null },
    workers: { value: 3, evidence: "3 cilvēki" },
    hours: { value: 4, evidence: "4 stundas" },
  });
  const scripted = new ScriptedReviewModel([
    [call("read_source_message", {}, { callId: "source" })],
    [call("read_project_context", {}, { callId: "context" })],
    [
      call(
        "search_forma2_positions",
        { query: "", offset: 40 },
        { callId: "page" },
      ),
    ],
    [
      call(
        "read_forma2_position",
        { positionId: "concrete" },
        { callId: "concrete" },
      ),
    ],
    [
      call(
        "read_forma2_position",
        { positionId: "gravel" },
        { callId: "gravel" },
      ),
    ],
    [call("validate_diary_draft", draft, { callId: "validate" })],
    [message(JSON.stringify(draft))],
  ]);
  const result = await runDiaryIntakeAgent(
    context,
    new MemorySession(),
    async () => {},
    scripted,
  );
  expect(result.draft.records).toHaveLength(3);
  expect(result.draft.records.map((row) => row.quantity.value)).toEqual([
    12.5,
    20,
    null,
  ]);
  expect(result.draft.records.map((row) => row.hours.value)).toEqual([
    null,
    null,
    4,
  ]);
  expect(JSON.stringify(scripted.calls[3].input)).toContain("gravel");
  scripted.assertComplete();
});

it("gives actionable row and field feedback so the SDK can repair a draft within its turn budget", async () => {
  const invalid = intakeDraft();
  invalid.records[0].quantity.value = 99;
  const valid = intakeDraft();
  const scripted = new ScriptedReviewModel([
    [call("read_source_message", {}, { callId: "source" })],
    [call("read_project_context", {}, { callId: "context" })],
    [
      call(
        "search_forma2_positions",
        { query: "beton", offset: 0 },
        { callId: "search" },
      ),
    ],
    [
      call(
        "read_forma2_position",
        { positionId: "concrete" },
        { callId: "position" },
      ),
    ],
    [call("validate_diary_draft", invalid, { callId: "invalid" })],
    [call("validate_diary_draft", valid, { callId: "valid" })],
    [message(JSON.stringify(valid))],
  ]);
  expect(
    (
      await runDiaryIntakeAgent(
        intakeContext(),
        new MemorySession(),
        async () => {},
        scripted,
      )
    ).draft,
  ).toEqual(valid);
  const feedback = JSON.stringify(scripted.calls[5].input);
  expect(feedback).toContain("quantity.evidence");
  expect(feedback).toContain("recordIndex");
  expect(feedback).toContain("vērtība 99");
  scripted.assertComplete();
});

it("sends JSON Schema null unions to the actual SDK for both tool arguments and final output", async () => {
  const scripted = model();
  await runDiaryIntakeAgent(
    intakeContext(),
    new MemorySession(),
    async () => {},
    scripted,
  );
  const request = JSON.parse(JSON.stringify(scripted.firstCall));
  const tool = request.tools.find(
    (item: { name?: string }) => item.name === "validate_diary_draft",
  );
  for (const schema of [tool.parameters, request.outputType.schema]) {
    const record = schema.properties.records.items.properties;
    expect(record.positionId.type).toEqual(["string", "null"]);
    expect(record.quantity.properties.value.anyOf).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "number" }),
        { type: "null" },
      ]),
    );
    expect(record.unit.anyOf).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "string" }),
        { type: "null" },
      ]),
    );
    expect(JSON.stringify(schema)).not.toContain('"nullable":true');
  }
});
