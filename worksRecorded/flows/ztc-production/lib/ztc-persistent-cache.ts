import type { ZtcWorkspaceData } from "@/flows/ztc-production/lib/ztc-workspace-data";

const DATABASE = "works-recorded-ztc-v1";
const STORE = "workspaces";
const MAX_BYTES = 64 * 1024 * 1024;

type Entry = {
	key: string;
	version: 1;
	saved: number;
	bytes: number;
	data: ZtcWorkspaceData;
};

async function database(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === "undefined") return null;
	return new Promise((resolve) => {
		let settled = false;
		const finish = (db: IDBDatabase | null) => {
			if (settled) {
				db?.close();
				return;
			}
			settled = true;
			clearTimeout(timeout);
			resolve(db);
		};
		const timeout = setTimeout(() => finish(null), 1000);
		try {
			const request = indexedDB.open(DATABASE, 1);
			request.onupgradeneeded = () =>
				request.result.createObjectStore(STORE, { keyPath: "key" });
			request.onsuccess = () => {
				request.result.onversionchange = () => request.result.close();
				finish(request.result);
			};
			request.onerror = request.onblocked = () => finish(null);
		} catch {
			finish(null);
		}
	});
}

export class ZtcPersistentCache {
	private readonly key: string;
	constructor(
		private readonly scope: string | undefined,
		private readonly siteId: string,
	) {
		this.key = JSON.stringify([scope, siteId]);
	}

	async read(): Promise<ZtcWorkspaceData | undefined> {
		if (!this.scope) return;
		const db = await database();
		if (!db) return;
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				db.close();
				resolve(undefined);
			}, 1000);
			try {
				const tx = db.transaction(STORE, "readonly");
				const request = tx.objectStore(STORE).get(this.key);
				request.onsuccess = () => {
					const entry = request.result as Entry | undefined;
					const data = entry?.data;
					resolve(
						entry?.version === 1 &&
							data?.siteId === this.siteId &&
							Array.isArray(data.rows) &&
							Array.isArray(data.rates) &&
							Array.isArray(data.projectOptions) &&
							Array.isArray(data.mediaOnlyDays) &&
							data.config &&
							typeof data.config === "object"
							? data
							: undefined,
					);
				};
				tx.oncomplete =
					tx.onerror =
					tx.onabort =
						() => {
							clearTimeout(timeout);
							db.close();
							resolve(undefined);
						};
			} catch {
				clearTimeout(timeout);
				db.close();
				resolve(undefined);
			}
		});
	}

	async write(data: ZtcWorkspaceData) {
		if (!this.scope || data.siteId !== this.siteId) return;
		let bytes: number;
		try {
			bytes = JSON.stringify(data).length * 2;
		} catch {
			return;
		}
		if (bytes > MAX_BYTES) return;
		await this.mutate((store) => {
			store.put({
				key: this.key,
				version: 1,
				saved: Date.now(),
				bytes,
				data,
			} satisfies Entry);
			const request = store.getAll();
			request.onsuccess = () => {
				const entries = (request.result as Entry[]).sort(
					(a, b) => a.saved - b.saved,
				);
				let size = entries.reduce((sum, entry) => sum + entry.bytes, 0);
				for (const entry of entries) {
					if (size <= MAX_BYTES) break;
					store.delete(entry.key);
					size -= entry.bytes;
				}
			};
		});
	}

	async clear() {
		await this.mutate((store) => {
			store.delete(this.key);
		});
	}

	private async mutate(change: (store: IDBObjectStore) => void) {
		if (!this.scope) return;
		const db = await database();
		if (!db) return;
		await new Promise<void>((resolve) => {
			const finish = () => {
				clearTimeout(timeout);
				db.close();
				resolve();
			};
			const timeout = setTimeout(finish, 1500);
			try {
				const tx = db.transaction(STORE, "readwrite");
				tx.oncomplete = tx.onabort = tx.onerror = finish;
				change(tx.objectStore(STORE));
			} catch {
				finish();
			}
		});
	}
}
