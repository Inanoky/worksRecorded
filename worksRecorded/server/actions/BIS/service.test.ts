const queryRawMock = jest.fn();

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$executeRaw: jest.fn(),
		$queryRaw: queryRawMock,
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

import { getUserBisTokenByUserId } from "./service";

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
