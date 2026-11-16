import { invalidateTgemDashboardCache } from "@/lib/tgem-invoice-approval/dashboard-cache";
import type { TgemInvoiceSettingsData } from "@/server/actions/tgem-invoice-settings-actions";

export type TgemSettingsCache = {
	generation: number;
	entries: Map<string, { data: TgemInvoiceSettingsData; fetchedAt: number }>;
	pending: Map<string, Promise<TgemInvoiceSettingsData>>;
};

let scope: string | undefined;
let cache: TgemSettingsCache = {
	generation: 0,
	entries: new Map(),
	pending: new Map(),
};

export function getTgemSettingsCache(nextScope: string) {
	if (scope !== nextScope) {
		cache.generation++;
		cache.entries.clear();
		scope = nextScope;
		cache = { generation: 0, entries: new Map(), pending: new Map() };
	}
	return cache;
}

export function invalidateTgemSettingsCaches() {
	cache.generation++;
	cache.entries.clear();
	invalidateTgemDashboardCache();
}
