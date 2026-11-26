import { getAuthorizedProjectSite } from "@/lib/projects/authorized-project-site";
import { requireUser } from "@/lib/utils/requireUser";
import { getProdevBisReview, saveProdevBisReview } from "./prodev-bis-review";

const database = {
	findFirst: jest.fn(),
	query: jest.fn(),
	update: jest.fn(),
	transaction: jest.fn(),
	actor: jest.fn(),
};
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		sitediaryrecords: {
			findFirst: (...args: unknown[]) => database.findFirst(...args),
		},
		user: { findUnique: (...args: unknown[]) => database.actor(...args) },
		$transaction: (...args: unknown[]) => database.transaction(...args),
	},
}));
jest.mock("@/lib/projects/authorized-project-site", () => ({
	getAuthorizedProjectSite: jest.fn(),
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));

const scope = {
	siteId: "c39cb04c-8ce5-477d-acd0-99586a82d850",
	recordId: "52d7cc72-a72f-49eb-a0ea-800279bb1716",
};
const change = {
	...scope,
	requestId: "51d11e4d-f40a-4c88-a2de-2d8466a0d8d8",
	status: "send_to_bis" as const,
	expectedVersion: 0,
};
const site = {
	id: scope.siteId,
	organizationId: "org",
	organization: { name: "ProDev", orgLanguage: "lv" },
};

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "reviewer" } as never);
	jest.mocked(getAuthorizedProjectSite).mockResolvedValue(site as never);
	database.actor.mockResolvedValue({
		firstName: "Testa",
		lastName: "Lietotājs",
	});
	database.findFirst.mockResolvedValue({ evalMetadata: null });
	database.query.mockResolvedValue([{ evalMetadata: { priorMetadata: true } }]);
	database.transaction.mockImplementation((run) =>
		run({
			$queryRaw: database.query,
			sitediaryrecords: { update: database.update },
		}),
	);
});

it("defaults to Nesūtīt for old records", async () => {
	await expect(getProdevBisReview(scope)).resolves.toEqual({
		version: 0,
		status: "do_not_send",
		history: [],
	});
	expect(database.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				id: scope.recordId,
				siteId: scope.siteId,
				organizationId: "org",
				archivedAt: null,
			},
		}),
	);
});

it("records the reviewer and the transition, retaining other metadata and ignoring retries", async () => {
	const saved = await saveProdevBisReview(change);
	expect(saved).toMatchObject({
		status: "send_to_bis",
		version: 1,
		history: [
			{
				id: change.requestId,
				from: "do_not_send",
				to: "send_to_bis",
				actorId: "reviewer",
				actorName: "Testa Lietotājs",
				at: expect.any(String),
			},
		],
	});
	expect(database.update).toHaveBeenCalledWith({
		where: { id: scope.recordId },
		data: { evalMetadata: { priorMetadata: true, prodevBisReview: saved } },
	});
	database.query.mockResolvedValue([
		{ evalMetadata: { prodevBisReview: saved } },
	]);
	expect(await saveProdevBisReview(change)).toEqual(saved);
	expect(database.update).toHaveBeenCalledTimes(1);
	await expect(
		saveProdevBisReview({
			...change,
			requestId: scope.recordId,
			status: "do_not_send",
		}),
	).rejects.toThrow("ir mainīta");
});

it("rejects other organizations and other status values", async () => {
	jest
		.mocked(getAuthorizedProjectSite)
		.mockResolvedValue({ ...site, organization: { name: "FIMA" } } as never);
	await expect(saveProdevBisReview(change)).rejects.toThrow(
		"Nav piekļuves ProDev",
	);
	await expect(
		saveProdevBisReview({ ...change, status: "approved" } as never),
	).rejects.toThrow();
	expect(database.transaction).not.toHaveBeenCalled();
});
