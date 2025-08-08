"use client";

import * as React from "react";
import { getPhotosByDate } from "@/app/photoActions";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ImageGalleryProps = {
  date: Date | null;
  siteId: string | null;
  className?: string;
};

type PhotoRow = {
  id: string;
  Date: string | Date | null;
  URL: string | null;
  fileUrl: string | null;
  Comment: string | null;
  Location: string | null;
  siteId: string | null;
  userId: string | null;
};

function toDayRangeISO(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export function ImageGallery({ date, siteId, className }: ImageGalleryProps) {
  const [photos, setPhotos] = React.useState<PhotoRow[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      if (!date) {
        setPhotos([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { startISO, endISO } = toDayRangeISO(date);
        const rows = await getPhotosByDate({ siteId: siteId ?? null, startISO, endISO });
        if (!alive) return;
        setPhotos(rows || []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load photos");
        setPhotos([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [date, siteId]);

  return (
    <div className={cn("p-3 border border-muted rounded-none", className)}>
      <div className="mb-2 text-sm text-muted-foreground">
        {loading
          ? "Loading photos…"
          : error
          ? error
          : `${photos?.length ?? 0} photo${(photos?.length ?? 0) === 1 ? "" : "s"}`}
      </div>

      <ScrollArea className="h-[330px]">
        {loading ? (
          <div className="grid grid-cols-5 gap-4 p-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square " />
            ))}
          </div>
        ) : (photos?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground p-2">
            No photos for this date.
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4 p-2 auto-rows-[150px]">
            {photos!.map((p) => {
              const src = p.URL ?? p.fileUrl ?? "";
              return (
                <button
                  key={p.id}
                  className="group relative overflow-hidden border border-muted"
                  title={p.Comment ?? undefined}
                  onClick={() => {
                    if (src) window.open(src, "_blank", "noopener,noreferrer");
                  }}
                >
                  <img
                    src={src}
                    alt={p.Comment ?? "Photo"}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {p.Comment ? (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-[11px] text-white line-clamp-2">
                      {p.Comment}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export const PhotoGalleryGrid = ImageGallery;
export default ImageGallery;
