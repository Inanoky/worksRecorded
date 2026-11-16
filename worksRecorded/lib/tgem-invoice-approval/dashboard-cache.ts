import type { TgemDashboardData } from "@/lib/tgem-invoice-approval/dashboard-types";

export const TGEM_DASHBOARD_CACHE_FRESH_MS = 60_000;

type Entry = {
	data: TgemDashboardData;
	fetchedAt: number;
	needsSetup: boolean;
};

export class TgemDashboardCache {
	private entries = new Map<string, Entry>();
	generation = 0;

	read(filter: string): Entry | undefined {
		const cached = this.entries.get(filter);
		if (cached) return cached;
		const all = this.entries.get("all");
		if (
			!all ||
			(filter !== "unassigned" &&
				!all.data.projects.some((project) => project.id === filter))
		)
			return undefined;
		const entry = {
			data: {
				...all.data,
				invoices: all.data.invoices.filter((invoice) =>
					filter === "unassigned"
						? !invoice.project
						: invoice.project?.id === filter,
				),
				approvalSetup: null,
			},
			fetchedAt: all.fetchedAt,
			needsSetup: filter !== "unassigned",
		};
		this.put(filter, entry);
		return entry;
	}

	put(filter: string, entry: Entry) {
		this.entries.delete(filter);
		this.entries.set(filter, entry);
		if (this.entries.size > 12) {
			const oldest = this.entries.keys().next().value;
			if (oldest) this.entries.delete(oldest);
		}
	}

	clear() {
		this.generation++;
		this.entries.clear();
	}
}

let sessionScope: string | undefined;
let sessionCache: TgemDashboardCache | undefined;

export function invalidateTgemDashboardCache() {
	sessionCache?.clear();
}

export function getTgemDashboardCache(scope: string) {
	if (sessionScope !== scope || !sessionCache) {
		sessionCache?.clear();
		sessionScope = scope;
		sessionCache = new TgemDashboardCache();
	}
	return sessionCache;
}
