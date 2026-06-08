import React from "react";

export type OriginalSourceContentProps = {
  originalUserComment?: string | null;
  originalAudioUrl?: string | null;
};

export function OriginalSourceContent({
  originalUserComment,
  originalAudioUrl,
}: OriginalSourceContentProps) {
  return (
    <div className="space-y-3">
      {originalUserComment ? (
        <p className="whitespace-pre-wrap">{originalUserComment}</p>
      ) : null}
      {originalAudioUrl ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
            Original voice message
          </p>
          <audio controls preload="metadata" src={originalAudioUrl} className="w-full" />
        </div>
      ) : null}
    </div>
  );
}
