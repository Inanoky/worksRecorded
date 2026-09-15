import { importWarehouseInvoice } from "./warehouse-import-client";

describe("warehouse import HTTP client", () => {
	const originalFetch = global.fetch;
	afterEach(() => {
		global.fetch = originalFetch;
	});
	it("issues independent POST requests without a server-action queue", async () => {
		const finish: Array<(value: Response) => void> = [];
		const fetchMock = jest.fn(
			() => new Promise<Response>((resolve) => finish.push(resolve)),
		);
		global.fetch = fetchMock;
		const requests = Promise.all([
			importWarehouseInvoice("receipt-a"),
			importWarehouseInvoice("receipt-b"),
		]);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/warehouse/invoices/import",
			expect.objectContaining({
				method: "POST",
				credentials: "same-origin",
				body: JSON.stringify({ receipt: "receipt-a" }),
			}),
		);
		finish[1]({
			status: 200,
			json: async () => ({ ok: true, count: 2, duplicate: false }),
		} as Response);
		finish[0]({ status: 403 } as Response);
		expect(await requests).toEqual([
			{ ok: false, error: "access" },
			{ ok: true, count: 2, duplicate: false },
		]);
	});
});
