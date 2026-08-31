"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type PhotoExportCardProps = {
	organizationLanguage?: string | null;
	photoCount: number;
	siteId: string;
};

type ExportSizeInfo = {
	estimatedBytes: number | null;
};

function formatFileSize(bytes: number, isLatvian: boolean) {
	const units = ["B", "KB", "MB", "GB", "TB"];
	const unitIndex = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const value = bytes / 1024 ** unitIndex;
	return `${new Intl.NumberFormat(isLatvian ? "lv-LV" : "en-US", {
		maximumFractionDigits: value >= 10 ? 0 : 1,
	}).format(value)} ${units[unitIndex]}`;
}

export function PhotoExportCard({
	organizationLanguage,
	photoCount,
	siteId,
}: PhotoExportCardProps) {
	const isLatvian = organizationLanguage === "lv";
	const exportHref = `/api/sites/${encodeURIComponent(siteId)}/photos/export`;
	const [sizeInfo, setSizeInfo] = useState<ExportSizeInfo | null>(null);
	const [sizeUnavailable, setSizeUnavailable] = useState(false);

	useEffect(() => {
		if (photoCount === 0) return;
		const controller = new AbortController();
		setSizeInfo(null);
		setSizeUnavailable(false);

		fetch(`${exportHref}?info=1`, {
			cache: "no-store",
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) throw new Error("Size estimate failed");
				return (await response.json()) as ExportSizeInfo;
			})
			.then((result) => {
				if (result.estimatedBytes === null) {
					setSizeUnavailable(true);
					return;
				}
				setSizeInfo(result);
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError")
					return;
				setSizeUnavailable(true);
			});

		return () => controller.abort();
	}, [exportHref, photoCount]);

	const text = {
		title: isLatvian ? "Fotoattēlu eksports" : "Photo export",
		description: isLatvian
			? "Lejupielādējiet visus objekta žurnāla fotoattēlus ZIP failā. Fotoattēli tiks sakārtoti mapēs pa mēnešiem."
			: "Download all site diary photos in a ZIP file. Photos are organized into folders by month.",
		button: isLatvian ? "Eksportēt fotoattēlus" : "Export photos",
		count: isLatvian
			? `${photoCount} ${photoCount === 1 ? "fotoattēls" : "fotoattēli"}`
			: `${photoCount} ${photoCount === 1 ? "photo" : "photos"}`,
		empty: isLatvian
			? "Šim objektam vēl nav eksportējamu fotoattēlu."
			: "This site does not have any photos to export yet.",
		calculatingSize: isLatvian ? "aprēķina izmēru…" : "calculating size…",
		approximateSize: isLatvian ? "aptuveni" : "approx.",
		sizeUnavailable: isLatvian ? "izmērs nav pieejams" : "size unavailable",
	};
	const sizeLabel = sizeInfo
		? `${text.approximateSize} ${formatFileSize(sizeInfo.estimatedBytes ?? 0, isLatvian)}`
		: sizeUnavailable
			? text.sizeUnavailable
			: text.calculatingSize;

	return (
		<Card data-tour="settings-photo-export">
			<CardHeader>
				<CardTitle>{text.title}</CardTitle>
				<CardDescription>{text.description}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-wrap items-center gap-3">
				{photoCount > 0 ? (
					<Button asChild>
						<a href={exportHref}>
							<Download />
							{text.button}
						</a>
					</Button>
				) : (
					<Button disabled>
						<Download />
						{text.button}
					</Button>
				)}
				<span className="text-sm text-muted-foreground" aria-live="polite">
					{photoCount > 0 ? `${text.count} · ${sizeLabel}` : text.empty}
				</span>
			</CardContent>
		</Card>
	);
}
