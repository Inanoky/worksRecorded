"use client";

import { Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
	type DiaryImageProgress,
	preloadDiaryImages,
} from "./preloadDiaryImages";

export function AllProjectsPhotoPreloader({
	urls,
	language,
	children,
}: {
	urls: string[];
	language: string;
	children: ReactNode;
}) {
	const cache = useRef(new Map<string, HTMLImageElement>());
	const key = JSON.stringify(urls);
	const [loadedKey, setLoadedKey] = useState<string | null>(null);
	const [progress, setProgress] = useState<DiaryImageProgress | null>(null);
	const lv = language.startsWith("lv");
	const loading = urls.length > 0 && loadedKey !== key;

	useEffect(() => {
		const controller = new AbortController();
		const photoUrls: string[] = JSON.parse(key);
		const activeUrls = new Set(photoUrls);
		for (const url of cache.current.keys()) {
			if (!activeUrls.has(url)) cache.current.delete(url);
		}
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
	}, [key]);

	if (loading) {
		return (
			<output
				aria-live="polite"
				className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground"
			>
				<Loader2 aria-hidden="true" className="size-5 animate-spin" />
				{lv ? "Ielādē projektu foto…" : "Loading project photos…"}
				{progress ? (
					<span className="tabular-nums">
						{progress.completed} / {progress.total}
					</span>
				) : null}
			</output>
		);
	}

	return (
		<>
			{progress && progress.failed > 0 ? (
				<output className="block px-4 py-2 text-sm text-muted-foreground">
					{lv
						? "Dažus foto neizdevās ielādēt."
						: "Some photos could not be loaded."}
				</output>
			) : null}
			{children}
		</>
	);
}
