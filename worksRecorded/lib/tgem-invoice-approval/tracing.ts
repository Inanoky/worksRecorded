import { Client } from "langsmith";

let client: Client | undefined;

export function getTgemInvoiceTracingClient() {
	client ??= new Client({
		timeout_ms: 5_000,
		callerOptions: { maxRetries: 1 },
	});
	return client;
}

export async function withTgemInvoiceTraceFlush<T>(
	operation: () => Promise<T>,
): Promise<T> {
	try {
		return await operation();
	} finally {
		try {
			await getTgemInvoiceTracingClient().awaitPendingTraceBatches();
		} catch {
			console.warn("[TGEM] Could not flush LangSmith trace updates");
		}
	}
}
