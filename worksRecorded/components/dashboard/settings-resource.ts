export function createSettingsResource<T>(loader: () => Promise<T>) {
	type Snapshot = {
		data: T | null;
		status: "idle" | "loading" | "ready" | "error";
		updatedAt: number;
	};
	const initial: Snapshot = { data: null, status: "idle", updatedAt: 0 };
	let snapshot = initial;
	let pending: Promise<void> | null = null;
	let generation = 0;
	const listeners = new Set<() => void>();
	const publish = (next: Snapshot) => {
		snapshot = next;
		for (const listener of listeners) listener();
	};
	const load = (force = false): Promise<void> => {
		if (!force && pending) return pending;
		if (
			!force &&
			snapshot.status === "ready" &&
			Date.now() - snapshot.updatedAt < 60_000
		) {
			return Promise.resolve();
		}
		const request = ++generation;
		publish({ ...snapshot, status: "loading" });
		pending = Promise.resolve()
			.then(loader)
			.then(
				(data) => {
					if (request === generation)
						publish({ data, status: "ready", updatedAt: Date.now() });
				},
				() => {
					if (request === generation)
						publish({ data: null, status: "error", updatedAt: 0 });
				},
			)
			.finally(() => {
				if (request === generation) pending = null;
			});
		return pending;
	};
	return {
		load,
		refresh: () => load(true),
		clear: () => {
			generation++;
			pending = null;
			publish(initial);
		},
		getSnapshot: () => snapshot,
		getServerSnapshot: () => initial,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
