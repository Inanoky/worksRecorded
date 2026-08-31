const structuredInvokeMock = jest.fn();
const withStructuredOutputMock = jest.fn(() => ({
	invoke: structuredInvokeMock,
}));
const saveSiteDiaryRecordMock = jest.fn();
const getConfigMock = jest.fn();
const systemPromptMock = jest.fn();
const recordTraceMock = jest.fn();
const getSiteDiaryToolContextMock = jest.fn();
const setSavedConfirmationRecordsMock = jest.fn();
const getBisConnectionStatusMock = jest.fn();
const readBisMaterialRecordsMock = jest.fn();
const readSiteDiaryBisStatusesMock = jest.fn();
const archiveAndReplaceSiteDiaryBatchMock = jest.fn();
const getSiteDiaryCorrectionTargetMock = jest.fn();
const startSiteDiaryCorrectionMock = jest.fn();
const buildSiteDiaryExtractionContextMock = jest.fn();
const mockBuildAiRunContext = jest.fn((args) => {
	const runName = args.runName ?? "SiteDiaryStructuredSave";
	const tags = [
		...(args.parentConfig?.tags ?? []),
		"works-recorded",
		`flow:${args.flow}`,
		...(args.tags ?? []),
	];
	const metadata = {
		...(args.parentConfig?.metadata ?? {}),
		...(args.metadata ?? {}),
	};

	return {
		runName,
		threadId: args.threadId,
		tags,
		metadata,
		runnableConfig: {
			...(args.parentConfig ?? {}),
			configurable: { thread_id: "test-thread" },
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

jest.mock("@/server/actions/site-diary-actions", () => ({
	getConfig: getConfigMock,
	saveSiteDiaryRecord: saveSiteDiaryRecordMock,
	archiveAndReplaceSiteDiaryBatch: archiveAndReplaceSiteDiaryBatchMock,
	getSiteDiaryCorrectionTarget: getSiteDiaryCorrectionTargetMock,
	startSiteDiaryCorrection: startSiteDiaryCorrectionMock,
}));

jest.mock(
	"@/flows/default-construction/backend/site-manager-agent/prompts",
	() => ({
		systemPromptSaveToDatabaseFunction: systemPromptMock,
	}),
);

jest.mock(
	"@/flows/default-construction/backend/site-manager-agent/structuredSaveTrace",
	() => ({
		recordStructuredSaveTrace: recordTraceMock,
	}),
);

jest.mock(
	"@/flows/default-construction/backend/site-manager-agent/runContext",
	() => ({
		fastPathTraceConfig: jest.fn((metadata) => ({
			metadata,
			tags: [`execution-path:${metadata.executionPath}`],
		})),
		buildSiteManagerWorkflowTraceContext: jest.fn(() => ({
			workflowId: "whatsapp-site-manager:text",
			workflowName: "WhatsApp site-manager text",
			workflowRunLabel: "WhatsApp Text",
			messageType: "text",
			mediaPurpose: "unknown",
			metadata: {
				workflowId: "whatsapp-site-manager:text",
				workflowName: "WhatsApp site-manager text",
				messageType: "text",
				mediaPurpose: "unknown",
			},
			tags: ["workflow:whatsapp-site-manager:text", "message-type:text"],
		})),
		formatSiteManagerWorkflowRunName: jest.fn(
			({ prefix, workflowRunLabel, senderLabel, fallback }) => {
				const base = [prefix, workflowRunLabel].filter(Boolean).join(" - ");
				const label = base || fallback;
				return senderLabel ? `${label} - ${senderLabel}` : label;
			},
		),
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
			senderFirstName: "Anna",
			senderLastName: "Bērziņa",
			senderName: "Anna Bērziņa",
			senderInitials: "AB",
			senderLabel: "Anna Bērziņa",
		})),
		recordSiteManagerModelCall: jest.fn(),
		recordSiteManagerTiming: jest.fn(),
		recordSiteManagerToolCall: jest.fn(),
		getSiteManagerSenderTraceMetadata: jest.fn(() => ({
			senderFirstName: "Anna",
			senderLastName: "Bērziņa",
			senderName: "Anna Bērziņa",
			senderInitials: "AB",
			senderLabel: "Anna Bērziņa",
		})),
		getSiteManagerSenderTraceTags: jest.fn(() => ["sender:Anna Bērziņa"]),
	}),
);

jest.mock(
	"@/flows/default-construction/backend/site-manager-agent/siteDiaryExtractionContext",
	() => ({
		buildSiteDiaryExtractionContext: buildSiteDiaryExtractionContextMock,
	}),
);

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
	buildAiRunContext: mockBuildAiRunContext,
	summarizeForTrace: jest.fn((value) => value),
}));

jest.mock(
	"@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext",
	() => ({
		getWhatsappSourceContext: jest.fn(() => ({
			originalAudioUrl: null,
			messageId: "wamid.test-correction",
		})),
	}),
);

import {
	bisConnectionStatusTool,
	bisMaterialRecordsTool,
	extractAndSaveSiteDiary,
	replaceLastSiteDiaryBatchOperation,
	siteDiaryBisStatusesTool,
	siteDiaryToDatabaseTool,
} from "@/flows/default-construction/backend/site-manager-agent/tools";

