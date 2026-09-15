jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: jest.fn(),
}));
jest.mock(
	"@/flows/default-construction/backend/warehouse-import-actions",
	() => ({ importWarehouseInvoice: jest.fn() }),
);

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { POST } from "@/app/api/warehouse/invoices/import/route";
import { importWarehouseInvoice } from "@/flows/default-construction/backend/warehouse-import-actions";

const mockUser = jest.fn();
const request = (body: unknown, origin = "https://worksrecorded.com") =>
	({
		url: "https://worksrecorded.com/api/warehouse/invoices/import",
		headers: { get: () => origin },
		json: async () => body,
	}) as unknown as Request;

describe("warehouse invoice processing endpoint", () => {
	const originalResponse = global.Response;
	beforeEach(() => {
		jest.resetAllMocks();
		global.Response = {
			json: (body: unknown, init: ResponseInit) => ({
				status: init.status,
				json: async () => body,
			}),
		} as unknown as typeof Response;
		jest
			.mocked(getKindeServerSession)
			.mockReturnValue({ getUser: mockUser } as never);
		mockUser.mockResolvedValue({ id: "user-1" });
	});
	afterEach(() => {
		global.Response = originalResponse;
	});
	it("rejects unauthenticated and cross-origin requests before processing", async () => {
		expect(
			(await POST(request({ receipt: "signed" }, "https://other.test"))).status,
		).toBe(403);
		mockUser.mockResolvedValue(null);
		expect((await POST(request({ receipt: "signed" }))).status).toBe(401);
		expect(importWarehouseInvoice).not.toHaveBeenCalled();
	});
	it.each([{}, { receipt: "" }, { receipt: "x".repeat(12001) }])(
		"rejects invalid input",
		async (body) => {
			expect((await POST(request(body))).status).toBe(400);
			expect(importWarehouseInvoice).not.toHaveBeenCalled();
		},
	);
	it.each([
		[{ ok: true, count: 2, duplicate: false }, 200],
		[{ ok: false, error: "access" }, 403],
		[{ ok: false, error: "empty" }, 422],
		[{ ok: false, error: "processing" }, 500],
	] as const)(
		"returns the individual processing result with its status",
		async (result, status) => {
			jest.mocked(importWarehouseInvoice).mockResolvedValue(result);
			const response = await POST(request({ receipt: "signed" }));
			expect(importWarehouseInvoice).toHaveBeenCalledWith("signed");
			expect(response.status).toBe(status);
			expect(await response.json()).toEqual(result);
		},
	);
});
