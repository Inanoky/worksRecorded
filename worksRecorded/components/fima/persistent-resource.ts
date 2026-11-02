import { PersistentProjectCache } from "@/flows/default-construction/visual/project-persistent-cache";
export type FimaResourcePersistence<T> = {
	read: () => Promise<T | undefined>;
	write: (data: T | null) => Promise<void>;
};
export function fimaResourcePersistence<T>(
	scope: string | undefined,
	cases: Record<string, string | null>,
	kind: "diary" | "acts",
) {
	if (!scope) return undefined;
	const queues = new Map<string, Promise<void>>();
	return (siteId: string): FimaResourcePersistence<T> => {
		const cache = new PersistentProjectCache(
			JSON.stringify([scope, cases[siteId] ?? null]),
			siteId,
		);
		const key = `fima:${kind}:v1`;
		return {
			read: async () => {
				await queues.get(siteId);
				return (await cache.read<T | null>(key)) ?? undefined;
			},
			write: (data) => {
				const work = (queues.get(siteId) ?? Promise.resolve())
					.catch(() => {})
					.then(() => cache.write(key, data));
				queues.set(siteId, work);
				return work;
			},
		};
	};
}
