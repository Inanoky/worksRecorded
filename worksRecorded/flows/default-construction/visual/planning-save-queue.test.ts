import type { saveVisualPlanningItem } from "./actions";
import {
	compareVisualPlanProgress,
	type VisualPlanInput,
} from "./planning-model";
import { sameVisualPlanningContent } from "./planning-save-queue";
import {
	VisualClientCache,
	type VisualPlanningIndex,
} from "./visual-client-cache";

const siteId = "33333333-3333-4333-8333-333333333333";
const drawingId = "22222222-2222-4222-8222-222222222222";
const input: VisualPlanInput = {
	siteId,
	drawingId,
	work: "XPS",
	location: "1. stāvs",
	unit: "m2",
	quantity: 20,
	startDate: "2026-10-21",
	endDate: "2026-10-23",
	contactId: null,
	geometry: {
		version: 1,
		areas: [
			{
				id: "zone",
				page: 1,
				polygon: [
					{ x: 0.1, y: 0.1 },
					{ x: 0.5, y: 0.1 },
					{ x: 0.5, y: 0.5 },
				],
			},
		],
	},
};
const index: VisualPlanningIndex = {
	today: "2026-10-21",
	location: input.location,
	plans: [],
	contacts: [],
	workOptions: [],
	unitOptions: [],
};
type Result = Awaited<ReturnType<typeof saveVisualPlanningItem>>;
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
function setup() {
	const cache = new VisualClientCache(siteId);
	cache.rememberPlanning(drawingId, index);
	const pending = deferred<Result>();
	const transport = jest.fn((_input: VisualPlanInput) => pending.promise);
	const queue = cache.getPlanningSaveQueue(transport);
	return { cache, queue, transport, pending };
}
function confirmed(
	plan: ReturnType<ReturnType<typeof setup>["queue"]["enqueue"]>,
): Result {
	return {
		ok: true,
		plan: {
			...plan,
			progress: compareVisualPlanProgress(plan, [], index.today),
		},
	};
}

it("shows a new plan locally before a slow server responds and merges its acknowledgement without reloading", async () => {
	const { cache, queue, transport, pending } = setup();
	const plan = queue.enqueue(input);
	expect(cache.peekPlanning(drawingId)?.plans[0]).toMatchObject({
		id: plan.id,
		quantity: 20,
	});
	expect(queue.getSnapshot()[0].status).toBe("saving");
	expect(transport).toHaveBeenCalledWith(
		expect.objectContaining({
			clientId: plan.id,
			mutationId: expect.any(String),
		}),
	);
	pending.resolve(confirmed(plan));
	await pending.promise;
	expect(queue.getSnapshot()).toEqual([]);
	expect(cache.peekPlanning(drawingId)?.plans[0]).toMatchObject({
		id: plan.id,
		progress: { actualQuantity: 0 },
	});
});

it("retains optimistic changes across stale reads and retries a lost acknowledgement with the same IDs", async () => {
	const { cache, queue, transport, pending } = setup();
	const plan = queue.enqueue(input);
	const request = transport.mock.calls[0];
	await cache.refreshPlanning(drawingId, async () => index);
	expect(cache.peekPlanning(drawingId)?.plans[0].id).toBe(plan.id);
	pending.reject(new Error("Connection lost"));
	await pending.promise.catch(() => {});
	expect(queue.getSnapshot()[0].status).toBe("failed");
	const retry = deferred<Result>();
	transport.mockReturnValueOnce(retry.promise);
	queue.retry(plan.id);
	expect(transport.mock.calls[1]).toEqual(request);
	retry.resolve(confirmed(plan));
	await retry.promise;
	expect(queue.getSnapshot()).toEqual([]);
	expect(cache.peekPlanning(drawingId)?.plans).toHaveLength(1);
});

it("does not let a stale in-flight read overwrite a confirmed save", async () => {
	const { cache, queue, pending } = setup();
	const read = deferred<VisualPlanningIndex>();
	const loading = cache.refreshPlanning(drawingId, () => read.promise);
	const plan = queue.enqueue(input);
	pending.resolve(confirmed(plan));
	await pending.promise;
	read.resolve(index);
	expect((await loading).plans[0].id).toBe(plan.id);
});

