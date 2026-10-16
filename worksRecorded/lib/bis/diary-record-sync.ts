type LinkedRecord = {
	id: string;
	BISId: string | null;
	bisStatus: string | null;
};
type SyncResult = {
	checked: number;
	cleared: number;
	clearedRecordIds: string[];
};

export async function syncLinkedBisRecords({
	records,
	fetchRecord,
	updateRecord,
}: {
	records: LinkedRecord[];
	fetchRecord: (bisId: string) => Promise<Response>;
	updateRecord: (
		record: LinkedRecord,
		data: { BISId?: null; bisStatus: string | null },
	) => Promise<unknown>;
}): Promise<SyncResult> {
	const clearedRecordIds: string[] = [];
	let checked = 0;
	for (const record of records) {
		if (!record.BISId) continue;
		const response = await fetchRecord(record.BISId);
		checked++;
		if (response.status === 404) {
			await response.body?.cancel();
			await updateRecord(record, { BISId: null, bisStatus: null });
			clearedRecordIds.push(record.id);
			continue;
		}
		if (!response.ok) {
			await response.body?.cancel();
			throw new Error(
				`BIS ierakstu pārbaude apturēta (HTTP ${response.status}). Nepārbaudīto ierakstu saites nav mainītas.`,
			);
		}
		const json = await response.json();
		if (!json?.data?.attributes || typeof json.data.attributes !== "object") {
			throw new Error(
				"BIS atgrieza nepilnīgus ieraksta datus. Ieraksta saite nav mainīta.",
			);
		}
		const currentStatus =
			json.data.attributes.status == null
				? null
				: String(json.data.attributes.status);
		if ((record.bisStatus ?? null) !== currentStatus) {
			await updateRecord(record, { bisStatus: currentStatus });
		}
	}
	return { checked, cleared: clearedRecordIds.length, clearedRecordIds };
}

export class BisDiarySyncCache {
	private entries = new Map<
		string,
		{
			pending?: Promise<SyncResult>;
			result?: SyncResult;
			error?: unknown;
			expiresAt: number;
		}
	>();

	async run(
		key: string,
		task: () => Promise<SyncResult>,
		force = false,
	): Promise<SyncResult> {
		const existing = this.entries.get(key);
		if (existing?.pending) return existing.pending;
		if (existing && existing.expiresAt > Date.now()) {
			if (existing.error) throw existing.error;
			if (!force && existing.result) return existing.result;
		}
		for (const [id, entry] of this.entries) {
			if (!entry.pending && entry.expiresAt <= Date.now())
				this.entries.delete(id);
		}
		if (this.entries.size >= 1000) {
			const oldest = [...this.entries].find(([, entry]) => !entry.pending);
			if (oldest) this.entries.delete(oldest[0]);
		}
		const entry: {
			pending?: Promise<SyncResult>;
			result?: SyncResult;
			error?: unknown;
			expiresAt: number;
		} = { expiresAt: 0 };
		const pending = Promise.resolve().then(task);
		entry.pending = pending;
		this.entries.set(key, entry);
		try {
			entry.result = await pending;
			entry.expiresAt = Date.now() + 5 * 60_000;
			return entry.result;
		} catch (error) {
			entry.error = error;
			entry.expiresAt = Date.now() + 60_000;
			throw error;
		} finally {
			entry.pending = undefined;
		}
	}
}
