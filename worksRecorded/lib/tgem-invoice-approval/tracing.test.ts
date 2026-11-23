const mockFlush = jest.fn();
const mockClient = jest.fn();

jest.mock("langsmith", () => ({
	Client: class {
		constructor(...args: unknown[]) {
			mockClient(...args);
		}
		awaitPendingTraceBatches() {
			return mockFlush();
		}
	},
}));

import { buildTgemInvoiceLangSmithConfig } from "./langsmith";
import {
	getTgemInvoiceTracingClient,
	withTgemInvoiceTraceFlush,
} from "./tracing";

beforeEach(() => {
	mockFlush.mockReset().mockResolvedValue(undefined);
});

it("shares the flushing client across intake, processing, and request traces for every channel", () => {
	const client = getTgemInvoiceTracingClient();
	for (const source of ["dashboard", "whatsapp", "email"] as const) {
		for (const stage of ["request", "intake", "processing"] as const) {
			expect(buildTgemInvoiceLangSmithConfig({ source, stage }).client).toBe(
				client,
			);
		}
	}
	expect(mockClient).toHaveBeenCalledTimes(1);
	expect(mockClient).toHaveBeenCalledWith({
		timeout_ms: 5_000,
		callerOptions: { maxRetries: 1 },
	});
});

it("waits for both the traced operation and its final trace delivery before returning", async () => {
	const events: string[] = [];
	let finishOperation!: (result: string) => void;
	let finishFlush!: () => void;
	mockFlush.mockImplementationOnce(() => {
		events.push("flush");
		return new Promise<void>((resolve) => {
			finishFlush = resolve;
		});
	});
	const result = withTgemInvoiceTraceFlush(
		() =>
			new Promise<string>((resolve) => {
				finishOperation = resolve;
			}),
	);
	let returned = false;
	void result.then(() => {
		returned = true;
	});
	expect(mockFlush).not.toHaveBeenCalled();
	finishOperation("invoice saved");
	await Promise.resolve();
	expect(events).toEqual(["flush"]);
	expect(returned).toBe(false);
	finishFlush();
	await expect(result).resolves.toBe("invoice saved");
});

it("flushes failures and preserves the original processing error", async () => {
	const original = new Error("OCR failed");
	const operation = jest.fn().mockRejectedValue(original);
	await expect(withTgemInvoiceTraceFlush(operation)).rejects.toBe(original);
	expect(mockFlush).toHaveBeenCalledTimes(1);
	expect(operation).toHaveBeenCalledTimes(1);
});

it("does not turn a successful invoice into a failure or retry when trace flushing fails", async () => {
	const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
	mockFlush.mockRejectedValueOnce(
		new Error("private tracing transport failure"),
	);
	const operation = jest.fn().mockResolvedValue({ invoiceCaseId: "case-1" });
	try {
		await expect(withTgemInvoiceTraceFlush(operation)).resolves.toEqual({
			invoiceCaseId: "case-1",
		});
		expect(operation).toHaveBeenCalledTimes(1);
		expect(warning).toHaveBeenCalledWith(
			"[TGEM] Could not flush LangSmith trace updates",
		);
	} finally {
		warning.mockRestore();
	}
});

it("preserves the original error even when flushing also fails", async () => {
	const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
	const original = new Error("Invoice write failed");
	mockFlush.mockRejectedValueOnce(new Error("Tracing failed"));
	try {
		await expect(
			withTgemInvoiceTraceFlush(async () => {
				throw original;
			}),
		).rejects.toBe(original);
	} finally {
		warning.mockRestore();
	}
});