it("saves separate floors independently and keeps unconfirmed plans after a remount", async () => {
	const { cache, queue, pending } = setup();
	const secondId = "44444444-4444-4444-8444-444444444444";
	cache.rememberPlanning(secondId, { ...index, location: "2. stāvs" });
	const plan = queue.enqueue(input);
	expect(cache.getPlanningSaveQueue(jest.fn())).toBe(queue);
	expect(cache.peekPlanning(secondId)?.plans).toEqual([]);
	expect(cache.peekPlanning(drawingId)?.plans[0].id).toBe(plan.id);
	expect(queue.enqueue({ ...input, id: plan.id, version: 1 })).toEqual(plan);
	expect(queue.getSnapshot()).toHaveLength(1);
	expect(queue.getSnapshot()[0].nextInput).toBeUndefined();
	pending.resolve(confirmed(plan));
	await pending.promise;
});

it("restores pending changes after a tab reload without automatically replaying writes", async () => {
	const { queue, pending } = setup();
	let stored: string | null = null;
	queue.attachStorage(null, (value) => {
		stored = value;
	});
	const plan = queue.enqueue(input);
	const restored = setup();
	restored.queue.attachStorage(stored, jest.fn());
	expect(restored.queue.getSnapshot()[0]).toMatchObject({
		id: plan.id,
		status: "failed",
	});
	expect(restored.cache.peekPlanning(drawingId)?.plans[0].id).toBe(plan.id);
	expect(restored.transport).not.toHaveBeenCalled();
	queue.detachStorage();
	pending.resolve(confirmed(plan));
	await pending.promise;
});

it("rejects restored requests from another project and discards failed local changes explicitly", async () => {
	const { cache, queue, pending } = setup();
	const plan = queue.enqueue(input);
	queue.discard(plan.id);
	expect(queue.getSnapshot()).toHaveLength(1);
	pending.resolve({
		ok: false,
		code: "invalid",
		error: "Changed by another user",
	});
	await pending.promise;
	const other = new VisualClientCache("another-site").getPlanningSaveQueue(
		jest.fn(),
	);
	other.attachStorage(JSON.stringify(queue.getSnapshot()), jest.fn());
	expect(other.getSnapshot()).toEqual([]);
	queue.discard(plan.id);
	expect(cache.peekPlanning(drawingId)?.plans).toEqual([]);
});

it("preserves WhatsApp send history while projecting and confirming a planning edit", async () => {
	const { cache, queue, pending } = setup();
	const saved = {
		...input,
		id: "11111111-1111-4111-8111-111111111111",
		version: 1,
		geometryReviewRequired: false,
		archivedAt: null,
	};
	const history = {
		id: "send",
		planVersion: 1,
		recipient: "37120000000",
		message: "Task",
		status: "sent",
		createdAt: "2026-10-21T10:00:00Z",
		completedAt: "2026-10-21T10:00:01Z",
		items: [],
	};
	cache.rememberPlanning(drawingId, {
		...index,
		plans: [
			{
				...saved,
				progress: compareVisualPlanProgress(saved, [], index.today),
				whatsAppSends: [history],
			},
		],
	});
	const plan = queue.enqueue({
		...input,
		id: saved.id,
		version: 1,
		quantity: 40,
	});
	expect(cache.peekPlanning(drawingId)?.plans[0].whatsAppSends).toEqual([
		history,
	]);
	pending.resolve(confirmed(plan));
	await pending.promise;
	expect(cache.peekPlanning(drawingId)?.plans[0].whatsAppSends).toEqual([
		history,
	]);
});

