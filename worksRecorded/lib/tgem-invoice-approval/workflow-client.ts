import { start } from "workflow/api";
import {
	processTgemInboundEmailWorkflow,
	processTgemInvoiceWorkflow,
	type TgemInvoiceProcessingInput,
} from "@/workflows/tgem-invoice";

export async function enqueueTgemInvoiceProcessing(
	input: TgemInvoiceProcessingInput,
) {
	const run = await start(processTgemInvoiceWorkflow, [input]);
	return { runId: run.runId };
}

export async function enqueueTgemInboundEmail(emailId: string) {
	const run = await start(processTgemInboundEmailWorkflow, [emailId]);
	return { runId: run.runId };
}
