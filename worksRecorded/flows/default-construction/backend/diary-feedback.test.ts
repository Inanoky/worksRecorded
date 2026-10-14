const mockSite = jest.fn();
const mockRecords = jest.fn();
const mockRecent = jest.fn();
const mockMaterials = jest.fn();
const mockWarehouseRecent = jest.fn();
const mockAnalytics = jest.fn();
const mockSites = jest.fn();
const mockFlow = jest.fn();
const mockInvoke = jest.fn();
const mockFind = jest.fn();
const mockUpsert = jest.fn();
const mockUpdate = jest.fn();
const mockVersion = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		site: {
			findUnique: (...args: unknown[]) => mockSite(...args),
			findMany: (...args: unknown[]) => mockSites(...args),
		},
		sitediaryrecords: {
			findMany: (...args: unknown[]) => mockRecords(...args),
			findFirst: (...args: unknown[]) => mockRecent(...args),
		},
		bISmaterialRecords: {
			findMany: (...args: unknown[]) => mockMaterials(...args),
			findFirst: (...args: unknown[]) => mockWarehouseRecent(...args),
		},
		analytics: { findUnique: (...args: unknown[]) => mockAnalytics(...args) },
		constructionDiaryFeedback: {
			findUnique: (...args: unknown[]) => mockFind(...args),
			upsert: (...args: unknown[]) => mockUpsert(...args),
			updateMany: (...args: unknown[]) => mockUpdate(...args),
		},
		constructionDiaryFeedbackVersion: {
			create: (...args: unknown[]) => mockVersion(...args),
		},
		$transaction: (...args: unknown[]) => mockTransaction(...args),
	},
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: (...args: unknown[]) => mockFlow(...args),
}));
jest.mock("@langchain/openai", () => ({
	ChatOpenAI: jest.fn().mockImplementation(() => ({
		withStructuredOutput: () => ({
			invoke: (...args: unknown[]) => mockInvoke(...args),
		}),
	})),
}));

import { ChatOpenAI } from "@langchain/openai";
import { prisma } from "@/lib/utils/db";
import {
	getDiaryFeedbackContext,
	readDiaryFeedbackDataset,
	refreshDiaryFeedback,
	runScheduledDiaryFeedback,
} from "./diary-feedback";

const state = {
	siteId: "site-a",
	revision: 2,
	generatedPrompt: "Old guidance",
	userInstructions: "XPS 150 ir atšķirīgs no XPS 50",
	sourceFingerprint: null,
	sourceRecordCount: 1,
	checkedAt: null,
};
const record = {
	id: "row-a",
	createdAt: new Date("2026-10-13"),
	originalUserComment: "ieklāju XPS 150mm 10m2",
	Works: "XPS 150mm",
	Location: "1. stāvs",
	Comments: "XPS 150mm",
};

