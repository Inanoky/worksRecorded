import type { saveVisualPlanningItem } from "./actions";
import {
	compareVisualPlanProgress,
	type VisualPlan,
	type VisualPlanInput,
	type VisualPlanProgress,
	visualPlanInputSchema,
} from "./planning-model";

export type PlanningSaveItem = {
	id: string;
	input: VisualPlanInput;
	nextInput?: VisualPlanInput;
	plan: VisualPlan;
	status: "saving" | "failed";
	error?: string;
	conflict?: VisualPlan;
};
type SavedPlan = VisualPlan & { progress?: VisualPlanProgress };
type Transport = (
	input: VisualPlanInput,
) => ReturnType<typeof saveVisualPlanningItem>;

export function planningItem(
	plan: SavedPlan,
	previous: (VisualPlan & { progress: VisualPlanProgress }) | undefined,
	today: string,
) {
	if (plan.progress) return { ...plan, progress: plan.progress };
	const sameActuals =
		previous &&
		["work", "location", "unit", "startDate"].every(
			(key) =>
				plan[key as keyof VisualPlan] === previous[key as keyof VisualPlan],
		);
	const progress = compareVisualPlanProgress(plan, [], today);
	if (sameActuals) {
		const actual = previous.progress.actualQuantity;
		return {
			...plan,
			progress: {
				...progress,
				...previous.progress,
				progressPercent:
					actual === null ? null : (actual / plan.quantity) * 100,
				variance: actual === null ? null : actual - plan.quantity,
				status:
					actual !== null && actual >= plan.quantity
						? ("completed" as const)
						: progress.status,
			},
		};
	}
	return {
		...plan,
		progress: {
			...progress,
			actualQuantity: null,
			progressPercent: null,
			variance: null,
			dataIncomplete: true,
		},
	};
}

