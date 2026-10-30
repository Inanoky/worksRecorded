"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getFimaDiaryFilterOptions } from "@/server/actions/fima-diary-filter-options";

export function useFimaDiaryFilterOptions(
	siteId: string | null | undefined,
	enabled: boolean,
	revision: number,
	rows?: readonly { Works?: string | null; Location?: string | null }[],
) {
	const local = useMemo(
		() =>
			rows
				? {
						works: [
							...new Set(
								rows
									.map((row) => row.Works)
									.filter((value): value is string => !!value),
							),
						].sort((a, b) => a.localeCompare(b, "lv")),
						locations: [
							...new Set(
								rows
									.map((row) => row.Location)
									.filter((value): value is string => !!value),
							),
						].sort((a, b) => a.localeCompare(b, "lv")),
					}
				: null,
		[rows],
	);
	const [result, setResult] = useState<{
		siteId: string;
		revision: number;
		options: Awaited<ReturnType<typeof getFimaDiaryFilterOptions>>;
	} | null>(null);
	useEffect(() => {
		if (!enabled || !siteId || local) return;
		let cancelled = false;
		void getFimaDiaryFilterOptions(siteId)
			.then((options) => {
				if (!cancelled) setResult({ siteId, revision, options });
			})
			.catch(() => {
				if (!cancelled) toast.error("Neizdevās ielādēt filtru vērtības.");
			});
		return () => {
			cancelled = true;
		};
	}, [siteId, enabled, revision, local]);
	return (
		local ??
		(enabled &&
		result &&
		result.siteId === siteId &&
		result.revision === revision
			? result.options
			: null)
	);
}