describe("diary feedback refresh", () => {
	it("uses the dedicated GPT-6.1 model with medium reasoning and structured Responses output", async () => {
		await refreshDiaryFeedback("site-a", true);
		expect(ChatOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				model: "gpt-6.1-sol",
				reasoningEffort: "medium",
				useResponsesApi: true,
			}),
		);
		expect(mockVersion.mock.calls[0][0].data.model).toBe("gpt-6.1-sol");
	});
	it("never generates or loads guidance without new records in 72 hours", async () => {
		mockRecent.mockResolvedValue(null);
		expect(await refreshDiaryFeedback("site-a", true)).toBe("inactive");
		expect(await getDiaryFeedbackContext("site-a")).toBe("");
		expect(mockInvoke).not.toHaveBeenCalled();
		expect(mockUpsert).not.toHaveBeenCalled();
		const cutoff = mockRecent.mock.calls[0][0].where.createdAt.gte;
		expect(
			Math.abs(Date.now() - cutoff.getTime() - 72 * 60 * 60 * 1000),
		).toBeLessThan(1000);
	});
	it("warehouse learning uses materials and assignments, never diary notes", async () => {
		const data = await readDiaryFeedbackDataset("site-a", "warehouse");
		expect(mockRecords).not.toHaveBeenCalled();
		expect(data.examples[0]).toMatchObject({
			source: "PAROC ROS 30g",
			estimatePositions: [{ id: "roof", name: "Jumta siltumizolācija" }],
			method: "manual",
		});
		expect(await refreshDiaryFeedback("site-a", true, null, "warehouse")).toBe(
			"updated",
		);
		expect(mockUpsert.mock.calls[0][0].where).toEqual({
			siteId_domain: { siteId: "site-a", domain: "warehouse" },
		});
		expect(mockVersion.mock.calls[0][0].data.domain).toBe("warehouse");
	});
	it("warehouse activity does not reactivate the diary brain", async () => {
		mockRecent.mockResolvedValue(null);
		expect(await refreshDiaryFeedback("site-a", true)).toBe("inactive");
		expect(await refreshDiaryFeedback("site-a", true, null, "warehouse")).toBe(
			"updated",
		);
	});
	it("scheduled batches filter old projects and cap generation at four brains", async () => {
		mockSites.mockResolvedValue(
			Array.from({ length: 4 }, (_, index) => ({
				id: `site-${index}`,
				organizationId: "org-a",
				diaryFeedback: [],
			})),
		);
		mockUpsert.mockResolvedValue({ ...state, checkedAt: new Date() });
		const results = await runScheduledDiaryFeedback();
		expect(results).toHaveLength(4);
		expect(results.map((item) => item.domain)).toEqual([
			"diary",
			"warehouse",
			"diary",
			"warehouse",
		]);
		expect(
			mockSites.mock.calls[0][0].where.OR[0].sitediaryrecords.some.createdAt
				.gte,
		).toBeInstanceOf(Date);
		expect(mockInvoke).not.toHaveBeenCalled();
	});
	beforeEach(() => {
		jest.clearAllMocks();
		mockSite.mockResolvedValue({
			id: "site-a",
			organizationId: "org-a",
			siteDiaryRecordsMap: { Works: { DropDownOptions: { xps: "XPS 150mm" } } },
		});
		mockFlow.mockResolvedValue("default-construction");
		mockRecords.mockResolvedValue([record]);
		mockRecent.mockResolvedValue({ id: "recent" });
		mockWarehouseRecent.mockResolvedValue({ id: "recent-material" });
		mockMaterials.mockResolvedValue([
			{
				id: "material-a",
				name: "PAROC ROS 30g",
				categoryId: null,
				categoryName: null,
				measurementUnit: "m2",
				quantity: 5,
				cost: 100,
			},
		]);
		mockAnalytics.mockResolvedValue({
			currentWeekProgress: {
				defaultConstructionForma2: {
					version: 1,
					document: {
						id: "doc",
						positions: [{ id: "roof", name: "Jumta siltumizolācija" }],
					},
					allocations: [
						{
							sourceType: "material",
							sourceId: "material-a",
							positionId: "roof",
							method: "manual",
						},
					],
					materialRules: [],
				},
			},
		});
		mockFind.mockResolvedValue(state);
		mockUpsert.mockResolvedValue(state);
		mockUpdate.mockResolvedValue({ count: 1 });
		mockInvoke.mockResolvedValue({
			rules: ["XPS biezumu nedrīkst pārņemt no iepriekšējā darba."],
			uncertain: [],
		});
		mockTransaction.mockImplementation((fn) => fn(prisma));
	});
	it("reads only active records of the selected project", async () => {
		const dataset = await readDiaryFeedbackDataset("site-a");
		expect(mockRecords).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { siteId: "site-a", archivedAt: null },
			}),
		);
		expect(dataset.examples).toHaveLength(1);
		expect(dataset.catalog).toMatchObject({ Works: ["XPS 150mm"] });
	});
	it("detects manual edits even without a changed creation timestamp", async () => {
		const before = await readDiaryFeedbackDataset("site-a");
		mockRecords.mockResolvedValue([{ ...record, Works: "XPS 50mm" }]);
		expect((await readDiaryFeedbackDataset("site-a")).fingerprint).not.toBe(
			before.fingerprint,
		);
	});
	it("includes older work categories instead of sampling only recent repetitive work", async () => {
		mockRecords.mockResolvedValue([
			...Array.from({ length: 100 }, (_, index) => ({
				...record,
				id: `new-${index}`,
				originalUserComment: `Jauns XPS ieraksts ${index}`,
			})),
			{
				...record,
				id: "old-corrected",
				createdAt: new Date("2026-01-01"),
				Works: "Manuāli labota kategorija",
				originalUserComment: "Vecs precizēts darbs",
			},
		]);
		const dataset = await readDiaryFeedbackDataset("site-a");
		expect(dataset.examples).toHaveLength(40);
		expect(
			dataset.examples.some(
				(example) =>
					"work" in example && example.work === "Manuāli labota kategorija",
			),
		).toBe(true);
	});
	it("keeps manual guidance while appending generated history", async () => {
		expect(await refreshDiaryFeedback("site-a")).toBe("updated");
		expect(mockInvoke.mock.calls[0][0][1].content).toContain(
			state.userInstructions,
		);
		expect(mockVersion).toHaveBeenCalledWith({
			data: expect.objectContaining({
				siteId: "site-a",
				revision: 3,
				userInstructions: state.userInstructions,
				kind: "generated",
			}),
		});
		expect(mockUpdate.mock.calls[1][0].where).toMatchObject({
			siteId: "site-a",
			revision: 2,
		});
		expect(mockUpdate.mock.calls[2][0].data).toEqual({
			generationToken: null,
			leaseUntil: null,
		});
	});
	it("does not regenerate unchanged records", async () => {
		const dataset = await readDiaryFeedbackDataset("site-a");
		mockUpsert.mockResolvedValue({
			...state,
			sourceFingerprint: dataset.fingerprint,
		});
		expect(await refreshDiaryFeedback("site-a")).toBe("unchanged");
		expect(mockInvoke).not.toHaveBeenCalled();
		expect(mockVersion).not.toHaveBeenCalled();
	});
	it("skips fresh projects and concurrent leases", async () => {
		mockUpsert.mockResolvedValueOnce({ ...state, checkedAt: new Date() });
		expect(await refreshDiaryFeedback("site-a")).toBe("not-due");
		mockUpdate.mockResolvedValueOnce({ count: 0 });
		expect(await refreshDiaryFeedback("site-a", true)).toBe("busy");
		expect(mockInvoke).not.toHaveBeenCalled();
	});
	it("discards generation if an existing record changed during analysis", async () => {
		mockRecords
			.mockResolvedValueOnce([record])
			.mockResolvedValueOnce([{ ...record, Works: "New category" }]);
		expect(await refreshDiaryFeedback("site-a")).toBe("source-changed");
		expect(mockVersion).not.toHaveBeenCalled();
	});
	it("does not overwrite a concurrent manual revision", async () => {
		mockUpdate
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });
		expect(await refreshDiaryFeedback("site-a")).toBe("superseded");
		expect(mockVersion).not.toHaveBeenCalled();
	});
	it("retains the old helper and releases the lease after model failure", async () => {
		mockInvoke.mockRejectedValueOnce(new Error("timeout"));
		await expect(refreshDiaryFeedback("site-a")).rejects.toThrow("timeout");
		expect(mockVersion).not.toHaveBeenCalled();
		expect(mockUpdate.mock.calls.at(-1)[0].data).toEqual({
			generationToken: null,
			leaseUntil: null,
		});
	});
	it("does not generate from other flows", async () => {
		mockFlow.mockResolvedValue("ztc-production");
		await expect(refreshDiaryFeedback("site-a")).rejects.toThrow(
			"tikai būvniecības",
		);
		expect(mockRecords).not.toHaveBeenCalled();
		expect(mockUpsert).not.toHaveBeenCalled();
	});
	it("continues extraction without feedback when storage is unavailable", async () => {
		const log = jest.spyOn(console, "error").mockImplementation(() => {});
		mockFind.mockRejectedValueOnce(new Error("unavailable"));
		expect(await getDiaryFeedbackContext("site-a")).toBe("");
		log.mockRestore();
	});
});
