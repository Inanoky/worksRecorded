"use client";

import { useEffect, useRef, useState } from "react";
import {
	type DiaryImageProgress,
	preloadDiaryImages,
} from "./preloadDiaryImages";

export function useDiaryImagePreload(
	urls: string[],
	scope: string,
	enabled = true,
) {
	const cache = useRef(new Map<string, HTMLImageElement>());
	const cacheScope = useRef(scope);
	const key = JSON.stringify([scope, urls]);
	const [loadedKey, setLoadedKey] = useState<string | null>(null);
	const [progress, setProgress] = useState<DiaryImageProgress | null>(null);

	useEffect(() => {
		if (cacheScope.current !== scope) {
			cache.current.clear();
			cacheScope.current = scope;
		}
		if (!enabled) return;
		const controller = new AbortController();
		const [, photoUrls]: [string, string[]] = JSON.parse(key);
		setProgress(null);
		void preloadDiaryImages(photoUrls, {
			cache: cache.current,
			signal: controller.signal,
			onProgress: setProgress,
		}).then((result) => {
			if (controller.signal.aborted) return;
			setProgress(result);
			setLoadedKey(key);
		});
		return () => controller.abort();
	}, [key, scope, enabled]);

	return {
		images: cache.current,
		progress,
		loading: enabled && urls.length > 0 && loadedKey !== key,
	};
}
