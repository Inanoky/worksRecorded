import React from "react";

export type OriginalSourceContentProps = {
  originalUserComment?: string | null;
  originalAudioUrl?: string | null;
};

function parseAudioUrls(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return [];

  if (normalized.startsWith("[")) {
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item ?? "").trim())
          .filter(Boolean);
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
}: OriginalSourceContentProps) {
  const audioUrls = parseAudioUrls(originalAudioUrl);

  return (
    <div className="space-y-3">
      {originalUserComment ? (
        <p className="whitespace-pre-wrap">{originalUserComment}</p>
      ) : null}
      {audioUrls.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
            {audioUrls.length > 1 ? "Original voice messages" : "Original voice message"}
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
