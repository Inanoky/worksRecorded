"use client";

import * as React from "react";
import { getPhotosByDate, deletePhotoById } from "@/server/actions/site-diary-actions"
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/utils";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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

  // Lightbox
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Zoom/pan (Photos-like)
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;

  const isPanningRef = React.useRef(false);
  const panStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startTranslateRef = React.useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 });

  const viewerRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const baseSizeRef = React.useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const imageList = React.useMemo(
    () => (photos || []).map((p) => ({ id: p.id, src: p.URL ?? p.fileUrl ?? "", caption: p.Comment ?? "" })),
    [photos]
  );

  function openLightboxAt(index: number) {
    if (!imageList.length) return;
    setCurrentIndex(index);
    setScale(1);
    setTx(0);
    setTy(0);
    setIsLightboxOpen(true);
  }
  function closeLightbox() {
    setIsLightboxOpen(false);
  }
  function goPrev() {
    if (!imageList.length) return;
    setCurrentIndex((i) => (i - 1 + imageList.length) % imageList.length);
    setScale(1); setTx(0); setTy(0);
  }
  function goNext() {
    if (!imageList.length) return;
    setCurrentIndex((i) => (i + 1) % imageList.length);
    setScale(1); setTx(0); setTy(0);
  }

  // Keyboard nav
  React.useEffect(() => {
    if (!isLightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLightboxOpen]);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      if (!date) { setPhotos([]); return; }
      setLoading(true); setError(null);
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
    return () => { alive = false; };
  }, [date, siteId]);

  async function handleDelete(id: string) {
    setDeleting(id);
    setPhotos((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
    try { await deletePhotoById(id); }
    catch { setError("Failed to delete photo"); }
    finally { setDeleting(null); }
  }

  // --- Photos-like "expand to cover" behavior ------------------------------

  function getCoverScale() {
    const viewer = viewerRef.current;
    const base = baseSizeRef.current;
    if (!viewer || !base.w || !base.h) return 1;
    const vw = viewer.clientWidth;
    const vh = viewer.clientHeight;
    // base.{w,h} are the displayed size at scale=1 (object-contain result)
    // cover scale fills both axes (eliminates letterboxing)
    return Math.max(vw / base.w, vh / base.h);
  }

  function clampTranslate(nextScale: number, nx: number, ny: number) {
    const viewer = viewerRef.current;
    const base = baseSizeRef.current;
    if (!viewer || !base.w || !base.h) return { x: nx, y: ny };

    const cover = getCoverScale();
    // While under or equal to cover, keep centered (no panning)
    if (nextScale <= Math.max(1, cover)) return { x: 0, y: 0 };

    const vw = viewer.clientWidth;
    const vh = viewer.clientHeight;
    const dispW = base.w * nextScale;
    const dispH = base.h * nextScale;
    const maxX = Math.max(0, (dispW - vw) / 2);
    const maxY = Math.max(0, (dispH - vh) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, nx)),
      y: Math.max(-maxY, Math.min(maxY, ny)),
    };
  }

  function handleImgLoaded() {
    const img = imgRef.current;
    if (!img) return;
    const prev = img.style.transform;
    img.style.transform = "translate3d(0,0,0) scale(1)";
    const rect = img.getBoundingClientRect();
    baseSizeRef.current = { w: rect.width, h: rect.height };
    img.style.transform = prev || "";
  }

  // Wheel zoom: expand centered until "cover", then cursor-centered beyond
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (!viewerRef.current) return;

    const factor = Math.pow(1.0015, -e.deltaY);
    let target = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    const cover = Math.max(1, getCoverScale());

    if (target <= cover) {
      setScale(target);
      setTx(0);
      setTy(0);
      return;
    }

    // If we are crossing cover boundary this tick, start from cover centered
    const startScale = scale < cover ? cover : scale;
    const startTx = scale < cover ? 0 : tx;
    const startTy = scale < cover ? 0 : ty;

    const vrect = viewerRef.current.getBoundingClientRect();
    const cx = e.clientX - (vrect.left + vrect.width / 2);
    const cy = e.clientY - (vrect.top + vrect.height / 2);

    const k = target / startScale;
    const nx = cx - (cx - startTx) * k;
    const ny = cy - (cy - startTy) * k;

    const clamped = clampTranslate(target, nx, ny);
    setScale(target);
    setTx(clamped.x);
    setTy(clamped.y);
  }

  // Double-click: 1x -> cover; cover -> 2x; >=2x -> 1x
  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    const cover = Math.max(1, getCoverScale());
    let target: number;
    if (scale < cover - 0.01) target = cover;
    else if (scale < 2 - 0.01) target = 2;
    else target = 1;

    if (!viewerRef.current) return;

    if (target <= cover) {
      setScale(target);
      setTx(0);
      setTy(0);
      return;
    }

    const vrect = viewerRef.current.getBoundingClientRect();
    const cx = e.clientX - (vrect.left + vrect.width / 2);
    const cy = e.clientY - (vrect.top + vrect.height / 2);

    const startScale = scale < cover ? cover : scale;
    const startTx = scale < cover ? 0 : tx;
    const startTy = scale < cover ? 0 : ty;

    const k = target / startScale;
    const nx = cx - (cx - startTx) * k;
    const ny = cy - (cy - startTy) * k;
    const clamped = clampTranslate(target, nx, ny);
    setScale(target);
    setTx(clamped.x);
    setTy(clamped.y);
  }

  // Mouse/touch pan
  function startPan(clientX: number, clientY: number) {
    const cover = Math.max(1, getCoverScale());
    if (scale <= cover) return; // lock pan until after cover
    isPanningRef.current = true;
    panStartRef.current = { x: clientX, y: clientY };
    startTranslateRef.current = { tx, ty };
  }
  function movePan(clientX: number, clientY: number) {
    if (!isPanningRef.current) return;
    const dx = clientX - panStartRef.current.x;
    const dy = clientY - panStartRef.current.y;
    const nx = startTranslateRef.current.tx + dx;
    const ny = startTranslateRef.current.ty + dy;
    const clamped = clampTranslate(scale, nx, ny);
    setTx(clamped.x);
    setTy(clamped.y);
  }
  function endPan() {
    isPanningRef.current = false;
  }

  // Touch pinch/zoom
  const touchState = React.useRef({
    pinching: false,
    startDist: 0,
    startScale: 1,
    midX: 0,
    midY: 0,
  });

  function dist(a: Touch, b: Touch) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      startPan(t.clientX, t.clientY);
    } else if (e.touches.length === 2 && viewerRef.current) {
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      touchState.current.pinching = true;
      touchState.current.startDist = dist(t1, t2);
      touchState.current.startScale = scale;

      const vrect = viewerRef.current.getBoundingClientRect();
      const midX = (t1.clientX + t2.clientX) / 2 - (vrect.left + vrect.width / 2);
      const midY = (t1.clientY + t2.clientY) / 2 - (vrect.top + vrect.height / 2);
      touchState.current.midX = midX;
      touchState.current.midY = midY;
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (touchState.current.pinching && e.touches.length === 2) {
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const newDist = dist(t1, t2);
      let newScale = (touchState.current.startScale * newDist) / (touchState.current.startDist || 1);
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      const cover = Math.max(1, getCoverScale());
      if (newScale <= cover) {
        setScale(newScale);
        setTx(0);
        setTy(0);
        return;
      }

      const startScale = touchState.current.startScale < cover ? cover : touchState.current.startScale;
      const startTx = scale < cover ? 0 : tx;
      const startTy = scale < cover ? 0 : ty;

      const k = newScale / startScale;
      const nx = touchState.current.midX - (touchState.current.midX - startTx) * k;
      const ny = touchState.current.midY - (touchState.current.midY - startTy) * k;

      const clamped = clampTranslate(newScale, nx, ny);
      setScale(newScale);
      setTx(clamped.x);
      setTy(clamped.y);
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      movePan(t.clientX, t.clientY);
    }
  }
  function handleTouchEnd() {
    touchState.current.pinching = false;
    endPan();
  }

  return (
    <div className={cn("p-3 border border-muted rounded-lg bg-background", className)}>
      <div className="mb-2 text-sm text-muted-foreground">
        {loading ? "Loading photos…" : error ? error : `${photos?.length ?? 0} photo${(photos?.length ?? 0) === 1 ? "" : "s"}`}
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
              {photos!.map((p, idx) => {
                const src = p.URL ?? p.fileUrl ?? "";
                const isDeleting = deleting === p.id;

                return (
                  <div
                    key={p.id}
                    className="group relative aspect-square overflow-hidden rounded-md border border-muted cursor-pointer"
                    title={p.Comment ?? undefined}
                    role="button"
                    tabIndex={0}
                    onClick={() => src && openLightboxAt(idx)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && src) openLightboxAt(idx);
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

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                      className={cn(
                        "hidden md:block absolute right-1 top-1 rounded-full p-1",
                        "bg-black/60 text-white",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus:ring-ring"
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

      {/* Lightbox */}
      {isLightboxOpen && imageList.length > 0 ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={closeLightbox}
          aria-modal="true"
          role="dialog"
        >
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute right-4 top-4 rounded-full p-2 bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 rounded-full p-2 bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Previous"
            title="Previous"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 rounded-full p-2 bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Next"
            title="Next"
          >
            <ChevronRight className="h-7 w-7" />
          </button>

          {/* Viewer */}
          <div
            ref={viewerRef}
            className="max-h-[90vh] max-w-[95vw] p-2"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              startPan(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => movePan(e.clientX, e.clientY)}
            onMouseUp={endPan}
            onMouseLeave={endPan}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="relative mx-auto flex items-center justify-center overflow-hidden rounded-md"
              style={{ maxHeight: "80vh", maxWidth: "90vw" }}
            >
              <img
                ref={imgRef}
                src={imageList[currentIndex]?.src}
                alt={imageList[currentIndex]?.caption || "Photo"}
                onLoad={handleImgLoaded}
                className="select-none"
                draggable={false}
                style={{
                  transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
                  transformOrigin: "center center",
                  maxHeight: "80vh",
                  maxWidth: "90vw",
                  objectFit: "contain",
                  // Smooth zoom when not panning
                  transition: isPanningRef.current ? "none" : "transform 120ms ease-out",
                }}
              />
            </div>

            {imageList[currentIndex]?.caption ? (
              <div className="mt-2 text-center text-sm text-white/90">
                {imageList[currentIndex].caption}
              </div>
            ) : null}
            <div className="mt-1 text-center text-xs text-white/70">
              {currentIndex + 1} / {imageList.length}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const PhotoGalleryGrid = ImageGallery;
export default ImageGallery;
