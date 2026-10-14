const mockUser = jest.fn();
const mockOrg = jest.fn();
const mockProject = jest.fn();
const mockFind = jest.fn();
const mockHistory = jest.fn();
const mockVersion = jest.fn();
const mockVersionCreate = jest.fn();
const mockUpdate = jest.fn();
const mockUpsert = jest.fn();
const mockTransaction = jest.fn();
const mockRefresh = jest.fn();

jest.mock("@/lib/utils/requireUser", () => ({ requireUser: () => mockUser() }));
jest.mock("@/server/actions/shared-actions", () => ({
	orgCheck: (...args: unknown[]) => mockOrg(...args),
}));
jest.mock("./diary-feedback", () => ({
	assertDiaryFeedbackProject: (...args: unknown[]) => mockProject(...args),
	refreshDiaryFeedback: (...args: unknown[]) => mockRefresh(...args),
	hasRecentDiaryFeedbackActivity: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		constructionDiaryFeedback: {
			findUnique: (...args: unknown[]) => mockFind(...args),
			findUniqueOrThrow: (...args: unknown[]) => mockFind(...args),
			updateMany: (...args: unknown[]) => mockUpdate(...args),
			upsert: (...args: unknown[]) => mockUpsert(...args),
		},
		constructionDiaryFeedbackVersion: {
			findMany: (...args: unknown[]) => mockHistory(...args),
			findFirst: (...args: unknown[]) => mockVersion(...args),
			create: (...args: unknown[]) => mockVersionCreate(...args),
		},
		$transaction: (...args: unknown[]) => mockTransaction(...args),
	},
}));

import { prisma } from "@/lib/utils/db";
import {
	getConstructionDiaryFeedback,
	restoreConstructionDiaryFeedback,
	saveConstructionDiaryFeedback,
} from "./diary-feedback-actions";

const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
const versionId = "30466413-fe4e-42a5-8944-171bd85be933";
const state = {
	generatedPrompt: "auto",
	userInstructions: "manual",
	sourceRecordCount: 10,
	sourceFingerprint: "hash",
	revision: 2,
};

describe("authorized feedback edits and history", () => {
	it("keeps warehouse history and restores isolated from the diary brain", async () => {
		await getConstructionDiaryFeedback(siteId, undefined, "warehouse");
		expect(mockHistory.mock.calls[0][0].where).toEqual({
			siteId,
			domain: "warehouse",
		});
		mockVersion.mockImplementation(({ where }) =>
			where.domain === "diary" ? state : null,
		);
		await expect(
			restoreConstructionDiaryFeedback({
				siteId,
				versionId,
				expectedRevision: 2,
				domain: "warehouse",
			}),
		).rejects.toThrow("šajā projektā");
		expect(mockUpdate).not.toHaveBeenCalled();
	});
	beforeEach(() => {
		jest.clearAllMocks();
		mockUser.mockResolvedValue({ id: "user-a" });
		mockOrg.mockResolvedValue({ id: siteId });
		mockProject.mockResolvedValue({ id: siteId });
		mockFind.mockResolvedValue(state);
		mockHistory.mockResolvedValue([]);
		mockUpdate.mockResolvedValue({ count: 1 });
		mockVersion.mockResolvedValue(state);
		mockTransaction.mockImplementation((fn) => fn(prisma));
	});
	it("denies another organization's project before reading or writing guidance", async () => {
		mockOrg.mockResolvedValue(false);
		await expect(getConstructionDiaryFeedback(siteId)).rejects.toThrow(
			"piekļuves",
		);
		await expect(
			saveConstructionDiaryFeedback({
				siteId,
				expectedRevision: 2,
				userInstructions: "new",
			}),
		).rejects.toThrow("piekļuves");
		expect(mockFind).not.toHaveBeenCalled();
		expect(mockUpsert).not.toHaveBeenCalled();
	});
	it("appends a manual version and invalidates an in-flight generation", async () => {
		await saveConstructionDiaryFeedback({
			siteId,
			expectedRevision: 2,
			userInstructions: "Precīza XPS izvēle",
		});
		expect(mockUpdate).toHaveBeenCalledWith({
			where: { siteId, domain: "diary", revision: 2 },
			data: expect.objectContaining({
				userInstructions: "Precīza XPS izvēle",
				revision: 3,
				generationToken: null,
				leaseUntil: null,
				sourceFingerprint: null,
			}),
		});
		expect(mockVersionCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				siteId,
				revision: 3,
				kind: "manual",
				actorId: "user-a",
				generatedPrompt: "auto",
			}),
		});
	});
	it("rejects stale revisions instead of overwriting another user's changes", async () => {
		mockUpdate.mockResolvedValue({ count: 0 });
		await expect(
			saveConstructionDiaryFeedback({
				siteId,
				expectedRevision: 1,
				userInstructions: "new",
			}),
		).rejects.toThrow("citā logā");
		expect(mockVersionCreate).not.toHaveBeenCalled();
	});
	it("restores as a new version without editing old history", async () => {
		await restoreConstructionDiaryFeedback({
			siteId,
			versionId,
			expectedRevision: 2,
		});
		expect(mockVersion).toHaveBeenCalledWith({
			where: { id: versionId, siteId, domain: "diary" },
		});
		expect(mockVersionCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				revision: 3,
				kind: "restored",
				userInstructions: "manual",
			}),
		});
	});
	it("cannot restore a version from another project", async () => {
		mockVersion.mockResolvedValue(null);
		await expect(
			restoreConstructionDiaryFeedback({
				siteId,
				versionId,
				expectedRevision: 2,
			}),
		).rejects.toThrow("šajā projektā");
		expect(mockUpdate).not.toHaveBeenCalled();
	});
	it("paginates immutable history within the same project", async () => {
		await getConstructionDiaryFeedback(siteId, 12);
		expect(mockHistory).toHaveBeenCalledWith({
			where: { siteId, domain: "diary", revision: { lt: 12 } },
			orderBy: { revision: "desc" },
			take: 21,
		});
	});
	it("rejects invalid IDs and oversized instructions", async () => {
		await expect(getConstructionDiaryFeedback("other")).rejects.toThrow();
		await expect(
			saveConstructionDiaryFeedback({
				siteId,
				expectedRevision: 2,
				userInstructions: "a".repeat(6001),
			}),
		).rejects.toThrow();
		expect(mockUser).not.toHaveBeenCalled();
	});
});
