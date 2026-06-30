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
  const imageViewportRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const baseSizeRef = React.useRef({ w: 0, h: 0 });
  const isPanningRef = React.useRef(false);
  const panStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startTranslateRef = React.useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 });
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;
  const THUMBNAIL_WINDOW = 8;

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    isPanningRef.current = false;
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

  function getCoverScale() {
    const viewer = imageViewportRef.current ?? viewerRef.current;
    const base = baseSizeRef.current;
    if (!viewer || !base.w || !base.h) return 1;
    return Math.max(viewer.clientWidth / base.w, viewer.clientHeight / base.h);
  }

  function clampTranslate(nextScale: number, nx: number, ny: number) {
    const viewer = imageViewportRef.current ?? viewerRef.current;
    const base = baseSizeRef.current;
    if (!viewer || !base.w || !base.h) return { x: nx, y: ny };

    if (nextScale <= MIN_SCALE) return { x: 0, y: 0 };

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

  const handleImageLoaded = React.useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const previousTransform = img.style.transform;
    img.style.transform = "translate3d(0,0,0) scale(1)";
    const rect = img.getBoundingClientRect();
    baseSizeRef.current = { w: rect.width, h: rect.height };
    img.style.transform = previousTransform;
  }, []);

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();
    if (!viewerRef.current) return;

    const factor = Math.pow(1.0015, -event.deltaY);
    const target = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));

    if (target <= MIN_SCALE) {
      setScale(target);
      setTx(0);
      setTy(0);
      return;
    }

    const startScale = Math.max(MIN_SCALE, scale);
    const startTx = scale <= MIN_SCALE ? 0 : tx;
    const startTy = scale <= MIN_SCALE ? 0 : ty;

    const viewerRect = (imageViewportRef.current ?? viewerRef.current).getBoundingClientRect();
    const cx = event.clientX - (viewerRect.left + viewerRect.width / 2);
    const cy = event.clientY - (viewerRect.top + viewerRect.height / 2);

    const k = target / startScale;
    const nx = cx - (cx - startTx) * k;
    const ny = cy - (cy - startTy) * k;

    const clamped = clampTranslate(target, nx, ny);
    setScale(target);
    setTx(clamped.x);
    setTy(clamped.y);
  }

  function zoomAtPoint(targetScale: number, clientX?: number, clientY?: number) {
    if (!viewerRef.current) return;

    const target = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

    if (target <= MIN_SCALE) {
      setScale(target);
      setTx(0);
      setTy(0);
      return;
    }

    const viewerRect = (imageViewportRef.current ?? viewerRef.current).getBoundingClientRect();
    const cx =
      (clientX ?? viewerRect.left + viewerRect.width / 2) -
      (viewerRect.left + viewerRect.width / 2);
    const cy =
      (clientY ?? viewerRect.top + viewerRect.height / 2) -
      (viewerRect.top + viewerRect.height / 2);
    const startScale = Math.max(MIN_SCALE, scale);
    const startTx = scale <= MIN_SCALE ? 0 : tx;
    const startTy = scale <= MIN_SCALE ? 0 : ty;

    const k = target / startScale;
    const nx = cx - (cx - startTx) * k;
    const ny = cy - (cy - startTy) * k;
    const clamped = clampTranslate(target, nx, ny);
    setScale(target);
    setTx(clamped.x);
    setTy(clamped.y);
  }

  function handleDoubleClick(event: React.MouseEvent) {
    event.preventDefault();
    let target: number;

    if (scale < 2 - 0.01) target = 2;
    else target = 1;

    zoomAtPoint(target, event.clientX, event.clientY);
  }

  function startPan(clientX: number, clientY: number) {
    if (scale <= MIN_SCALE) return;
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

  const touchState = React.useRef({
    pinching: false,
    startDist: 0,
    startScale: 1,
    midX: 0,
    midY: 0,
  });

  function dist(a: React.Touch, b: React.Touch) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  function handleTouchStart(event: React.TouchEvent) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      startPan(touch.clientX, touch.clientY);
    } else if (event.touches.length === 2 && viewerRef.current) {
      event.preventDefault();
      const [touchOne, touchTwo] = [event.touches[0], event.touches[1]];
      touchState.current.pinching = true;
      touchState.current.startDist = dist(touchOne, touchTwo);
      touchState.current.startScale = scale;

      const viewerRect = viewerRef.current.getBoundingClientRect();
      touchState.current.midX =
        (touchOne.clientX + touchTwo.clientX) / 2 -
        (viewerRect.left + viewerRect.width / 2);
      touchState.current.midY =
        (touchOne.clientY + touchTwo.clientY) / 2 -
        (viewerRect.top + viewerRect.height / 2);
    }
  }

  function handleTouchMove(event: React.TouchEvent) {
    if (touchState.current.pinching && event.touches.length === 2) {
      event.preventDefault();
      const [touchOne, touchTwo] = [event.touches[0], event.touches[1]];
      const newDist = dist(touchOne, touchTwo);
      let newScale =
        (touchState.current.startScale * newDist) /
        (touchState.current.startDist || 1);
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      if (newScale <= MIN_SCALE) {
        setScale(newScale);
        setTx(0);
        setTy(0);
        return;
      }

      const startScale = Math.max(MIN_SCALE, touchState.current.startScale);
      const startTx = scale <= MIN_SCALE ? 0 : tx;
      const startTy = scale <= MIN_SCALE ? 0 : ty;

      const k = newScale / startScale;
      const nx =
        touchState.current.midX - (touchState.current.midX - startTx) * k;
      const ny =
        touchState.current.midY - (touchState.current.midY - startTy) * k;

      const clamped = clampTranslate(newScale, nx, ny);
      setScale(newScale);
      setTx(clamped.x);
      setTy(clamped.y);
    } else if (event.touches.length === 1) {
      const touch = event.touches[0];
      movePan(touch.clientX, touch.clientY);
    }
  }

  function handleTouchEnd() {
    touchState.current.pinching = false;
    endPan();
  }

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
        ref={viewerRef}
        className="flex h-[92vh] w-[92vw] max-w-[1400px] flex-col p-2"
        onClick={(event) => event.stopPropagation()}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          startPan(event.clientX, event.clientY);
        }}
        onMouseMove={(event) => movePan(event.clientX, event.clientY)}
        onMouseUp={endPan}
        onMouseLeave={endPan}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor:
            scale > MIN_SCALE
              ? isPanningRef.current
                ? "grabbing"
                : "grab"
              : "zoom-in",
        }}
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
          ref={imageViewportRef}
          className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden rounded-md"
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
              transformOrigin: "center center",
              transition: isPanningRef.current
                ? "none"
                : "transform 120ms ease-out",
            }}
            draggable={false}
            onLoad={handleImageLoaded}
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
