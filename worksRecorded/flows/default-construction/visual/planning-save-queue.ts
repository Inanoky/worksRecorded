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
	enqueue(input: VisualPlanInput) {
		if (input.siteId !== this.siteId)
			throw new Error("Plāns nepieder šim projektam.");
		const id = input.id ?? input.clientId ?? crypto.randomUUID();
		if (this.items.some((item) => item.id === id))
			throw new Error("Šī plāna iepriekšējais labojums vēl tiek sinhronizēts.");
		const request = {
			...input,
			...(!input.id ? { clientId: id } : {}),
			mutationId: crypto.randomUUID(),
		};
		const plan: VisualPlan = {
			...input,
			id,
			version: (input.version ?? 0) + 1,
			geometryReviewRequired: false,
			archivedAt: null,
		};
		const item: PlanningSaveItem = {
			id,
			input: request,
			plan,
			status: "saving",
		};
		this.items = [...this.items, item];
		this.publish();
		void this.run(item);
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
		void this.run(next);
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
				this.items = [
					...this.items,
					{
						id: item.id,
						input: parsed.data,
						plan: {
							...parsed.data,
							id: item.id,
							version: (parsed.data.version ?? 0) + 1,
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
	private async run(item: PlanningSaveItem) {
		try {
			const result = await this.transport(item.input);
			if (!result.ok) {
				this.items = this.items.map((entry) =>
					entry === item
						? {
								...entry,
								status: "failed",
								error: result.error,
								conflict: result.conflict,
							}
						: entry,
				);
			} else {
				if (result.plan.id !== item.id)
					throw new Error("Serveris neatgrieza gaidīto plānu.");
				this.onSaved(item.input.drawingId, result.plan);
				this.items = this.items.filter((entry) => entry !== item);
			}
		} catch {
			this.items = this.items.map((entry) =>
				entry === item
					? {
							...entry,
							status: "failed",
							error:
								"Sinhronizācija neizdevās. Labojums ir saglabāts šajā pārlūka cilnē; mēģiniet vēlreiz.",
						}
					: entry,
			);
		}
		this.publish();
	}
}
