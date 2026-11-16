"use client";

import * as React from "react";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { TGEM_DASHBOARD_CACHE_FRESH_MS } from "@/lib/tgem-invoice-approval/dashboard-cache";
import {
	getTgemSettingsCache,
	invalidateTgemSettingsCaches,
} from "@/lib/tgem-invoice-approval/settings-cache";
import {
	getTgemInvoiceSettingsData,
	type TgemInvoiceSettingsData,
} from "@/server/actions/tgem-invoice-settings-actions";
import { TgemAccessGroupSettings } from "./TgemAccessGroupSettings";
import { TgemCostCodeSettings } from "./TgemCostCodeSettings";
import { TgemSettingsRefreshContext } from "./TgemSettingsRefreshContext";

export function TgemInvoiceSettings({
	cacheScope,
	projectFilter,
	organizationLanguage,
}: {
	cacheScope: string;
	projectFilter: string | null;
	organizationLanguage?: string | null;
}) {
	const key =
		projectFilter && projectFilter !== "unassigned" ? projectFilter : "all";
	const cache = React.useMemo(
		() => getTgemSettingsCache(cacheScope),
		[cacheScope],
	);
	const [snapshot, setSnapshot] = React.useState<{
		key: string;
		data: TgemInvoiceSettingsData;
	} | null>(() => {
		const cached = cache.entries.get(key);
		return cached ? { key, data: cached.data } : null;
	});
	const [failed, setFailed] = React.useState(false);
	const requestRef = React.useRef<Promise<TgemInvoiceSettingsData> | null>(
		null,
	);
	const activeKey = React.useRef(key);
	activeKey.current = key;
	const data =
		snapshot?.key === key ? snapshot.data : cache.entries.get(key)?.data;
	const copy =
		organizationLanguage === "lv"
			? {
					loading: "Ielādē projekta iestatījumus…",
					failed: "Neizdevās atjaunināt iestatījumus. Mēģiniet vēlreiz.",
					retry: "Mēģināt vēlreiz",
				}
			: organizationLanguage === "ru"
				? {
						loading: "Загрузка настроек проекта…",
						failed: "Не удалось обновить настройки. Попробуйте ещё раз.",
						retry: "Повторить",
					}
				: {
						loading: "Loading project settings…",
						failed: "Could not refresh settings. Please try again.",
						retry: "Try again",
					};

	const load = React.useCallback(async () => {
		const generation = cache.generation;
		const requestKey = JSON.stringify([generation, key]);
		let request = cache.pending.get(requestKey);
		if (!request) {
			request = getTgemInvoiceSettingsData(key === "all" ? null : key);
			cache.pending.set(requestKey, request);
		}
		requestRef.current = request;
		try {
			const next = await request;
			if (cache.generation !== generation) return;
			if (next.scope !== cacheScope) throw new Error("Settings scope changed");
			cache.entries.delete(key);
			cache.entries.set(key, { data: next, fetchedAt: Date.now() });
			if (cache.entries.size > 12) {
				const oldest = cache.entries.keys().next().value;
				if (oldest) cache.entries.delete(oldest);
			}
			if (activeKey.current === key && requestRef.current === request) {
				setSnapshot({ key, data: next });
				setFailed(false);
			}
		} catch {
			if (activeKey.current === key && requestRef.current === request)
				setFailed(true);
		} finally {
			if (cache.pending.get(requestKey) === request)
				cache.pending.delete(requestKey);
		}
	}, [cache, cacheScope, key]);

	React.useEffect(() => {
		setFailed(false);
		const cached = cache.entries.get(key);
		setSnapshot(cached ? { key, data: cached.data } : null);
		if (
			!cached ||
			Date.now() - cached.fetchedAt >= TGEM_DASHBOARD_CACHE_FRESH_MS
		)
			void load();
	}, [cache, key, load]);

	const changed = React.useCallback(async () => {
		invalidateTgemSettingsCaches();
		await load();
	}, [load]);

	return (
		<TgemSettingsRefreshContext.Provider value={changed}>
			{failed ? (
				<div
					role="alert"
					className="mx-auto flex max-w-[116rem] items-center gap-3 px-5 py-3 text-sm text-destructive"
				>
					{copy.failed}
					<button
						type="button"
						className="underline"
						onClick={() => void load()}
					>
						{copy.retry}
					</button>
				</div>
			) : null}
			{data ? (
				<TgemCostCodeSettings
					initialCostCodes={data.costCodes}
					organizationLanguage={organizationLanguage}
					selectedProject={data.selectedProject}
					deletableProject={data.deletableProject}
					approvalSetup={data.approvalSetup}
					submitterFlowSettings={data.submitterFlowSettings}
				>
					{data.access ? (
						<div className="mt-6">
							<TgemAccessGroupSettings {...data.access} />
						</div>
					) : null}
				</TgemCostCodeSettings>
			) : !failed ? (
				<ProjectOpeningOverlay label={copy.loading} />
			) : null}
		</TgemSettingsRefreshContext.Provider>
	);
}
