import {
	getSiteBisConfig,
	getUserBisTokenByUserId,
} from "@/server/actions/BIS/service";
import { getDashboardBisStatus } from "./dashboard-status";

jest.mock("@/server/actions/BIS/service", () => ({
	getSiteBisConfig: jest.fn(),
	getUserBisTokenByUserId: jest.fn(),
}));
beforeEach(() => {
	jest.resetAllMocks();
	jest
		.mocked(getSiteBisConfig)
		.mockResolvedValue({ bisCaseId: "case" } as never);
	jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it("never checks BIS for flows with BIS disabled", async () => {
	await expect(getDashboardBisStatus("user", "site", false)).resolves.toEqual({
		enabled: false,
		unavailable: false,
	});
	expect(getSiteBisConfig).not.toHaveBeenCalled();
	expect(getUserBisTokenByUserId).not.toHaveBeenCalled();
});
it("never renews a token for a project without a BIS case", async () => {
	jest.mocked(getSiteBisConfig).mockResolvedValue({ bisCaseId: null } as never);
	await expect(getDashboardBisStatus("user", "site", true)).resolves.toEqual({
		enabled: false,
		unavailable: false,
	});
	expect(getUserBisTokenByUserId).not.toHaveBeenCalled();
});
it("only returns a ready flag and never returns secrets to a client", async () => {
	jest.mocked(getUserBisTokenByUserId).mockResolvedValue({
		accessToken: "secret",
		refreshToken: "secret",
	} as never);
	await expect(getDashboardBisStatus("user", "site", true)).resolves.toEqual({
		enabled: true,
		unavailable: false,
	});
	expect(getUserBisTokenByUserId).toHaveBeenCalledWith("user", {
		refresh: false,
	});
});
it("treats an account without saved tokens as disconnected, not as an outage", async () => {
	jest.mocked(getUserBisTokenByUserId).mockResolvedValue(null);
	await expect(getDashboardBisStatus("user", "site", true)).resolves.toEqual({
		enabled: false,
		unavailable: false,
	});
});
it("isolates non-JSON refresh failures from dashboard rendering", async () => {
	jest.mocked(getUserBisTokenByUserId).mockRejectedValue(
		Object.assign(new Error("secret HTML body"), {
			code: "BIS_REFRESH_NON_JSON",
		}),
	);
	await expect(getDashboardBisStatus("user", "site", true)).resolves.toEqual({
		enabled: false,
		unavailable: true,
	});
	expect(console.warn).toHaveBeenCalledWith(
		"[BIS] Dashboard continues without BIS",
		{ userId: "user", siteId: "site", code: "BIS_REFRESH_NON_JSON" },
	);
});
it("does not spam logs during a cooldown", async () => {
	jest
		.mocked(getUserBisTokenByUserId)
		.mockRejectedValue(
			Object.assign(new Error("Cooldown"), { code: "BIS_REFRESH_COOLDOWN" }),
		);
	await expect(getDashboardBisStatus("user", "site", true)).resolves.toEqual({
		enabled: false,
		unavailable: true,
	});
	expect(console.warn).not.toHaveBeenCalled();
});
it("also isolates token-storage/config read failures while never claiming BIS is usable", async () => {
	jest
		.mocked(getSiteBisConfig)
		.mockRejectedValue(new Error("Database unavailable"));
	await expect(getDashboardBisStatus("user", "site", true)).resolves.toEqual({
		enabled: false,
		unavailable: true,
	});
	expect(getUserBisTokenByUserId).not.toHaveBeenCalled();
});
