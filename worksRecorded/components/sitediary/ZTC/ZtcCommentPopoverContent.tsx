"use client";

import { Mic2 } from "lucide-react";

import {
  parseZtcDiaryAudioUrls,
  type ZtcDiaryRow,
} from "@/components/sitediary/ZTC/ztc-site-diary-utils";

export function ZtcCommentPopoverContent({ row }: { row: ZtcDiaryRow }) {
  const audioUrls = parseZtcDiaryAudioUrls(row.originalAudioUrl);

  return (
    <div className="space-y-3">
      {row.Comments ? (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {row.Comments}
        </p>
      ) : null}
      {audioUrls.length > 0 ? (
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Mic2 className="h-3.5 w-3.5" />
            <span>{audioUrls.length > 1 ? "Balss ziņas" : "Balss ziņa"}</span>
          </div>
          <div className="space-y-2">
            {audioUrls.map((audioUrl, index) => (
              <div key={`${audioUrl}-${index}`} className="space-y-1">
                {audioUrls.length > 1 ? (
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Balss ziņa {index + 1}
                  </p>
                ) : null}
                <audio
                  controls
                  preload="metadata"
                  src={audioUrl}
                  className="w-full"
                />
              </div>
            ))}
          </div>
          {row.originalUserComment ? (
            <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {row.originalUserComment}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
