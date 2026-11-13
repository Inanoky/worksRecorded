export function warehousePageKey(input: object) {
	return JSON.stringify(
		Object.entries(input)
			.filter(([, value]) => value !== undefined && value !== "")
			.sort(([a], [b]) => a.localeCompare(b)),
	);
}

export function createWarehousePageCache<T>() {
	const values = new Map<string, Promise<T>>();
	return {
		seed(key: string, value: T) {
			values.set(key, Promise.resolve(value));
		},
		read(key: string, load: () => Promise<T>) {
			const existing = values.get(key);
			if (existing) return existing;
			const pending = load().catch((error) => {
				if (values.get(key) === pending) values.delete(key);
				throw error;
			});
			values.set(key, pending);
			return pending;
		},
		clear() {
			values.clear();
		},
	};
}
