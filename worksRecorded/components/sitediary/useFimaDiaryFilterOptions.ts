"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getFimaDiaryFilterOptions } from "@/server/actions/fima-diary-filter-options";

export function useFimaDiaryFilterOptions(
	siteId: string | null | undefined,
	enabled: boolean,
	revision: number,
) {
	const [result, setResult] = useState<{
		siteId: string;
		revision: number;
		options: Awaited<ReturnType<typeof getFimaDiaryFilterOptions>>;
	} | null>(null);
	useEffect(() => {
		if (!enabled || !siteId) return;
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
	}, [siteId, enabled, revision]);
	return enabled &&
		result &&
		result.siteId === siteId &&
		result.revision === revision
		? result.options
		: null;
}
