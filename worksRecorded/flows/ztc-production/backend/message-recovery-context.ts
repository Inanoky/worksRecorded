import { AsyncLocalStorage } from "node:async_hooks";

export type ZtcMessageRecoveryContext = {
	workerId: string;
	messageIds: string[];
	deadline: number;
	stopped: boolean;
	awaitingBatch: boolean;
};

const recovery = new AsyncLocalStorage<ZtcMessageRecoveryContext>();

export class ZtcMessageDeadlineError extends Error {
	constructor() {
		super("ZTC message processing deadline exceeded");
		this.name = "ZtcMessageDeadlineError";
	}
}

export function getZtcMessageRecoveryContext() {
	return recovery.getStore();
}

export function withZtcMessageRecoveryContext<T>(
	context: ZtcMessageRecoveryContext,
	run: () => Promise<T>,
) {
	return recovery.run(context, run);
}

export function assertZtcMessageActive() {
	const context = recovery.getStore();
	if (!context) return;
	if (context.stopped || Date.now() >= context.deadline) {
		context.stopped = true;
		throw new ZtcMessageDeadlineError();
	}
}

export function setZtcRecoveryBatch(formData: FormData) {
	const context = recovery.getStore();
	if (!context) return;
	assertZtcMessageActive();
	const value = formData.get("MetaBatchMessageIds");
	if (typeof value !== "string") return;
	const ids: unknown = JSON.parse(value);
	if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id)) {
		throw new Error("Invalid ZTC recovery batch message IDs");
	}
	context.messageIds = Array.from(new Set([...context.messageIds, ...ids]));
}

export function markZtcRecoveryAwaitingBatch() {
	const context = recovery.getStore();
	if (context) context.awaitingBatch = true;
}
