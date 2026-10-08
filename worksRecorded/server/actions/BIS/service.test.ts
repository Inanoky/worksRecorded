const queryRawMock = jest.fn();
const executeRawMock = jest.fn();
const transactionMock = jest.fn();

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$executeRaw: executeRawMock,
		$queryRaw: queryRawMock,
		$transaction: transactionMock,
	},
}));

jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: jest.fn(),
}));

jest.mock("@/server/actions/shared-actions", () => ({
	orgCheck: jest.fn(),
}));

jest.mock("./TestBisEnv/relay", () => ({
	bisFetch: jest.fn(),
}));

import {
	getUserBisTokenByUserId,
	refreshBisAccessToken,
	upsertUserBisToken,
} from "./service";
import { bisFetch } from "./TestBisEnv/relay";

function createRawQueryError({
	databaseCode = "42P01",
	message = 'relation "BisToken" does not exist',
}: {
	databaseCode?: string;
	message?: string;
} = {}) {
	return {
		code: "P2010",
		message: `Raw query failed. Code: ${databaseCode}. Message: ${message}`,
		meta: {
			code: databaseCode,
			message,
		},
	};
}

describe("BIS token reads", () => {
	let warnSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it("returns disconnected state when the BisToken relation is missing", async () => {
		queryRawMock.mockRejectedValue(createRawQueryError());

		await expect(getUserBisTokenByUserId("user-1")).resolves.toBeNull();
		expect(warnSpy).toHaveBeenCalledWith(
			"[BIS] Token storage is unavailable; continuing with BIS disabled",
			{ prismaCode: "P2010", databaseCode: "42P01" },
		);
	});

	it("uses the public BisToken relation", async () => {
		queryRawMock.mockResolvedValue([]);

		await expect(getUserBisTokenByUserId("user-1")).resolves.toBeNull();
		expect(queryRawMock.mock.calls[0][0].join(" ")).toContain(
			'FROM "public"."BisToken"',
		);
	});

	it("rethrows a missing-relation error for another table", async () => {
		const error = createRawQueryError({
			message: 'relation "AnotherTable" does not exist',
		});
		queryRawMock.mockRejectedValue(error);

		await expect(getUserBisTokenByUserId("user-1")).rejects.toBe(error);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("rethrows unrelated raw-query errors", async () => {
		const error = createRawQueryError({
			databaseCode: "42501",
			message: "permission denied",
		});
		queryRawMock.mockRejectedValue(error);

		await expect(getUserBisTokenByUserId("user-1")).rejects.toBe(error);
		expect(warnSpy).not.toHaveBeenCalled();
	});
});

describe("BIS token renewal", () => {
	const stored = {
		id: "token-1",
		userId: "user-1",
		accessToken: "expired-access",
		refreshToken: "stored-refresh",
		updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
	};
	const fetchMock = jest.mocked(bisFetch);
	let logSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	function response(status: number, payload: unknown) {
		return {
			ok: status >= 200 && status < 300,
			status,
			text: async () => JSON.stringify(payload),
		} as Response;
	}

	beforeEach(() => {
		jest.resetAllMocks();
		process.env.BIS_CLIENT_ID = "test-client";
		process.env.BIS_CLIENT_SECRET = "test-secret";
		logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
		errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
		queryRawMock.mockResolvedValue([stored]);
		executeRawMock.mockResolvedValue(1);
		transactionMock.mockImplementation(async (callback) =>
			callback({ $queryRaw: queryRawMock, $executeRaw: executeRawMock }),
		);
		fetchMock.mockResolvedValue(
			response(200, {
				access_token: "renewed-access",
				refresh_token: "rotated-refresh",
			}),
		);
	});

	afterEach(() => {
		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	it("renews using the account's database refresh token and saves both tokens", async () => {
		const result = await getUserBisTokenByUserId("user-1");
		expect(result).toMatchObject({
			id: "token-1",
			accessToken: "renewed-access",
			refreshToken: "rotated-refresh",
		});
		const [, url, init] = fetchMock.mock.calls[0];
		expect(url).toMatch(/\/bisp\/api\/auth\/oauth2\.0\/token$/);
		expect(init).toMatchObject({ method: "POST", cache: "no-store" });
		expect(init?.body?.toString()).toBe(
			"grant_type=refresh_token&refresh_token=stored-refresh",
		);
		expect(init?.headers).toMatchObject({
			Authorization: `Basic ${Buffer.from("test-client:test-secret").toString("base64")}`,
		});
		expect(queryRawMock.mock.calls[1][0].join(" ")).toContain("FOR UPDATE");
		expect(queryRawMock.mock.calls[1].slice(1)).toEqual(["user-1"]);
		expect(executeRawMock.mock.calls[0].slice(1)).toEqual([
			"renewed-access",
			"rotated-refresh",
			"token-1",
			"user-1",
		]);
	});

	it("retains the saved refresh token if BIS does not rotate it", async () => {
		fetchMock.mockResolvedValue(
			response(200, { access_token: "renewed-access" }),
		);
		await expect(refreshBisAccessToken("user-1")).resolves.toMatchObject({
			refreshToken: "stored-refresh",
		});
	});

	it("does not renew a fresh access token", async () => {
		queryRawMock.mockResolvedValue([{ ...stored, updatedAt: new Date() }]);
		await expect(getUserBisTokenByUserId("user-1")).resolves.toMatchObject({
			accessToken: "expired-access",
		});
		expect(fetchMock).not.toHaveBeenCalled();
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it("renews one minute before the two-hour expiry", async () => {
		queryRawMock.mockResolvedValue([
			{ ...stored, updatedAt: new Date(Date.now() - 119 * 60 * 1000) },
		]);
		await expect(getUserBisTokenByUserId("user-1")).resolves.toMatchObject({
			accessToken: "renewed-access",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each([400, 401, 429, 500])(
		"retains the connection on renewal HTTP %s",
		async (status) => {
			fetchMock.mockResolvedValue(
				response(status, { error: "invalid_client" }),
			);
			await expect(getUserBisTokenByUserId("user-1")).rejects.toThrow();
			expect(executeRawMock).not.toHaveBeenCalled();
		},
	);

	it("retains the connection on network failure and permits another attempt", async () => {
		fetchMock.mockRejectedValueOnce(new Error("timeout"));
		await expect(getUserBisTokenByUserId("user-1")).rejects.toThrow("timeout");
		expect(executeRawMock).not.toHaveBeenCalled();
		await expect(getUserBisTokenByUserId("user-1")).resolves.toMatchObject({
			accessToken: "renewed-access",
		});
	});

	it("coalesces parallel renewal requests for the same account", async () => {
		const result = await Promise.all(
			Array.from({ length: 5 }, () => getUserBisTokenByUserId("user-1")),
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(transactionMock).toHaveBeenCalledTimes(1);
		expect(
			result.every((token) => token?.accessToken === "renewed-access"),
		).toBe(true);
	});

	it("uses a newer connection saved while the request waited for the database lock", async () => {
		queryRawMock
			.mockResolvedValueOnce([stored])
			.mockResolvedValueOnce([
				{
					...stored,
					accessToken: "new-login-access",
					refreshToken: "new-login-refresh",
					updatedAt: new Date(),
				},
			]);
		await expect(getUserBisTokenByUserId("user-1")).resolves.toMatchObject({
			accessToken: "new-login-access",
		});
		expect(fetchMock).not.toHaveBeenCalled();
		expect(executeRawMock).not.toHaveBeenCalled();
	});

	it("recognizes renewal by another worker even when the refresh token is unchanged", async () => {
		queryRawMock
			.mockResolvedValueOnce([stored])
			.mockResolvedValueOnce([
				{
					...stored,
					accessToken: "other-worker-access",
					updatedAt: new Date(),
				},
			]);
		await expect(getUserBisTokenByUserId("user-1")).resolves.toMatchObject({
			accessToken: "other-worker-access",
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("does not use a caller's refresh token when its account is disconnected", async () => {
		queryRawMock.mockResolvedValue([]);
		await expect(
			refreshBisAccessToken("user-1", "caller-refresh"),
		).rejects.toThrow("BIS is not connected");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("atomically saves a reconnected account without deleting the token row", async () => {
		await upsertUserBisToken("user-1", "login-access", "login-refresh");
		expect(executeRawMock).toHaveBeenCalledTimes(1);
		const sql = executeRawMock.mock.calls[0][0].join(" ");
		expect(sql).toContain('ON CONFLICT ("userId") DO UPDATE');
		expect(sql).not.toContain("DELETE");
	});
});