export class PlanningSaveQueue {
	private items: PlanningSaveItem[] = [];
	private listeners = new Set<() => void>();
	private persist?: (value: string | null) => void;
	private running = new Set<string>();
	private timers = new Map<string, ReturnType<typeof setTimeout>>();
	constructor(
		private readonly transport: Transport,
		private readonly onSaved: (drawingId: string, plan: SavedPlan) => void,
		private readonly siteId: string,
	) {}
	getSnapshot = () => this.items;
	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
	enqueue(input: VisualPlanInput, delay = 0) {
		if (input.siteId !== this.siteId)
			throw new Error("Plāns nepieder šim projektam.");
		const id = input.id ?? input.clientId ?? crypto.randomUUID();
		const previous = this.items.find((item) => item.id === id);
		if (previous && previous.input.drawingId !== input.drawingId)
			throw new Error("Plāns nepieder šim rasējumam.");
		if (previous && sameVisualPlanningContent(previous.plan, input))
			return previous.plan;
		const defer =
			previous && (this.running.has(id) || previous.status === "failed");
		const request = {
			...input,
			...(previous
				? defer
					? { id, version: (previous.input.version ?? 0) + 1 }
					: {
							id: previous.input.id,
							clientId: previous.input.clientId,
							version: previous.input.version,
						}
				: !input.id
					? { clientId: id }
					: {}),
			mutationId: crypto.randomUUID(),
		};
		const plan: VisualPlan = {
			...input,
			id,
			version: (request.version ?? 0) + 1,
			geometryReviewRequired: false,
			archivedAt: null,
		};
		const item: PlanningSaveItem = defer
			? {
					...previous,
					nextInput: request,
					plan,
				}
			: {
					id,
					input: request,
					plan,
					status: "saving",
				};
		this.items = previous
			? this.items.map((entry) => (entry.id === id ? item : entry))
			: [...this.items, item];
		this.publish();
		if (item.status === "saving") this.schedule(id, delay);
		return plan;
	}
	retry(id: string) {
		const item = this.items.find((entry) => entry.id === id);
		if (!item || item.status !== "failed") return;
		const next = {
			...item,
			status: "saving" as const,
			error: undefined,
			conflict: undefined,
		};
		this.items = this.items.map((entry) => (entry === item ? next : entry));
		this.publish();
		this.schedule(id, 0);
	}
	discard(id: string) {
		if (!this.items.some((item) => item.id === id && item.status === "failed"))
			return;
		this.items = this.items.filter((item) => item.id !== id);
		this.publish();
	}
	attachStorage(raw: string | null, persist: (value: string | null) => void) {
		this.persist = persist;
		try {
			const restored: PlanningSaveItem[] = JSON.parse(raw ?? "[]");
			for (const item of restored) {
				const parsed = visualPlanInputSchema.safeParse(item?.input);
				if (
					!parsed.success ||
					parsed.data.siteId !== this.siteId ||
					item.id !== (parsed.data.id ?? parsed.data.clientId) ||
					!item?.id ||
					!item.input?.mutationId ||
					this.items.some((entry) => entry.id === item.id)
				)
					continue;
				const parsedNext = visualPlanInputSchema.safeParse(item.nextInput);
				const nextInput =
					parsedNext.success &&
					parsedNext.data.mutationId &&
					parsedNext.data.siteId === this.siteId &&
					parsedNext.data.id === item.id &&
					parsedNext.data.drawingId === parsed.data.drawingId
						? parsedNext.data
						: undefined;
				this.items = [
					...this.items,
					{
						id: item.id,
						input: parsed.data,
						...(nextInput ? { nextInput } : {}),
						plan: {
							...(nextInput ?? parsed.data),
							id: item.id,
							version: (parsed.data.version ?? 0) + (nextInput ? 2 : 1),
							geometryReviewRequired: false,
							archivedAt: null,
						},
						status: "failed",
						error:
							"Iepriekšējā saglabāšana nav apstiprināta. Mēģiniet vēlreiz.",
					},
				];
			}
		} catch {}
		this.publish();
	}
	detachStorage() {
		this.persist = undefined;
	}
	private publish() {
		try {
			this.persist?.(this.items.length ? JSON.stringify(this.items) : null);
		} catch {}
		for (const listener of this.listeners) listener();
	}
	private schedule(id: string, delay: number) {
		clearTimeout(this.timers.get(id));
		this.timers.delete(id);
		if (this.running.has(id)) return;
		if (delay > 0)
			this.timers.set(
				id,
				setTimeout(() => {
					this.timers.delete(id);
					void this.run(id);
				}, delay),
			);
		else void this.run(id);
	}
	private async run(id: string) {
		if (this.running.has(id)) return;
		this.running.add(id);
		try {
			while (true) {
				const item = this.items.find((entry) => entry.id === id);
				if (!item || item.status !== "saving") break;
				const result = await this.transport(item.input);
				const latest = this.items.find((entry) => entry.id === id) ?? item;
				if (!result.ok) {
					this.items = this.items.map((entry) =>
						entry.id === id
							? {
									...latest,
									status: "failed",
									error: result.error,
									conflict: result.conflict,
								}
							: entry,
					);
					break;
				} else {
					if (result.plan.id !== item.id)
						throw new Error("Serveris neatgrieza gaidīto plānu.");
					this.onSaved(item.input.drawingId, result.plan);
					if (latest.nextInput) {
						const input = {
							...latest.nextInput,
							id,
							clientId: undefined,
							version: result.plan.version,
						};
						this.items = this.items.map((entry) =>
							entry.id === id
								? {
										...latest,
										input,
										nextInput: undefined,
										plan: { ...latest.plan, version: result.plan.version + 1 },
									}
								: entry,
						);
					} else this.items = this.items.filter((entry) => entry.id !== id);
				}
				this.publish();
			}
		} catch {
			this.items = this.items.map((entry) =>
				entry.id === id
					? {
							...entry,
							status: "failed",
							error:
								"Sinhronizācija neizdevās. Labojums ir saglabāts šajā pārlūka cilnē; mēģiniet vēlreiz.",
						}
					: entry,
			);
		} finally {
			this.running.delete(id);
		}
		this.publish();
	}
}

export function sameVisualPlanningContent(
	left: VisualPlan,
	right: VisualPlanInput,
) {
	return (
		(
			[
				"drawingId",
				"work",
				"location",
				"unit",
				"quantity",
				"startDate",
				"endDate",
				"contactId",
			] as const
		).every((key) => left[key] === right[key]) &&
		JSON.stringify(geometryContent(left.geometry)) ===
			JSON.stringify(geometryContent(right.geometry))
	);
}

function geometryContent(geometry: VisualPlanInput["geometry"]) {
	return [
		geometry.version,
		geometry.section ?? null,
		geometry.quantitySource ?? null,
		geometry.areas.map((area) => [
			area.id,
			area.page,
			area.polygon.map(({ x, y }) => [x, y]),
		]),
	];
}
