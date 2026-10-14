import { z } from "zod";
import type { DiaryEditChanges } from "./diary-edit";
import {
	type DiaryEditRequest,
	diaryEditInputSchema,
} from "./diary-edit-input";

const itemSchema = z
	.object({
		version: z.literal(1),
		id: z.string().uuid(),
		createdAt: z.number().finite(),
		request: diaryEditInputSchema,
		error: z.string().optional(),
	})
	.strict();
export type DiarySaveItem = z.infer<typeof itemSchema>;
export type DiarySaveSnapshot = {
	items: DiarySaveItem[];
	savingId: string | null;
	error: string | null;
	lastSavedAt: number | null;
	confirmed: DiaryEditChanges;
	confirmedRevisions: Record<string, number>;
	revision: number;
};
type Storage = Pick<
	globalThis.Storage,
	"getItem" | "setItem" | "removeItem" | "key" | "length"
>;
type Options = {
	siteId: string;
	scope: string;
	save: (request: DiaryEditRequest) => Promise<DiaryEditChanges>;
	lock?: (run: () => Promise<void>) => Promise<void>;
};
const numericFields = new Set(["Amounts", "WorkersInvolved", "TimeInvolved"]);

function displayFields(fields: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(fields).map(([key, value]) => [
			key,
			value instanceof Date
				? value.toISOString()
				: numericFields.has(key)
					? value == null
						? ""
						: String(value)
					: (value ?? ""),
		]),
	);
}

