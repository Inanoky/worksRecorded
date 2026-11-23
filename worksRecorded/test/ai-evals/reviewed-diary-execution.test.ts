import { automaticallyAssignForma2Sources } from "@/flows/default-construction/backend/forma2-auto-assignment";
import { getCurrentForma2WorkSelections } from "@/flows/default-construction/backend/forma2-data-read";
import { getSiteManagerAgentRunContext } from "@/flows/default-construction/backend/site-manager-agent/runContext";
import { extractAndSaveSiteDiary } from "@/flows/default-construction/backend/site-manager-agent/tools";
import { oceltScenarioCases } from "./ocelt-scenario-cases";
import { projectDiaryCorpora } from "./project-diary-corpora";
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

it("uses each project's own form, language and catalog without copying the reference answers into model input", async () => {
	jest
		.mocked(extractAndSaveSiteDiary)
		.mockResolvedValue({ ok: true, rows: [] } as never);
	for (const key of ["sbstomme-hus-k", "stoneandtree-waterfront"] as const) {
		const corpus = projectDiaryCorpora[key];
		const item = structuredClone(corpus.cases[0]);
		item.expectedRecords[0].reviewedComment =
			"GOLD_PROJECT_ANSWER_MUST_NOT_LEAK";
		await executeReviewedDiaryCase(item, {
			siteId: `eval:${key}`,
			userId: `eval-user:${key}`,
			runId: "project-context",
			project: corpus.project,
			matchForma2: false,
		});
		const call = jest.mocked(extractAndSaveSiteDiary).mock.calls.at(-1)?.[0];
		expect(call?.evaluationContext?.config).toEqual(corpus.project.config);
		expect(call?.evaluationContext?.language).toBe(corpus.project.language);
		expect(JSON.stringify(call)).not.toContain(
			"GOLD_PROJECT_ANSWER_MUST_NOT_LEAK",
		);
		expect(JSON.stringify(call)).not.toContain("Skataka DN1000");
		const state = jest
			.mocked(getCurrentForma2WorkSelections)
			.mock.calls.at(-1)?.[1];
		expect(state?.document?.positions.length ?? 0).toBe(
			corpus.project.positions.length,
		);
	}
	expect(automaticallyAssignForma2Sources).not.toHaveBeenCalled();
});
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

it("scores review state from application recovery metadata and skips the extra Forma2 model for scenario runs", async () => {
	jest.mocked(extractAndSaveSiteDiary).mockImplementation(async (args) => {
		args.evaluationContext?.onStep?.({
			phase: "partial_recovery",
			rowQuality: [
				{ status: "accepted" },
				{ status: "accepted" },
				{ status: "needs_review" },
			],
		});
		return {
			ok: true,
			rows: [
				{ Works: "Ūdensvads", Date: "2026-11-13" },
				{ Works: "PP skataka", Date: "2026-11-13" },
				{
					Works: "Piezīmes",
					Date: "2026-11-13",
					Comments: "Jāpārbauda. Avota fakti.",
				},
			],
		} as never;
	});
	const result = await executeReviewedDiaryCase(oceltScenarioCases[1], {
		siteId: "eval-site",
		userId: "eval-user",
		runId: "eval-scenario",
		matchForma2: false,
	});
	expect(result.rows.map((row) => row.needsReview)).toEqual([
		false,
		false,
		true,
	]);
	expect(result.extractionSucceeded).toBe(true);
	expect(automaticallyAssignForma2Sources).not.toHaveBeenCalled();
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
	if (!expected.forma2PositionId) throw new Error("Missing reference position");
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

it("keeps a fallback note visible as extraction failure without running Forma2 matching", async () => {
	jest.mocked(extractAndSaveSiteDiary).mockResolvedValue({
		ok: true,
		savedAsNote: true,
		rows: [
			{
				Works: "Piezīmes",
				Comments: reviewedDiaryCases[0].sourceText,
				Amounts: null,
				Units: null,
			},
		],
	} as never);
	const result = await executeReviewedDiaryCase(reviewedDiaryCases[0], {
		siteId: "eval-site",
		userId: "eval-user",
		runId: "eval-run",
	});
	expect(result).toMatchObject({
		extractionSucceeded: false,
		savedAsNote: true,
		rows: [
			{
				work: "Piezīmes",
				comment: reviewedDiaryCases[0].sourceText,
				amount: null,
				unit: null,
				forma2PositionId: null,
			},
		],
	});
	expect(automaticallyAssignForma2Sources).not.toHaveBeenCalled();
});
