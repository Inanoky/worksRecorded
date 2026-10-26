const mockResponsesParse = jest.fn();
const mockSiteFindUnique = jest.fn();
const mockZtcRecordsFindMany = jest.fn();

jest.mock("openai", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		responses: {
			parse: (...args: unknown[]) => mockResponsesParse(...args),
		},
	})),
}));

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		ztcSiteConfiguration: {
			findUnique: (...args: unknown[]) => mockSiteFindUnique(...args),
		},
		ztcRecords: {
			findMany: (...args: unknown[]) => mockZtcRecordsFindMany(...args),
		},
	},
}));

import {
	matchZtcCanonicalEntities,
	ZTC_CANONICAL_MATCH_MODEL,
	ZTC_CANONICAL_MATCH_REASONING_EFFORT,
} from "./canonical-entity-matching";

const canonicalProject = "dz. ēka. auto nojume (rd)";

function rateProject(
	projectName: string,
	options: {
		works?: Array<Record<string, unknown>>;
		additionalWorks?: Array<Record<string, unknown>>;
		excludedTasks?: Record<string, string[]>;
	} = {},
) {
	return {
		projectName,
		manual: false,
		excludedTasks: options.excludedTasks,
		works: options.works ?? [],
		additionalDetails: [],
		additionalWorks: options.additionalWorks ?? [],
	};
}