export class DiarySaveQueue {
	private storage: Storage | null = null;
	private listeners = new Set<() => void>();
	private running = false;
	private owned = new Set<string>();
	private active = false;
	private snapshot: DiarySaveSnapshot = {
		items: [],
		savingId: null,
		error: null,
		lastSavedAt: null,
		confirmed: { rows: [], createdIds: [] },
		confirmedRevisions: {},
		revision: 0,
	};
	readonly prefix: string;
	constructor(private options: Options) {
		this.prefix = `construction-diary-save:v1:${options.scope}:${options.siteId}:`;
	}
	getSnapshot = () => this.snapshot;
	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
	private publish(change: Partial<DiarySaveSnapshot>) {
		this.snapshot = { ...this.snapshot, ...change };
		for (const listener of this.listeners) listener();
	}
	attach(storage: Storage) {
		this.storage = storage;
		this.active = true;
		this.reload();
	}
	detach() {
		this.active = false;
	}
	reload = () => {
		if (!this.storage) return;
		try {
			const items: DiarySaveItem[] = [];
			for (let i = 0; i < this.storage.length; i++) {
				const key = this.storage.key(i);
				if (!key?.startsWith(this.prefix)) continue;
				const raw = this.storage.getItem(key);
				if (!raw) continue;
				const parsed = itemSchema.safeParse(JSON.parse(raw));
				if (
					!parsed.success ||
					parsed.data.request.siteId !== this.options.siteId ||
					key !== this.prefix + parsed.data.id
				)
					throw new Error(
						"Neizdevās nolasīt gaidošās izmaiņas. Neizdzēsiet pārlūka datus; sazinieties ar atbalstu.",
					);
				items.push(parsed.data);
			}
			items.sort(
				(a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
			);
			this.publish({ items, error: null });
			void this.run();
		} catch (error) {
			this.publish({
				error:
					error instanceof Error
						? error.message
						: "Neizdevās nolasīt gaidošās izmaiņas.",
			});
		}
	};
	enqueue = (request: DiaryEditRequest) => {
		if (!this.active || !this.storage || this.snapshot.error)
			throw new Error(
				this.snapshot.error ??
					"Neizdevās saglabāt izmaiņas pārlūkā. Atstājiet redaktoru atvērtu un mēģiniet vēlreiz.",
			);
		const parsed = diaryEditInputSchema.safeParse(request);
		if (!parsed.success || request.siteId !== this.options.siteId)
			throw new Error(
				"Pārbaudiet ievadītos laukus un projekta identifikatoru.",
			);
		if (
			parsed.data.updates.some(
				(row) =>
					!row.expected ||
					Object.keys(row.fields).some(
						(key) => !Object.hasOwn(row.expected ?? {}, key),
					),
			)
		)
			throw new Error(
				"Izmaiņu sākotnējās vērtības nav pieejamas. Atveriet ierakstu vēlreiz.",
			);
		if (!parsed.data.updates.length && !parsed.data.creates.length) return;
		const tail = this.snapshot.items.at(-1);
		if (
			tail &&
			this.owned.has(tail.id) &&
			tail.id !== this.snapshot.savingId &&
			!tail.error &&
			!tail.request.creates.length &&
			!parsed.data.creates.length &&
			tail.request.updates.length === parsed.data.updates.length &&
			tail.request.updates.every((row) =>
				parsed.data.updates.some((next) => row.id === next.id),
			)
		) {
			const merged = {
				...tail,
				request: {
					...tail.request,
					updates: tail.request.updates.map((row) => {
						const next = parsed.data.updates.find((next) => next.id === row.id);
						if (!next) return row;
						return {
							...row,
							fields: { ...row.fields, ...next.fields },
							expected: { ...next.expected, ...row.expected },
						};
					}),
				},
			};
			try {
				this.storage.setItem(this.prefix + tail.id, JSON.stringify(merged));
			} catch {
				throw new Error(
					"Neizdevās saglabāt izmaiņas pārlūkā. Atstājiet redaktoru atvērtu.",
				);
			}
			this.publish({
				items: this.snapshot.items.map((item) =>
					item.id === tail.id ? merged : item,
				),
			});
			void this.run();
			return;
		}
		if (this.snapshot.items.length >= 100)
			throw new Error(
				"Pārāk daudz gaidošu izmaiņu. Vispirms atkārtojiet saglabāšanu.",
			);
		const item: DiarySaveItem = {
			version: 1,
			id: crypto.randomUUID(),
			createdAt: Math.max(
				Date.now(),
				...this.snapshot.items.map((item) => item.createdAt + 1),
			),
			request: parsed.data,
		};
		try {
			this.storage.setItem(this.prefix + item.id, JSON.stringify(item));
		} catch {
			throw new Error(
				"Pārlūkā nepietiek vietas izmaiņu saglabāšanai. Izmaiņas nav nosūtītas; atstājiet redaktoru atvērtu.",
			);
		}
		this.owned.add(item.id);
		this.publish({ items: [...this.snapshot.items, item] });
		void this.run();
	};
	retry = () => {
		if (!this.storage) return;
		try {
			for (const item of this.snapshot.items) {
				const retry = { ...item, error: undefined };
				this.storage.setItem(this.prefix + item.id, JSON.stringify(retry));
			}
			this.reload();
		} catch {
			this.publish({
				error: "Neizdevās saglabāt rindu pārlūkā. Mēģiniet vēlreiz.",
			});
		}
	};
	discard = () => {
		if (!this.storage || this.running) return;
		try {
			for (const item of this.snapshot.items)
				this.storage.removeItem(this.prefix + item.id);
			this.publish({ items: [], error: null });
		} catch {
			this.publish({ error: "Neizdevās atcelt gaidošās izmaiņas." });
		}
	};
	project<T extends { id?: string | null }>(rows: T[]): T[] {
		const result = new Map(rows.map((row) => [row.id, row]));
		for (const item of this.snapshot.items) {
			for (const row of item.request.creates) {
				const old = result.get(row.clientId);
				result.set(row.clientId, {
					Photos: [],
					createdBy: "N/A",
					createdAt: new Date(item.createdAt).toISOString(),
					...old,
					id: row.clientId,
					...displayFields(row.fields),
				} as unknown as T);
			}
			for (const row of item.request.updates) {
				const old = result.get(row.id);
				if (old) result.set(row.id, { ...old, ...displayFields(row.fields) });
			}
		}
		return [...result.values()];
	}
	hasPending(id: string) {
		return this.snapshot.items.some(
			(item) =>
				item.request.updates.some((row) => row.id === id) ||
				item.request.creates.some((row) => row.clientId === id),
		);
	}
	private async run() {
		if (
			this.running ||
			!this.active ||
			!this.storage ||
			this.snapshot.error ||
			!this.snapshot.items.length ||
			this.snapshot.items[0].error
		)
			return;
		this.running = true;
		try {
			const work = async () => {
				this.reload();
				while (this.active && this.storage) {
					const item = this.snapshot.items[0];
					if (!item || item.error || this.snapshot.error) break;
					const raw = this.storage.getItem(this.prefix + item.id);
					if (!raw) {
						this.reload();
						continue;
					}
					const fresh = itemSchema.parse(JSON.parse(raw));
					if (fresh.error) {
						this.reload();
						break;
					}
					this.publish({ savingId: item.id });
					try {
						const changes = await this.options.save(fresh.request);
						const expectedIds = [
							...fresh.request.updates.map((row) => row.id),
							...fresh.request.creates.map((row) => row.clientId),
						];
						if (
							expectedIds.some(
								(id) => !changes.rows.some((row) => row.id === id),
							)
						)
							throw new Error(
								"Serveris neapstiprināja visus ierakstus. Mēģiniet vēlreiz.",
							);
						this.storage.removeItem(this.prefix + item.id);
						const confirmed = new Map(
							this.snapshot.confirmed.rows.map((row) => [row.id, row]),
						);
						const confirmedRevisions = { ...this.snapshot.confirmedRevisions };
						for (const row of changes.rows) confirmed.set(row.id, row);
						for (const row of changes.rows)
							confirmedRevisions[row.id] = this.snapshot.revision + 1;
						this.publish({
							items: this.snapshot.items.filter((row) => row.id !== item.id),
							lastSavedAt: Date.now(),
							revision: this.snapshot.revision + 1,
							confirmedRevisions,
							confirmed: {
								rows: [...confirmed.values()],
								createdIds: [
									...new Set([
										...this.snapshot.confirmed.createdIds,
										...changes.createdIds,
									]),
								],
							},
						});
					} catch (error) {
						const failed = {
							...fresh,
							error:
								error instanceof Error
									? error.message
									: "Neizdevās saglabāt. Mēģiniet vēlreiz.",
						};
						try {
							this.storage.setItem(
								this.prefix + item.id,
								JSON.stringify(failed),
							);
						} catch {}
						this.publish({
							items: this.snapshot.items.map((row) =>
								row.id === item.id ? failed : row,
							),
						});
						break;
					}
				}
			};
			await (this.options.lock ? this.options.lock(work) : work());
		} catch {
			this.publish({
				error: "Neizdevās piekļūt gaidošajām izmaiņām. Mēģiniet vēlreiz.",
			});
		} finally {
			this.running = false;
			this.publish({ savingId: null });
		}
	}
}
