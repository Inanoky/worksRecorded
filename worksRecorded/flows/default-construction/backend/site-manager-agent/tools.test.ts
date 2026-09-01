jest.mock("@langchain/core/runnables", () => ({
	patchConfig: jest.fn((config) => config),
	RunnableLambda: {
		from: jest.fn((fn) => ({
			invoke: jest.fn((input, config) => fn(input, config)),
		})),
	},
}));

jest.mock("@langchain/langgraph/prebuilt", () => ({
	ToolNode: jest.fn().mockImplementation((tools) => ({ tools })),
}));

jest.mock("@langchain/openai", () => ({
	ChatOpenAI: jest.fn().mockImplementation(() => ({
		withStructuredOutput: jest.fn(),
	})),
}));

jest.mock("langchain/tools", () => ({
	DynamicStructuredTool: jest.fn().mockImplementation((config) => config),
}));

jest.mock("@/server/actions/site-diary-actions", () => ({
	archiveAndReplaceSiteDiaryBatch: jest.fn(),
	getConfig: jest.fn(),
	getSiteDiaryCorrectionTarget: jest.fn(),
	saveSiteDiaryRecord: jest.fn(),
	startSiteDiaryCorrection: jest.fn(),
}));

jest.mock("@/server/ai-flows/agents/bis-support-agent/tools", () => ({
	getBisConnectionStatus: jest.fn(),
	readBisMaterialRecords: jest.fn(),
	readSiteDiaryBisStatuses: jest.fn(),
}));

jest.mock(
	"@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolContext",
	() => ({
		getSiteManagerToolContext: jest.fn(),
		setSiteManagerSavedConfirmationRecords: jest.fn(),
	}),
);

jest.mock(
	"@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolResult",
	() => ({
		formatSiteDiarySaveToolResult: jest.fn(),
	}),
);

jest.mock(
	"@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext",
	() => ({
		getWhatsappSourceContext: jest.fn(() => ({})),
	}),
);

jest.mock("@/server/ai-flows/ai-run-context", () => ({
	buildAiRunContext: jest.fn(() => ({
		runnableConfig: { metadata: {}, tags: [] },
	})),
	summarizeForTrace: jest.fn((value) => String(value ?? "")),
}));

jest.mock("./AIschemas", () => ({
	buildZodSchemaFromConfig: jest.fn(),
	mapToDbFields: jest.fn(),
}));

jest.mock("./prompts", () => ({
	systemPromptSaveToDatabaseFunction: jest.fn(),
}));

jest.mock("./runContext", () => ({
	buildSiteManagerWorkflowTraceContext: jest.fn(() => ({
		metadata: {},
		tags: [],
		workflowRunLabel: null,
	})),
	fastPathTraceConfig: jest.fn(() => ({ metadata: {}, tags: [] })),
	formatSiteManagerWorkflowRunName: jest.fn(() => "run-name"),
	getSiteManagerAgentRunContext: jest.fn(),
	getSiteManagerSenderTraceMetadata: jest.fn(() => ({})),
	getSiteManagerSenderTraceTags: jest.fn(() => []),
	recordSiteManagerModelCall: jest.fn(),
	recordSiteManagerTiming: jest.fn(),
	recordSiteManagerToolCall: jest.fn(),
}));

jest.mock("./siteDiaryExtractionChecker", () => ({
	invokeSiteDiaryExtractionChecker: jest.fn(),
	siteDiaryExtractionCheckerModel: "test-checker-model",
}));

jest.mock("./siteDiaryExtractionContext", () => ({
	buildSiteDiaryExtractionContext: jest.fn(),
}));

jest.mock("./structuredSaveTrace", () => ({
	recordStructuredSaveTrace: jest.fn(),
}));

import { normalizeUnknownNumericFields } from "./tools";

describe("normalizeUnknownNumericFields", () => {
	it("preserves implicit completed-object counts as pieces", () => {
		expect(
			normalizeUnknownNumericFields(
				{
					Works: "Sienu izbūve",
					Comments: "Samontētas 10 sienas.",
					Amounts: 10,
					Units: "pcs",
				},
				"Šodien samontējam 10 sienas",
			),
		).toMatchObject({ Amounts: 10, Units: "pcs" });
	});

	it.each([
		["Darbi veikti 2. stāvā.", 2],
		["Reģipsis montēts 2 kārtās.", 2],
		["Darbus veica 3 cilvēki.", 3],
		["Sienu vidējais biezums ir 75 mm.", 75],
	])(
		"does not treat contextual numbers as implicit pieces",
		(source, amount) => {
			expect(
				normalizeUnknownNumericFields(
					{
						Works: "Sienu izbūve",
						Comments: source,
						Amounts: amount,
						Units: "pcs",
					},
					source,
				),
			).toMatchObject({ Amounts: null, Units: null });
		},
	);

	it("normalizes negative unknown hours to null", () => {
		expect(
			normalizeUnknownNumericFields(
				{ Works: "Sienu izbūve", TimeInvolved: -1 },
				"Šodien samontējam 10 sienas",
			),
		).toMatchObject({ TimeInvolved: null });
	});

	it("preserves m2 amounts backed by Latvian kvadrātmetru evidence", () => {
		const source =
			"Šodien trīs cilvēki pa desmit stundām aizbetonēja 100 kvadrātmetru, 100 milimetru biezuma grīdas, un arī divi cilvēki sastiegroja 150 kvadrātmetru stiegrojumu, un arī bija papildu darbi trīs stundas divi cilvēki, viņi tur piebetonēja, pasūtītājam vēl tur nelielu siju.";

		expect(
			normalizeUnknownNumericFields(
				{
					Works: "Betonēšana",
					Comments: "Aizbetonētas 100 kvadrātmetru grīdas.",
					Amounts: 100,
					Units: "m2",
				},
				source,
			),
		).toMatchObject({ Amounts: 100, Units: "m2" });

		expect(
			normalizeUnknownNumericFields(
				{
					Works: "Stiegrošana",
					Comments: "Sastiegrots 150 kvadrātmetru stiegrojums.",
					Amounts: 150,
					Units: "m2",
				},
				source,
			),
		).toMatchObject({ Amounts: 150, Units: "m2" });

		expect(
			normalizeUnknownNumericFields(
				{
					Works: "Papildu darbi",
					Comments: "Piebetonēja pasūtītājam nelielu siju.",
					Amounts: null,
					Units: null,
				},
				source,
			),
		).toMatchObject({ Amounts: null, Units: null });

		expect(
			normalizeUnknownNumericFields(
				{
					Works: "Betonēšana",
					Comments: "Aizbetonētas grīdas.",
					Amounts: 101,
					Units: "m2",
				},
				source,
			),
		).toMatchObject({ Amounts: null, Units: null });
	});
});
