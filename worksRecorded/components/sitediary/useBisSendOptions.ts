"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectCacheScope } from "@/components/providers/ProjectLoadingProgressProvider";
import type { BisSendOptions } from "@/lib/bis/diary-send-options";

function useBisOption<K extends keyof BisSendOptions>(
	siteId: string | null | undefined,
	enabled: boolean,
	kind: K,
) {
	const identity = useProjectCacheScope();
	const key = `${identity}:${siteId}:${enabled}`;
	const currentKey = useRef(key);
	currentKey.current = key;
	const pending = useRef<{
		key: string;
		promise: Promise<void>;
		controller: AbortController;
	} | null>(null);
	const [state, setState] = useState<{
		key: string;
		data?: BisSendOptions[K];
		loading: boolean;
		error?: string;
		loadedAt?: number;
	}>({ key, loading: false });
	const load = useCallback(() => {
		if (!enabled || !siteId) return Promise.resolve();
		if (
			pending.current?.key === key &&
			!pending.current.controller.signal.aborted
		)
			return pending.current.promise;
		pending.current?.controller.abort();
		const controller = new AbortController();
		setState((old) => ({
			key,
			data: old.key === key ? old.data : undefined,
			loading: true,
		}));
		const promise = Promise.resolve()
			.then(() =>
				fetch(
					`/api/sites/${encodeURIComponent(siteId)}/bis-diary?kind=${kind}`,
					{ cache: "no-store", signal: controller.signal },
				),
			)
			.then(async (response) => {
				if (!response.ok) throw new Error("Neizdevās ielādēt BIS sarakstu.");
				const result = await response.json();
				if (!Array.isArray(result.data))
					throw new Error("BIS atgrieza nepilnīgu sarakstu.");
				if (currentKey.current === key && !controller.signal.aborted)
					setState({
						key,
						data: result.data,
						loading: false,
						loadedAt: Date.now(),
					});
			})
			.catch(() => {
				if (currentKey.current === key && !controller.signal.aborted)
					setState((old) => ({
						key,
						data: old.key === key ? old.data : undefined,
						loading: false,
						error: "Neizdevās ielādēt BIS sarakstu. Mēģiniet vēlreiz.",
					}));
			})
			.finally(() => {
				if (pending.current?.promise === promise) pending.current = null;
			});
		pending.current = { key, promise, controller };
		return promise;
	}, [key, siteId, kind, enabled]);
	useEffect(() => {
		void load();
		return () => pending.current?.controller.abort();
	}, [load]);
	return {
		data: enabled && state.key === key ? state.data : undefined,
		loading: enabled && (state.key !== key || state.loading),
		error: enabled && state.key === key ? state.error : undefined,
		loadedAt: state.key === key ? state.loadedAt : undefined,
		refresh: load,
	};
}

export function useBisSendOptions(
	siteId: string | null | undefined,
	enabled: boolean,
) {
	const materials = useBisOption(siteId, enabled, "materials");
	const attachments = useBisOption(siteId, enabled, "attachments");
	const measurements = useBisOption(siteId, enabled, "measurements");
	const responsiblePeople = useBisOption(siteId, enabled, "responsiblePeople");
	return { materials, attachments, measurements, responsiblePeople };
}
