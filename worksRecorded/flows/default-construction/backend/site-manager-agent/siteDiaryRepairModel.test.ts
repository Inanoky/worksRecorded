const mockInvoke = jest.fn();
jest.mock("@langchain/openai", () => ({
	ChatOpenAI: jest.fn(() => ({
		withStructuredOutput: jest.fn(() => ({ invoke: mockInvoke })),
	})),
}));

import { ChatOpenAI } from "@langchain/openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
	buildSiteDiaryRepairRequest,
	buildSiteDiaryRepairSchema,
	siteDiaryRepairSchema,
} from "./siteDiaryRepair";
import {
	buildSiteDiaryRepairMessages,
	invokeSiteDiaryTargetedRepair,
} from "./siteDiaryRepairModel";

const source =
	"Iebūvēta ūdensvada caurule OD63, 22 metri. Izrakta tranšeja 30 m3.";
const request = () =>
	buildSiteDiaryRepairRequest({
		source,
		referenceDate: "2026-11-18",
		config: {
			Works: {
				Type: "dropdown",
				DropDownOptions: {
					water: "1.1 Ūdensvada OD63 caurules montāža",
					trench: "Trenching",
					unrelated: "Jumta segums",
				},
			},
		},
		rows: [
			{
				Works: "Trenching",
				Comments: "Slepenas iepriekšējās piezīmes",
				Amounts: 30,
				Units: "m3",
			},
			{ Works: "Trenching", Comments: "Nepareiza kategorija" },
		],
		checker: {
			verdict: "needs_model_repair",
			reason: "Nepareiza kategorija",
			badSplitSignals: [],
			repairActions: [],
			repairInstructions: "Maini otrās rindas kategoriju.",
			expectedRecordCount: 2,
			coverageComplete: true,
			rowReviews: [
				{
					rowIndex: 0,
					status: "accept",
					reason: "Pareizi",
					sourceText: "Izrakta tranšeja 30 m3.",
				},
				{
					rowIndex: 1,
					status: "needs_review",
					reason: "Nepareizi",
					sourceText: "Iebūvēta ūdensvada caurule OD63, 22 metri.",
				},
			],
			modelRepairTargets: [
				{ rowIndex: 1, fields: ["Works"], allowStructuralChanges: false },
			],
		},
	});

describe("targeted repair model", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockInvoke.mockReset();
	});
	it("uses strict structured output with a bounded, scoped prompt", () => {
		expect(() =>
			zodResponseFormat(siteDiaryRepairSchema, "repair"),
		).not.toThrow();
		const schema = JSON.stringify(
			zodResponseFormat(siteDiaryRepairSchema, "repair").json_schema.schema,
		);
		expect(schema).not.toContain('"not":{}');
		expect(schema).not.toContain('"nullable":true');
		const messages = buildSiteDiaryRepairMessages(request());
		const payload = JSON.parse(String(messages[1].content));
		expect(payload).not.toHaveProperty("originalRows");
		expect(payload).not.toHaveProperty("sourceForMissingActivities");
		expect(payload.targets).toHaveLength(1);
		expect(payload.targets[0].rowId).toBe("row-2");
		expect(JSON.stringify(payload)).not.toContain(
			"Slepenas iepriekšējās piezīmes",
		);
		expect(
			payload.candidates.some(
				(candidate: { work: string }) => candidate.work === "Jumta segums",
			),
		).toBe(true);
		expect(String(messages[0].content).length).toBeLessThan(2800);
	});
	it("includes the full source only when the checker found missing activities", () => {
		const scoped = request();
		scoped.allowAdditions = true;
		expect(
			JSON.parse(String(buildSiteDiaryRepairMessages(scoped)[1].content))
				.sourceForMissingActivities,
		).toBe(source);
	});
	it("refuses oversized context instead of silently truncating the source", () => {
		const scoped = request();
		scoped.instructions = "a".repeat(28_001);
		expect(() => buildSiteDiaryRepairMessages(scoped)).toThrow(
			"REPAIR_CONTEXT_TOO_LARGE",
		);
	});
	it("uses medium reasoning through Responses and preserves tracing configuration", async () => {
		const output = {
			changes: [],
			replacements: [],
			additions: [],
			unresolvedRowIds: ["row-2"],
			reason: "Nepietiek datu",
		};
		mockInvoke.mockResolvedValue({
			parsed: output,
			raw: { usage_metadata: { input_tokens: 100 } },
		});
		const result = await invokeSiteDiaryTargetedRepair({
			request: request(),
			runnableConfig: {
				runName: "SiteDiaryTargetedRepair",
				metadata: { targetCount: 1 },
			},
		});
		expect(result.parsed).toEqual({ ...output, reason: "Mērķēts labojums." });
		expect(ChatOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				model: "gpt-6.1-sol",
				maxRetries: 0,
				timeout: 180_000,
				useResponsesApi: true,
				modelKwargs: { reasoning: { effort: "medium" } },
			}),
		);
		expect(mockInvoke.mock.calls[0][1]).toMatchObject({
			runName: "SiteDiaryTargetedRepair",
			metadata: { targetCount: 1 },
		});
	});
	it("rejects a malformed model response", async () => {
		mockInvoke.mockResolvedValue({ parsed: { records: [] } });
		await expect(
			invokeSiteDiaryTargetedRepair({ request: request() }),
		).rejects.toThrow();
	});
	it("excludes locked rows and forbidden fields from the actual response schema", () => {
		const schema = buildSiteDiaryRepairSchema(request());
		expect(Object.keys(schema.shape)).toEqual(["changes", "unresolvedRowIds"]);
		const empty = {
			changes: [],
			replacements: [],
			additions: [],
			unresolvedRowIds: [],
			reason: "Pārbaude",
		};
		expect(
			schema.safeParse({ ...empty, unresolvedRowIds: ["row-1"] }).success,
		).toBe(false);
		expect(
			schema.safeParse({ ...empty, unresolvedRowIds: ["row-2"] }).success,
		).toBe(true);
		expect(
			schema.safeParse({
				...empty,
				changes: [
					{
						rowId: "row-2",
						field: "Amounts",
						value: 999,
						sourceSpans: [source],
						calculationEvidence: null,
					},
				],
			}).success,
		).toBe(false);
		expect(
			schema.safeParse({
				...empty,
				changes: [
					{
						rowId: "row-2",
						field: "Works",
						value: "foreign-project",
						sourceSpans: [source],
						calculationEvidence: null,
					},
				],
			}).success,
		).toBe(false);
		expect(() => zodResponseFormat(schema, "scoped_repair")).not.toThrow();
	});
});
