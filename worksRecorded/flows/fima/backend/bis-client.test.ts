jest.mock("@/server/actions/BIS/service", () => ({
	requireBisAccessTokenForSite: jest.fn(async () => ({
		accessToken: "test-token",
		userId: "user",
		bisCaseId: "123",
		site: {},
	})),
	getBisBaseUrl: () => "https://bis.example.test",
	refreshBisAccessToken: jest.fn(async () => ({
		accessToken: "renewed-test-token",
	})),
}));
jest.mock("@/server/actions/BIS/TestBisEnv/relay", () => ({
	bisFetch: jest.fn(),
}));

import { refreshBisAccessToken } from "@/server/actions/BIS/service";
import { bisFetch } from "@/server/actions/BIS/TestBisEnv/relay";
import { fimaBisClient } from "./bis-client";

const response = (body: unknown, status = 200) => ({
	ok: status < 400,
	status,
	json: async () => body,
});
beforeEach(() => {
	jest.clearAllMocks();
	Object.defineProperty(AbortSignal, "timeout", {
		configurable: true,
		value: jest.fn(() => undefined),
	});
});
test("follows absolute same-host pagination links without rebuilding their path", async () => {
	(bisFetch as jest.Mock)
		.mockResolvedValueOnce(
			response({
				data: [{ id: "1" }],
				links: {
					next: "https://bis.example.test/bisp/api/portal/bis_cases/123/logbook/project?page[number]=2",
				},
			}),
		)
		.mockResolvedValueOnce(response({ data: [{ id: "2" }] }));
	const client = await fimaBisClient("site");
	expect(await client.list("project")).toEqual([{ id: "1" }, { id: "2" }]);
	expect((bisFetch as jest.Mock).mock.calls[1][1]).toBe(
		"https://bis.example.test/bisp/api/portal/bis_cases/123/logbook/project?page[number]=2",
	);
});
test("never sends credentials to an external pagination target", async () => {
	(bisFetch as jest.Mock).mockResolvedValue(
		response({
			data: [],
			links: { next: "https://external.example/bisp/api/data" },
		}),
	);
	const client = await fimaBisClient("site");
	await expect(client.list("project")).rejects.toThrow("Nederīgs BIS resurss");
	expect(bisFetch).toHaveBeenCalledTimes(1);
});
test("refreshes authentication for safe reads once", async () => {
	(bisFetch as jest.Mock)
		.mockResolvedValueOnce(response({}, 401))
		.mockResolvedValueOnce(response({ data: [] }));
	const client = await fimaBisClient("site");
	await client.request("project");
	expect(refreshBisAccessToken).toHaveBeenCalledTimes(1);
	expect(bisFetch).toHaveBeenCalledTimes(2);
});
test("does not retry mutations when authentication expires", async () => {
	(bisFetch as jest.Mock).mockResolvedValue(response({}, 401));
	const client = await fimaBisClient("site");
	await expect(client.request("performed_works", "POST", {})).rejects.toThrow(
		"401",
	);
	expect(bisFetch).toHaveBeenCalledTimes(1);
	expect(refreshBisAccessToken).not.toHaveBeenCalled();
});
