const DATABASE = "works-recorded-limeni-v1";
const STORE = "project-cache";
const MAX_BYTES = 64 * 1024 * 1024;
let generation = 0;
type Entry<T> = {
	key: string;
	value: T;
	expires: number;
	saved: number;
	bytes: number;
};

async function database() {
	if (typeof indexedDB === "undefined") return null;
	return new Promise<IDBDatabase | null>((resolve) => {
		let settled = false;
		const finish = (value: IDBDatabase | null) => {
			if (settled) {
				value?.close();
				return;
			}
			settled = true;
			clearTimeout(timeout);
			resolve(value);
		};
		const timeout = setTimeout(() => finish(null), 1500);
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

export class PersistentProjectCache {
	constructor(
		private readonly scope: string,
		private readonly siteId: string,
	) {}
	private key(key: string) {
		return JSON.stringify([this.scope, this.siteId, key]);
	}
	async read<T>(key: string): Promise<T | undefined> {
		const db = await database();
		if (!db) return;
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				db.close();
				resolve(undefined);
			}, 1500);
			try {
				const tx = db.transaction(STORE, "readonly");
				const request = tx.objectStore(STORE).get(this.key(key));
				request.onsuccess = () => {
					const entry = request.result as Entry<T> | undefined;
					resolve(
						entry && entry.expires > Date.now() ? entry.value : undefined,
					);
				};
				request.onerror = () => resolve(undefined);
				tx.oncomplete = tx.onabort = () => {
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
	async write<T>(key: string, value: T, days = 7) {
		const started = generation;
		const db = await database();
		if (!db) return;
		if (started !== generation) {
			db.close();
			return;
		}
		await new Promise<void>((resolve) => {
			try {
				const tx = db.transaction(STORE, "readwrite");
				const store = tx.objectStore(STORE);
				const bytes =
					value instanceof Blob ? value.size : JSON.stringify(value).length * 2;
				if (bytes > MAX_BYTES / 2) {
					db.close();
					resolve();
					return;
				}
				store.put({
					key: this.key(key),
					value,
					bytes,
					saved: Date.now(),
					expires: Date.now() + days * 86_400_000,
				} satisfies Entry<T>);
				const all = store.getAll();
				all.onsuccess = () => {
					const entries = (all.result as Entry<unknown>[]).sort(
						(a, b) => a.saved - b.saved,
					);
					let size = entries.reduce((sum, entry) => sum + entry.bytes, 0);
					for (const entry of entries)
						if (entry.expires < Date.now() || size > MAX_BYTES) {
							store.delete(entry.key);
							size -= entry.bytes;
						}
				};
				tx.oncomplete =
					tx.onabort =
					tx.onerror =
						() => {
							db.close();
							resolve();
						};
			} catch {
				db.close();
				resolve();
			}
		});
	}
}

export async function clearPersistentProjects() {
	generation++;
	if (typeof indexedDB === "undefined") return;
	await new Promise<void>((resolve) => {
		try {
			const request = indexedDB.deleteDatabase(DATABASE);
			request.onsuccess = request.onerror = request.onblocked = () => resolve();
		} catch {
			resolve();
		}
	});
}

export async function switchPersistentIdentity(scope: string) {
	try {
		const previous = localStorage.getItem("works-recorded:project-cache-scope");
		if (previous && previous !== scope) await clearPersistentProjects();
		localStorage.setItem("works-recorded:project-cache-scope", scope);
	} catch {}
}
