"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { cn } from "@/lib/utils/utils";

type ZtcRelatedImageGalleryProps = {
  photos: Array<{ src: string; caption?: string }>;
  title: string;
  subtitle?: string;
  onClose: () => void;
};

export function ZtcRelatedImageGallery({
  photos,
  title,
  subtitle,
  onClose,
}: ZtcRelatedImageGalleryProps) {
  const [mounted, setMounted] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const viewerRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const baseSizeRef = React.useRef({ w: 0, h: 0 });
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;
  const THUMBNAIL_WINDOW = 8;

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, [currentIndex, photos]);

  React.useEffect(() => {
    if (!photos.length) return;
    const indexes = [
      currentIndex,
      (currentIndex + 1) % photos.length,
      (currentIndex - 1 + photos.length) % photos.length,
    ];

    const preloads = Array.from(new Set(indexes))
      .map((index) => photos[index]?.src)
      .filter(Boolean)
      .map((src) => {
        const image = new window.Image();
        image.decoding = "async";
        image.src = src;
        return image;
      });

    return () => {
      preloads.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [currentIndex, photos]);

  const goPrev = React.useCallback(() => {
    if (!photos.length) return;
    setCurrentIndex((index) => (index - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goNext = React.useCallback(() => {
    if (!photos.length) return;
    setCurrentIndex((index) => (index + 1) % photos.length);
  }, [photos.length]);

  const getCoverScale = React.useCallback(() => {
    const viewer = viewerRef.current;
    const base = baseSizeRef.current;
    if (!viewer || !base.w || !base.h) return 1;
    return Math.max(viewer.clientWidth / base.w, viewer.clientHeight / base.h);
  }, []);

  const clampTranslate = React.useCallback(
    (nextScale: number, nx: number, ny: number) => {
      const viewer = viewerRef.current;
      const base = baseSizeRef.current;
      if (!viewer || !base.w || !base.h) return { x: nx, y: ny };

      const cover = getCoverScale();
      if (nextScale <= Math.max(1, cover)) return { x: 0, y: 0 };

      const maxX = Math.max(0, (base.w * nextScale - viewer.clientWidth) / 2);
      const maxY = Math.max(0, (base.h * nextScale - viewer.clientHeight) / 2);

      return {
        x: Math.max(-maxX, Math.min(maxX, nx)),
        y: Math.max(-maxY, Math.min(maxY, ny)),
      };
    },
    [getCoverScale],
  );

  const zoomAtPoint = React.useCallback(
    (targetScale: number, clientX?: number, clientY?: number) => {
      const viewer = viewerRef.current;
      const cover = Math.max(1, getCoverScale());
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

      if (!viewer || nextScale <= cover) {
        setScale(nextScale);
        setTx(0);
        setTy(0);
        return;
      }

      const rect = viewer.getBoundingClientRect();
      const cx =
        (clientX ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2);
      const cy =
        (clientY ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2);
      const startScale = scale < cover ? cover : scale;
      const startTx = scale < cover ? 0 : tx;
      const startTy = scale < cover ? 0 : ty;
      const k = nextScale / startScale;
      const clamped = clampTranslate(
        nextScale,
        cx - (cx - startTx) * k,
        cy - (cy - startTy) * k,
      );

      setScale(nextScale);
      setTx(clamped.x);
      setTy(clamped.y);
    },
    [clampTranslate, getCoverScale, scale, tx, ty],
  );

  const handleImageLoaded = React.useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const previousTransform = img.style.transform;
    img.style.transform = "translate3d(0,0,0) scale(1)";
    const rect = img.getBoundingClientRect();
    baseSizeRef.current = { w: rect.width, h: rect.height };
    img.style.transform = previousTransform;
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onClose]);

  if (!mounted || !photos.length) return null;

  const currentPhoto = photos[currentIndex];
  const visibleThumbnailIndexes = photos
    .map((_, index) => index)
    .filter((index) => {
      const distance = Math.min(
        Math.abs(index - currentIndex),
        photos.length - Math.abs(index - currentIndex),
      );
      return distance <= THUMBNAIL_WINDOW;
    });

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Aizvērt"
      >
        <X className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          goPrev();
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring md:left-6"
        aria-label="Iepriekšējais foto"
      >
        <ChevronLeft className="h-7 w-7" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          goNext();
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring md:right-6"
        aria-label="Nākamais foto"
      >
        <ChevronRight className="h-7 w-7" />
      </button>

      <div
        className="flex h-[92vh] w-[92vw] max-w-[1400px] flex-col p-2"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 text-center text-white">
          <div className="text-base font-medium">{title}</div>
          {subtitle ? <div className="text-xs text-white/70">{subtitle}</div> : null}
        </div>
        <div className="absolute left-1/2 top-16 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-2 py-1 text-white">
          <button
            type="button"
            onClick={() => zoomAtPoint(scale / 1.25)}
            className="rounded-full p-1 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Samazināt foto"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="min-w-12 text-center text-xs font-medium">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomAtPoint(scale * 1.25)}
            className="rounded-full p-1 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Palielināt foto"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
        <div
          ref={viewerRef}
          className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden rounded-md"
          onWheel={(event) => {
            event.preventDefault();
            const factor = Math.pow(1.0015, -event.deltaY);
            zoomAtPoint(scale * factor, event.clientX, event.clientY);
          }}
        >
          <img
            ref={imgRef}
            src={currentPhoto.src}
            alt={currentPhoto.caption || title}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
              transformOrigin: "center",
              cursor: scale > Math.max(1, getCoverScale()) ? "grab" : "zoom-in",
            }}
            draggable={false}
            onLoad={handleImageLoaded}
            onDoubleClick={(event) =>
              zoomAtPoint(scale < 2 ? 2 : 1, event.clientX, event.clientY)
            }
          />
        </div>
        {currentPhoto.caption ? (
          <div className="mx-auto mt-3 max-h-24 max-w-4xl overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-black/40 px-3 py-2 text-center text-sm leading-snug text-white/90">
            {currentPhoto.caption}
          </div>
        ) : null}
        <div className="mt-1 text-center text-xs text-white/70">
          {currentIndex + 1} / {photos.length}
        </div>
      </div>
      {photos.length > 1 ? (
        <div className="absolute bottom-3 left-1/2 flex max-w-[90vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-md bg-black/40 p-2">
          {visibleThumbnailIndexes.map((index) => {
            const photo = photos[index];
            return (
            <button
              key={`${photo.src}-${index}`}
              type="button"
              className={cn(
                "h-14 w-14 shrink-0 overflow-hidden rounded border",
                index === currentIndex
                  ? "border-white"
                  : "border-white/20 opacity-70",
              )}
              onClick={(event) => {
                event.stopPropagation();
                setCurrentIndex(index);
              }}
            >
              <img
                src={photo.src}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
            );
          })}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