const toolInput = {
	question: "poured 12.5 m3 concrete",
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
	Units: {
		Type: "dropdown",
		DisplayName: "Mrv",
		DropDownOptions: {
			m3: "m3",
			hour: "hour",
		},
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

describe("save_to_database site diary tool", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		getConfigMock.mockResolvedValue(siteConfig);
		systemPromptMock.mockResolvedValue("Extract site diary records");
		getSiteDiaryToolContextMock.mockReturnValue(trustedContext);
		buildSiteDiaryExtractionContextMock.mockResolvedValue({
			text: "Trusted site diary extraction context for site-1",
			metadata: {
				recentRecordCount: 0,
				schemaOptionCount: 0,
				truncated: false,
			},
		});
	});

	it("exposes only extraction fields and keeps date optional", () => {
		expect(siteDiaryToDatabaseTool.name).toBe("save_to_database");

		const schema = siteDiaryToDatabaseTool.schema as any;
		expect(Object.keys(schema.shape)).toEqual(["question", "date"]);
		expect(schema.shape.date.description).toContain(
			"Omit it when no date was specified",
		);
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
				{
					Area: "Building A",
					Activity: "Concrete pour",
					Quantity: 12.5,
					Mrv: "m3",
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
			records: [
				{
					id: "record-1",
					Date: new Date("2026-06-08T00:00:00.000Z"),
					Location: "Building A",
					Works: "Concrete pour",
					Comments: "Concrete poured",
					Amounts: 12.5,
					Units: "m3",
					WorkersInvolved: 2,
					TimeInvolved: 4,
				},
			],
			normalizedInsertRows: [{ Location: "Building A" }],
		});

		const result = await siteDiaryToDatabaseTool.invoke(toolInput);

		const [messages, runnableConfig] = structuredInvokeMock.mock.calls[0];
		expect(messages[0].content).toContain("today is : 08-06-2026");
		expect(messages[0].content).toContain(trustedContext.siteId);
		expect(messages[2].content).toContain(toolInput.question);
		expect(messages[2].content).toContain(toolInput.date);
		expect(messages[2].content).not.toContain(
			trustedContext.originalUserComment,
		);
		expect(runnableConfig).toEqual(
			expect.objectContaining({
				configurable: { thread_id: "test-thread" },
				runName: "Structured Save - WhatsApp Text - Anna Bērziņa",
				tags: expect.arrayContaining([
					"sender:Anna Bērziņa",
					"workflow:whatsapp-site-manager:text",
					"site-diary-test",
				]),
				metadata: expect.objectContaining({
					fastPathOutcome: "save",
					workflowId: "whatsapp-site-manager:text",
					workflowName: "WhatsApp site-manager text",
					messageType: "text",
					mediaPurpose: "unknown",
					senderFirstName: "Anna",
					senderLastName: "Bērziņa",
					senderName: "Anna Bērziņa",
					senderInitials: "AB",
					senderLabel: "Anna Bērziņa",
				}),
			}),
		);
		expect(mockBuildAiRunContext).toHaveBeenCalledWith(
			expect.objectContaining({
				runName: "Structured Save - WhatsApp Text - Anna Bērziņa",
				metadata: expect.objectContaining({
					workflowId: "whatsapp-site-manager:text",
					senderFirstName: "Anna",
					senderLastName: "Bērziņa",
					senderName: "Anna Bērziņa",
					senderInitials: "AB",
					senderLabel: "Anna Bērziņa",
				}),
				tags: expect.arrayContaining(["sender:Anna Bērziņa"]),
			}),
		);
		expect(saveSiteDiaryRecordMock).toHaveBeenCalledWith({
			rows: [
				{
					Location: "Building A",
					Works: "Concrete pour",
					Amounts: 12.5,
					Units: "m3",
				},
			],
			userId: "user-1",
			siteId: "site-1",
			originalUserComment: "Manager Name : poured concrete",
			evalMetadata: { evaluationId: "eval-1" },
		});
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				rawRecords: [
					{
						Area: "Building A",
						Activity: "Concrete pour",
						Quantity: 12.5,
						Mrv: "m3",
					},
				],
				mappedRows: [
					{
						Location: "Building A",
						Works: "Concrete pour",
						Amounts: 12.5,
						Units: "m3",
					},
				],
			}),
		);
		expect(result).toBe(
			"Saved 1 site diary record(s) successfully. Record IDs: record-1.",
		);
		expect(setSavedConfirmationRecordsMock).toHaveBeenLastCalledWith([
			{
				Date: new Date("2026-06-08T00:00:00.000Z"),
				Location: "Building A",
				Works: "Concrete pour",
				Comments: "Concrete poured",
				Units: "m3",
				Amounts: 12.5,
				WorkersInvolved: 2,
				TimeInvolved: 4,
			},
		]);
	});

	it.each([
		["No records to insert", "No records to insert"],
		["Database unavailable", "Database unavailable"],
	])(
		"returns a clear failure when persistence reports %s",
		async (message, expected) => {
			structuredInvokeMock.mockResolvedValue({
				records: [{ Area: null, Activity: null, Quantity: null }],
			});
			saveSiteDiaryRecordMock.mockResolvedValue({ ok: false, message });

			const result = await siteDiaryToDatabaseTool.invoke(toolInput);

			expect(result).toBe(
				`Failed to save site diary entry. Reason: ${expected}`,
			);
			expect(result).not.toContain("successfully");
		},
	);

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

	it("runs the checker before saving a one-row extraction", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Area: "2. stāvs",
						Activity: "Concrete pour",
						Quantity: null,
						Hours: 4,
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "accept",
					reason: "One supported job.",
					badSplitSignals: [],
					repairInstructions: "",
					expectedRecordCount: 1,
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
		});

		await extractAndSaveSiteDiary({
			question: "Šodien betonēšana 2. stāvā, 4h.",
			requestedDate: "18-08-2026",
		});

		expect(structuredInvokeMock).toHaveBeenCalledTimes(2);
		const [, extractionConfig] = structuredInvokeMock.mock.calls[0];
		const [checkerMessages] = structuredInvokeMock.mock.calls[1];
		expect(checkerMessages[0].content).toContain(
			"strict construction site diary extraction checker",
		);
		expect(checkerMessages[1].content).toContain("Trusted extraction context");
		expect(checkerMessages[1].content).toContain(
			"Trusted site diary extraction context for site-1",
		);
		expect(checkerMessages[1].content).toContain("Record 1");
		expect(saveSiteDiaryRecordMock).toHaveBeenCalledWith(
			expect.objectContaining({
				rows: [
					expect.objectContaining({
						Location: "2. stāvs",
						Works: "Concrete pour",
						TimeInvolved: 4,
					}),
				],
			}),
		);
		expect(extractionConfig).toEqual(
			expect.objectContaining({
				tags: expect.arrayContaining(["site-diary-checker:accept"]),
				metadata: expect.objectContaining({
					siteDiaryCheckerRan: true,
					siteDiaryCheckerVerdict: "accept",
					siteDiaryCheckerAppliedRepair: false,
					siteDiaryCheckerSucceeded: true,
					siteDiaryCheckerPersistedAfterRepair: false,
				}),
			}),
		);
	});

	it("repairs a one-row under-split extraction before saving", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Area: "1. un 2. stāvs",
						Activity: "Concrete pour",
						Comments:
							"1. stāvā uzstādītas durvis 2h un 2. stāvā nokrāsotas sienas 3h.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "retry",
					reason: "Two distinct source-backed jobs were merged into one row.",
					badSplitSignals: ["under-split"],
					repairInstructions:
						"Split into two rows: one for 1. stāva durvju uzstādīšana with 2h, and one for 2. stāva sienu krāsošana with 3h.",
					expectedRecordCount: 2,
				},
				raw: {},
			})
			.mockResolvedValueOnce({
				records: [
					{
						Area: "1. stāvs",
						Activity: "Door installation",
						Hours: 2,
					},
					{
						Area: "2. stāvs",
						Activity: "Wall painting",
						Hours: 3,
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "accept",
					reason: "Repair split the two supported jobs.",
					badSplitSignals: [],
					repairInstructions: "",
					expectedRecordCount: 2,
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 2,
			recordIds: ["record-1", "record-2"],
		});

		await extractAndSaveSiteDiary({
			question:
				"Šodien 1. stāvā uzstādītas durvis, 2h un 2. stāvā nokrāsotas sienas, 3h.",
			requestedDate: "18-08-2026",
		});

		const [, extractionConfig] = structuredInvokeMock.mock.calls[0];
		const [repairMessages] = structuredInvokeMock.mock.calls[2];
		expect(repairMessages[0].content).toContain("Checker repair is mandatory");
		expect(repairMessages[0].content).toContain("Split into two rows");
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Location: "1. stāvs",
				Works: "Door installation",
				TimeInvolved: 2,
			}),
			expect.objectContaining({
				Location: "2. stāvs",
				Works: "Wall painting",
				TimeInvolved: 3,
			}),
		]);
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				checker: expect.objectContaining({
					verdict: "retry",
					expectedRecordCount: 2,
					appliedRepair: true,
					repairVerdict: "accept",
				}),
			}),
		);
		expect(extractionConfig).toEqual(
			expect.objectContaining({
				tags: expect.arrayContaining([
					"site-diary-checker:retry",
					"site-diary-checker:repair-applied",
					"site-diary-checker:repair-accepted",
				]),
				metadata: expect.objectContaining({
					siteDiaryCheckerRan: true,
					siteDiaryCheckerVerdict: "retry",
					siteDiaryCheckerAppliedRepair: true,
					siteDiaryCheckerRepairVerdict: "accept",
					siteDiaryCheckerSucceeded: true,
					siteDiaryCheckerPersistedAfterRepair: true,
				}),
			}),
		);
	});

	it("repairs merged material delivery and backfill rows before saving", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Activity: "Backfilling",
						Area: "Project",
						Quantity: 140,
						Mrv: "m3",
						Hours: 10,
						Workers: 5,
						Comments:
							"Objektā ievesta smilts 160 m3 un iestrādāti 140 m3; 10 h strādāja ekskavatora operators, 2 būvstrādnieki, brigadieris un būvdarbu vadītāja palīgs.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "retry",
					reason:
						"Material delivery and backfilling have separate source-backed quantities.",
					badSplitSignals: ["merged delivery and placed work"],
					repairInstructions:
						"Split into two rows: Material delivery for ievesta smilts 160 m3 with no workers/hours, and Backfilling for iestrādāti 140 m3 with 5 workers and 10 hours.",
					expectedRecordCount: 2,
				},
				raw: {},
			})
			.mockResolvedValueOnce({
				records: [
					{
						Activity: "Material delivery",
						Area: "Project",
						Quantity: 160,
						Mrv: "m3",
						Hours: null,
						Workers: null,
						Comments: "Ievesta smilts 160 m3.",
					},
					{
						Activity: "Backfilling",
						Area: "Project",
						Quantity: 140,
						Mrv: "m3",
						Hours: 10,
						Workers: 5,
						Comments:
							"Iestrādāti 140 m3 smilts. Strādāja 10h ekskavatora operators, 2 būvstrādnieki, brigadieris un būvdarbu vadītāja palīgs.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "accept",
					reason: "Delivery and backfill are split with supported quantities.",
					badSplitSignals: [],
					repairInstructions: "",
					expectedRecordCount: 2,
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 2,
			recordIds: ["record-delivery", "record-backfill"],
		});

		await extractAndSaveSiteDiary({
			question:
				"Šodien ievesta smilts 160m3, iestrādāti 140m3. Strādāja pa 10h ekskavators ar operātoru, 2 būvstrādnieki, brigadieris un būvdarbu vad. Palīgs",
			requestedDate: "25-08-2026",
		});

		const [repairMessages] = structuredInvokeMock.mock.calls[2];
		expect(repairMessages[0].content).toContain("Checker repair is mandatory");
		expect(repairMessages[0].content).toContain("Material delivery");
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Works: "Material delivery",
				Amounts: 160,
				Units: "m3",
				WorkersInvolved: null,
				TimeInvolved: null,
			}),
			expect.objectContaining({
				Works: "Backfilling",
				Amounts: 140,
				Units: "m3",
				WorkersInvolved: 5,
				TimeInvolved: 10,
			}),
		]);
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				checker: expect.objectContaining({
					verdict: "retry",
					expectedRecordCount: 2,
					appliedRepair: true,
					repairVerdict: "accept",
				}),
			}),
		);
	});

	it("applies simple checker field repair before saving", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Activity: "Material delivery",
						Quantity: 180,
						Mrv: "m3",
						Hours: 10,
						Workers: 5,
					},
					{
						Activity: "Sand installation",
						Quantity: 120,
						Mrv: "m3",
						Hours: 10,
						Workers: 5,
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "retry",
					reason: "Delivery row has unsupported copied work labor.",
					badSplitSignals: ["unsupported delivery labor"],
					repairInstructions:
						"Keep 2 rows, but remove WorkersInvolved and TimeInvolved=10 from the delivery row.",
					expectedRecordCount: 2,
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 2,
			recordIds: ["record-1", "record-2"],
		});

		await extractAndSaveSiteDiary({
			question:
				"Šodien ievesta smilts 180m3, iestrādāti 120m3. Strādāja pa 10h ekskavators ar operātoru, 2 būvstrādnieki, brigadieris un būvdarbu vad. Palīgs.",
			requestedDate: "18-08-2026",
		});

		expect(structuredInvokeMock).toHaveBeenCalledTimes(2);
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Works: "Material delivery",
				Amounts: 180,
				Units: "m3",
				WorkersInvolved: null,
				TimeInvolved: null,
			}),
			expect.objectContaining({
				Works: "Sand installation",
				Amounts: 120,
				Units: "m3",
				TimeInvolved: 10,
			}),
		]);
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				checker: expect.objectContaining({
					verdict: "retry",
					appliedRepair: true,
					repairVerdict: "accept",
					repairReason:
						"Applied deterministic checker field repair: cleared unsupported delivery workers/time.",
				}),
			}),
		);
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[1]).toEqual(
			expect.objectContaining({
				WorkersInvolved: 5,
				TimeInvolved: 10,
			}),
		);
	});

	it("applies structured checker field repairs without model repair", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Area: "Project",
						Activity: "Concrete pour",
						Quantity: 20,
						Mrv: "m3",
						Hours: 10,
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "repairable",
					reason: "Hours are not supported by the source.",
					badSplitSignals: [],
					repairInstructions: "Set TimeInvolved to null.",
					expectedRecordCount: 1,
					repairActions: [
						{
							rowIndex: 0,
							field: "TimeInvolved",
							operation: "set_null",
							reason: "No source-backed hours.",
						},
					],
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
		});

		await extractAndSaveSiteDiary({
			question: "Šodien betonēšana 20 m3.",
			requestedDate: "18-08-2026",
		});

		expect(structuredInvokeMock).toHaveBeenCalledTimes(2);
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Works: "Concrete pour",
				Amounts: 20,
				Units: "m3",
				TimeInvolved: null,
			}),
		]);
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				checker: expect.objectContaining({
					verdict: "repairable",
					repairActions: [expect.objectContaining({ field: "TimeInvolved" })],
					appliedRepair: true,
					repairVerdict: "accept",
					repairReason: "Applied 1 structured checker field repair action(s).",
				}),
			}),
		);
	});

	it("passes first extraction amounts and units into the checker", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Area: "Project",
						Activity: "Concrete pour",
						Quantity: 45,
						Mrv: "m2",
						Comments: "Ieklats OSB 22 mm.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "accept",
					reason: "Completed scope quantity is source-backed.",
					badSplitSignals: [],
					repairInstructions: "",
					expectedRecordCount: 1,
					repairActions: [],
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
		});

		await extractAndSaveSiteDiary({
			question: "OSB 22 mm, ieklāti 45 m2.",
			requestedDate: "18-08-2026",
		});

		const [checkerMessages] = structuredInvokeMock.mock.calls[1];
		const checkerHumanMessage = String(checkerMessages[1].content);
		expect(checkerHumanMessage).toContain("Original WhatsApp message");
		expect(checkerHumanMessage).toContain("OSB 22 mm, ieklāti 45 m2.");
		expect(checkerHumanMessage).toContain("Amounts: 45");
		expect(checkerHumanMessage).toContain("Units: m2");
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Amounts: 45,
				Units: "m2",
			}),
		]);
	});

	it("preserves source-backed amount and unit when checker asks to null them", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Area: "Project",
						Activity: "Concrete pour",
						Quantity: 45,
						Mrv: "m2",
						Comments: "Ieklats OSB 22 mm.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "repairable",
					reason: "Checker confused completed scope with material thickness.",
					badSplitSignals: [],
					repairInstructions: "Set Amounts and Units to null.",
					expectedRecordCount: 1,
					repairActions: [
						{
							rowIndex: 0,
							field: "Amounts",
							operation: "set_null",
							reason: "Incorrectly treated 45 m2 as unsupported.",
						},
						{
							rowIndex: 0,
							field: "Units",
							operation: "set_null",
							reason: "Incorrectly treated m2 as unsupported.",
						},
					],
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
		});

		await extractAndSaveSiteDiary({
			question: "OSB 22 mm, ieklāti 45 m2.",
			requestedDate: "18-08-2026",
		});

		expect(structuredInvokeMock).toHaveBeenCalledTimes(2);
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Amounts: 45,
				Units: "m2",
			}),
		]);
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				checker: expect.objectContaining({
					verdict: "repairable",
					repairActions: [
						expect.objectContaining({ field: "Amounts" }),
						expect.objectContaining({ field: "Units" }),
					],
					appliedRepair: true,
					repairVerdict: "accept",
					repairReason:
						"Applied 0 structured checker field repair action(s); preserved 2 exact source-backed amount/unit pair repair action(s).",
				}),
			}),
		);
	});

	it("nulls wrong amount unit pairs before checker and does not protect checker repair", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Area: "Project",
						Activity: "Concrete pour",
						Quantity: 45,
						Mrv: "m3",
						Hours: 4,
						Comments: "Ieklats OSB 22 mm.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "repairable",
					reason: "Wrong quantity unit and unsupported hours.",
					badSplitSignals: [],
					repairInstructions: "Set Amounts, Units, and TimeInvolved to null.",
					expectedRecordCount: 1,
					repairActions: [
						{
							rowIndex: 0,
							field: "Amounts",
							operation: "set_null",
							reason: "45 m3 is not source-backed.",
						},
						{
							rowIndex: 0,
							field: "Units",
							operation: "set_null",
							reason: "m3 is not source-backed for 45.",
						},
						{
							rowIndex: 0,
							field: "TimeInvolved",
							operation: "set_null",
							reason: "No source-backed hours.",
						},
					],
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
		});

		await extractAndSaveSiteDiary({
			question: "OSB 22 mm, ieklāti 45 m2.",
			requestedDate: "18-08-2026",
		});

		const [checkerMessages] = structuredInvokeMock.mock.calls[1];
		const checkerHumanMessage = String(checkerMessages[1].content);
		expect(checkerHumanMessage).not.toContain("Amounts: 45");
		expect(checkerHumanMessage).not.toContain("Units: m3");
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Amounts: null,
				Units: null,
				TimeInvolved: null,
			}),
		]);
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				checker: expect.objectContaining({
					verdict: "repairable",
					appliedRepair: true,
					repairVerdict: "accept",
					repairReason: "Applied 3 structured checker field repair action(s).",
				}),
			}),
		);
	});

	it("preserves cubic aliases when checker asks to null the m3 pair", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Area: "Project",
						Activity: "Material delivery",
						Quantity: 180,
						Mrv: "m3",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "repairable",
					reason: "Checker incorrectly rejected a cubic amount alias.",
					badSplitSignals: [],
					repairInstructions: "Set Amounts and Units to null.",
					expectedRecordCount: 1,
					repairActions: [
						{
							rowIndex: 0,
							field: "Amounts",
							operation: "set_null",
							reason: "Incorrectly treated kubi as unsupported.",
						},
						{
							rowIndex: 0,
							field: "Units",
							operation: "set_null",
							reason: "Incorrectly treated kubi as unsupported.",
						},
					],
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
		});

		await extractAndSaveSiteDiary({
			question: "Ievestas smilts 180 kubi.",
			requestedDate: "18-08-2026",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Amounts: 180,
				Units: "m3",
			}),
		]);
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				checker: expect.objectContaining({
					verdict: "repairable",
					appliedRepair: true,
					repairVerdict: "accept",
					repairReason:
						"Applied 0 structured checker field repair action(s); preserved 2 exact source-backed amount/unit pair repair action(s).",
				}),
			}),
		);
	});

	it("does not protect material dimensions as completed amounts", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Area: "Project",
						Activity: "Concrete pour",
						Quantity: 22,
						Mrv: "m2",
						Comments: "Izmantots OSB 22 mm.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "accept",
					reason: "Material dimension was removed from quantity fields.",
					badSplitSignals: [],
					repairInstructions: "",
					expectedRecordCount: 1,
					repairActions: [],
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
		});

		await extractAndSaveSiteDiary({
			question: "Izmantots OSB 22 mm.",
			requestedDate: "18-08-2026",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Amounts: null,
				Units: null,
			}),
		]);
	});

	it("does not save rows when checker-guided repair is still rejected", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Activity: "Material delivery",
						Quantity: 180,
						Mrv: "m3",
						Hours: 10,
					},
					{
						Activity: "Sand installation",
						Quantity: 120,
						Mrv: "m3",
						Hours: 10,
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "retry",
					reason: "Rows should be merged into one supported job.",
					badSplitSignals: ["structural repair required"],
					repairInstructions: "Merge into one supported row.",
					expectedRecordCount: 1,
				},
				raw: {},
			})
			.mockResolvedValueOnce({
				records: [
					{
						Activity: "Material delivery",
						Quantity: 180,
						Mrv: "m3",
						Hours: 10,
					},
					{
						Activity: "Sand installation",
						Quantity: 120,
						Mrv: "m3",
						Hours: 10,
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "retry",
					reason: "Repair still has unsupported rows.",
					badSplitSignals: ["structural repair required"],
					repairInstructions: "Merge into one supported row.",
					expectedRecordCount: 1,
				},
				raw: {},
			});

		const result = await extractAndSaveSiteDiary({
			question:
				"Šodien ievesta smilts 180m3, iestrādāti 120m3. Strādāja pa 10h ekskavators ar operātoru.",
			requestedDate: "18-08-2026",
		});

		expect(result.ok).toBe(false);
		expect(result.content).toContain(
			"Checker-guided repair was still rejected",
		);
		expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
		const [, extractionConfig] = structuredInvokeMock.mock.calls[0];
		expect(extractionConfig).toEqual(
			expect.objectContaining({
				tags: expect.arrayContaining([
					"site-diary-checker:retry",
					"site-diary-checker:repair-applied",
					"site-diary-checker:failed",
				]),
				metadata: expect.objectContaining({
					siteDiaryCheckerRan: true,
					siteDiaryCheckerVerdict: "retry",
					siteDiaryCheckerAppliedRepair: true,
					siteDiaryCheckerRepairVerdict: "retry",
					siteDiaryCheckerSucceeded: false,
					siteDiaryCheckerPersistedAfterRepair: false,
				}),
			}),
		);
	});

	it("saves model-repaired rows after a final structured field repair", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Activity: "Backfilling",
						Area: "Project",
						Quantity: 120,
						Mrv: "m3",
						Hours: 10,
						Comments: "Piegāde un iestrāde kopā.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "needs_model_repair",
					reason: "Delivery and work were merged.",
					badSplitSignals: ["merged delivery and work"],
					repairInstructions:
						"Split delivery and backfilling into two source-backed rows.",
					expectedRecordCount: 2,
					repairActions: [],
				},
				raw: {},
			})
			.mockResolvedValueOnce({
				records: [
					{
						Activity: "Material delivery",
						Area: "Project",
						Quantity: 180,
						Mrv: "m3",
						Hours: 10,
					},
					{
						Activity: "Backfilling",
						Area: "Project",
						Quantity: 120,
						Mrv: "m3",
						Hours: 10,
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "repairable",
					reason: "Delivery row has copied work hours.",
					badSplitSignals: [],
					repairInstructions: "Set delivery TimeInvolved to null.",
					expectedRecordCount: 2,
					repairActions: [
						{
							rowIndex: 0,
							field: "TimeInvolved",
							operation: "set_null",
							reason: "No delivery time evidence.",
						},
					],
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 2,
			recordIds: ["record-delivery", "record-work"],
		});

		const result = await extractAndSaveSiteDiary({
			question:
				"Šodien ievesta smilts 180m3, iestrādāti 120m3. Strādāja pa 10h ekskavators ar operātoru.",
			requestedDate: "18-08-2026",
		});

		expect(result.ok).toBe(true);
		expect(structuredInvokeMock).toHaveBeenCalledTimes(4);
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Works: "Material delivery",
				Amounts: 180,
				Units: "m3",
				TimeInvolved: null,
			}),
			expect.objectContaining({
				Works: "Backfilling",
				Amounts: 120,
				Units: "m3",
				TimeInvolved: 10,
			}),
		]);
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				checker: expect.objectContaining({
					verdict: "needs_model_repair",
					appliedRepair: true,
					repairVerdict: "accept",
					repairReason: "Applied 1 structured checker field repair action(s).",
				}),
			}),
		);
	});

	it("marks checker trace failure while preserving fallback save behavior", async () => {
		const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [{ Area: "2. stāvs", Activity: "Concrete pour", Hours: 4 }],
			})
			.mockRejectedValueOnce(new Error("checker unavailable"));
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
		});

		const result = await extractAndSaveSiteDiary({
			question: "Šodien betonēšana 2. stāvā, 4h.",
			requestedDate: "18-08-2026",
		});

		warnSpy.mockRestore();
		expect(result.ok).toBe(true);
		expect(saveSiteDiaryRecordMock).toHaveBeenCalledTimes(1);
		const [, extractionConfig] = structuredInvokeMock.mock.calls[0];
		expect(extractionConfig).toEqual(
			expect.objectContaining({
				tags: expect.arrayContaining(["site-diary-checker:failed"]),
				metadata: expect.objectContaining({
					siteDiaryCheckerRan: true,
					siteDiaryCheckerSucceeded: false,
				}),
			}),
		);
	});

	it("repairs one-machine in-progress sub-actions back into one row before saving", async () => {
		structuredInvokeMock
			.mockResolvedValueOnce({
				records: [
					{
						Area: "Project",
						Activity: "Excavation",
						Comments: "No plkst. 15.00 Agris ar ekskavatoru veic zemes noņemšanu.",
					},
					{
						Area: "Project",
						Activity: "Backfilling",
						Comments: "No plkst. 15.00 Agris ar ekskavatoru veic šķembošanu.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "needs_model_repair",
					reason:
						"Viena mašīna un viens cilvēks veic saistītas iesāktas apakšdarbības vienā teikumā.",
					badSplitSignals: ["one actor sub-action split", "start time only"],
					repairInstructions:
						"Saglabā vienu ierakstu ar abām darbībām komentārā; neizdomā stundas no sākuma laika.",
					expectedRecordCount: 1,
					repairActions: [],
				},
				raw: {},
			})
			.mockResolvedValueOnce({
				records: [
					{
						Area: "Project",
						Activity: "Excavation",
						Comments:
							"No plkst. 15.00 Agris ar ekskavatoru veic zemes noņemšanu un šķembošanu.",
					},
				],
			})
			.mockResolvedValueOnce({
				parsed: {
					verdict: "accept",
					reason: "Viens korekts iesākta darba ieraksts.",
					badSplitSignals: [],
					repairInstructions: "",
					expectedRecordCount: 1,
					repairActions: [],
				},
				raw: {},
			});
		saveSiteDiaryRecordMock.mockResolvedValue({
			ok: true,
			count: 1,
			recordIds: ["record-1"],
		});

		const result = await extractAndSaveSiteDiary({
			question:
				"No plkst. 15.00 Agris ar ekskavatoru veic zemes noņemšanu un šķembošanu.",
			requestedDate: "18-08-2026",
		});

		expect(result.ok).toBe(true);
		expect(structuredInvokeMock).toHaveBeenCalledTimes(4);
		expect(saveSiteDiaryRecordMock).toHaveBeenCalledTimes(1);
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Works: "Excavation",
			}),
		]);
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).not.toHaveProperty(
			"TimeInvolved",
		);
		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				checker: expect.objectContaining({
					verdict: "needs_model_repair",
					expectedRecordCount: 1,
					appliedRepair: true,
					repairVerdict: "accept",
				}),
			}),
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
		expect(messages[2].content).toContain("Date is : 02-07-2026");
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

	it("moves a model-misplaced hour amount to TimeInvolved", async () => {
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "Pamati",
					Activity: "Concrete pour",
					Quantity: 9.5,
					Mrv: "hour",
					Hours: null,
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

		await siteDiaryToDatabaseTool.invoke({
			question:
				"Veikta smilts piebēršana pamatiem ar Bobcat operatoru, 9,5 stundas.",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
			expect.objectContaining({
				Amounts: null,
				Units: null,
				TimeInvolved: 9.5,
			}),
		);
	});

	it("preserves decimal hours mapped to TimeInvolved", async () => {
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "Pamati",
					Activity: "Concrete pour",
					Quantity: null,
					Mrv: null,
					Hours: 9.5,
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

		await siteDiaryToDatabaseTool.invoke({
			question:
				"Veikta smilts piebēršana pamatiem ar Bobcat operatoru, 9,5 stundas.",
		});

		expect(saveSiteDiaryRecordMock).toHaveBeenCalledWith(
			expect.objectContaining({
				rows: [
					expect.objectContaining({
						Amounts: null,
						Units: null,
						TimeInvolved: 9.5,
					}),
				],
				evalMetadata: { evaluationId: "eval-1" },
			}),
		);
	});

	it("infers two workers from row-local operator and helper role evidence", async () => {
		getConfigMock.mockResolvedValue({
			...siteConfig,
			Comments: {
				Type: "textInput",
				DisplayName: "Comments",
			},
		});
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "Project",
					Activity: "Excavation",
					Quantity: 80,
					Mrv: "m3",
					Hours: 8,
					Workers: null,
					Comments:
						"Izrakti 80 m3 grunts ar ekskavatoru; strādāja ekskavatora operators un palīgstrādnieks.",
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

		await siteDiaryToDatabaseTool.invoke({
			question:
				"Grunts rakšana 80 kubi, grunts rakšana veica ekskavatoru operātors, strādāja arī palīgstrādnieks 8 stundas.",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
			expect.objectContaining({
				Works: "Excavation",
				Amounts: 80,
				Units: "m3",
				TimeInvolved: 8,
				WorkersInvolved: 2,
			}),
		);
	});

	it("does not infer a worker count from a lone machinery operator mention", async () => {
		getConfigMock.mockResolvedValue({
			...siteConfig,
			Comments: {
				Type: "textInput",
				DisplayName: "Comments",
			},
		});
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "Pamati",
					Activity: "Backfilling",
					Quantity: null,
					Mrv: null,
					Hours: 9.5,
					Workers: null,
					Comments:
						"Veikta smilts piebēršana pamatiem ar Bobcat operatoru.",
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

		await siteDiaryToDatabaseTool.invoke({
			question:
				"Veikta smilts piebēršana pamatiem ar Bobcat operatoru, 9,5 stundas.",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
			expect.objectContaining({
				Works: "Backfilling",
				TimeInvolved: 9.5,
				WorkersInvolved: null,
			}),
		);
	});

	it.each([
		["9,5 stundas", 9.5, 9.5],
		["9.5h", 9.5, 9.5],
		["9:15", 9.25, 9.25],
		["9h15", 9.15, 9.25],
		["9 h 15 min", 9.15, 9.25],
		["9.15 stundas", 9.15, 9.25],
		["9.50 stundas", 9.5, 9.8333],
	])(
		"normalizes human duration input %s to decimal hours",
		async (durationText, modelHours, expectedHours) => {
			structuredInvokeMock.mockResolvedValue({
				records: [
					{
						Area: "Pamati",
						Activity: "Concrete pour",
						Quantity: null,
						Mrv: null,
						Hours: modelHours,
					},
				],
			});
			saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

			await siteDiaryToDatabaseTool.invoke({
				question: `Veikta smilts piebēršana pamatiem, ${durationText}.`,
			});

			expect(
				saveSiteDiaryRecordMock.mock.calls[0][0].rows[0].TimeInvolved,
			).toBe(expectedHours);
		},
	);

	it("nulls invented default workers and hours when the source has no labor evidence", async () => {
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "Project",
					Activity: "Concrete pour",
					Quantity: null,
					Mrv: null,
					Workers: 1,
					Hours: 1,
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

		await siteDiaryToDatabaseTool.invoke({
			question: "Pievieno BIS sistēmā, ka šodien iztīrījām telpu.",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
			expect.objectContaining({
				WorkersInvolved: null,
				TimeInvolved: null,
			}),
		);
	});

	it("preserves explicit one worker and one hour from source evidence", async () => {
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "Project",
					Activity: "Concrete pour",
					Quantity: null,
					Mrv: null,
					Workers: 1,
					Hours: 1,
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

		await siteDiaryToDatabaseTool.invoke({
			question: "Iztīrīta telpa, 1 cilvēks, 1 stunda.",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
			expect.objectContaining({
				WorkersInvolved: 1,
				TimeInvolved: 1,
			}),
		);
	});

	it("preserves source-supported quantities and decimal hours", async () => {
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "Pamati",
					Activity: "Concrete pour",
					Quantity: 20,
					Mrv: "m3",
					Hours: 9.5,
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

		await siteDiaryToDatabaseTool.invoke({
			question: "Piebērti 20 m3 smilts, 9,5 stundas.",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
			expect.objectContaining({
				Amounts: 20,
				Units: "m3",
				TimeInvolved: 9.5,
			}),
		);
	});

	it("preserves Latvian cubic quantities expressed as kubi", async () => {
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "Objekts",
					Activity: "Material delivery",
					Quantity: 180,
					Mrv: "m3",
				},
				{
					Area: "Objekts",
					Activity: "Excavation",
					Quantity: 80,
					Mrv: "m3",
				},
				{
					Area: "Pamati",
					Activity: "Backfilling",
					Quantity: 400,
					Mrv: "m3",
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 3 });

		await siteDiaryToDatabaseTool.invoke({
			question:
				"Ievestas smilts 180 kubi, grunts rakšana 80 kubi, smilts piebēršana pamatiem 400 kubi.",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows).toEqual([
			expect.objectContaining({
				Works: "Material delivery",
				Amounts: 180,
				Units: "m3",
			}),
			expect.objectContaining({
				Works: "Excavation",
				Amounts: 80,
				Units: "m3",
			}),
			expect.objectContaining({
				Works: "Backfilling",
				Amounts: 400,
				Units: "m3",
			}),
		]);
	});

	it("preserves an m2 quantity expressed as Latvian kvadrātus", async () => {
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: null,
					Activity: "Concrete pour",
					Quantity: 40,
					Mrv: "m2",
					Hours: 8,
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

		await siteDiaryToDatabaseTool.invoke({
			question: "Nošpaktelēju 40 kvadrātus, iztērēju astoņas stundas.",
		});

		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
			expect.objectContaining({
				Amounts: 40,
				Units: "m2",
				TimeInvolved: 8,
			}),
		);
	});

	it("nulls context numbers mapped to Amounts", async () => {
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "2 stāvs",
					Activity: "Concrete pour",
					Quantity: 2,
					Mrv: null,
					Workers: 2,
					Hours: 4,
				},
			],
		});
		saveSiteDiaryRecordMock.mockResolvedValue({ ok: true, count: 1 });

		await siteDiaryToDatabaseTool.invoke({
			question: "Šodien apmestas sienas 2 stāvā, 2 cilvēki, 4h",
		});

		const [, runnableConfig] = structuredInvokeMock.mock.calls[0];
		expect(runnableConfig).toEqual(
			expect.objectContaining({
				runName: "Structured Save - WhatsApp Text - Anna Bērziņa",
				tags: expect.arrayContaining([
					"sender:Anna Bērziņa",
					"workflow:whatsapp-site-manager:text",
					"site-diary-test",
				]),
				metadata: expect.objectContaining({
					workflowId: "whatsapp-site-manager:text",
					senderLabel: "Anna Bērziņa",
				}),
			}),
		);
		expect(saveSiteDiaryRecordMock.mock.calls[0][0].rows[0]).toEqual(
			expect.objectContaining({
				Amounts: null,
				Units: null,
				WorkersInvolved: 2,
				TimeInvolved: 4,
			}),
		);
		expect(runnableConfig.metadata).not.toHaveProperty(
			"siteDiaryValidationWarningCount",
		);
	});

	it("fast-path fallback does not persist", async () => {
		structuredInvokeMock.mockResolvedValue({
			action: "fallback",
			language: "lv",
			records: [],
			intentReason: "question",
			intentConfidence: 0.99,
		});

		const result = await extractAndSaveSiteDiary({
			question: "Vai darbi ir pabeigti?",
			allowFallback: true,
		});

		expect(result.action).toBe("fallback");
		expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
	});

	it("returns correction intent without creating a new diary row", async () => {
		structuredInvokeMock.mockResolvedValue({
			action: "correct_existing_report",
			language: "lv",
			records: [],
			intentReason: "The complete sentence asks to change the previous record",
			intentConfidence: 0.98,
		});

		const result = await extractAndSaveSiteDiary({
			question: "Izmaini daudzumu iepriekšējā ierakstā uz 10",
			allowFallback: true,
		});

		expect(result).toMatchObject({
			action: "correct_existing_report",
			count: 0,
		});
		expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
	});

	it("returns clarification intent without creating a new diary row", async () => {
		structuredInvokeMock.mockResolvedValue({
			action: "clarify",
			language: "lv",
			records: [],
			intentReason: "The standalone wording is ambiguous",
			intentConfidence: 0.55,
		});

		const result = await extractAndSaveSiteDiary({
			question: "Salabo",
			allowFallback: true,
		});

		expect(result).toMatchObject({ action: "clarify", count: 0 });
		expect(saveSiteDiaryRecordMock).not.toHaveBeenCalled();
	});

	it("shadow extraction returns a save decision without persisting", async () => {
		structuredInvokeMock.mockResolvedValue({
			action: "save_new_report",
			language: "en",
			records: [{ Area: "Building A", Activity: "Concrete pour", Quantity: 2 }],
			intentReason: "completed work",
			intentConfidence: 0.99,
		});

		const result = await extractAndSaveSiteDiary({
			question: "Completed concrete pour today",
			allowFallback: true,
			persist: false,
		});

		expect(result).toMatchObject({
			action: "save_new_report",
			language: "en",
			ok: true,
			count: 1,
		});
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

	it("nests the save pipeline trace under the save_to_database tool", async () => {
		getSiteDiaryToolContextMock.mockReturnValue(undefined);
		const starts: Array<{
			kind: "tool" | "chain";
			runId: string;
			parentRunId?: string;
			runName?: string;
		}> = [];
		const callbacks = [
			{
				name: "trace-parent-test",
				handleToolStart(
					_tool: unknown,
					_input: string,
					runId: string,
					parentRunId?: string,
					_tags?: string[],
					_metadata?: Record<string, unknown>,
					runName?: string,
				) {
					starts.push({ kind: "tool", runId, parentRunId, runName });
				},
				handleChainStart(
					_chain: unknown,
					_inputs: unknown,
					runId: string,
					parentRunId?: string,
					_tags?: string[],
					_metadata?: Record<string, unknown>,
					_runType?: string,
					runName?: string,
				) {
					starts.push({ kind: "chain", runId, parentRunId, runName });
				},
			},
		];

		await siteDiaryToDatabaseTool.invoke(toolInput, { callbacks });

		const toolStart = starts.find((start) => start.kind === "tool");
		const pipelineStart = starts.find(
			(start) =>
				start.kind === "chain" &&
				start.runName ===
					"SiteDiarySavePipeline - WhatsApp Text - Anna Bērziņa",
		);
		expect(toolStart).toBeDefined();
		expect(pipelineStart).toEqual(
			expect.objectContaining({
				parentRunId: toolStart?.runId,
			}),
		);
	});
});

