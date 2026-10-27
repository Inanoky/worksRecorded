import type { SectionMappingSource } from "@/flows/default-construction/lib/section-mapping-source";

export type OriginalSourceContentProps = {
	originalUserComment?: string | null;
	originalAudioUrl?: string | null;
	sectionMapping?: SectionMappingSource;
};

function parseAudioUrls(value: string | null | undefined) {
	const normalized = String(value ?? "").trim();
	if (!normalized) return [];

	if (normalized.startsWith("[")) {
		try {
			const parsed = JSON.parse(normalized);
			if (Array.isArray(parsed)) {
				return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
			}
		} catch {
			return [];
		}
	}

	return normalized
		.split(/\r?\n/)
		.map((item) => item.trim())
		.filter(Boolean);
}

export function OriginalSourceContent({
	originalUserComment,
	originalAudioUrl,
	sectionMapping,
}: OriginalSourceContentProps) {
	const audioUrls = parseAudioUrls(originalAudioUrl);

	return (
		<div className="space-y-3">
			{sectionMapping ? (
				<div className="space-y-2 rounded-md border p-3 text-xs">
					<p className="font-medium">
						{sectionMapping.recordRef} · {sectionMapping.section} ·{" "}
						{sectionMapping.measuredM2.toLocaleString("lv-LV")} m²
					</p>
					{sectionMapping.boundaryReview ? (
						<p className="font-medium text-amber-700">Robeža jāpārbauda</p>
					) : null}
					<p>
						Mērīts rasējumā 1:100. Sākotnējais apjoms:{" "}
						{sectionMapping.originalQuantity == null
							? "nav norādīts"
							: `${sectionMapping.originalQuantity.toLocaleString("lv-LV")} m²`}
						.
					</p>
					<p>{sectionMapping.originalWork}</p>
					<div className="flex flex-col items-start gap-1">
						{sectionMapping.sources.map((source) => (
							<a
								key={`${source.label}:${source.url}`}
								href={source.url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary underline underline-offset-2"
							>
								{source.label}
							</a>
						))}
					</div>
				</div>
			) : null}
			{originalUserComment ? (
				<p className="whitespace-pre-wrap">{originalUserComment}</p>
			) : null}
			{audioUrls.length > 0 ? (
				<div className="space-y-1">
					<p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
						{audioUrls.length > 1
							? "Original voice messages"
							: "Original voice message"}
					</p>
					<div className="space-y-2">
						{audioUrls.map((audioUrl, index) => (
							<audio
								key={`${audioUrl}-${index}`}
								controls
								preload="metadata"
								src={audioUrl}
								className="w-full"
							/>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}
