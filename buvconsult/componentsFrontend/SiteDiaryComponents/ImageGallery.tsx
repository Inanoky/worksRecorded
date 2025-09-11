"use client";

import * as React from "react";
import { getPhotosByDate, deletePhotoById } from "@/app/actions/photoActions";
import { Skeleton } from "@/componentsFrontend/ui/skeleton";
import { ScrollArea } from "@/componentsFrontend/ui/scroll-area";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
  const [deleting, setDeleting] = React.useState<string | null>(null);

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

  async function handleDelete(id: string) {
    // optimistic remove
    setDeleting(id);
    setPhotos((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));

    try {
      await deletePhotoById(id);
    } catch (e) {
      // revert on failure (best effort)
      setError("Failed to delete photo");
      // (Optional) Re-fetch for accuracy; keeping it light for now.
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className={cn("p-3 border border-muted rounded-lg bg-background", className)}>
      <div className="mb-2 text-sm text-muted-foreground">
        {loading
          ? "Loading photos…"
          : error
          ? error
          : `${photos?.length ?? 0} photo${(photos?.length ?? 0) === 1 ? "" : "s"}`}
      </div>

      <div className="relative h-full">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 p-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : (photos?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground p-2">No photos for this date.</div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 p-2">
              {photos!.map((p) => {
                const src = p.URL ?? p.fileUrl ?? "";
                const isDeleting = deleting === p.id;

                return (
                  // Use a div with role/button semantics (so nested delete <button> is valid)
                  <div
                    key={p.id}
                    className="group relative aspect-square overflow-hidden rounded-md border border-muted cursor-pointer"
                    title={p.Comment ?? undefined}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (src) window.open(src, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <img
                      src={src}
                      alt={p.Comment ?? "Photo"}
                      className={cn(
                        "h-full w-full object-cover transition-transform duration-200 group-hover:scale-105",
                        isDeleting && "opacity-50"
                      )}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />

                    {/* Hover delete button (desktop only) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                      className={cn(
                        // desktop-only visibility; reveal on hover
                        "hidden md:block absolute right-1 top-1 rounded-full p-1",
                        "bg-black/60 text-white",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      )}
                      aria-label="Delete photo"
                      title="Delete photo"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {p.Comment ? (
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-[11px] text-white line-clamp-2">
                        {p.Comment}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

export const PhotoGalleryGrid = ImageGallery;
export default ImageGallery;