describe("replace_last_site_diary_batch correction operation", () => {
	const correctionTarget = {
		batch: {
			id: "batch-1",
			originalText: "Šodien salabojām durvis 2. stāvā, 5 gab., 2h.",
		},
		records: [
			{ id: "old-1", BISId: null, Date: new Date("2026-06-20T00:00:00.000Z") },
		],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		getConfigMock.mockResolvedValue(siteConfig);
		systemPromptMock.mockResolvedValue("Extract site diary records");
		getSiteDiaryToolContextMock.mockReturnValue(trustedContext);
		buildSiteDiaryExtractionContextMock.mockResolvedValue({
			text: "Trusted site diary extraction context for site-1",
			metadata: {
				recentRecordCount: 0,
				schemaOptionCount: 0,
				truncated: false,
			},
		});
		getSiteDiaryCorrectionTargetMock.mockResolvedValue(correctionTarget);
		structuredInvokeMock.mockResolvedValue({
			records: [{ Area: "2 stāvs", Activity: "Repair works", Quantity: 10 }],
		});
		archiveAndReplaceSiteDiaryBatchMock.mockResolvedValue({
			ok: true,
			idempotent: false,
			oldCount: 1,
			count: 1,
			records: [
				{
					id: "new-1",
					siteId: "site-1",
					userId: "user-1",
					Location: "2 stāvs",
					Works: "Repair works",
					Amounts: 10,
				},
			],
		});
	});

	it("propagates evalMetadata from run context to archiveAndReplaceSiteDiaryBatch", async () => {
		await replaceLastSiteDiaryBatchOperation({
			correction: "Izmaini daudzumu uz 10 gab.",
			language: "lv",
		});

		expect(archiveAndReplaceSiteDiaryBatchMock).toHaveBeenCalledWith(
			expect.objectContaining({ evalMetadata: { evaluationId: "eval-1" } }),
		);
	});

	it("passes the target record date into correction extraction", async () => {
		await replaceLastSiteDiaryBatchOperation({
			correction: "Izmaini daudzumu uz 10 gab.",
			language: "lv",
		});

		const [messages] = structuredInvokeMock.mock.calls[0];
		expect(messages[0].content).toContain("today is : 20-06-2026");
		expect(messages[2].content).toContain("Date is : 20-06-2026");
	});

	it("forces replacement rows to keep the target record date", async () => {
		structuredInvokeMock.mockResolvedValue({
			records: [
				{
					Area: "2 stāvs",
					Activity: "Repair works",
					Quantity: 10,
					Date: "2026-07-21T00:00:00.000Z",
				},
			],
		});

		await replaceLastSiteDiaryBatchOperation({
			correction: "Izmaini daudzumu uz 10 gab.",
			language: "lv",
		});

		expect(archiveAndReplaceSiteDiaryBatchMock).toHaveBeenCalledWith(
			expect.objectContaining({
				rows: [
					expect.objectContaining({
						Date: new Date("2026-06-20T00:00:00.000Z"),
					}),
				],
			}),
		);
	});

	it("records a structured save trace after a successful correction", async () => {
		await replaceLastSiteDiaryBatchOperation({
			correction: "Izmaini daudzumu uz 10 gab.",
			language: "lv",
		});

		expect(recordTraceMock).toHaveBeenCalledWith(
			expect.objectContaining({
				siteId: "site-1",
				userId: "user-1",
				date: "20-06-2026",
				mappedRows: [
					expect.objectContaining({
						Date: new Date("2026-06-20T00:00:00.000Z"),
					}),
				],
				persistedRecords: expect.arrayContaining([
					expect.objectContaining({ id: "new-1" }),
				]),
			}),
		);
	});

	it("does not record a trace when the correction fails", async () => {
		archiveAndReplaceSiteDiaryBatchMock.mockResolvedValue({
			ok: false,
			reason: "no-eligible-batch",
		});

		await replaceLastSiteDiaryBatchOperation({
			correction: "Izmaini daudzumu uz 10 gab.",
			language: "lv",
		});

		expect(recordTraceMock).not.toHaveBeenCalled();
	});

	it("returns replaced status with new record count on success", async () => {
		const result = await replaceLastSiteDiaryBatchOperation({
			correction: "Izmaini daudzumu uz 10 gab.",
			language: "lv",
		});

		expect(result).toMatchObject({
			kind: "site_diary_correction",
			status: "replaced",
			oldRecordCount: 1,
			newRecordCount: 1,
		});
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
		expect(Object.keys((bisConnectionStatusTool.schema as any).shape)).toEqual(
			[],
		);

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
		await siteDiaryBisStatusesTool.invoke({
			submission: "sent",
			search: "walls",
			limit: 3,
		});

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
