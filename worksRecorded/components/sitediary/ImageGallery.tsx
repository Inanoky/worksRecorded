"use client";

import {
	CalendarDays,
	Check,
	ChevronLeft,
	ChevronRight,
	ImageOff,
	Mic2,
	X,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { createPortal } from "react-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getSiteDiaryDialogMessages,
	normalizeOrganizationLanguage,
} from "@/lib/dashboard-i18n";
import { cn } from "@/lib/utils/utils";
import {
	deletePhotoById,
	getPhotosByDate,
	movePhotosToDate,
} from "@/server/actions/site-diary-actions";

type ImageGalleryProps = {
	date: Date | null;
	siteId: string | null;
	className?: string;
	scrollAreaClassName?: string;
	organizationLanguage?: string | null;
	onMediaChanged?: () => void | Promise<void>;
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

type AudioRow = {
	id: string;
	Date: string | Date | null;
	Location: string | null;
	Works: string | null;
	originalUserComment: string | null;
	originalAudioUrl: string | null;
	siteId: string | null;
	userId: string | null;
	workerId: string | null;
};

function toDayRangeISO(date: Date) {
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	return { startISO: start.toISOString(), endISO: end.toISOString() };
}

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

function formatDateInputValue(value: string | Date | null | undefined) {
	if (!value) return "";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

const IMAGE_GALLERY_LOADING_SKELETON_KEYS = Array.from(
	{ length: 10 },
	(_, index) => `image-gallery-skeleton-${index + 1}`,
);

export function ImageGallery({
	date,
	siteId,
	className,
	scrollAreaClassName,
	organizationLanguage,
	onMediaChanged,
}: ImageGalleryProps) {
	const t = getSiteDiaryDialogMessages(
		normalizeOrganizationLanguage(organizationLanguage),
	);
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);

	const [photos, setPhotos] = React.useState<PhotoRow[] | null>(null);
	const [audioRecords, setAudioRecords] = React.useState<AudioRow[] | null>(
		null,
	);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [deleting, setDeleting] = React.useState<string | null>(null);
	const [selectionMode, setSelectionMode] = React.useState(false);
	const [movingSelected, setMovingSelected] = React.useState(false);
	const [bulkMoveTargetDate, setBulkMoveTargetDate] = React.useState("");
	const [selectedPhotoIds, setSelectedPhotoIds] = React.useState<Set<string>>(
		() => new Set(),
	);
	const [loadedThumbnailIds, setLoadedThumbnailIds] = React.useState<
		Set<string>
	>(() => new Set());
	const [failedThumbnailIds, setFailedThumbnailIds] = React.useState<
		Set<string>
	>(() => new Set());

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
	const startTranslateRef = React.useRef<{ tx: number; ty: number }>({
		tx: 0,
		ty: 0,
	});

	const viewerRef = React.useRef<HTMLDivElement | null>(null);
	const imgRef = React.useRef<HTMLImageElement | null>(null);
	const baseSizeRef = React.useRef<{ w: number; h: number }>({ w: 0, h: 0 });

	const imageList = React.useMemo(
		() =>
			(photos || []).map((p) => ({
				id: p.id,
				src: p.URL ?? p.fileUrl ?? "",
				caption: p.Comment ?? "",
			})),
		[photos],
	);
	const selectedPhotoCount = selectedPhotoIds.size;

	function openLightboxAt(index: number) {
		if (!imageList.length) return;
		setCurrentIndex(index);
		setScale(1);
		setTx(0);
		setTy(0);
		setIsLightboxOpen(true);
	}

	const closeLightbox = React.useCallback(() => {
		setIsLightboxOpen(false);
	}, []);

	const goPrev = React.useCallback(() => {
		if (!imageList.length) return;
		setCurrentIndex((i) => (i - 1 + imageList.length) % imageList.length);
		setScale(1);
		setTx(0);
		setTy(0);
	}, [imageList.length]);

	const goNext = React.useCallback(() => {
		if (!imageList.length) return;
		setCurrentIndex((i) => (i + 1) % imageList.length);
		setScale(1);
		setTx(0);
		setTy(0);
	}, [imageList.length]);

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
	}, [closeLightbox, goNext, goPrev, isLightboxOpen]);

	React.useEffect(() => {
		setSelectedPhotoIds(new Set());
		setLoadedThumbnailIds(new Set());
		setFailedThumbnailIds(new Set());
		setBulkMoveTargetDate("");
		setSelectionMode(false);

		let alive = true;
		async function run() {
			if (!date) {
				setPhotos([]);
				setAudioRecords([]);
				return;
			}
			setLoading(true);
			setError(null);
			try {
				const { startISO, endISO } = toDayRangeISO(date);
				const result = await getPhotosByDate({
					siteId: siteId ?? null,
					startISO,
					endISO,
				});
				if (!alive) return;
				setPhotos(result.photos || []);
				setAudioRecords(result.audioRecords || []);
			} catch (e: unknown) {
				if (!alive) return;
				setError(e instanceof Error ? e.message : t.failedLoadPhotos);
				setPhotos([]);
				setAudioRecords([]);
			} finally {
				if (alive) setLoading(false);
			}
		}
		run();
		return () => {
			alive = false;
		};
	}, [date, siteId, t.failedLoadPhotos]);

	async function handleDelete(id: string) {
		if (!window.confirm(t.confirmDeletePhoto)) return;

		setDeleting(id);
		setPhotos((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
		setSelectedPhotoIds((prev) => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
		try {
			await deletePhotoById(id);
			await onMediaChanged?.();
		} catch {
			setError(t.failedDeletePhoto);
		} finally {
			setDeleting(null);
		}
	}

	function togglePhotoSelection(photoId: string) {
		setSelectedPhotoIds((prev) => {
			const next = new Set(prev);
			if (next.has(photoId)) {
				next.delete(photoId);
			} else {
				next.add(photoId);
			}
			return next;
		});
	}

	function handleModeChange(nextSelectionMode: boolean) {
		setSelectionMode(nextSelectionMode);
		setError(null);
		if (!nextSelectionMode) {
			setSelectedPhotoIds(new Set());
		}
	}

	async function handleMoveSelectedPhotos() {
		const photoIds = Array.from(selectedPhotoIds);
		if (photoIds.length === 0) {
			setError(t.selectPhotosToMove);
			return;
		}

		if (!bulkMoveTargetDate) {
			setError(t.selectPhotoMoveDate);
			return;
		}

		setMovingSelected(true);
		setError(null);
		try {
			await movePhotosToDate({
				photoIds,
				targetDate: bulkMoveTargetDate,
			});
			if (formatDateInputValue(date) !== bulkMoveTargetDate) {
				const movedPhotoIds = new Set(photoIds);
				setPhotos((prev) =>
					prev ? prev.filter((item) => !movedPhotoIds.has(item.id)) : prev,
				);
			}
			setSelectedPhotoIds(new Set());
			await onMediaChanged?.();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : t.failedMovePhoto);
		} finally {
			setMovingSelected(false);
		}
	}

	function formatAudioTime(value: string | Date | null) {
		if (!value) return null;
		const parsed = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(parsed.getTime())) return null;
		return parsed.toLocaleTimeString(undefined, {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	// --- Photos-like "expand to cover" behavior ------------------------------

	function getCoverScale() {
		const viewer = viewerRef.current;
		const base = baseSizeRef.current;
		if (!viewer || !base.w || !base.h) return 1;
		const vw = viewer.clientWidth;
		const vh = viewer.clientHeight;
		return Math.max(vw / base.w, vh / base.h);
	}

	function clampTranslate(nextScale: number, nx: number, ny: number) {
		const viewer = viewerRef.current;
		const base = baseSizeRef.current;
		if (!viewer || !base.w || !base.h) return { x: nx, y: ny };

		const cover = getCoverScale();
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

	// Wheel zoom
	function handleWheel(e: React.WheelEvent) {
		e.preventDefault();
		if (!viewerRef.current) return;

		const factor = 1.0015 ** -e.deltaY;
		const target = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
		const cover = Math.max(1, getCoverScale());

		if (target <= cover) {
			setScale(target);
			setTx(0);
			setTy(0);
			return;
		}

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

	// Double-click zoom
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
		if (scale <= cover) return;
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

	function dist(a: React.Touch, b: React.Touch) {
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
			const midX =
				(t1.clientX + t2.clientX) / 2 - (vrect.left + vrect.width / 2);
			const midY =
				(t1.clientY + t2.clientY) / 2 - (vrect.top + vrect.height / 2);
			touchState.current.midX = midX;
			touchState.current.midY = midY;
		}
	}

	function handleTouchMove(e: React.TouchEvent) {
		if (touchState.current.pinching && e.touches.length === 2) {
			e.preventDefault();
			const [t1, t2] = [e.touches[0], e.touches[1]];
			const newDist = dist(t1, t2);
			let newScale =
				(touchState.current.startScale * newDist) /
				(touchState.current.startDist || 1);
			newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

			const cover = Math.max(1, getCoverScale());
			if (newScale <= cover) {
				setScale(newScale);
				setTx(0);
				setTy(0);
				return;
			}

			const startScale =
				touchState.current.startScale < cover
					? cover
					: touchState.current.startScale;
			const startTx = scale < cover ? 0 : tx;
			const startTy = scale < cover ? 0 : ty;

			const k = newScale / startScale;
			const nx =
				touchState.current.midX - (touchState.current.midX - startTx) * k;
			const ny =
				touchState.current.midY - (touchState.current.midY - startTy) * k;

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
		<div className={cn("flex min-h-0 flex-col bg-background", className)}>
			<div className="relative min-h-0 flex-1">
				{loading ? (
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
						{IMAGE_GALLERY_LOADING_SKELETON_KEYS.map((skeletonKey) => (
							<Skeleton key={skeletonKey} className="aspect-square" />
						))}
					</div>
				) : error ? (
					<div className="p-2 text-sm text-muted-foreground">{error}</div>
				) : (photos?.length ?? 0) === 0 && (audioRecords?.length ?? 0) === 0 ? (
					<div className="text-sm text-muted-foreground p-2">
						{t.noMediaForDate}
					</div>
				) : (
					<div
						data-tour="dialog-gallery"
						className="flex h-full min-h-0 flex-col gap-3"
					>
						{(photos?.length ?? 0) > 0 ? (
							<div className="flex flex-col gap-2 rounded-md border border-muted bg-muted/20 p-2 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex flex-col gap-1">
									<div className="text-sm font-medium text-foreground">
										{selectionMode ? t.selectMode : t.regularViewerMode}
									</div>
									{selectionMode ? (
										<div className="text-xs text-muted-foreground">
											{selectedPhotoCount > 0
												? t.selectedPhotos(selectedPhotoCount)
												: t.selectPhotosToMove}
										</div>
									) : null}
								</div>
								<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
									<button
										type="button"
										onClick={() => handleModeChange(!selectionMode)}
										className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm"
									>
										{selectionMode ? t.regularViewerMode : t.selectMode}
									</button>
									{selectionMode ? (
										<>
											<input
												type="date"
												value={bulkMoveTargetDate}
												onChange={(e) => setBulkMoveTargetDate(e.target.value)}
												className="h-9 rounded-md border border-input bg-background px-2 text-sm"
												aria-label={t.movePhotoToDate}
												title={t.movePhotoToDate}
											/>
											<button
												type="button"
												onClick={handleMoveSelectedPhotos}
												disabled={selectedPhotoCount === 0 || movingSelected}
												className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
											>
												<CalendarDays className="h-4 w-4" />
												<span>{t.moveSelectedPhotos}</span>
											</button>
										</>
									) : null}
									{selectionMode && selectedPhotoCount > 0 ? (
										<button
											type="button"
											onClick={() => setSelectedPhotoIds(new Set())}
											className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm"
										>
											{t.clearPhotoSelection}
										</button>
									) : null}
								</div>
							</div>
						) : null}
						<ScrollArea className={scrollAreaClassName ?? "h-[600px]"}>
							<div className="space-y-4 pr-3">
								{(photos?.length ?? 0) > 0 ? (
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
										{(photos ?? []).map((p, idx) => {
											const src = p.URL ?? p.fileUrl ?? "";
											const isDeleting = deleting === p.id;
											const isSelected =
												selectionMode && selectedPhotoIds.has(p.id);
											const thumbnailLoaded = loadedThumbnailIds.has(p.id);
											const thumbnailFailed =
												failedThumbnailIds.has(p.id) || !src;

											return (
												<div
													key={p.id}
													className={cn(
														"group relative aspect-square overflow-hidden rounded-md border",
														src ? "cursor-pointer" : "cursor-default",
														isSelected
															? "border-primary ring-2 ring-primary"
															: "border-muted",
													)}
													title={p.Comment ?? undefined}
												>
													<button
														type="button"
														className="relative block h-full w-full"
														aria-label={p.Comment ?? t.photo}
														aria-pressed={isSelected}
														onClick={() => {
															if (selectionMode) {
																togglePhotoSelection(p.id);
															} else if (src) {
																openLightboxAt(idx);
															}
														}}
													>
														{!thumbnailLoaded && !thumbnailFailed ? (
															<Skeleton
																className="absolute inset-0 z-0 rounded-none"
																aria-label={`${t.photo} loading`}
															/>
														) : null}

														{thumbnailFailed ? (
															<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/40 px-2 text-center text-xs text-muted-foreground">
																<ImageOff
																	className="h-5 w-5"
																	aria-hidden="true"
																/>
																<span>{t.photo}</span>
															</div>
														) : null}

														{src ? (
															<Image
																src={src}
																alt={p.Comment ?? t.photo}
																fill
																sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
																loading="lazy"
																className={cn(
																	"object-cover transition-transform duration-200 group-hover:scale-105",
																	!thumbnailLoaded && "opacity-0",
																	isDeleting && "opacity-50",
																)}
																onLoad={() => {
																	setLoadedThumbnailIds((current) => {
																		const next = new Set(current);
																		next.add(p.id);
																		return next;
																	});
																}}
																onError={() => {
																	setFailedThumbnailIds((current) => {
																		const next = new Set(current);
																		next.add(p.id);
																		return next;
																	});
																}}
															/>
														) : null}
													</button>

													{selectionMode ? (
														<div
															className={cn(
																"absolute left-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border text-white",
																isSelected
																	? "border-primary bg-primary"
																	: "border-white/70 bg-black/45",
															)}
														>
															{isSelected ? (
																<Check className="h-4 w-4" />
															) : null}
														</div>
													) : null}

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
															"focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus:ring-ring",
														)}
														aria-label={t.deletePhoto}
														title={t.deletePhoto}
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
								) : null}

								{(audioRecords?.length ?? 0) > 0 ? (
									<section className="space-y-2">
										<div className="flex items-center gap-2 text-sm font-medium">
											<Mic2 className="h-4 w-4" />
											<span>{t.voiceMessages}</span>
										</div>
										<div className="grid gap-2">
											{(audioRecords ?? []).map((record) => {
												const time = formatAudioTime(record.Date);
												const title = [time, record.Location, record.Works]
													.filter(Boolean)
													.join(" · ");
												const audioUrls = parseAudioUrls(
													record.originalAudioUrl,
												);

												return (
													<div
														key={record.id}
														className="rounded-md border border-muted bg-muted/20 p-3"
													>
														{title ? (
															<div className="mb-2 text-xs font-medium text-muted-foreground">
																{title}
															</div>
														) : null}
														{record.originalUserComment ? (
															<p className="mb-2 whitespace-pre-wrap text-sm">
																{record.originalUserComment}
															</p>
														) : null}
														<div className="space-y-2">
															{audioUrls.map((audioUrl) => (
																// biome-ignore lint/a11y/useMediaCaption: Persisted voice messages do not include transcript tracks.
																<audio
																	key={audioUrl}
																	controls
																	preload="metadata"
																	src={audioUrl}
																	className="w-full"
																/>
															))}
														</div>
													</div>
												);
											})}
										</div>
									</section>
								) : null}
							</div>
						</ScrollArea>
					</div>
				)}
			</div>

			{/* Lightbox via portal – full-screen, independent of parent dialog */}
			{mounted && isLightboxOpen && imageList.length > 0
				? createPortal(
						<div
							className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
							onClick={(event) => {
								if (event.target === event.currentTarget) closeLightbox();
							}}
							onKeyDown={(event) => {
								if (event.key === "Escape") closeLightbox();
							}}
							aria-modal="true"
							role="dialog"
						>
							{/* Close */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									closeLightbox();
								}}
								className="absolute right-4 top-4 rounded-full p-2 bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring"
								aria-label={t.close}
								title={t.close}
							>
								<X className="h-6 w-6" />
							</button>

							{/* Prev */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									goPrev();
								}}
								className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 rounded-full p-2 bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring"
								aria-label={t.previous}
								title={t.previous}
							>
								<ChevronLeft className="h-7 w-7" />
							</button>

							{/* Next */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									goNext();
								}}
								className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 rounded-full p-2 bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-ring"
								aria-label={t.next}
								title={t.next}
							>
								<ChevronRight className="h-7 w-7" />
							</button>

							{/* Viewer */}
							<section
								ref={viewerRef}
								aria-label={t.photo}
								className="flex h-[92vh] w-[92vw] max-w-[1400px] flex-col p-2"
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
								<div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md">
									{/* biome-ignore lint/performance/noImgElement: Zoom and pan require direct transform control of the lightbox image. */}
									<img
										ref={imgRef}
										src={imageList[currentIndex]?.src}
										alt={imageList[currentIndex]?.caption || t.photo}
										onLoad={handleImgLoaded}
										className="select-none"
										draggable={false}
										style={{
											transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
											transformOrigin: "center center",
											maxHeight: "100%",
											maxWidth: "100%",
											objectFit: "contain",
											transition: isPanningRef.current
												? "none"
												: "transform 120ms ease-out",
										}}
									/>
								</div>

								{imageList[currentIndex]?.caption ? (
									<div className="mx-auto mt-3 max-h-24 max-w-4xl overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-black/40 px-3 py-2 text-center text-sm leading-snug text-white/90">
										{imageList[currentIndex].caption}
									</div>
								) : null}
								<div className="mt-1 text-center text-xs text-white/70">
									{currentIndex + 1} / {imageList.length}
								</div>
							</section>
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}

export const PhotoGalleryGrid = ImageGallery;
export default ImageGallery;
