const mockScheduled = jest.fn();
jest.mock("@/flows/default-construction/backend/diary-feedback", () => ({
	runScheduledDiaryFeedback: () => mockScheduled(),
}));

import { GET } from "./route";

describe("feedback scheduler authentication", () => {
	const responseDescriptor = Object.getOwnPropertyDescriptor(
		globalThis,
		"Response",
	);
	beforeAll(() =>
		Object.defineProperty(globalThis, "Response", {
			configurable: true,
			value: {
				json: (body: unknown, init?: { status?: number }) => ({
					status: init?.status || 200,
					json: async () => body,
				}),
			},
		}),
	);
	afterAll(() => {
		if (responseDescriptor)
			Object.defineProperty(globalThis, "Response", responseDescriptor);
		else Reflect.deleteProperty(globalThis, "Response");
	});
	const originalSecret = process.env.CRON_SECRET;
	afterEach(() => {
		if (originalSecret === undefined) delete process.env.CRON_SECRET;
		else process.env.CRON_SECRET = originalSecret;
		jest.clearAllMocks();
	});
	it("fails closed if CRON_SECRET is missing", async () => {
		delete process.env.CRON_SECRET;
		const result = await GET({
			headers: new Headers({ authorization: "Bearer undefined" }),
		} as Request);
		expect(result.status).toBe(401);
		expect(mockScheduled).not.toHaveBeenCalled();
	});
	it("rejects unauthenticated requests", async () => {
		process.env.CRON_SECRET = "test-secret";
		expect((await GET({ headers: new Headers() } as Request)).status).toBe(401);
	});
	it("refreshes only for the authenticated scheduler", async () => {
		process.env.CRON_SECRET = "test-secret";
		mockScheduled.mockResolvedValue([{ siteId: "site-a", status: "updated" }]);
		expect(
			(
				await GET({
					headers: new Headers({ authorization: "Bearer test-secret" }),
				} as Request)
			).status,
		).toBe(200);
		expect(mockScheduled).toHaveBeenCalledTimes(1);
	});
});
