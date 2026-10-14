import { z } from "zod";
import type { VisualDrawing } from "./model";
import {
	type PolygonEdit,
	type PolygonSaveResponse,
	type PolygonSaveResult,
	polygonEditSchema,
} from "./polygon-edit";

export type PolygonSaveItem = {
	drawingId: string;
	edit: PolygonEdit;
	status: "queued" | "saving" | "failed";
	error?: string;
	code?: "conflict" | "error";
};
export type PolygonSaveSnapshot = {
	items: PolygonSaveItem[];
	lastSavedAt: number | null;
};
const savedQueueSchema = z.object({
	version: z.literal(1),
	items: z
		.array(
			z.object({
				drawingId: z.string().min(1),
				edit: polygonEditSchema.extend({ mutationId: z.string().uuid() }),
			}),
		)
		.max(200),
});
const keyFor = (drawingId: string, markId: string) =>
	JSON.stringify([drawingId, markId]);

export function applyPolygonSave(
	drawing: VisualDrawing,
	result: PolygonSaveResult,
): VisualDrawing {
	if (drawing.id !== result.drawingId) return drawing;
	return {
		...drawing,
		state: {
			...drawing.state,
			marks: drawing.state.marks.map((mark) =>
				mark.id === result.markId
					? {
							...mark,
							polygon: result.polygon,
							...(result.editedAt ? { editedAt: result.editedAt } : {}),
							...(result.editedBy ? { editedBy: result.editedBy } : {}),
							...(result.geometryMutationId !== undefined
								? { geometryMutationId: result.geometryMutationId ?? undefined }
								: {}),
						}
					: mark,
			),
		},
	};
}

export function projectPolygonSaves(
	drawing: VisualDrawing | null,
	items: PolygonSaveItem[],
) {
	if (!drawing) return null;
	const edits = new Map(
		items
			.filter((item) => item.drawingId === drawing.id)
			.map((item) => [item.edit.markId, item.edit.polygon]),
	);
	if (!edits.size) return drawing;
	return {
		...drawing,
		state: {
			...drawing.state,
			marks: drawing.state.marks.map((mark) =>
				edits.has(mark.id)
					? { ...mark, polygon: edits.get(mark.id) as PolygonEdit["polygon"] }
					: mark,
			),
		},
	};
}

export class PolygonSaveQueue {
	private items = new Map<string, PolygonSaveItem>();
	private running = new Set<string>();
	private listeners = new Set<() => void>();
	private snapshot: PolygonSaveSnapshot = { items: [], lastSavedAt: null };
	private persist: ((value: string | null) => void) | null = null;

	constructor(
		private readonly save: (
			drawingId: string,
			edit: PolygonEdit,
		) => Promise<PolygonSaveResponse>,
		private readonly onSaved: (result: PolygonSaveResult) => void,
		readonly ownerId?: string,
	) {}

	getSnapshot = () => this.snapshot;
	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	enqueue(drawingId: string, input: PolygonEdit) {
		const edit = polygonEditSchema.parse({
			...input,
			mutationId: input.mutationId ?? crypto.randomUUID(),
		});
		const key = keyFor(drawingId, edit.markId);
		if (this.items.has(key))
			throw new Error(
				"Šīs zonas labojums vēl nav saglabāts. Vispirms atkārtojiet vai atceliet saglabāšanu.",
			);
		if (this.items.size >= 200)
			throw new Error(
				"Pārāk daudz nesaglabātu zonu. Uzgaidiet, līdz saglabāšana ir pabeigta.",
			);
		this.items.set(key, { drawingId, edit, status: "queued" });
		this.publish(null);
		void this.run(drawingId);
	}

	retry(drawingId: string, markId: string) {
		const item = this.items.get(keyFor(drawingId, markId));
		if (!item || item.status !== "failed") return;
		this.items.set(keyFor(drawingId, markId), {
			...item,
			status: "queued",
			error: undefined,
			code: undefined,
		});
		this.publish(null);
		void this.run(drawingId);
	}

	discard(drawingId: string, markId: string) {
		const key = keyFor(drawingId, markId);
		if (this.items.get(key)?.status !== "failed") return;
		this.items.delete(key);
		this.publish(null);
	}

	hasPending(drawingId?: string) {
		return [...this.items.values()].some(
			(item) => !drawingId || item.drawingId === drawingId,
		);
	}

	attachStorage(
		stored: string | null,
		persist: (value: string | null) => void,
	) {
		this.persist = persist;
		if (stored) {
			try {
				const restored = savedQueueSchema.parse(JSON.parse(stored));
				for (const item of restored.items) {
					const key = keyFor(item.drawingId, item.edit.markId);
					if (!this.items.has(key))
						this.items.set(key, {
							...item,
							status: "failed",
							code: "error",
							error:
								"Iepriekšējais labojums vēl nav apstiprināts. Mēģiniet saglabāt vēlreiz.",
						});
				}
			} catch {}
		}
		this.publish(null);
	}

	detachStorage() {
		this.persist = null;
	}

	private publish(lastSavedAt = this.snapshot.lastSavedAt) {
		this.snapshot = { items: [...this.items.values()], lastSavedAt };
		try {
			this.persist?.(
				this.items.size
					? JSON.stringify({
							version: 1,
							items: this.snapshot.items.map(({ drawingId, edit }) => ({
								drawingId,
								edit,
							})),
						})
					: null,
			);
		} catch {}
		for (const listener of this.listeners) listener();
	}

	private async run(drawingId: string) {
		if (this.running.has(drawingId)) return;
		this.running.add(drawingId);
		try {
			while (this.items.size) {
				const item = [...this.items.values()].find(
					(value) => value.drawingId === drawingId && value.status === "queued",
				);
				if (!item) break;
				const key = keyFor(drawingId, item.edit.markId);
				this.items.set(key, { ...item, status: "saving" });
				this.publish();
				try {
					const response = await this.save(drawingId, item.edit);
					if (!response.ok) {
						this.items.set(key, {
							...item,
							status: "failed",
							code: response.code,
							error: response.error,
						});
						this.publish();
						continue;
					}
					const result = response.result;
					if (
						result.drawingId !== drawingId ||
						result.markId !== item.edit.markId ||
						result.mutationId !== item.edit.mutationId
					)
						throw new Error("Invalid save response");
					this.onSaved(result);
					this.items.delete(key);
					this.publish(Date.now());
				} catch {
					this.items.set(key, {
						...item,
						status: "failed",
						code: "error",
						error: "Labojums vēl nav apstiprināts. Mēģiniet saglabāt vēlreiz.",
					});
					this.publish();
				}
			}
		} finally {
			this.running.delete(drawingId);
		}
	}
}
