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
	siteDiaryExtractionCheckerSchema,
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
			rows: [
				{
					Works: "Apmetums",
					Location: "2. stāvs",
					Comments: "Apmestas sienas.",
					TimeInvolved: 4,
				},
			],
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
			originalMessage:
				"Durvis 2h. Sienas 3h. Ievestas smiltis 20 m3. Laiks saulains.",
			language: "lv",
			rows: [
				{ Works: "Durvis", TimeInvolved: 2 },
				{ Works: "Sienas", TimeInvolved: 3 },
				{ Works: "Materiālu piegāde", Amounts: 20, Units: "m3" },
				{ Works: "Piezīmes", Comments: "Laiks saulains." },
			],
		});

		expect(result.parsed).toEqual(
			expect.objectContaining({
				verdict: "accept",
				expectedRecordCount: 4,
			}),
		);
	});

	it("rejects one machinery/operator job split into multiple rows", async () => {
		mockInvoke.mockResolvedValue({
			parsed: {
				verdict: "retry",
				reason: "Viena frēzēšanas darbība sadalīta tehnikā un operatorā.",
				badSplitSignals: ["machinery/operator split", "sub-action rows"],
				repairInstructions:
					"Apvieno frēzēšanu, tehniku un operatoru vienā darbu ierakstā.",
				expectedRecordCount: 1,
			},
			raw: {},
		});

		const result = await invokeSiteDiaryExtractionChecker({
			originalMessage:
				"Asfalta frēzēšana ar frēzi un operatoru, darbs pabeigts.",
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
				repairInstructions:
					"Saglabā kā vienu kopsavilkuma ierakstu ar kopējām 12 stundām.",
				expectedRecordCount: 1,
			},
			raw: {},
		});

		const result = await invokeSiteDiaryExtractionChecker({
			originalMessage:
				"Ūdens trubas plus kanalizācija, ūdens radiatori, divpadsmit stundas.",
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
			originalMessage:
				"Šodien 1. stāvā uzstādītas durvis, 2h un 2. stāvā nokrāsotas sienas, 3h.",
			language: "lv",
			rows: [
				{ Works: "Durvis", Location: "1. stāvs", TimeInvolved: 2 },
				{ Works: "Sienu krāsošana", Location: "2. stāvs", TimeInvolved: 3 },
			],
		});

		expect(result.parsed.verdict).toBe("accept");
		expect(result.parsed.expectedRecordCount).toBe(2);
	});

	it("rejects merged material delivery and placed work with separate quantities", async () => {
		mockInvoke.mockResolvedValue({
			parsed: {
				verdict: "retry",
				reason: "Piegāde un iestrāde ir atsevišķi avota notikumi.",
				badSplitSignals: ["merged delivery and placed work"],
				repairInstructions:
					"Sadali divos ierakstos: Materiālu piegāde ar 160 m3 un Backfilling ar iestrādātiem 140 m3; darbiniekus un stundas liec tikai Backfilling rindā.",
				expectedRecordCount: 2,
			},
			raw: {},
		});

		const result = await invokeSiteDiaryExtractionChecker({
			originalMessage:
				"Šodien ievesta smilts 160m3, iestrādāti 140m3. Strādāja pa 10h ekskavators ar operātoru, 2 būvstrādnieki, brigadieris un būvdarbu vad. Palīgs",
			language: "lv",
			rows: [
				{
					Works: "Backfilling",
					Location: "Project",
					Comments:
						"Objektā ievesta smilts 160 m3 un iestrādāti 140 m3; 10 h strādāja ekskavatora operators, 2 būvstrādnieki, brigadieris un būvdarbu vadītāja palīgs.",
					Amounts: 140,
					Units: "m3",
					WorkersInvolved: 5,
					TimeInvolved: 10,
				},
			],
		});

		expect(result.parsed.verdict).toBe("retry");
		expect(result.parsed.expectedRecordCount).toBe(2);
		expect(result.parsed.repairInstructions).toContain("160 m3");
		expect(result.parsed.repairInstructions).toContain("140 m3");
	});

	it("returns structured repair actions for copied delivery labor", async () => {
		mockInvoke.mockResolvedValue({
			parsed: {
				verdict: "repairable",
				reason: "Piegādes rindai nepamatoti pievienotas darbu stundas.",
				badSplitSignals: ["unsupported delivery labor"],
				repairInstructions:
					"Saglabā 2 rindas, bet no Materiālu piegādes rindas noņem WorkersInvolved un TimeInvolved; 5 darbiniekus un 10 stundas atstāj tikai Backfilling rindā.",
				expectedRecordCount: 2,
				repairActions: [
					{
						rowIndex: 0,
						field: "WorkersInvolved",
						operation: "set_null",
						reason: "Delivery labor is not source-backed.",
					},
					{
						rowIndex: 0,
						field: "TimeInvolved",
						operation: "set_null",
						reason: "Delivery hours are not source-backed.",
					},
				],
			},
			raw: {},
		});

		const result = await invokeSiteDiaryExtractionChecker({
			originalMessage:
				"Šodien ievesta smilts 160m3, iestrādāti 140m3. Strādāja pa 10h ekskavators ar operātoru, 2 būvstrādnieki, brigadieris un būvdarbu vad. Palīgs",
			language: "lv",
			rows: [
				{
					Works: "Material delivery",
					Location: "Project",
					Comments: "Ievesta smilts 160 m3.",
					Amounts: 160,
					Units: "m3",
					WorkersInvolved: 5,
					TimeInvolved: 10,
				},
				{
					Works: "Backfilling",
					Location: "Project",
					Comments: "Iestrādāti 140 m3 smilts.",
					Amounts: 140,
					Units: "m3",
					WorkersInvolved: 5,
					TimeInvolved: 10,
				},
			],
		});

		expect(result.parsed.verdict).toBe("repairable");
		expect(result.parsed.expectedRecordCount).toBe(2);
		expect(result.parsed.repairActions).toEqual([
			expect.objectContaining({
				rowIndex: 0,
				field: "WorkersInvolved",
				operation: "set_null",
			}),
			expect.objectContaining({
				rowIndex: 0,
				field: "TimeInvolved",
				operation: "set_null",
			}),
		]);
		expect(result.parsed.repairInstructions).toContain("Materiālu piegādes");
		expect(result.parsed.repairInstructions).toContain("Backfilling");
	});

	it("parses structured checker field repairs", () => {
		expect(
			siteDiaryExtractionCheckerSchema.parse({
				verdict: "repairable",
				reason: "Unsupported copied hours.",
				badSplitSignals: [],
				repairInstructions: "Set unsupported hours to null.",
				expectedRecordCount: 1,
				repairActions: [
					{
						rowIndex: 0,
						field: "TimeInvolved",
						operation: "set_null",
						reason: "No source-backed time evidence.",
					},
				],
			}),
		).toEqual(
			expect.objectContaining({
				verdict: "repairable",
				repairActions: [expect.objectContaining({ field: "TimeInvolved" })],
			}),
		);
	});

	it("accepts split delivery and placed work when labor stays on the work row", async () => {
		mockInvoke.mockResolvedValue({
			parsed: {
				verdict: "accept",
				reason: "Piegāde un iestrāde sadalītas ar korektiem laukiem.",
				badSplitSignals: [],
				repairInstructions: "",
				expectedRecordCount: 2,
			},
			raw: {},
		});

		const result = await invokeSiteDiaryExtractionChecker({
			originalMessage:
				"Šodien ievesta smilts 160m3, iestrādāti 140m3. Strādāja pa 10h ekskavators ar operātoru, 2 būvstrādnieki, brigadieris un būvdarbu vad. Palīgs",
			language: "lv",
			rows: [
				{
					Works: "Material delivery",
					Amounts: 160,
					Units: "m3",
				},
				{
					Works: "Backfilling",
					Amounts: 140,
					Units: "m3",
					WorkersInvolved: 5,
					TimeInvolved: 10,
				},
			],
		});

		expect(result.parsed.verdict).toBe("accept");
		expect(result.parsed.expectedRecordCount).toBe(2);
	});

	it("accepts explicit same-work follow-up rows supported by trusted context", async () => {
		mockInvoke.mockResolvedValue({
			parsed: {
				verdict: "accept",
				reason:
					"Pašreizējā ziņa skaidri atsaucas uz iepriekšējo darbu un vietu, bet 3 h ir no pašreizējās ziņas.",
				badSplitSignals: [],
				repairInstructions: "",
				expectedRecordCount: 1,
				repairActions: [],
			},
			raw: {},
		});

		const result = await invokeSiteDiaryExtractionChecker({
			originalMessage: "Šodien tas pats darbs tajā pašā vietā, vēl 3h.",
			language: "lv",
			contextText:
				"CurrentMessageHasExplicitContextReference: true\nReference item 1: RelativeDate: yesterday; Location: 2. stāvs; Works: Fire stopping / sealing; TimeInvolved: 5",
			rows: [
				{
					Works: "Fire stopping / sealing",
					Location: "2. stāvs",
					Comments: "Tas pats darbs tajā pašā vietā.",
					TimeInvolved: 3,
					WorkersInvolved: null,
				},
			],
		});

		expect(result.parsed.verdict).toBe("accept");
		const [messages] = mockInvoke.mock.calls[0];
		expect(String(messages[0].content)).toContain(
			"Works and Location may be supported by those reference items",
		);
		expect(String(messages[1].content)).toContain(
			"CurrentMessageHasExplicitContextReference: true",
		);
		expect(String(messages[1].content)).toContain("Fire stopping / sealing");
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
			rows: [{ Works: "Frēzēšana" }, { Works: "Tehnika" }],
		});
		const system = String(messages[0].content);
		const human = String(messages[1].content);

		expect(system).toContain("real separate diary events/jobs");
		expect(system).toContain("trusted reference items");
		expect(system).toContain("vēl 3h");
		expect(system).toContain("machinery/tools/operators/sub-actions");
		expect(system).toContain(
			"multiple distinct source-backed diary events/jobs",
		);
		expect(system).toContain("merged them into one broad row");
		expect(system).toContain("one-row summaries");
		expect(system).toContain(
			"material delivery with actual installed/placed work",
		);
		expect(system).toContain("expectedRecordCount=2");
		expect(system).toContain(
			"unsupported delivery WorkersInvolved or TimeInvolved",
		);
		expect(system).toContain("return verdict=repairable");
		expect(system).toContain("repairActions are only for safe nulling");
		expect(system).toContain("split into specific separate jobs");
		expect(human).toContain("Original WhatsApp message");
		expect(human).toContain("Trusted extraction context");
		expect(human).toContain("Record 2");
	});
});
