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
		site: {
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

	it("uses Terra medium to link noisy project and work extraction to candidate IDs", async () => {
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_0",
				projectConfidence: 0.98,
				workMatches: [
					{
						rawIndex: 0,
						workCandidateId: "work_0",
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

	it("selects the nearest compatible cross-section before calling the model", async () => {
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

		const result = await matchZtcCanonicalEntities({
			siteId: "site-cross-section",
			rawProjectName: canonicalProject,
			rawWorks: ["R3/T3 - latojums 25x45"],
			category: "works",
		});

		expect(result.works[0]).toEqual(
			expect.objectContaining({
				task: "latojums 28x45",
				canonicalWork: "R3/T3 - latojums 28x45",
				source: "exact",
			}),
		);
		expect(result.modelCalled).toBe(false);
		expect(mockResponsesParse).not.toHaveBeenCalled();
	});

	it("does not let the model choose a farther cross-section", async () => {
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
				task: null,
				canonicalWork: "R3/T3 - lat0jums 25x45",
				source: "raw",
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
					{ rawIndex: 0, workCandidateId: "work_0", confidence: 0.99 },
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
