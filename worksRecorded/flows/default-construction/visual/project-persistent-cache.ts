const DATABASE = "works-recorded-limeni-v1";
const STORE = "project-cache";
const META = "project-cache-meta";
const MAX_BYTES = 192 * 1024 * 1024;
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
			const request = indexedDB.open(DATABASE, 2);
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(STORE))
					db.createObjectStore(STORE, { keyPath: "key" });
				if (!db.objectStoreNames.contains(META)) {
					const metadata = db.createObjectStore(META, { keyPath: "key" });
					const cursor = request.transaction?.objectStore(STORE).openCursor();
					if (cursor)
						cursor.onsuccess = () => {
							const item = cursor.result;
							if (!item) return;
							const entry = item.value as Entry<unknown>;
							const resource = JSON.parse(entry.key)[2] as string;
							if (
								resource === "snapshot" ||
								(typeof resource === "string" &&
									resource.startsWith("preview:"))
							) {
								entry.expires = Number.MAX_SAFE_INTEGER;
								item.update(entry);
							}
							metadata.put({
								key: entry.key,
								saved: entry.saved,
								bytes: entry.bytes,
								expires: entry.expires,
							});
							item.continue();
						};
				}
			};
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
	async write<T>(key: string, value: T, days = 0) {
		const started = generation;
		const db = await database();
		if (!db) return;
		if (started !== generation) {
			db.close();
			return;
		}
		await new Promise<void>((resolve) => {
			try {
				const tx = db.transaction([STORE, META], "readwrite");
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
					expires: days
						? Date.now() + days * 86_400_000
						: Number.MAX_SAFE_INTEGER,
				} satisfies Entry<T>);
				const metadata = tx.objectStore(META);
				metadata.put({
					key: this.key(key),
					bytes,
					saved: Date.now(),
					expires: days
						? Date.now() + days * 86_400_000
						: Number.MAX_SAFE_INTEGER,
				});
				const all = metadata.getAll();
				all.onsuccess = () => {
					const entries = (all.result as Entry<unknown>[]).sort(
						(a, b) => a.saved - b.saved,
					);
					let size = entries.reduce((sum, entry) => sum + entry.bytes, 0);
					for (const entry of entries)
						if (entry.expires < Date.now() || size > MAX_BYTES) {
							store.delete(entry.key);
							metadata.delete(entry.key);
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