describe("matchZtcCanonicalEntities", () => {
	it("rejects an excluded global rate after resolving the AM project", async () => {
		mockSiteFindUnique.mockResolvedValue({
			siteDiaryRecordsMap: {
				otherSettings: {
					ztcDefaultTaskRates: {
						projects: [
							rateProject("Visi projekti", {
								works: [
									{
										task: "koka karkas 95 mm. 145 mm. 195 mm. 245",
										rate: "3",
										unit: "m2",
									},
								],
							}),
							rateProject("AM piebūve", {
								excludedTasks: {
									works: ["koka karkas 95 mm. 145 mm. 195 mm. 245"],
								},
								works: [
									{ task: "koka karkas 195 x 45 mm", rate: "2.7", unit: "m2" },
								],
							}),
						],
					},
				},
			},
		});
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 0.99,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: "work_0",
						decision: "matched",
						confidence: 0.99,
					},
				],
			},
		});
		const result = await matchZtcCanonicalEntities({
			siteId: "am-regression",
			rawProjectName: "AM",
			rawWorks: ["TL - Koka karkass 195x45mm"],
			category: "works",
		});
		expect(result.works[0].task).toBeNull();
		expect(result.works[0].rate).toBeNull();
	});

	it("prefers a project override when a global rate has the same name", async () => {
		mockSiteFindUnique.mockResolvedValue({
			siteDiaryRecordsMap: {
				otherSettings: {
					ztcDefaultTaskRates: {
						projects: [
							rateProject("Visi projekti", {
								works: [
									{ task: "koka karkas 195x45 mm", rate: "3", unit: "m2" },
								],
							}),
							rateProject("AM piebūve", {
								works: [
									{ task: "koka karkas 195x45 mm", rate: "2.7", unit: "m2" },
								],
							}),
						],
					},
				},
			},
		});
		const result = await matchZtcCanonicalEntities({
			siteId: "am-override",
			rawProjectName: "AM piebūve",
			rawWorks: ["TL - koka karkas 195x45 mm"],
			category: "works",
		});
		expect(result.works[0].rate?.rate).toBe("2.7");
		expect(result.modelCalled).toBe(false);
	});
	beforeEach(() => {
		jest.clearAllMocks();
		mockSiteFindUnique.mockResolvedValue({
			siteDiaryRecordsMap: {
				otherSettings: {
					ztcDefaultTaskRates: {
						projects: [
							rateProject("Visi projekti"),
							rateProject(canonicalProject, {
								works: [
									{
										task: "Ģipškartona plāksne GKFI12.5",
										rate: "0.0429",
										unit: "m2",
									},
								],
								additionalWorks: [
									{
										task: "peļu sieta montāža",
										rate: "1",
										unit: "st",
									},
								],
							}),
							rateProject("dzīka auto nojume (rd)"),
							rateProject("zemgales prospekts 11 (zp)"),
						],
					},
				},
			},
		});
		mockZtcRecordsFindMany.mockResolvedValue([]);
	});

	it.each([
		["R3/T3 - Vertikāls latojums 45mm", "vertikāls latojums 45x45"],
		["R4/T4 - Horizontāls latojums 32mm", "horizontālais latojums 32x45"],
		["L4/B4 - Iekšējais latojums", "iekšējais latojums 45x45"],
	])(
		"accepts semantic H13 decision for %s without a dimension veto",
		async (rawWork, task) => {
			mockSiteFindUnique.mockResolvedValue({
				siteDiaryRecordsMap: {
					otherSettings: {
						ztcDefaultTaskRates: {
							projects: [
								rateProject("H13", {
									works: [{ task, rate: "0.9", unit: "m2" }],
								}),
							],
						},
					},
				},
			});
			mockResponsesParse.mockResolvedValue({
				output_parsed: {
					projectCandidateId: "project_0",
					projectConfidence: 1,
					workMatches: [
						{
							rawIndex: 0,
							workCandidateId: "work_0",
							decision: "matched",
							confidence: 0.6,
							reason: "Same work, abbreviated dimensions.",
						},
					],
				},
			});
			const result = await matchZtcCanonicalEntities({
				siteId: `h13-${task}`,
				rawProjectName: "H13",
				rawWorks: [rawWork],
			});
			expect(result.works[0]).toEqual(
				expect.objectContaining({
					task,
					source: "llm",
					reason: "Same work, abbreviated dimensions.",
				}),
			);
		},
	);

	it("ignores a candidate ID when the model explicitly decides it is unsuitable", async () => {
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 1,
				workMatches: [
					{
						rawIndex: 0,
						decision: "unassigned",
						workCandidateId: "work_0",
						confidence: 0.08,
						reason: "Different material and thickness.",
					},
				],
			},
		});
		const result = await matchZtcCanonicalEntities({
			siteId: "explicit-unassigned-id",
			rawProjectName: canonicalProject,
			rawWorks: ["Plywood 22mm apšuvums"],
		});
		expect(result.works[0].rate).toBeNull();
	});

	it("preserves the model's unassigned decision", async () => {
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 1,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: null,
						decision: "unassigned",
						confidence: 1,
						reason: "Different material.",
					},
				],
			},
		});
		const result = await matchZtcCanonicalEntities({
			siteId: "no-good-rate",
			rawProjectName: canonicalProject,
			rawWorks: ["R2/T2 - Plywood 22mm apšuvums"],
		});
		expect(result.works[0]).toEqual(
			expect.objectContaining({
				task: null,
				rate: null,
				reason: "Different material.",
			}),
		);
	});

	it("rejects invented IDs and works belonging to another project", async () => {
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_2",
				projectConfidence: 1,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: "work_0",
						decision: "matched",
						confidence: 1,
					},
				],
			},
		});
		const result = await matchZtcCanonicalEntities({
			siteId: "wrong-project-rate",
			rawProjectName: "zemgales prospekts 11 (zp)",
			rawWorks: ["Blue GKL"],
		});
		expect(result.works[0].rate).toBeNull();
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 1,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: "invented",
						decision: "matched",
						confidence: 1,
					},
				],
			},
		});
		const invalid = await matchZtcCanonicalEntities({
			siteId: "invented-rate",
			rawProjectName: canonicalProject,
			rawWorks: ["Blue GKL"],
		});
		expect(invalid.works[0].rate).toBeNull();
	});

	it("does not infer a project-specific rate without project context", async () => {
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 1,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: "work_0",
						decision: "matched",
						confidence: 1,
					},
				],
			},
		});
		const result = await matchZtcCanonicalEntities({
			siteId: "no-project-context",
			rawWorks: ["Blue GKL"],
		});
		expect(result.works[0].rate).toBeNull();
	});

	it("retries after API failure rather than caching an outage as no match", async () => {
		mockResponsesParse
			.mockRejectedValueOnce(new Error("timeout"))
			.mockResolvedValueOnce({
				output_parsed: {
					projectCandidateId: "project_0",
					projectConfidence: 1,
					workMatches: [
						{
							rawIndex: 0,
							workCandidateId: "work_0",
							decision: "matched",
							confidence: 1,
						},
					],
				},
			});
		const args = {
			siteId: "retry-outage",
			rawProjectName: canonicalProject,
			rawWorks: ["Blue GKL"],
		};
		expect((await matchZtcCanonicalEntities(args)).works[0].rate).toBeNull();
		expect(
			(await matchZtcCanonicalEntities(args)).works[0].rate,
		).not.toBeNull();
		expect(mockResponsesParse).toHaveBeenCalledTimes(2);
	});

	it("uses Terra medium to link noisy project and work extraction to candidate IDs", async () => {
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 0.98,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: "work_0",
						decision: "matched",
						confidence: 0.96,
					},
				],
			},
		});

		const result = await matchZtcCanonicalEntities({
			siteId: "site-1",
			rawProjectName: "dzelzceļa auto nojume (rd)",
			rawWorks: ["R1/T1 - Blue GKL 12.5"],
			category: "works",
		});

		expect(result.project).toEqual({
			name: canonicalProject,
			confidence: 0.98,
			source: "llm",
		});
		expect(result.works[0]).toEqual(
			expect.objectContaining({
				task: "Ģipškartona plāksne GKFI12.5",
				canonicalWork: "R1/T1 - Ģipškartona plāksne GKFI12.5",
				source: "llm",
			}),
		);
		expect(mockResponsesParse).toHaveBeenCalledWith(
			expect.objectContaining({
				model: ZTC_CANONICAL_MATCH_MODEL,
				reasoning: { effort: ZTC_CANONICAL_MATCH_REASONING_EFFORT },
			}),
			expect.any(Object),
		);
	});

	it("does not call the model when project and work already match canonical candidates", async () => {
		const result = await matchZtcCanonicalEntities({
			siteId: "site-2",
			rawProjectName: canonicalProject,
			rawWorks: ["R1/T1 - Ģipškartona plāksne GKFI12.5"],
			category: "works",
		});

		expect(result.project?.source).toBe("exact");
		expect(result.works[0]?.source).toBe("exact");
		expect(result.modelCalled).toBe(false);
		expect(mockResponsesParse).not.toHaveBeenCalled();
	});

	it("uses the configured canonical project without the model when only the suffix differs", async () => {
		const result = await matchZtcCanonicalEntities({
			siteId: "site-2-suffix",
			rawProjectName: "dz. ēka. auto nojume (rī)",
		});

		expect(result.project).toEqual({
			name: canonicalProject,
			confidence: 1,
			source: "exact",
		});
		expect(result.modelCalled).toBe(false);
		expect(mockResponsesParse).not.toHaveBeenCalled();
	});

	it("leaves differing cross-sections to the model instead of selecting the nearest", async () => {
		mockSiteFindUnique.mockResolvedValue({
			siteDiaryRecordsMap: {
				otherSettings: {
					ztcDefaultTaskRates: {
						projects: [
							rateProject("Visi projekti"),
							rateProject(canonicalProject, {
								works: [
									{ task: "latojums 45x45", rate: "0.9", unit: "m2" },
									{ task: "latojums 28x45", rate: "0.8", unit: "m2" },
								],
							}),
						],
					},
				},
			},
		});

		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 1,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: null,
						decision: "unassigned",
						confidence: 0,
						reason: "No suitable configured dimensions.",
					},
				],
			},
		});
		const result = await matchZtcCanonicalEntities({
			siteId: "site-cross-section",
			rawProjectName: canonicalProject,
			rawWorks: ["R3/T3 - latojums 25x45"],
			category: "works",
		});

		expect(result.works[0]).toEqual(
			expect.objectContaining({
				task: null,
				canonicalWork: "R3/T3 - latojums 25x45",
				source: "raw",
			}),
		);
		expect(result.modelCalled).toBe(true);
		expect(mockResponsesParse).toHaveBeenCalled();
	});

	it("accepts the model choice without a nearest-dimension veto", async () => {
		mockSiteFindUnique.mockResolvedValue({
			siteDiaryRecordsMap: {
				otherSettings: {
					ztcDefaultTaskRates: {
						projects: [
							rateProject("Visi projekti"),
							rateProject(canonicalProject, {
								works: [
									{ task: "latojums 28x45", rate: "0.8", unit: "m2" },
									{ task: "latojums 45x45", rate: "0.9", unit: "m2" },
								],
							}),
						],
					},
				},
			},
		});
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 1,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: "work_1",
						decision: "matched",
						confidence: 0.99,
					},
				],
			},
		});

		const result = await matchZtcCanonicalEntities({
			siteId: "site-cross-section-ocr",
			rawProjectName: canonicalProject,
			rawWorks: ["R3/T3 - lat0jums 25x45"],
			category: "works",
		});

		expect(result.works[0]).toEqual(
			expect.objectContaining({
				task: "latojums 45x45",
				canonicalWork: "R3/T3 - latojums 45x45",
				source: "llm",
			}),
		);
		expect(result.modelCalled).toBe(true);
	});

	it("rejects an LLM project selection with conflicting project numbers", async () => {
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_2",
				projectConfidence: 0.99,
				workMatches: [],
			},
		});

		const result = await matchZtcCanonicalEntities({
			siteId: "site-3",
			rawProjectName: "zemgales prospekts 12 (rī)",
		});

		expect(result.project).toEqual({
			name: "zemgales prospekts 12 (rī)",
			confidence: 0,
			source: "raw",
		});
	});

	it("keeps an unrelated exact historical project without calling the model", async () => {
		mockZtcRecordsFindMany.mockResolvedValue([
			{ Location: "noliktavas pārbūve (np)" },
		]);

		const result = await matchZtcCanonicalEntities({
			siteId: "site-3-existing",
			rawProjectName: "noliktavas pārbūve (rī)",
		});

		expect(result.project).toEqual({
			name: "noliktavas pārbūve (np)",
			confidence: 1,
			source: "exact",
		});
		expect(result.modelCalled).toBe(false);
		expect(mockResponsesParse).not.toHaveBeenCalled();
	});

	it("matches additional works from the selected project's additional-work rates", async () => {
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 1,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: "work_0",
						decision: "matched",
						confidence: 0.93,
					},
				],
			},
		});

		const result = await matchZtcCanonicalEntities({
			siteId: "site-4",
			rawProjectName: canonicalProject,
			rawWorks: ["peļu siets"],
			category: "additionalWorks",
		});

		expect(result.project?.name).toBe(canonicalProject);
		expect(result.works[0]).toEqual(
			expect.objectContaining({
				task: "peļu sieta montāža",
				canonicalWork: "peļu sieta montāža",
				source: "llm",
			}),
		);
	});

	it("rejects a globally inherited rate excluded by the selected project", async () => {
		mockSiteFindUnique.mockResolvedValue({
			siteDiaryRecordsMap: {
				otherSettings: {
					ztcDefaultTaskRates: {
						projects: [
							rateProject("Visi projekti", {
								additionalWorks: [
									{ task: "CNC projekts", rate: "15", unit: "st" },
								],
							}),
							rateProject(canonicalProject, {
								excludedTasks: { additionalWorks: ["CNC projekts"] },
							}),
						],
					},
				},
			},
		});
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 1,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: "work_0",
						decision: "matched",
						confidence: 0.99,
					},
				],
			},
		});

		const result = await matchZtcCanonicalEntities({
			siteId: "site-excluded-global-rate",
			rawProjectName: canonicalProject,
			rawWorks: ["CNC projekts"],
			category: "additionalWorks",
		});

		expect(result.works[0]).toEqual(
			expect.objectContaining({
				task: null,
				canonicalWork: "CNC projekts",
				source: "raw",
			}),
		);
	});

	it("does not let an exact historical OCR variant override a configured project with rates", async () => {
		mockZtcRecordsFindMany.mockResolvedValue([
			{ Location: "dzelzceļa auto nojume (rd)" },
		]);
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 0.99,
				workMatches: [],
			},
		});

		const result = await matchZtcCanonicalEntities({
			siteId: "site-5",
			rawProjectName: "dzelzceļa auto nojume (rd)",
		});

		expect(result.project).toEqual({
			name: canonicalProject,
			confidence: 0.99,
			source: "llm",
		});
	});
});
