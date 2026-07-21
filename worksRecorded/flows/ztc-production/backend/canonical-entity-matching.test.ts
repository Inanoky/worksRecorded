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
	} = {},
) {
	return {
		projectName,
		manual: false,
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

	it("rejects an LLM project selection with a conflicting project code", async () => {
		mockResponsesParse.mockResolvedValue({
			output_parsed: {
				projectCandidateId: "project_2",
				projectConfidence: 0.99,
				workMatches: [],
			},
		});

		const result = await matchZtcCanonicalEntities({
			siteId: "site-3",
			rawProjectName: "dzelzceļa auto nojume (rd)",
		});

		expect(result.project).toEqual({
			name: "dzelzceļa auto nojume (rd)",
			confidence: 0,
			source: "raw",
		});
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