it("combines rapid local edits into one background write with the original version", async () => {
	jest.useFakeTimers();
	try {
		const { cache, queue, transport, pending } = setup();
		const first = queue.enqueue(input, 300);
		const latest = queue.enqueue(
			{ ...input, id: first.id, version: 1, quantity: 40 },
			300,
		);
		expect(cache.peekPlanning(drawingId)?.plans[0].quantity).toBe(40);
		expect(transport).not.toHaveBeenCalled();
		jest.advanceTimersByTime(300);
		expect(transport).toHaveBeenCalledTimes(1);
		expect(transport).toHaveBeenCalledWith(
			expect.objectContaining({
				id: undefined,
				clientId: first.id,
				version: undefined,
				quantity: 40,
			}),
		);
		pending.resolve(confirmed(latest));
		await pending.promise;
		expect(queue.getSnapshot()).toEqual([]);
	} finally {
		jest.useRealTimers();
	}
});

it("compares unchanged geometry by values rather than JSON property order", () => {
	const geometry = {
		...input.geometry,
		section: "PA1.6",
		quantitySource: "area" as const,
	};
	const saved = {
		...input,
		id: "saved",
		version: 2,
		geometryReviewRequired: false,
		archivedAt: null,
		geometry,
	};
	expect(
		sameVisualPlanningContent(saved, {
			...input,
			geometry: {
				quantitySource: "area",
				section: "PA1.6",
				areas: input.geometry.areas,
				version: 1,
			},
		}),
	).toBe(true);
});

it("keeps the newest edit visible while an older save completes and rebases the next write", async () => {
	const { cache, queue, transport, pending } = setup();
	const first = queue.enqueue({
		...input,
		id: "11111111-1111-4111-8111-111111111111",
		version: 2,
	});
	const second = deferred<Result>();
	transport.mockReturnValueOnce(second.promise);
	queue.enqueue({ ...input, id: first.id, version: 3, quantity: 30 });
	const latest = queue.enqueue({
		...input,
		id: first.id,
		version: 4,
		quantity: 40,
	});
	expect(cache.peekPlanning(drawingId)?.plans[0].quantity).toBe(40);
	expect(transport).toHaveBeenCalledTimes(1);
	pending.resolve(confirmed(first));
	await pending.promise;
	expect(cache.peekPlanning(drawingId)?.plans[0].quantity).toBe(40);
	expect(transport).toHaveBeenCalledTimes(2);
	expect(transport).toHaveBeenLastCalledWith(
		expect.objectContaining({ id: first.id, version: 3, quantity: 40 }),
	);
	second.resolve(confirmed(latest));
	await second.promise;
	expect(queue.getSnapshot()).toEqual([]);
	expect(cache.peekPlanning(drawingId)?.plans[0]).toMatchObject({
		quantity: 40,
		version: 4,
	});
});

it("restores a newer edit after a lost acknowledgement and retries the original mutation first", async () => {
	const { queue, transport, pending } = setup();
	let stored: string | null = null;
	queue.attachStorage(null, (value) => {
		stored = value;
	});
	const first = queue.enqueue(input);
	const original = transport.mock.calls[0][0];
	const latest = queue.enqueue({
		...input,
		id: first.id,
		version: 1,
		quantity: 40,
	});
	pending.reject(new Error("Offline"));
	await pending.promise.catch(() => {});
	const restored = setup();
	restored.queue.attachStorage(stored, jest.fn());
	expect(restored.cache.peekPlanning(drawingId)?.plans[0].quantity).toBe(40);
	const second = deferred<Result>();
	restored.transport
		.mockReturnValueOnce(restored.pending.promise)
		.mockReturnValueOnce(second.promise);
	restored.queue.retry(first.id);
	expect(restored.transport).toHaveBeenCalledWith(original);
	restored.pending.resolve(confirmed(first));
	await restored.pending.promise;
	expect(restored.transport).toHaveBeenLastCalledWith(
		expect.objectContaining({ id: first.id, version: 1, quantity: 40 }),
	);
	expect(restored.cache.peekPlanning(drawingId)?.plans[0].quantity).toBe(40);
	second.resolve(confirmed(latest));
	await second.promise;
	expect(restored.queue.getSnapshot()).toEqual([]);
});
